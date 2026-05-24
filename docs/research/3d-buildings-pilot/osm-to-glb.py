#!/usr/bin/env python3
"""
osm-to-glb.py — convert Overpass JSON of OSM buildings into a single
GLB (glTF 2.0 binary). Pure stdlib; no trimesh / pygltf dependency.

Input:  business-bay-osm.json (Overpass output, type=way, building=*)
Output: business-bay-buildings.glb

Geometry choices:
  * Coordinates: equirectangular projection centred on the bbox
    midpoint. +X east, +Z south (i.e. positive Z is geographic
    south so the model reads naturally when viewed top-down with
    Y up). +Y is vertical height.
  * Height priority: explicit "height" tag → "building:levels" × 3.5 m
    → 15 m default fallback.
  * Triangulation: top + bottom faces via fan from vertex 0
    (works for convex footprints; most OSM building footprints in
    Business Bay are simple rectangles or near-convex 6-node hulls).
    Concave footprints will produce a few overlapping triangles
    that the viewer will Z-fight, but no crash.
  * Winding: doubleSided=true on the material so we don't have to
    police triangle winding per ring.

Relations (multipolygons) are SKIPPED in v1 — Business Bay has 17 of
them; coverage at ~454 ways still tells the story.

Not for production. Pilot/research only.
"""

import json
import math
import struct
import sys
from pathlib import Path

INPUT_PATH = Path(__file__).parent / "business-bay-osm.json"
OUTPUT_PATH = Path(__file__).parent / "business-bay-buildings.glb"
STATS_PATH = Path(__file__).parent / "business-bay-buildings.stats.json"

# Bounding box used in the Overpass query (lat_south, lng_west, lat_north, lng_east).
BBOX = (25.180, 55.260, 25.195, 55.282)
LAT0 = (BBOX[0] + BBOX[2]) / 2  # 25.1875
LNG0 = (BBOX[1] + BBOX[3]) / 2  # 55.271

MPD_LAT = 111_320.0
MPD_LNG = 111_320.0 * math.cos(math.radians(LAT0))

DEFAULT_HEIGHT_M = 15.0  # ~4 floors
LEVEL_HEIGHT_M = 3.5     # OSM convention; same value loadZaahiPlots uses


def parse_height(tags: dict) -> float:
    """Resolve a building height in metres from OSM tags."""
    h = tags.get("height")
    if h:
        # Strip "m", whitespace, decimal commas.
        s = str(h).replace(",", ".").lower()
        for tok in s.replace("m", " ").split():
            try:
                return max(2.0, float(tok))
            except ValueError:
                continue
    lvl = tags.get("building:levels")
    if lvl:
        try:
            return max(2.0, float(str(lvl).split()[0]) * LEVEL_HEIGHT_M)
        except ValueError:
            pass
    return DEFAULT_HEIGHT_M


def lnglat_to_xz(lng: float, lat: float) -> tuple[float, float]:
    """Local-tangent-plane projection centred on (LAT0, LNG0). +Z south."""
    x = (lng - LNG0) * MPD_LNG
    z = (LAT0 - lat) * MPD_LAT  # invert so +Z points south, matching screen-down
    return x, z


def ring_is_closed(ring: list[tuple[float, float, float]]) -> list[tuple[float, float, float]]:
    """OSM often duplicates the first node at the end. Strip the duplicate."""
    if len(ring) >= 2 and ring[0] == ring[-1]:
        return ring[:-1]
    return ring


def signed_area(ring_xz: list[tuple[float, float]]) -> float:
    """Shoelace; positive => CCW in this XZ system (where +Z is south)."""
    n = len(ring_xz)
    s = 0.0
    for i in range(n):
        x1, z1 = ring_xz[i]
        x2, z2 = ring_xz[(i + 1) % n]
        s += (x2 - x1) * (z2 + z1)
    return s / 2.0


def main() -> None:
    raw = json.loads(INPUT_PATH.read_text())
    elements = raw.get("elements", [])
    ways = [e for e in elements if e["type"] == "way"]
    rels = [e for e in elements if e["type"] == "relation"]
    print(f"input: {len(ways)} ways, {len(rels)} relations (relations skipped in v1)")

    vertices: list[float] = []   # interleaved? No — separate POSITION + NORMAL accessors
    normals: list[float] = []
    indices: list[int] = []

    kept = 0
    skipped_geom = 0
    skipped_polygon_size = 0
    height_explicit = 0
    height_from_levels = 0
    height_fallback = 0
    samples_named: list[tuple[str, float]] = []
    height_distribution: list[float] = []

    for w in ways:
        geom = w.get("geometry")
        if not geom or len(geom) < 4:
            skipped_geom += 1
            continue

        ring_lnglat = [(g["lon"], g["lat"]) for g in geom]
        ring_lnglat = ring_is_closed(ring_lnglat)
        if len(ring_lnglat) < 3:
            skipped_polygon_size += 1
            continue

        ring_xz = [lnglat_to_xz(lng, lat) for lng, lat in ring_lnglat]
        # Force CCW in the XZ plane so the top face normal points up after extrusion.
        if signed_area(ring_xz) < 0:
            ring_xz.reverse()

        tags = w.get("tags", {})
        h = parse_height(tags)
        if tags.get("height"):
            height_explicit += 1
        elif tags.get("building:levels"):
            height_from_levels += 1
        else:
            height_fallback += 1
        height_distribution.append(h)

        name = tags.get("name")
        if name and len(samples_named) < 30:
            samples_named.append((name, h))

        n = len(ring_xz)
        base = len(vertices) // 3  # index of the first vertex of this building

        # Bottom ring (y=0) then top ring (y=h). 2n vertices total per building.
        for (x, z) in ring_xz:
            vertices.extend([x, 0.0, z])
            normals.extend([0.0, -1.0, 0.0])  # bottom face normal points down
        for (x, z) in ring_xz:
            vertices.extend([x, h, z])
            normals.extend([0.0, 1.0, 0.0])   # top face normal points up

        bot = base
        top = base + n

        # Top face fan (vertices [top, top+i, top+i+1] for i in 1..n-2).
        # Reverse winding for the bottom so its normal still points down.
        for i in range(1, n - 1):
            indices.extend([top, top + i, top + i + 1])
            indices.extend([bot, bot + i + 1, bot + i])

        # Side wall — 2 triangles per edge, using its own duplicated
        # vertex pairs so normals are flat per face. For simplicity we
        # reuse the bottom+top ring vertices and accept smooth-shaded
        # walls; doubleSided=true on the material keeps both sides
        # rendering even if the winding orientation is off.
        for i in range(n):
            j = (i + 1) % n
            a, b, c, d = bot + i, bot + j, top + j, top + i
            indices.extend([a, b, c, a, c, d])

        kept += 1

    if kept == 0:
        print("ERROR: no buildings kept", file=sys.stderr)
        sys.exit(1)

    print(f"kept: {kept} buildings (skipped {skipped_geom} geom-empty, {skipped_polygon_size} <3-node)")
    print(f"heights: {height_explicit} explicit, {height_from_levels} from levels, {height_fallback} fallback@{DEFAULT_HEIGHT_M}m")
    print(f"vertices: {len(vertices) // 3}, indices: {len(indices)}")

    # ── Pack into GLB ─────────────────────────────────────────────────
    pos_bytes = struct.pack(f"<{len(vertices)}f", *vertices)
    nrm_bytes = struct.pack(f"<{len(normals)}f", *normals)
    idx_bytes = struct.pack(f"<{len(indices)}I", *indices)

    def pad4(b: bytes) -> bytes:
        n = (4 - len(b) % 4) % 4
        return b + b"\x00" * n

    pos_pad = pad4(pos_bytes)
    nrm_pad = pad4(nrm_bytes)
    idx_pad = pad4(idx_bytes)

    pos_offset = 0
    nrm_offset = pos_offset + len(pos_pad)
    idx_offset = nrm_offset + len(nrm_pad)
    bin_total = idx_offset + len(idx_pad)

    xs = vertices[0::3]
    ys = vertices[1::3]
    zs = vertices[2::3]

    gltf = {
        "asset": {"version": "2.0", "generator": "zaahi/osm-to-glb pilot"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "BusinessBayBuildings"}],
        "meshes": [{
            "name": "BusinessBay",
            "primitives": [{
                "attributes": {"POSITION": 0, "NORMAL": 1},
                "indices": 2,
                "material": 0,
            }],
        }],
        "materials": [{
            "name": "ZAAHIBuildingShell",
            "pbrMetallicRoughness": {
                # Off-white sand tone — matches ZAAHI palette without
                # competing against the ZAAHI Signature gold extrusions.
                "baseColorFactor": [0.85, 0.82, 0.78, 1.0],
                "metallicFactor": 0.05,
                "roughnessFactor": 0.85,
            },
            "doubleSided": True,
        }],
        "buffers": [{"byteLength": bin_total}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": pos_offset, "byteLength": len(pos_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": nrm_offset, "byteLength": len(nrm_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": idx_offset, "byteLength": len(idx_bytes), "target": 34963},
        ],
        "accessors": [
            {
                "bufferView": 0, "componentType": 5126, "count": len(vertices) // 3,
                "type": "VEC3",
                "min": [min(xs), min(ys), min(zs)],
                "max": [max(xs), max(ys), max(zs)],
            },
            {"bufferView": 1, "componentType": 5126, "count": len(normals) // 3, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5125, "count": len(indices), "type": "SCALAR"},
        ],
    }

    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_pad = b" " * ((4 - len(json_bytes) % 4) % 4)
    json_chunk = json_bytes + json_pad

    bin_chunk = pos_pad + nrm_pad + idx_pad

    header = struct.pack(
        "<4sII",
        b"glTF",
        2,
        12 + 8 + len(json_chunk) + 8 + len(bin_chunk),
    )
    json_hdr = struct.pack("<II", len(json_chunk), 0x4E4F534A)  # 'JSON'
    bin_hdr = struct.pack("<II", len(bin_chunk), 0x004E4942)    # 'BIN\0'

    OUTPUT_PATH.write_bytes(header + json_hdr + json_chunk + bin_hdr + bin_chunk)

    print(f"wrote: {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size / 1024:.1f} KB)")

    # ── Sidecar stats for the report ──────────────────────────────────
    heights_sorted = sorted(height_distribution)
    median = heights_sorted[len(heights_sorted) // 2]
    p90 = heights_sorted[int(len(heights_sorted) * 0.90)]
    p99 = heights_sorted[int(len(heights_sorted) * 0.99)]
    stats = {
        "input_ways": len(ways),
        "input_relations_skipped": len(rels),
        "kept": kept,
        "skipped_geom_empty": skipped_geom,
        "skipped_too_few_nodes": skipped_polygon_size,
        "height_explicit": height_explicit,
        "height_from_levels": height_from_levels,
        "height_fallback": height_fallback,
        "height_median_m": median,
        "height_p90_m": p90,
        "height_p99_m": p99,
        "height_max_m": max(height_distribution),
        "vertices": len(vertices) // 3,
        "indices": len(indices),
        "triangles": len(indices) // 3,
        "glb_kb": round(OUTPUT_PATH.stat().st_size / 1024, 1),
        "bbox": list(BBOX),
        "named_sample": samples_named,
    }
    STATS_PATH.write_text(json.dumps(stats, indent=2, ensure_ascii=False))
    print(f"stats: {STATS_PATH}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Single-building OSM extrusion — same footprint+height as the Blender
hero file but as a straight 1-tier box. Used for side-by-side
comparison: Approach 1 (OSM) vs Approach 2 (Blender hero).
"""
import json, math, struct
from pathlib import Path

OUT = Path(__file__).parent / "millennium-osm-baseline.glb"

# Same source as blender-hero — Millennium Tower, OSM way 203296254
RING_LNGLAT = [
    (55.2656183, 25.1947930),
    (55.2658937, 25.1950893),
    (55.2661356, 25.1948974),
    (55.2658676, 25.1945943),
]
HEIGHT = 285.0

lat0 = sum(p[1] for p in RING_LNGLAT) / len(RING_LNGLAT)
lng0 = sum(p[0] for p in RING_LNGLAT) / len(RING_LNGLAT)
MPD_LAT = 111_320.0
MPD_LNG = 111_320.0 * math.cos(math.radians(lat0))
# Match Blender's coords (Y up, X east, Z south so it visually aligns
# with the bulk OSM GLB convention used elsewhere in this folder).
ring_xz = [((lng - lng0) * MPD_LNG, (lat0 - lat) * MPD_LAT) for lng, lat in RING_LNGLAT]

# Bottom + top rings, fan triangulation top/bottom, 2 tris per side edge
vertices, normals, indices = [], [], []
n = len(ring_xz)
for x, z in ring_xz:
    vertices.extend([x, 0.0, z]); normals.extend([0, -1, 0])
for x, z in ring_xz:
    vertices.extend([x, HEIGHT, z]); normals.extend([0, 1, 0])

for i in range(1, n - 1):
    indices.extend([n + 0, n + i, n + i + 1])   # top fan
    indices.extend([0,     i + 1, i])           # bottom fan (reversed)
for i in range(n):
    j = (i + 1) % n
    indices.extend([i, j, n + j, i, n + j, n + i])

pos_b = struct.pack(f"<{len(vertices)}f", *vertices)
nrm_b = struct.pack(f"<{len(normals)}f",  *normals)
idx_b = struct.pack(f"<{len(indices)}I",  *indices)
def pad(b): n = (4 - len(b) % 4) % 4; return b + b"\x00" * n
pos_p, nrm_p, idx_p = pad(pos_b), pad(nrm_b), pad(idx_b)
pos_off = 0
nrm_off = pos_off + len(pos_p)
idx_off = nrm_off + len(nrm_p)
bin_total = idx_off + len(idx_p)
xs, ys, zs = vertices[0::3], vertices[1::3], vertices[2::3]

gltf = {
    "asset": {"version": "2.0", "generator": "zaahi/osm-baseline-single"},
    "scene": 0, "scenes": [{"nodes": [0]}],
    "nodes": [{"mesh": 0, "name": "MillenniumTower_OSM"}],
    "meshes": [{"name": "Millennium_OSM", "primitives": [{
        "attributes": {"POSITION": 0, "NORMAL": 1},
        "indices": 2, "material": 0,
    }]}],
    "materials": [{
        "name": "OSMBaseline",
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.55, 0.55, 0.56, 1.0],
            "metallicFactor": 0.05, "roughnessFactor": 0.8,
        },
        "doubleSided": True,
    }],
    "buffers": [{"byteLength": bin_total}],
    "bufferViews": [
        {"buffer": 0, "byteOffset": pos_off, "byteLength": len(pos_b), "target": 34962},
        {"buffer": 0, "byteOffset": nrm_off, "byteLength": len(nrm_b), "target": 34962},
        {"buffer": 0, "byteOffset": idx_off, "byteLength": len(idx_b), "target": 34963},
    ],
    "accessors": [
        {"bufferView": 0, "componentType": 5126, "count": len(vertices)//3, "type": "VEC3",
         "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]},
        {"bufferView": 1, "componentType": 5126, "count": len(normals)//3, "type": "VEC3"},
        {"bufferView": 2, "componentType": 5125, "count": len(indices), "type": "SCALAR"},
    ],
}
json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
json_pad = b" " * ((4 - len(json_bytes) % 4) % 4)
json_chunk = json_bytes + json_pad
bin_chunk  = pos_p + nrm_p + idx_p
total_len = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
header  = struct.pack("<4sII", b"glTF", 2, total_len)
j_hdr   = struct.pack("<II", len(json_chunk), 0x4E4F534A)
b_hdr   = struct.pack("<II", len(bin_chunk),  0x004E4942)
OUT.write_bytes(header + j_hdr + json_chunk + b_hdr + bin_chunk)

triangles = len(indices) // 3
print(f"wrote {OUT.name} — verts={len(vertices)//3} tris={triangles} size={OUT.stat().st_size/1024:.1f}KB")

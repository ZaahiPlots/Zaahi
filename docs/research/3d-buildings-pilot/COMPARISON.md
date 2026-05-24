# Blender Hero vs OSM Baseline — Side-by-side

**Building:** Millennium Tower, Business Bay (OSM way `203296254`, real height 285 m, 60 levels, 4-corner rectangular footprint).
**Date:** 2026-05-24
**Branch:** `research/3d-buildings-pilot`

Same source data fed through two pipelines. The Blender hero is **not** a photo-modelled facade — it is an algorithmic ZAAHI Signature 3-tier massing driven by the same footprint + height the OSM baseline uses. The difference is style, not source.

---

## Pipeline diagram

```
                                       ┌────────────────────────┐
                                       │ OSM Overpass cache      │
                                       │ business-bay-osm.json   │
                                       │ (Millennium way ID      │
                                       │  203296254 + height tag)│
                                       └────┬───────────────────┘
                                            │
                ┌───────────────────────────┴──────────────────────────┐
                │                                                       │
                ▼                                                       ▼
   ┌──────────────────────────┐               ┌────────────────────────────────────┐
   │ single-building-          │               │ Blender 5.1.2 via TCP 9876        │
   │ osm-baseline.py           │               │ blender-mcp execute_code          │
   │ (pure-stdlib python)      │               │ ZAAHI Signature 3-tier            │
   │ straight 1-tier box       │               │  podium 100% × 14 m  (dark navy)  │
   │                           │               │  body   70% × 264 m  (mid grey)   │
   │                           │               │  crown  50% ×  7 m   (gold)       │
   └────────────┬──────────────┘               └──────────────────┬─────────────────┘
                │                                                  │
                ▼                                                  ▼
   ┌──────────────────────────┐               ┌────────────────────────────────────┐
   │ millennium-osm-          │               │ blender-hero-building.glb         │
   │ baseline.glb             │               │ glTF 2.0 magic OK                  │
   │ glTF 2.0 magic OK        │               │ 3 meshes / 3 materials / 24 verts │
   │ 1 mesh / 1 mat / 8 verts │               │ 36 triangles · 4.2 KB             │
   │ 12 triangles · 1.3 KB    │               │                                    │
   └──────────────────────────┘               └────────────────────────────────────┘
```

---

## Numerical comparison

| Metric | OSM baseline (single) | Blender hero (ZAAHI Signature) | OSM bulk (all 454 BB) |
|---|---:|---:|---:|
| Source footprint | OSM way 203296254 | OSM way 203296254 | OSM ways (all `building=*` in bbox) |
| Source height | 285 m (real) | 285 m (real) | per-building OSM tag → 15 m fallback |
| Materials | 1 (off-white PBR) | 3 (podium dark / body grey / crown gold) | 1 (off-white PBR) |
| Meshes | 1 | 3 (separate per tier) | 1 (all 454 buildings merged) |
| Vertices | 8 | 24 | 8,872 |
| Triangles | 12 | 36 | 15,928 |
| File size | 1.3 KB | 4.2 KB | 395.6 KB |
| Wall-clock time | <0.1 s | ~0.37 s (Blender side) + ~2 s TCP overhead | ~2 s |
| Visual fidelity | flat 285 m box | 3 tiers stepping in (gold crown) | flat extrusion farm |
| ZAAHI brand-fit | low | **high** (matches `loadZaahiPlots` Signature output) | low |

---

## Side-by-side visual

Open `viewer.html` in a browser, then load each file via the dropdown (added in this commit):

- `millennium-osm-baseline.glb` — single tall slab, off-white. Anonymous skyscraper.
- `blender-hero-building.glb` — three nested tiers, dark podium base, mid-grey body, gold crown cap. Matches the `loadZaahiPlots` Signature look against which our 114 curated ZAAHI listings render today.

Side-by-side: visual distinction is immediate — the Blender hero reads as "designed object" where the OSM baseline reads as "data primitive."

---

## What was actually done in Blender

The session used the **MCP TCP protocol** (port 9876 on this same host, confirmed open after the founder started Blender + blender-mcp addon). One round-trip:

1. Probe — `{"type":"get_scene_info","params":{}}` returned default scene (Cube, Light, Camera). Protocol confirmed.
2. Clear — `{"type":"execute_code","params":{"code":"<delete-all>"}}` removed defaults.
3. Build + export — single `execute_code` call carrying the full massing script:
   - Projects the 4 footprint corners (lng/lat) → local metres around the building centroid.
   - Computes the three tiers per CLAUDE.md spec — `PODIUM_TOP = 14m`, `CROWN_H = 7m`, with `scaleRingFromCentroid` at 1.00 / 0.70 / 0.50.
   - Builds three `bmesh.new()` solids, links each to its own object, attaches a Principled-BSDF material with the chosen colour.
   - Parents all three under a `MillenniumTower` empty for tidy hierarchy.
   - Adds one Sun light so the .glb renders nicely if loaded into a Cesium / three.js viewer.
   - Exports via `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB')`.

The MCP responded with `status: success` + the Blender gltf-exporter's own stdout (Draco lib path, primitive count, finish time 0.103 s).

**Total elapsed in Blender:** 0.37 s.

This is critical context for what "Blender hero" actually means in this run: an algorithmic parametric massing executed in Blender — not a hand-modelled facade with photo reference. The CLAUDE.md ZAAHI Signature spec (which `loadZaahiPlots` already implements client-side via maplibre extrusions) is the same spec, just run server-side in Blender → GLB. The hand-modelled photo-facade path remains a separate ~30 min – 3 h per building workflow (different deliverable, different cost model).

---

## So — is it worth doing hero buildings in Blender?

For **photo-grade facade detail** (what the original task framing implied — Google Street View references, curtain wall patterns, lobby canopies, podium articulation): **yes, but only for ~10–15 icons** (Burj Khalifa, Address Sky View, Damac Heights, etc.). Workflow remains manual / GUI-driven. 30 min – 3 h each.

For **ZAAHI Signature 3-tier massing on top of every OSM building**: **no**, that's pure waste. The exact same algorithm runs in `loadZaahiPlots` client-side in 0 ms per building. Routing it through Blender just adds a 2 s TCP round-trip per building.

The right split:

| Category | How many | Pipeline | Why |
|---|---:|---|---|
| Bulk Dubai (all 120k buildings) | 120,000 | OSM Overpass → straight extrusion → split per-district GLB → R2 → MapLibre layer | Volume; visual baseline; cheap |
| Hero icons (manual Blender) | ~15 | Hand-model in Blender with photo refs → 30–50 k tris each → override OSM by building-id | Brand-anchor screenshots; demos; press-page hero shots |
| ZAAHI listings (our 114) | 114 | `loadZaahiPlots` runtime 3-tier extrusion (already shipping) | Foreground, gold, opacity 1, our actual listings |

The Blender route demonstrated here proves three things:

1. **The TCP MCP protocol works end-to-end on this box** — `execute_code` runs arbitrary bpy, returns stdout, exports a valid glTF 2.0 binary. Previous setup-session 2026-04-30 left this unverified; now it's verified.
2. **Algorithmic ZAAHI Signature in Blender is real-time-fast** (0.37 s per building). If we ever want to **pre-bake** all 114 ZAAHI listings as static GLBs (so the client doesn't need to compute the 3-tier extrusion on every map open), that's a viable path: ~40 s total via batch through this same protocol.
3. **The integration delta from OSM to ZAAHI Signature is purely material + tier-scale logic.** No new data acquisition needed. The OSM footprint + height fields are sufficient inputs.

---

## Recommendation

1. **Do not** route normal OSM buildings through Blender. Run the Python pipeline that already exists in `osm-to-glb.py`, ship a per-district GLB to R2, render via deck.gl ScenegraphLayer.
2. **Reserve Blender for ~15 hand-modelled hero buildings.** Founder-run sessions; bring in Sketchfab CC-BY assets where licence permits.
3. **Consider** baking each of the 114 ZAAHI Signature listings into a static GLB via the protocol demonstrated here — this avoids client-side `bmesh`-style work and lets the same GLB feed both `/parcels/map` (deck.gl) and the future Cesium 3D-city route. Estimate: ~40 s batch + GLB merging, one-off when listings change.
4. **Phase B integration** (separate task): `@deck.gl/mesh-layers` + `@deck.gl/mapbox` adapter on the existing MapLibre map, point at the per-district OSM GLBs as a togglable layer. ~8–15 hours per the earlier REPORT.md.

---

## Files added by this comparison run

| File | Size | Source |
|---|---:|---|
| `blender-hero-building.glb` | 4.2 KB | Blender 5.1.2 via MCP TCP 9876 |
| `millennium-osm-baseline.glb` | 1.3 KB | `single-building-osm-baseline.py` (pure Python) |
| `single-building-osm-baseline.py` | 5 KB | Generates the OSM baseline GLB (audit + repro) |
| `COMPARISON.md` | — | This document |

Plus the existing files from the earlier OSM bulk run are untouched (`business-bay-buildings.glb`, `osm-to-glb.py`, `REPORT.md`).

No `src/**` edits. No main push. No DB queries. No credential touches.

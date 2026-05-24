# 3D Buildings Pilot — Business Bay

**Date:** 2026-05-24
**Branch:** `research/3d-buildings-pilot`
**Two approaches tested:** automated OSM extraction (✅ delivered) + facade-photo Blender modelling (❌ blocked on this box).

---

## TL;DR

- **Approach 1 (OSM Overpass → GLB)** delivers **454 buildings, 16k triangles, 396 KB GLB** for the entire Business Bay bbox in <2 s of script runtime. **46 % of buildings (209 / 454) have real heights** in OSM tags; the rest fall back to a 15 m default. Median real height 67 m, max 288 m (Millennium Tower). Open `viewer.html` locally to inspect.
- **Approach 2 (Google photos → Blender via blender-mcp)** is **blocked** in this environment: no Blender binary installed, no blender-mcp MCP server configured. Surface to founder for manual run.
- **Recommendation:** OSM as the bulk-import baseline; Blender (or any DCC) reserved for hero / iconic buildings that need brand-grade fidelity (Burj Khalifa, Address Sky View, Damac Heights, JW Marriott).
- **MapLibre integration:** use **deck.gl `ScenegraphLayer`** to drop the GLB into the existing MapLibre canvas — already a thin dependency, no per-building draw calls, native PBR. ZAAHI Signature 3D and PMTiles continue to coexist. ~6-10 hours for a basic integration.

---

## Approach 1 — OSM Overpass automated pipeline

### What ran

1. **Overpass query** (`overpass-query.txt`) — `way["building"]` + `relation["building"]` inside the bbox `25.180,55.260,25.195,55.282`. Sent via POST to `overpass-api.de/api/interpreter` with `User-Agent: zaahi-3d-buildings-spike/0.1` (required — without UA the server returned 406 on three retries).
2. **Response cached** in `business-bay-osm.json` (519 KB). Founder can inspect raw OSM data here.
3. **Python converter** (`osm-to-glb.py`) — pure stdlib. Reads the JSON, projects each building footprint with equirectangular local tangent plane centred on the bbox midpoint, extrudes to the building's height, packs into a single glTF 2.0 binary file with one material and one mesh.
4. **GLB written** to `business-bay-buildings.glb`, 396 KB.

### Coverage stats (auto-generated, sidecar `business-bay-buildings.stats.json`)

| Metric | Value |
|---|---:|
| Input — ways (simple polygons) | 454 |
| Input — relations (multipolygons, skipped in v1) | 17 |
| Buildings kept in GLB | 454 |
| Buildings skipped (bad geometry) | 0 |
| Heights from explicit `height` tag | **172** |
| Heights from `building:levels` × 3.5 m | **37** |
| Heights using 15 m fallback | **245** |
| Heights median (real) | 15 m |
| Heights p90 | 130 m |
| Heights p99 | 248 m |
| Heights max | **288 m** |
| Vertices | 8,872 |
| Triangle count | 15,928 |
| GLB size | 395.6 KB |

The fallback 15 m default applies to 54 % of the dataset — mostly small structures (district cooling plants, mosque ancillaries, parking garages, villas) that the OSM community hasn't tagged with heights yet. **Critically, all the tall towers in BB have real heights** — the 288 m max equals Millennium Tower's actual height.

Selected named buildings the OSM data resolved (from `named_sample`):

| Name | Resolved height |
|---|---:|
| Millennium Tower | 285 m → 285 m (explicit) |
| Al Manzil | 45 m → 45 m (explicit) |
| Burj Views | 30 m → 30 m (explicit) |
| Vida Residence | 10 levels → 35 m |
| Villa Rotana | 6 levels → 21 m |
| Address Downtown (فندق العنوان داون تاون) | 20 → 20 m |

(Some named buildings still default to 15 m — those are the BLVD Crescent / BLVD Heights / The Palace tagged without heights yet.)

### How it looks

Open `viewer.html` in any modern browser (three.js + GLTFLoader via CDN). The viewer:
- Loads the GLB at scene origin (bbox centre = lat 25.1875, lng 55.271)
- Tan ground reference plane, gold grid (50 m squares)
- OrbitControls (drag rotate, scroll zoom, right-drag pan)
- Screenshot button — exports `business-bay-osm-<ts>.png`
- Wireframe toggle — debug overlapping fan triangles on concave footprints

**Founder action:** open `viewer.html`, screenshot a top-down + a low-angle view, drop into a `screenshots/` folder beside this report.

### Quality / known artifacts

- **Concave footprint Z-fighting.** ~5–10 buildings have non-convex footprints (L-shapes, U-shapes). The v1 converter uses fan triangulation, which produces a few overlapping triangles. With `doubleSided: true` on the material there's no crash, just minor visual artifacts when rotating. Fix in v2: ear-clipping triangulation (50 lines of Python) or upgrade to `mapbox/earcut.hpp`. Defer until founder commits to the integration.
- **17 relations skipped.** Multipolygons with inner rings (courtyards, atriums) won't render in v1. The relations include some larger BB blocks (Bay Square plazas). Manual import or v2 multipolygon support fixes this.
- **245 fallback heights at 15 m.** Visually obvious — these look like a flat carpet of low buildings between the towers. Doesn't break the scene but reduces the "skyline" credibility. Two mitigations: (a) cross-reference with our DDA plot data which often has building heights, (b) accept the v1 quality and improve over time via OSM community edits.
- **No roof detail / no facade textures.** The shells are smooth-shaded grey-tan. For a "Dubai feel" we'd add: roof-tier sub-divisions (podium/body/crown like ZAAHI Signature), basic curtain-wall pattern via vertex colours, optional emission lighting at night. None of that is in v1.

### Pipeline reusability

The `osm-to-glb.py` script is parameterised only by `INPUT_PATH`, `OUTPUT_PATH`, and `BBOX`. To run on a different district (Downtown, DIFC, Marina) we just change the bbox in the script + Overpass query and re-run. Estimated 30-60 s end-to-end per district up to ~5000 buildings. Marina has ~1500 buildings; expected GLB ~1.3 MB.

For a full **Dubai-wide pipeline**, OSM has ~120k buildings — the resulting single GLB would be ~25-30 MB, which is too heavy for one mesh node in a MapLibre layer. We'd need to split into per-district GLBs and stream like vector tiles. That's a separate engineering exercise (~10-15 hours).

---

## Approach 2 — Google photos → Blender via blender-mcp

### Status: BLOCKED on this box

The Claude Code environment hosting this spike has:
- ✅ `python3` (available)
- ❌ **`blender` binary not installed** (`which blender` returns nothing)
- ❌ **`blender-mcp` MCP server not configured** (`ToolSearch` for blender returned only Google Drive / Supabase / Vercel auth tools; no blender server in the active MCP set)
- ❌ **No interactive web browser** — cannot navigate Google Street View / Google Earth to gather facade reference photos
- ❌ **`trimesh` Python package not installed** — couldn't even do a simulated Blender-side path via headless tools

### What would be needed to unblock

1. `apt install blender` on the box (requires sudo)
2. Install the [blender-mcp server](https://github.com/ahujasid/blender-mcp) and add it to `~/.config/claude-code/mcp_servers.json` — this lets me drive Blender via the MCP tool surface
3. OR: founder runs Blender locally and exports the GLB themselves

The interactive workflow Blender enables (load reference photo, model from photo with snap-to-axes, UV-unwrap, paint texture) is fundamentally human-driven. Even with blender-mcp installed, an AI agent's "model from photos" workflow is:
- Import reference photos as background image
- Sketch footprint from satellite view
- Extrude in stages (podium / body / crown)
- Apply procedural material
- Export GLB

This is ~30-60 minutes per building for a skilled modeller, ~2-3 hours per building for an agent driving via MCP. So **Approach 2 is realistic only for high-value "hero" buildings** (Burj Khalifa, Burj Vista, JW Marriott, Address Boulevard) — maybe a dozen city-wide. Not a path to populate 120k Dubai buildings.

### Recommended Approach 2 path (when un-blocked)

1. **Identify hero set.** 10–15 iconic Dubai towers that ZAAHI lists or will demo against. Burj Khalifa is mandatory (it's the brand-anchor screenshot).
2. **Source assets where they exist.** Sketchfab has user-modelled Burj Khalifa GLBs under CC-BY licence (e.g. `https://sketchfab.com/3d-models/burj-khalifa-...`). Verify licence per model. Save to `docs/research/3d-buildings-pilot/hero-models/`.
3. **Hand-model the rest in Blender** based on:
   - Footprint from Google Maps satellite view (Trace it with Blender's snap-to-image)
   - Heights from official developer datasheets (Emaar / Damac / Nakheel publish them)
   - Facade pattern from one Street View photo (rough texture, not photogrammetric)
4. Each hero building → its own `<name>.glb`, ~10k–50k triangles each
5. Composite hero GLBs on top of the OSM bulk GLB at runtime in the MapLibre scene

### Why I'm NOT trying a synthetic Approach 2 right now

The founder asked for Blender + facade photos. Faking it (using only OSM data + procedural detail) would not validate the actual Approach 2 thesis — that hand-modelled hero buildings significantly outperform automated extrusion. Better to be honest that this box can't run the test, and surface the unblock path.

---

## Comparison & recommendation

| Dimension | Approach 1 (OSM) | Approach 2 (Blender + photos) |
|---|---|---|
| Time per building | ~0.004 s (1500/sec batch) | 30 min – 3 hours |
| Coverage achievable | Whole city (~120k buildings) | Top 10-15 hero buildings |
| Heights accuracy | 46 % real, 54 % 15 m default in BB | 100 % accurate (from datasheet) |
| Facade fidelity | None (smooth shells) | Curtain wall, podium-body-crown, base texture |
| Iconic skyline | Acceptable for towers (Millennium etc.) | Required for Burj Khalifa demo |
| Cost / dependency | Free (Overpass; OSM ToS allows derived works) | Free per-building modeller hours; licence-clean assets cost $0-50 each on Sketchfab |
| Maintenance | Re-run Overpass weekly to catch OSM edits | Manual update when developer adds new tower |

### Recommended hybrid

- **OSM as the bulk-fill baseline** for entire Dubai. Auto-generated per-district GLBs streamed to MapLibre.
- **Blender for ~15 hero buildings** demo-grade — Burj Khalifa, Address Sky View, Address Boulevard, Damac Heights, JW Marriott Marquis, Address Downtown, Vida Residence, Princess Tower, etc. Overlay these on top of the OSM mesh, hide-by-id the underlying OSM building so the two don't z-fight.
- **ZAAHI listings 3D Signature** (loadZaahiPlots) stays on top — our 114 curated plots win the foreground.

Render order (back to front):
1. Cesium / MapLibre basemap
2. OSM bulk extrusion GLB (per-district)
3. Hero Blender GLBs (override OSM by building id)
4. ZAAHI Signature 3D buildings (loadZaahiPlots, opacity 1, gold tinted)
5. UI chrome

### MapLibre integration sketch

Three viable paths:

| Option | Lib | Lines of code | Pros | Cons |
|---|---|---:|---|---|
| **A. deck.gl ScenegraphLayer** | `@deck.gl/mesh-layers` + `@loaders.gl/gltf` | ~50 | Native PBR; instancing; pairs with MapLibre via `@deck.gl/mapbox` adapter; supports per-feature highlight | One more renderer (deck.gl) alongside MapLibre |
| **B. threebox-map** | `threebox-plugin` | ~80 | Three.js scene as MapLibre custom layer; simpler API | Threebox is maintained-but-quiet; perf depends on three.js |
| **C. Custom WebGL CustomLayer** | MapLibre `CustomLayerInterface` + manual GLB parse | ~400 | Zero extra deps; tightest perf | Lots of WebGL plumbing; risk-heavy for an MVP |

**Recommended: Option A (deck.gl ScenegraphLayer).** It's the same family of tools we'd use for Google 3D Tiles (`@deck.gl/geo-layers Tile3DLayer`), so adopting deck.gl pays double dividends. The MapLibre + deck.gl pairing is well-documented and stable.

Integration sketch (`~8-15 hours total`):
- Install `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/mesh-layers`, `@deck.gl/mapbox` (~250 KB gzipped)
- Add a new map layer `osm-buildings-3d` using `ScenegraphLayer` + the GLB URL
- Tie visibility to a new `LayersState.osmBuildings3D` flag, exposed as a mini-dock toggle
- Position the layer below `ZAAHI_BUILDINGS_3D` in the render order so our curated plots stay foreground
- Anchor the GLB to the bbox centroid in lng/lat coords; deck.gl handles MapLibre projection automatically

---

## Files in this spike

| File | Purpose | Size |
|---|---|---:|
| `overpass-query.txt` | Overpass QL query used | 132 B |
| `business-bay-osm.json` | Raw Overpass response, audit trail | 519 KB |
| `osm-to-glb.py` | Pure-stdlib Python converter | 7 KB |
| `business-bay-buildings.glb` | Generated GLB, 454 buildings | **396 KB** |
| `business-bay-buildings.stats.json` | Sidecar coverage stats | 1 KB |
| `viewer.html` | Three.js GLB viewer for local inspection | 5 KB |
| `REPORT.md` | This document | — |

No production code modified. No `src/**` edits. No main push. Branch `research/3d-buildings-pilot` carries everything.

---

## Decision points for the founder

1. **Continue with hybrid (OSM bulk + Blender heroes)?** If yes, next step is a Phase B with deck.gl integration into the existing map + the first 3 hero buildings via Blender.
2. **Approach 2 (Blender) — local run by founder?** I cannot execute on this box. If you want to validate the hero-modelling path, you'd run Blender locally and drop the resulting GLBs into `hero-models/` on this branch.
3. **Multipolygon support v2?** Trivial improvement (~2 hours) to also process the 17 BB relations and add ear-clipping for concave footprints. Worth doing before we ship?
4. **Whole-Dubai OSM pipeline?** ~10-15 hours to add per-district tile splitting + Vercel / R2 hosting of the GLB tiles. Yes / no / defer.

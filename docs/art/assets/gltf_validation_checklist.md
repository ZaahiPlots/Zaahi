# ZAAHI glTF delivery — validation checklist

Companion to `docs/art/ARTIST_PLAYBOOK.md` §5.9. Every building delivery passes every check on this page before the `.glb` lands in `public/models/` and gets a `Building` row.

Print this. Tick each box. Missing ticks = delivery rejected.

---

## Pre-flight (artist-side before sending)

### Structure

- [ ] File extension is **`.glb`** (not `.gltf`, not `.gltf+bin`).
- [ ] File name follows the convention **`<slug-or-plotnumber>_lod<N>.glb`** — lowercase, hyphen-separated, with `_lod3` (or the target LOD) suffix.
- [ ] File size is within LOD budget: LOD3 ≤ 500 KB (hard ceiling 2 MB), LOD2 ≤ 2 MB, LOD1 ≤ 8 MB.
- [ ] Companion `<slug>_meta.json` present, all required fields filled.
- [ ] Optional `<slug>_footprint.geojson` present if the building's polygon is available.

### Khronos glTF Validator — zero errors

Open [github.khronos.org/glTF-Validator](https://github.khronos.org/glTF-Validator/). Drag the `.glb` in (files are processed locally in the browser — nothing is uploaded).

- [ ] **Errors: 0**
- [ ] Any **warnings** are copied into `<slug>_meta.json → validator.warnings[]` with one-line explanation each.
- [ ] Asset version reads "2.0".
- [ ] Asset generator field is populated (tool + version).

### gltf.report — sanity inspection

Open [gltf.report](https://gltf.report/). Drop the `.glb`.

- [ ] Vertex count matches the `<slug>_meta.json → vertices` field (± 5 %).
- [ ] Triangle count matches `triangles` field (± 5 %).
- [ ] Material count matches `materials[]` length.
- [ ] Every texture in the Textures panel shows a valid preview thumbnail (no "image URI not resolved" errors → textures embedded correctly).
- [ ] Bounding box size matches `bbox_m` within 2 % on each axis.

### Khronos glTF Sample Viewer — render inspection

Open [github.khronos.org/glTF-Sample-Viewer-Release](https://github.khronos.org/glTF-Sample-Viewer-Release/). Drop the `.glb`.

- [ ] Building renders with all materials visible (no pink = missing-material fallback).
- [ ] No black triangles (normal direction correct).
- [ ] No z-fighting artifacts (two faces at the same depth visibly flickering).
- [ ] Materials respond plausibly to the environment light rotation (metals should reflect the HDR environment; mattes should not).
- [ ] Scale — switch to the "Grid" helper; each grid cell is 1 metre. Building height in cells should match the real building's storey-count × 3.5 m (± 10 %).
- [ ] No intrusive animations playing (if animations exist, they should be static or removed).

### Geometry

- [ ] Vertex count ≤ LOD budget (LOD3 ≤ 10k verts target; hard ceiling 50k for LOD3).
- [ ] No stray objects far from the main geometry (stray verts at the scene origin from mirror modifiers, dropped dummy objects, etc.).
- [ ] Origin within ~10 m of the geometry's bbox centre.
- [ ] Building base (bbox-min-Y) sits at or just above Y=0 (ground plane).
- [ ] Up axis: +Y (glTF convention).
- [ ] Forward axis: +Z (façade faces +Z).

### Materials

- [ ] Material count ≤ 15 (target 5–10 per building).
- [ ] Every material uses the Principled BSDF / Physical Material shader (not an engine-specific or legacy shader).
- [ ] `metallicFactor` values are either 0 or 1 (not intermediate, except at texture bilerp edges).
- [ ] `roughnessFactor` values are in [0.05, 0.95].
- [ ] `baseColorFactor` values are in [0.04, 0.95] per channel (real architectural surfaces rarely hit pure black or pure white).
- [ ] `alphaMode` is OPAQUE unless the material is real glass (§3.4 in playbook).
- [ ] `doubleSided` is false unless the material covers genuinely thin geometry.

### Textures

- [ ] All textures embedded in the `.glb` (no external URIs).
- [ ] Texture resolutions per §3.3 budget (default 2048², smaller for small buildings, 4096² only for landmarks).
- [ ] Normal maps use OpenGL convention (+Y up in tangent space) — green channel is NOT inverted.
- [ ] No duplicate textures (same image used by multiple materials should be one texture, referenced N times).

### Metadata

- [ ] `<slug>_meta.json` present.
- [ ] All required fields: `name`, `deliveryVersion`, `deliveredAt`, `artist`, `sourceTool`, `units`, `forwardAxis`, `upAxis`, `bbox_m`, `vertices`, `triangles`, `materials`, `textures`, `validator`.
- [ ] Validator status is `"pass"` or contains explicit warnings list.
- [ ] Notes field explains any intentional deviation from defaults (e.g. "PATTERN material baseColor intentionally black — artist design choice" as V2 shipped).

---

## Engineering-side checks (ZAAHI agent / engineer)

After the artist delivers. If any fail, bounce back with specific reference to the playbook section.

- [ ] All pre-flight boxes ticked by artist.
- [ ] File opens in local Three.js via `GLTFLoader` (quick sanity load in a dev script).
- [ ] Building renders on `/parcels/map` at the correct coordinates — tower visible, right scale, right orientation.
- [ ] Pin click opens the `BuildingCard` — full integration test.
- [ ] No framebuffer warnings in the browser console during render (regression check against the 2026-04-24 FBO fix).
- [ ] File size after `gltf-transform optimize` post-processing is within final budget.
- [ ] `Building` row in Postgres created (append-only) or updated with `modelPath`, `scaleFactor`, `rotationDeg`, `modelProvider` fields per §5.6 of the playbook.
- [ ] Seed script (`scripts/seed-<slug>.ts`) kept as a permanent record of the ingestion, even after the row is created.

---

## Failure reference

If any single check fails, the artist's delivery goes back with a specific reference. Example rejection:

> Rejected. §5.2 violation: file ships in cm (bbox-Y = 11172) but `<slug>_meta.json → units` says "meters". Re-export with scene units set to metres and re-send. Alternatively, engineering can set `Building.scaleFactor = 0.01` if you prefer to keep cm — confirm preference in your reply.

Clear, actionable, referenced to a spec section. This document is the spec.

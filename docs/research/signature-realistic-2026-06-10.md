# ZAAHI Signature — realistic facades research

**Date:** 2026-06-10
**Phase:** A (technical recon + visual prototype)
**Status:** Read-only research. `src/` not touched. Prototype lives outside the repo at `/home/zaahi/scratch/signature-realistic/`.
**Meshy credits spent:** 0 (200 / 200 balance unchanged — Meshy is the wrong tool, see §3).

---

## TL;DR

- Current Signature renders through MapLibre `fill-extrusion` — a single solid colour per feature, 1-3 features per parcel (podium/body/crown). No textures, no windows, no PBR. Looks like clay at street zoom.
- Realistic facades **require leaving `fill-extrusion`** entirely and going to a custom Three.js mesh layer (MapLibre `CustomLayer` or deck.gl `SimpleMeshLayer`).
- I built a standalone Three.js prototype that reproduces the Signature math exactly (footprint → setback → podium/body/crown taper) and replaces the flat colour with a **procedural fragment shader** that paints windows / banding / balconies / corrugation tiled in world units. Per-category material profiles for residential / commercial / mixed-use / hotel / industrial. Dark background matches prod.
- **Meshy is NOT the right source** for tiling facade textures. Its `text-to-texture` endpoint is for re-skinning a specific GLB, not for generating seamless tileable PBR sets. Honest alternatives — procedural shader (used in the prototype), ambientCG / Polyhaven CC0 libraries, or hybrid — are cheaper and more controllable.
- **Verdict: achievable, with caveats.** ≈ 8-12 engineer-days from prototype to production parity (custom-layer integration + interaction parity + perf tuning + emirate-aware extensions). Performance for the current 132 ZAAHI plots is trivial; the question is whether we also want the 461K PMTiles registry rendered this way (different question, different answer — see §6).

---

## 1. Current Signature rendering — exact inventory

### 1.1 Tech stack today

- **Layer:** `ZAAHI_BUILDINGS_3D` (`page.tsx:257`) — single MapLibre `fill-extrusion` layer.
- **Source:** GeoJSON FeatureCollection, one feature per *tier* (podium / body / crown). Floor count drives how many features the loader creates.
- **Paint:** `fill-extrusion-color: ["get","color"]`, `fill-extrusion-height: ["get","height"]`, `fill-extrusion-base: ["get","base"]`, `fill-extrusion-opacity: 1` (`page.tsx:3573-3580`). MapLibre's default `vertical-gradient: true` gives a faint shading on the sides — that's the only "lighting" the buildings get.
- **Selection paint:** the click handler swaps `fill-extrusion-color` to a brightness-boosted version of the same hex (`page.tsx:411-419`). Same flat colour, just brighter.

### 1.2 The Signature math

| Function | File:line | Job |
|---|---|---|
| `computeSetbackM(plotSqft, landUse, setbacks, sub)` | `page.tsx:3131-3149` | Reads AffectionPlan setbacks if present (avg of non-zero `building`/`podium` values), else `defaultSetbackM(landUse, sub)`. Tiny plots (`plotSqft < 5000`) bypass with setback 0. |
| `insetRingByMeters(ring, setbackM)` | `page.tsx:3157-3176` | Uniform centroid-inset. Converts metres → degree shrink via `111000 × cos(lat)` for lng, `111000` for lat. Floor of 0.5 scale so tiny plots stay visible. |
| `scaleRingFromCentroid(ring, scale)` | `page.tsx:3383-3390` (closure inside `loadZaahiPlots`) | Used for body (0.7×) and crown (0.5×) taper. |
| Tier composer (closure) | `page.tsx:3425-3444` | `forceFlat` for FUTURE_DEVELOPMENT / buildingStyle="FLAT"; else: ≤4 floors → 1 tier, 5-10 → 2 tiers, ≥11 → 3 tiers. |
| Constants | `page.tsx:3377-3380` | `FLOOR_H = 3.5`, `PODIUM_TOP = 14`, `CROWN_H = 7`, `floors = round(totalH / FLOOR_H)`. |

### 1.3 What MapLibre `fill-extrusion` can NOT do

- Per-face textures (only flat colour per feature)
- Window patterns / banding / spandrel / balcony details
- True PBR (no metalness, no roughness, no normal map)
- Real glass (reflection / refraction)
- Cast shadows from buildings onto buildings / ground (sun-time slider currently shades the side via `useSunLight`, but no cast shadows — see backlog #25)

These are exactly the visual gaps the founder is calling out.

---

## 2. Proposed path — custom Three.js layer + procedural facade

### 2.1 Architecture

```
MapLibre map
 └── CustomLayer (THREE.WebGLRenderer)
      ├── Per-parcel: InstancedMesh OR per-mesh ExtrudeGeometry
      ├── Material: ShaderMaterial with category-tagged fragment shader
      │   - input: building-local UVs derived from world position
      │   - output: base panel + windows + balconies + spandrel + sun lift
      └── Shared light rig (sun direction = MapLibre sun simulation)
```

- **MapLibre CustomLayer** (`addLayer({type:"custom", render:gl,matrix=>{...}})`) lets a Three.js scene render at any zoom, syncing the projection matrix every frame.
- **Deck.gl alternative**: `SimpleMeshLayer` (already in stack for hero buildings via `MapboxOverlay`) accepts per-instance geometry + per-instance attributes. Cleaner integration if we go instanced. Memory `feedback_glb_hero_tuning.md` says deck.gl rotation isn't plain Y-up; we'd handle the conversion once.
- **Geometry generation**: keep the exact ring math from prod (porting `computeSetbackM` / `insetRingByMeters` / `scaleRingFromCentroid` to a TypeScript module is mechanical). For each parcel, the loader emits 1-3 `ExtrudeGeometry`s OR a single merged mesh with a `tierIndex` attribute.
- **Material**: a single `ShaderMaterial` per category (5 today, 9 if we extend) with uniforms for base / window / sill / accent / floor-height. Vertex shader passes world-space position; fragment shader computes windows tile.

### 2.2 What I built in the prototype

`/home/zaahi/scratch/signature-realistic/index.html` — single-file Three.js prototype, no build step, opens directly in any modern browser.

**What it does:**
1. Pulls 5 real plot polygons from prod (`scripts/_pick-footprints.mjs`, read-only). One representative per shape class:
   - **rectangular** · plot 6457940 · MAJAN · 70×63 m · 5 vertices · concavity 0.000 · *residential 3-floor*
   - **narrow** · plot 6455974 · MAJAN · 70×141 m · 12 vertices · concavity 0.000 · *commercial 15-floor*
   - **L-shape** · plot 6453982 · LIVING LEGENDS · 100×92 m · 16 vertices · concavity 0.243 · *mixed-use 8-floor*
   - **tiny** · plot 3261099 · SAMA AL JADAF · 37×34 m · 11 vertices · concavity 0.011 · *hotel 5-floor*
   - **huge** · plot 5310951 · DUBAI WHOLESALE CITY · 1857×1483 m · 18 vertices · concavity 0.003 · *industrial 2-floor (this one's a district-sized outline; included to stress-test setback math at scale)*
2. Same Signature math, ported to JS. Same setback per-category default. Same 0.7×/0.5× ring scale rule for body/crown.
3. Each tier rendered as a `THREE.ExtrudeGeometry` from the polygon ring.
4. Material per category:
   - **Residential** — warm beige base, dark windows, wider columns (4 m), prominent balcony band at floor base
   - **Commercial** — navy panel, blue-glass windows, narrower columns (2.8 m), dark spandrel between floors
   - **Mixed-use** — purple base; lower 4 floors render commercial pattern, upper floors residential
   - **Hotel** — orange base, wide ribbon windows (4 m columns), accent balcony band every floor
   - **Industrial** — slate grey, corrugated vertical ribs at 60 cm pitch, sparse small windows in upper third only
5. Dark background `#0a1422` matching prod.
6. Hemisphere + directional + ambient three-light rig. South-facing faces get a subtle sun lift in the shader.
7. Orbit camera per card, ~45° initial pitch.
8. "Download all PNGs" button captures 10 frames (5 plots × 2 angles).

**How to view:** open `/home/zaahi/scratch/signature-realistic/index.html` directly in Firefox or Chrome (footprints inlined — no http.server required). Drag any card to orbit, scroll to zoom, click "Auto-rotate" for cinematic. Click "Download all PNGs" to dump screenshots; once received, drop them into `docs/research/signature-realistic-shots/` for permanent reference.

### 2.3 Why I couldn't auto-snapshot from the headless side

I tried `firefox --headless --screenshot=… file://…` — fails twice:
1. The dev box already has a regular Firefox profile open elsewhere; the headless invocation hits "Firefox is already running" until you point it at a separate profile.
2. With `--profile /tmp/ff-profile-sig --no-remote`, the headless instance does launch but Firefox's headless mode does NOT initialise a real WebGL context — the screenshot comes out blank. (Known limitation; Chromium handles this better but isn't installed.)

Acceptable result: the founder runs the HTML in a real browser, hits Download, and the resulting PNGs land in the docs folder. The prototype's purpose is to confirm the visual direction is the right one to invest in — that's an eyeball test.

---

## 3. Meshy — honest verdict for this job

### 3.1 What Meshy is good at

Per `MESHY_PIPELINE_GUIDE.md` (in repo) + 10+ pilot runs:
- `multi-image-to-3d`: rebuilds a specific real building (Burj Khalifa, Atlantis, etc) from 4 photos. **Good for hero landmarks.**
- `text-to-3d`: builds a one-off mesh from a description. Variable quality, biased toward generic shapes. Good for *archetypes* (a hotel, a warehouse) as one-off models.
- `text-to-texture`: takes a GLB you upload and paints it with a generated texture matching a prompt.

### 3.2 What we actually need

**Tileable, seamless PBR sets** that wrap any building face procedurally:
- Albedo (base color) — periodic across `floor_h × column_w` cells
- Normal map (sill / mullion micro-relief)
- Roughness (glass = low, panel = mid)
- Metallic (glass / steel banding)
- Window depth / spandrel cutouts

These are NOT properties of one building — they're material libraries.

### 3.3 Meshy doesn't fit

- `text-to-texture` only works ON an uploaded mesh. The output texture conforms to that mesh's UV layout. It is **not seamless / not tileable** — borders mismatch when you try to repeat it.
- Even if we pass a "demo 1×1 m flat plane" to Meshy and ask "modern glass facade with windows", the output is a one-shot texture on that plane's UV, not a periodic pattern. We could extract a snippet and force-tile it, but seam artefacts at the edge make it visibly fake.
- `text-to-3d` could produce a 1-floor-1-column "facade panel" model that we instance — but at that point we're re-inventing what a proper material shader does in ten lines of GLSL.

### 3.4 Better sources

| Source | Cost | What it gives | When to use |
|---|---|---|---|
| **Procedural shader** (what the prototype uses) | $0 | Infinite tileable variation, perfect at any zoom, animatable | Default. Already proves the concept. |
| **ambientCG.com** | $0 (CC0) | High-quality PBR sets: "Glass Facade", "Concrete Wall", "Brick Modern" | When founder wants a specific real-world material match (e.g. "we want it to look like Dubai office block 2023") |
| **Polyhaven.com** | $0 (CC0) | Smaller library but higher quality where it covers | Complement to ambientCG |
| **Textures.com** | Paid | Specific Dubai facades | Only if CC0 sources don't cover the look |
| **Custom 3D scan** | $$$ | One-off bespoke material | Marketing hero shots only |

Honest recommendation: **start with the procedural shader prototype** (already done), iterate the look with founder, optionally pull 3-4 ambientCG sets (glass, concrete, brick, metal) and blend them in for marketing-quality variation. Skip Meshy.

---

## 4. Performance — 100+ buildings, custom layer, realistic facades

### 4.1 Current state (fill-extrusion)

- 132 ZAAHI parcels × 1-3 tiers each ≈ **250 features** in `ZAAHI_BUILDINGS_3D`.
- MapLibre `fill-extrusion` is highly optimised (single draw call per layer, GPU rasterisation). Locks ~ 1-2 ms per frame on a mid-tier laptop.
- Memory: ~2 MB for the GeoJSON source.

### 4.2 With custom Three.js layer + procedural shader

- 250 geometries (or 132 if we merge tiers). Each is an `ExtrudeGeometry` with ~50-300 triangles for typical 5-15 vertex rings. Total ≈ 30-50K triangles.
- Single `ShaderMaterial` per category → 5 draw calls max (one per material), if we group meshes by category. Without grouping, 132-250 draw calls (still fine on desktop, may stutter on mid-tier mobile).
- Procedural shader: ~30 ALU ops per fragment. Modern GPUs eat it.
- Expected frame budget: 3-6 ms on desktop, 8-15 ms on mid-tier mobile. **Still 60 fps.**

### 4.3 Where it gets uncomfortable

- **All 461K PMTiles plots rendered this way?** Hard no without massive engineering. PMTiles vector tiles are already optimised for that volume; replicating Three.js extrusions would mean range-fetching tiles + spawning thousands of geometries at high zoom. Different problem.
- **All AD ADM 362K plots?** Same — keep them as raw `fill-extrusion` (current behaviour) and only the curated ZAAHI listings use the rich Three.js layer.
- **Sun shadows** (founder backlog #25) — adding `mesh.castShadow + receiveShadow` requires a shadow map pass. Doable for ~250 listings; not doable for 461K plots.

### 4.4 Bottom line on perf

For the **132 (today) → 1,000 (year-from-now) curated ZAAHI listings**, realistic facades through a Three.js custom layer is **definitively fine**. Mobile we'd profile-tune (LOD: fall back to fill-extrusion at zoom < 15). Background PMTiles registry stays on fill-extrusion forever; no need to touch it.

---

## 5. Effort estimate to production

| Step | Effort | Notes |
|---|---|---|
| Port Signature math to a shared TS module | 0.5 d | extract from page.tsx `loadZaahiPlots` |
| `CustomLayer` integration: Three.js renderer + view-matrix wire-up | 1 d | follow MapLibre custom-layer docs |
| Geometry generator (`buildSignatureMeshes(parcels) → Mesh[]`) | 1 d | port + UV layout fixes |
| 5 procedural shader programs (residential / commercial / mixed / hotel / industrial) | 2 d | already prototyped; production-polish + finalise per-category constants with founder |
| Material polish for the 4 remaining categories (educational / healthcare / agricultural / future-dev) | 1 d | reuse fragment shader templates |
| Selection paint integration (gold halo + brightness bump) | 0.5 d | reproduce the prod onClick effect |
| Filter / status / vault parity (so the new layer respects `filter_by_*` tools and `vaultOnly` mode) | 1 d | replicate `setFilter` logic |
| Perf tuning + mobile LOD | 1 d | profile, group meshes by category, fall back to fill-extrusion at low zoom |
| Optional: sun shadows | 1.5 d | depth-pass shadow map; consult against backlog #25 |
| QA + bug-fixes | 1.5 d | hover/click/JV/conflict-marker parity |

**Total: ~8 engineer-days minimum, ~12 if shadows + edge cases all land.** Realistic calendar: **2 weeks** including code review + iteration with founder on look.

After ship: any new category just needs a 30-line shader variant. No retraining, no asset downloads, no Meshy retours.

---

## 6. Risks / caveats

1. **WebGL2 baseline.** The prototype assumes WebGL2. Old Safari iOS (<15) and ancient Android are WebGL1-only. Fragment-shader features used (`fract`, `step`, `smoothstep`) are fine in WebGL1, so portability is not the issue — but performance on iOS 10-year-old hardware will be poor. Honest answer: anyone running Chrome / Safari from the last 4 years is fine.
2. **Selection / hover already works on `fill-extrusion`** via `setFilter` + `setPaintProperty`. With a custom layer we have to reimplement that ourselves (uniform updates on click). Not hard, but it's a chunk of behaviour to mirror.
3. **Sun-time slider (#25 in backlog)** — current `useSunLight` updates MapLibre's directional light. Our custom layer needs to consume the same parameter; otherwise shading on the buildings diverges from the rest of the map at sunrise/sunset.
4. **The "huge" 1.8 km wide plot** — Wholesale City row in the prototype — is technically not a building plot, it's a district-level outline. Setback math still produces a sane inset (the inset cap kicks in at scale = 0.5). The visual is a flat box on a kilometre-wide footprint, which is honest: at that scale you should be looking at the master plan, not the "building". No code change needed; just a reminder that big rows in our DB are still actually districts.
5. **Realism is a moving target.** Procedural windows look great at z14-z17. At z18+ they start to feel game-like (too regular). A second-pass refinement would add subtle per-cell jitter, occasional lit windows, AC condenser specks — small fragment-shader tweaks.

---

## 7. What's in `/home/zaahi/scratch/signature-realistic/`

```
signature-realistic/
├── index.html      ← Three.js standalone prototype, footprints inlined
└── footprints.json ← the 5 real plot polygons (also embedded in index.html)
```

**How to run:**
1. Open `index.html` directly in Firefox / Chrome (`file://` works; footprints are inlined).
2. Drag any card to orbit, scroll to zoom.
3. Click **Download all PNGs** to capture 10 frames (5 plots × 2 angles SW + NE). They save to your Downloads folder; move them into `docs/research/signature-realistic-shots/` for archive.
4. Click **Auto-rotate** for a cinematic.

**What to evaluate:**
- Does the residential card feel like a Dubai residential building? (windows pitch + balcony band)
- Is the commercial blue-glass too saturated, or about right?
- Does the L-shape parcel look right with the taper? (the taper happens around the shape's centroid; concave shapes show the body shifted)
- Is the industrial corrugation legible at the card's render scale?
- Does the dark sky background match the prod map enough for the comparison to feel real?

---

## 8. Credits ledger

- Meshy: 0 spent / 200 balance. No API calls made in this phase.
- All prototype code: handwritten GLSL + Three.js.
- DB queries: read-only `SELECT` against prod for 5 parcels.

---

## 9. Decision needed (founder)

Three options:

- **A. Go (the path proposed here).** Worth 2 calendar weeks of engineering for a major visual upgrade. Touches the rendering layer materially — small risk of breaking hover / click / filter / vault parity during the swap. Phase the rollout (custom layer for ZAAHI listings only; PMTiles registry stays fill-extrusion).
- **B. Hybrid: keep fill-extrusion, add stylised lighting + a sparse window overlay.** Cheaper (~3 days). Won't look as good but won't touch the renderer's heart. Founder may find this enough for a marketing-level uplift.
- **C. Hold.** The current Signature shipped 2026-04-12 and was founder-approved as the platform's signature look. If the prototype convinces nobody that there's a meaningful upgrade, no change is the right call.

After eyeballing the prototype the founder picks A / B / C; if A, I produce a phased build plan with milestones for the 8-12 days.

---

## 10. Investigation log — STAGES 1-5 (2026-06-11 / 12)

Founder ratified Plan A on 2026-06-11. Implementation followed on `feat/signature-realistic`. Reached a working pipeline end-to-end for STAGES 1-3, blocked on rendering issues at STAGE 4-5. **Investigation paused 2026-06-12** with the symptom narrowed to *broken CustomLayer camera sync* (even a control debug cube fails to render). Branch is preserved as-is; nothing merged to `main`.

### What shipped (and is preserved on the branch)

| Stage | Commit | What landed |
|---|---|---|
| 1 | `746cc74` | `src/lib/signature/geometry.ts` — port of `computeSetbackM` / `insetRingByMeters` / `scaleRingFromCentroid` / `emitSignatureTiers` from `page.tsx` into a shared module, with a 10-case parity script (`scripts/_signature-parity.mjs`) proving byte-identical setback metres + footprint ring + tier list. Vault path (`src/lib/zaahi-3d-tiers.ts`) intentionally left untouched. |
| 2 | `7562866` | `src/lib/signature/three-layer.ts` — MapLibre `CustomLayer` + Three.js scene attached to the shared GL context. `?render=three` URL flag in `page.tsx` toggles fill-extrusion opacity to 0 and feeds the same Tier[] into the Three.js scene. Stage 2 rendered with `MeshLambertMaterial` flat-colour as a sanity check; this visually matched the old fill-extrusion path. |
| 3 | `efaa9aa` | Procedural fragment shaders for residential / commercial / industrial (plus OFFICE / RETAIL / WAREHOUSE aliases) ported from the standalone prototype's `index.html`. Y-up → Z-up axis conversion done in the GLSL. Stage 3 visually rendered correctly on the founder's eye review. |

### Where it broke

| Stage | Commit | Behaviour observed |
|---|---|---|
| 4 + 5 | `5aced17` | Stage 4 added the remaining 6 land-use shader variants. Stage 5 wired in `setSelected` / `setVisibility` / `setEnabled` + an LOD switch (`zoom>=15 && !touch`) + a basemap-swap flicker fix. Preview deploy: ZAAHI buildings rendered as **flat grey `#7a7a7a`** at street zoom. |
| precision fix | `923fe7f` | Pivoted on the hypothesis that `vLocal` (passed to the fragment shader as a varying from absolute project-meters coords) lost float32 precision once vertices crossed kilometre-scale. Refactored to per-mesh local origin: CPU subtracts the building's centroid from each vertex (down to ±50 m range), `mesh.position` set to the origin so Three.js's modelViewMatrix puts the building back in world space. Preview: **"WebGL context was lost"** message + zero Three.js console logs at all. |
| defensive try/catch + ctx-loss handler | `3afe0d5` | Wrapped the install path in `try/catch`, added `webglcontextlost`/`webglcontextrestored` handlers, dropped the per-vertex diagnostic loop. Preview: silent fail returned — `[ZAAHI] addLayer: zaahi-plots-buildings-3d features: 310` log fires but the next-line `[ZAAHI] installing Three.js custom layer` does NOT, and no error reaches any catch. |
| pre-install gate diagnostic + live URL fallback | `8da7e63` | Logs `useThreeRender(memo)` AND `liveRenderThree` (read from `window.location.search` directly) right before the install gate. Live-URL fallback means install fires whenever the URL has `?render=three`, regardless of `useMemo` race. Deploy `zaahi-ke5cptyn0` was Building at the time of the STOP — its console output would have told us definitively whether `useMemo` is returning false during the SSR-pass-then-stuck-stale hypothesis. |

### Suspects RULED OUT (with the receipts)

| Suspect | Evidence |
|---|---|
| `uDesaturate` stuck at 1 (Stage 5 selection desaturation accidentally on) | Console log on `zaahi-sj7ym01dw` showed `setSelected: null` → all meshes get `uDesaturate = 0`. |
| `landUse` not arriving → all meshes fall back to Lambert | Console diagnostic showed `setBuildings: 123 buildings, 310 meshes (shader=309 lambert=1) landUse: [...]` — shader path active on 99.7% of meshes, all 8 categories arrived as expected UPPER_SNAKE strings. |
| Three.js color-space double-encoding (sRGB → linear → sRGB wash) | Forced `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` on `zaahi-sj7ym01dw`. Console confirmed `outputColorSpace=srgb-linear, WebGL2=true, ColorManagement.enabled=true`. No visual change — grey persisted. |
| `vLocal` precision overflow under large absolute coords | Per-mesh origin fix in `923fe7f` confirmed `firstMeshSampleAbs(m)=18.34` in the standalone (small) — but rendering still produced no output. Math worked out analytically as well: for a plot 3 km SW of project origin, `meshOrigin ≈ (-2710 m, -2997 m)`, vertices stay in ±15 m local, modelMatrix produces correct Mercator coords. |
| Shader compilation failure on this GPU | The `renderer init: …WebGL2=true…` log fires successfully on every preview. The Lambert fallback for FUTURE_DEV (1 mesh in the 310) is the only non-shader path; its absence/presence didn't change the symptom. |

### Confirmed by the standalone test (`scratch/signature-realistic/maplibre-customlayer-test.html`)

- **Precision math is correct.** `firstMeshSampleAbs(m) = 18.34` proves the per-mesh origin keeps geometry vertex coords in the small-range band even when buildings are kilometres away from the project anchor.
- **Shaders DO compile** — `renderer init: outputColorSpace=srgb-linear, WebGL2=true` reaches the on-page log.
- **300 meshes are added to the scene** — `setBuildings: 300 meshes` log reaches the on-page log.
- **No error reaches any catcher** — neither `window.onerror`, nor `unhandledrejection`, nor the `console.error` wrappers fire. The script runs cleanly end-to-end.

### The blocking symptom

Even when the standalone adds a **deliberately massive 100 × 100 × 60 m bright-red `MeshBasicMaterial` (DoubleSide) reference cube at the project origin** alongside the 300 procedural buildings, **nothing renders into the map viewport**. The OpenStreetMap raster basemap paints correctly; the Three.js draw output is absent. No error, no context loss.

This narrows the bug to **the camera/projection-matrix synchronisation between MapLibre's `render(gl, matrix)` callback and the Three.js scene**:

```js
camera.projectionMatrix = new THREE.Matrix4()
  .fromArray(matrix)
  .multiply(modelMatrix);
```

where:

```js
const modelMatrix = new THREE.Matrix4()
  .makeTranslation(merc.x, merc.y, merc.z)
  .scale(new THREE.Vector3(mercScale, -mercScale, mercScale));
```

The matrix math reads correct on paper (negative Y scale because MapLibre's Mercator Y axis points south, Three.js scene built north-positive) but something in the pipeline puts the output outside any visible clip-space region.

### Hypotheses still open (NOT investigated)

1. **`renderer.resetState()` ordering** — the call may be wiping state Three.js needed to set up the program. Try `renderer.state.reset()` (the lower-level alternative) or remove the call to see if MapLibre's leftover state happens to work.
2. **Matrix multiplication order / convention** — Three.js's WebGL renderer expects row-major or column-major in specific places; pre-multiplying `modelMatrix` into `camera.projectionMatrix` might collide with how Three.js's auto-injected uniforms are derived.
3. **`renderer.outputColorSpace`** — pinning to `LinearSRGBColorSpace` may have side effects on how Three.js handles the sRGB framebuffer attachment that MapLibre owns.
4. **`camera.matrixWorldInverse` staleness** — I never set the camera's `position` or call `updateMatrixWorld()`. The internal `matrixWorldInverse` stays identity, but if Three.js lazily updates it from `matrixWorld` and the lazy path has a side effect on `projectionMatrix`, that could explain the symptom.
5. **`scene.up = (0,0,1)` interaction with `PerspectiveCamera`** — the default camera has `up = (0,1,0)`. Mismatched up vectors don't matter for raw projection matrix override in theory, but some Three.js internal might use `camera.up` for backface culling direction.
6. **`THREE.RawShaderMaterial`** instead of `ShaderMaterial` — bypasses Three.js's auto-uniform injection entirely. Cleaner test of where the matrix path breaks.

### Decisions ratified by founder (2026-06-12)

- **Branch `feat/signature-realistic` is preserved as-is.** All commits (Stage 1 through `8da7e63` + the handoff docs commits) stay on the branch. No revert, no rebase, no force-push. Nothing merged to `main`.
- **`main` is untouched.** Prod continues on the MapLibre `fill-extrusion` path. None of the Signature-realistic code is reachable on prod.
- **Investigation is paused, not abandoned.** The branch is the canonical reference for any future restart. The next attempt should start from the matrix synchronisation hypotheses above, not from Stage 1.
- **SIG-FINAL (vault math unification in `src/lib/zaahi-3d-tiers.ts`) is also paused.** It only matters once the Three.js render path is unblocked.

### Standalone artifacts preserved (outside repo)

- `/home/zaahi/scratch/signature-realistic/maplibre-customlayer-test.html` — MapLibre 5.22.0 + Three.js 0.184 + 300 procedural-shader buildings + 100m red `MeshBasicMaterial` debug cube at project origin. Founder confirmed even the red cube does not render. **This is the smallest known reproducer of the broken-camera-sync symptom.**
- `/home/zaahi/scratch/signature-realistic/precision-test.html` — Card A (small vertex coords → textured) vs Card B (large vertex coords + offset → expected grey) Three.js precision-overflow visual.
- `/home/zaahi/scratch/signature-realistic/index.html` — original Phase A prototype with 5 plot footprints + per-category shaders. Still useful as the visual target for any future restart.
- `/home/zaahi/scratch/signature-realistic/footprints.json` — 5 real plot rings used by the prototype and the parity script (parity script reads it via absolute path).

### Quick re-entry guide for the next session

1. `git checkout feat/signature-realistic` (tip is `0e22008` "docs(handoff): update — 8da7e63 …" or whatever's later).
2. Read this section + the corresponding `docs/research/handoff-YYYY-MM-DD.md` (the protocol from CLAUDE.md "SESSION HANDOFF").
3. Start the python server in scratch:
   ```bash
   cd /home/zaahi/scratch/signature-realistic
   python3 -m http.server 8088 --bind 127.0.0.1 > /tmp/scratch-http.log 2>&1 &
   ```
4. First experiment: swap `ShaderMaterial` → `RawShaderMaterial` in the standalone. If the red cube starts rendering, the bug is in Three.js's auto-uniform injection vs my custom-projection-matrix path.

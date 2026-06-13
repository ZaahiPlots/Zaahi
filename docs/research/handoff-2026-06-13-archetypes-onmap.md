# Handoff — Archetypes on the map via Three.js CustomLayer (2026-06-13)

Branch `research/landuse-archetypes` (pushed to origin).
**STOP gates honoured:** not merged to main; tiles/canonical files/auth/prod DB untouched.

## ROUND 4 UPDATE (colour fix — geometry approved)

Founder approved the archetype **geometry** (residential = эталон). Only colour was
broken (everything near-black). Fixed in `archetype-layer.ts` (geometry untouched):
- **Root cause:** `renderer.outputColorSpace = LinearSRGBColorSpace` (leftover from the
  signature *shader* layer) rendered lit colours near-black → changed to `SRGBColorSpace`.
- Material `MeshStandard DoubleSide opacity 0.62` → `MeshLambert FrontSide opacity 0.8 +
  emissive = colour×0.45`. FrontSide stops back-face-through-front alpha self-multiply
  (the "alpha squaring → black" the founder suspected); emissive keeps shadowed faces
  in-hue. Translucency kept.
- **Floor bands for ALL types**: light horizontal rib LineLoops every `FLOOR_H` on the
  main body (line overlays — geometry NOT touched) → volume reads, parity with the
  approved residential look. Edges kept light (0.55).
Verified on live MapLibre z16-17 — `docs/research/archetype-shots-v2/map-color-*.png`:
RESIDENTIAL canon yellow #FFD700, COMMERCIAL blue, EDUCATIONAL teal, INDUSTRIAL
steel-grey — all readable. (AGRICULTURAL/INVESTMENT/FUTURE_DEV not in footprints.json
so not re-shot, but the fix is material-level → identical for them.) Legend unchanged.

## ROUND 3 UPDATE (env fix + DLRC + filter parity)

- **Preview env FIXED.** Added the missing branch-Preview env vars (DIRECT_URL,
  DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL) by copying
  Production values via `vercel env pull` → `vercel env add … preview
  research/landuse-archetypes` (NO `env rm` — 06-12 lesson). TILES_BASE_URL is `""`
  in prod (relative tiles) so not needed. Preview now builds **Ready**:
  `https://zaahi-nbwrcw4lg-zaahiplots-projects.vercel.app` (latest = newest push).
- **DLRC = 8, definitive.** Not 12. Confirmed two ways: (1) cross-ref of the hotel
  candidates against the real 372-plot DLRC project set in
  `data/layers/dda/dlrc.geojson`; (2) live authoritative DDA GIS query
  `PROJECT_NAME='DUBAI LAND RESIDENCE COMPLEX' AND land use HOTEL/HOSPITALITY` → 8
  plots: 6489099, 6489024, 6489023, 6489017, 6489008, 6489009, 6489015, 6489014.
- **Filter parity DONE.** `reapplyMapFilters` now drives the archetype layer via
  `querySourceFeatures(ZAAHI_PLOTS_SRC, {filter: buildZaahiFilter()})` → passing
  parcelIds → `setVisibility`. Reuses the exact filter expression (no reimpl).
- **Screenshots on the real basemap — STILL not auto-captured (handed to founder).**
  Two walls neither bypassable within constraints: (a) the preview URL is behind
  **Vercel deployment protection (SSO 401)** — needs a bypass secret I don't have, and
  disabling protection weakens all previews; (b) the app `/parcels/map` is behind
  `AuthGuard` needing an APPROVED **prod** Supabase user — creating one is a prod auth
  write (Autonomy v2 STOP), and `create-test-user.sh` only targets *staging*
  (`pdoxeieilnquhwtnsdug`), and pointing local at staging means editing `.env.local`
  (forbidden). → **Founder action:** open
  `https://zaahi-nbwrcw4lg-zaahiplots-projects.vercel.app/parcels/map?archetypes=1`
  (you're already Vercel-SSO'd + app-approved), **zoom ≥ 15** on any listing cluster
  (e.g. Majan / Dubai Studio City / Al Reem AD), and the per-land-use morphology
  renders. Live-MapLibre proof shots already in `archetype-shots-v2/map-repro-*.png`.

## What shipped this session

Land-use **morphology** archetypes now render **on the map** behind `?archetypes=1`
(default off → prod unchanged), via a Three.js CustomLayer — NOT fill-extrusion
(which can't do sloped/sawtooth roofs, L-shapes, wings, two-volume massing).

**Verified on a live MapLibre instance** (the production layer code, bundled with
esbuild, mounted on a real map — `docs/research/archetype-shots-v2/map-repro-*.png`):
- HOTEL → L-shaped tower on lobby podium ✅
- INDUSTRIAL → warehouse shed with **sawtooth roof** ✅ (custom non-extrusion geom)
- RESIDENTIAL → balcony-band body + terraced top ✅
- EDUCATIONAL, MIXED_USE ✅

The hard seam (MapLibre v5 matrix) is the §10 root-cause fix, reused verbatim from
the proven BuildingGlbLayer + feat/signature-v2 three-layer. Matrix renders correctly.

## Architecture

- `src/lib/archetypes/geometry.ts` — one constructor per land use (ported from
  scripts/archetype-builders.ts) + NEW `buildInvestment` (premium tower: protruding
  sky-terrace + tapered corner-cut crown). Emits `Solid[]` (prism / gable / sawtooth)
  in metre-space; `obbOf` = PCA oriented bounding box.
- `src/lib/archetypes/archetype-layer.ts` — single shared CustomLayer
  (`installArchetypeLayer(map) → controller`). Reuses the proven pattern:
  - matrix unwrap shim (`defaultProjectionData.mainMatrix ?? modelViewProjectionMatrix
    ?? …`, handles indexed-object serialisation) — **do not simplify** (§10 fix).
  - `gl.bindFramebuffer(gl.FRAMEBUFFER, null)` before+after render (BuildingGlbLayer fix).
  - Z-up scene, ORIGIN-relative metres, per-mesh precision origin (mesh.position =
    building centroid, vertices building-local → float32-safe).
  - prism = ExtrudeGeometry; gable/sawtooth = hand-built BufferGeometry (Z-up).
  - translucent MeshStandardMaterial (canonical colour, opacity 0.62) + white edges.
  - controller API: `setBuildings / setSelected / setVisibility / setEnabled (LOD) / destroy`
  - WebGL context-loss reinstall handling.

## page.tsx wiring (the gated edit — diff summary + invariants)

All additive, flag-gated (`archetypesFlagOn()` reads `?archetypes=1` once):
1. import + `archetypesFlagOn()` helper + `ARCHETYPE_MIN_ZOOM = 15`.
2. `archetypeCtrlRef` ref near `selectedParcelId`.
3. In `loadZaahiPlots`: accumulate `archetypeInputs[]` (parcelId, footprintRing[lng,lat],
   landUse, colorHex, totalH, isVault, status) — SAME footprint+height the fill-extrusion
   uses. After the building source block: if flag on → install layer once (+ a `zoom`
   handler for LOD) → `setBuildings(archetypeInputs)`.
4. `applySelectionPaint` also calls the archetype controller's `setSelected` (controller
   stashed on `map.__zaahiArchetypes`).

**Invariant table**

| Invariant | flag OFF | flag ON |
|---|---|---|
| Legend / 10 colours | unchanged | unchanged (colour from existing `buildingHex`) |
| `fill-extrusion-opacity` literal 1 | unchanged | unchanged (archetype opacity is Three material, not the layer) |
| Click / hover / SidePanel | unchanged | unchanged — they `queryRenderedFeatures` the flat `ZAAHI_PLOTS_FILL`, not the 3D layer; CustomLayer is non-queryable so clicks pass through |
| `loadZaahiPlots` fn preserved | yes | yes (additive only) |
| Prod render | fill-extrusion as before | n/a (flag off in prod) |
| LOD | n/a | zoom ≥ 15 → archetypes + hide `ZAAHI_BUILDINGS_3D`; zoom < 15 → fill-extrusion |
| auth / prod DB / tiles / canonical files | untouched | untouched |

tsc clean; `pnpm build` green.

## Preview deploy

Pushed → Vercel preview `https://zaahi-dhlngmsun-zaahiplots-projects.vercel.app`
**BUILD ERRORED — pre-existing env issue, NOT the archetype code.** Build log:
`Error: supabaseKey is required.` → `Failed to collect page data for
/api/buildings/[id]`. That route is untouched by this work; the preview scope is
missing a SUPABASE env var (same class as the historical "Error 1m" previews and
the feat/backlog-batch-2 "env scope" rebuild). **Local `pnpm build` is green** (the
dev box has `.env.local`). Fix = set the missing SUPABASE env on the branch's
Preview scope in Vercel, then redeploy — this is an env-var change (CLAUDE.md
constrains env edits) so left for founder/infra. Once the preview builds:
open `/parcels/map?archetypes=1`, zoom ≥15 on a ZAAHI listing.

**Final on-zaahi.io-basemap per-category screenshots are NOT yet captured** — the map
is behind `AuthGuard` + `/api/parcels/map` needs an APPROVED user, and the preview URL
may sit behind Vercel SSO. To capture:
1. Get/confirm an approved session (`$HOME/create-test-user.sh`, or founder's login),
   or disable Vercel deployment protection for the preview.
2. Headless-chrome the preview `/parcels/map?archetypes=1` once logged in, fly to each
   archetype's plot (coords in `docs/research/archetype-shots/footprints.json` and the
   DLRC list below), screenshot. swiftshader flags as used in the repro work.

The live-MapLibre `map-repro-*.png` shots already prove the layer renders correctly on
a map; the preview shots add the real street basemap context.

## Rebuild the standalone map reproducer

```
node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/bin/esbuild \
  scripts/_repro-archetype-map.ts --bundle --format=iife \
  --outfile=docs/research/archetype-shots-v2/_map-repro.bundle.js \
  --define:process.env.NODE_ENV='"production"'
python3 -m http.server 8088   # then chrome --headless --screenshot of _map-repro.html?cat=HOTEL
```
(The 2.7 MB bundle is git-ignored — regenerate as above.)

## Remaining / next steps

1. **Authed preview screenshots per category** (above) — the only piece of the
   founder's "ВЫХОД" not yet captured.
2. **Filter parity** — `controller.setVisibility(predicate)` exists but isn't yet wired
   to the status/landUse/vault filters or vault-only mode. Clicks/hover already work.
3. **AGRICULTURAL / INVESTMENT** have no curated parcels — only render once such plots
   exist (or via synthetic demo). Builders are ready.
4. **DLRC 8-vs-12 hotels** — founder asked to use the REAL admin boundary. `build-dlrc.ts`
   + `data/layers/Community__1_.kml` hold the DDA community polygon; re-run
   `scripts/_probe-dlrc-hotels.py` clipped to that polygon (not a bbox) to confirm. Last
   bbox sweep found 8 dedicated hotel plots (6489xxx cluster). NOT redone this session.
5. **Merge to main** — STOP-gated (founder).
6. **Tiles** — separate decision, STOP-gated. (Archetypes are a Three.js layer over the
   curated listings only; PMTiles background stays fill-extrusion per §4 of the
   signature-realistic doc.)

## Pollers / cleanup
- http.server on 8088 + headless chrome — killed at session end (verify `ss -ltn | grep 8088`).
- esbuild installed in the pnpm store (already present, not added to package.json).

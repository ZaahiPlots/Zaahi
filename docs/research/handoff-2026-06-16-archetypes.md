# Handoff — Land-Use Archetypes (2026-06-16) · FROZEN, NOT MERGED

**Status: COMPLETE & merge-ready, but merge DEFERRED by founder** (the schematic 3D-city
look didn't reach the quality bar; founder will explore other 3D methods later). State is
**frozen** — do not continue work on it until founder decides the 3D method.

Branch: `research/landuse-archetypes` · HEAD **`294f5e2`** (pushed, local == origin).
Live preview (branch alias, archetypes default-ON): 
`https://zaahi-git-research-landuse-archetypes-zaahiplots-projects.vercel.app/parcels/map`
**Not merged to main. Tiles untouched. main untouched.**

---

## What was built (all 10 land-use types)
Per-land-use 3D building archetypes on `/parcels/map`, behind the `?archetypes=1` flag
(preview hosts default-ON; prod hard-OFF).

- **Pipeline:** parametric **Blender** hard-surface generator (`scripts/_blender_param_archetype.py`)
  → unit-box GLB (`public/glb/archetypes/*.glb`) → instanced per listing by the Three.js
  CustomLayer (`src/lib/archetypes/archetype-layer.ts`). Residential/Mixed-Use are also GLB.
- **8 GLB types:** hotel (window-grid + canopy), commercial (curtain-wall tower), educational
  (courtyard campus), healthcare (H-plan + helipad), industrial (sawtooth warehouse),
  agricultural (barn + silo, gable), future-dev (pad + footing grid + fence — no building),
  investment (off-plan tower + tower crane). + residential (balcony tower) & mixed-use
  (podium/body/crown) — also GLB. = 10 total.
- **Materials (PBR, render-only):** GLASS (towers: hotel/commercial/investment/mixed/residential —
  metalness 0.35, roughness 0.09, sky PMREM envMap) + CONCRETE (sheds/low: industrial/edu/
  health/agri/future-dev — roughness 0.70, light env). Tinted to each legend colour (colour-code
  preserved). Reacts to the map sun toggle (`setSun` → same `getSunPosition` as the slider).
- **Style-G edge lines kept** (needed for texture to read on the bright satellite; pure-PBR
  no-lines regressed — see ruled-out).
- **Hotel colour CHANGED to carrot orange `#E8732A`** (was burgundy) across ZAAHI_LANDUSE_COLOR /
  LAND_USE_LEGEND / SidePanel / filter-state / prepare-tiles / CLAUDE.md (founder-sanctioned).

## Placement — proven on REAL listings (not demo)
Audited all **148 real DB listings** (`scripts/_diag-*.mts` → `verify-plots-real.json`):
- **Centre:** model centred on the **footprint centroid (= DDA building-limit if present, else
  setback-inset)** — 148/148 within <3 m. (Plot-centroid centring was wrong: 68/148 building-limits
  are offset up to 28 m from the plot centre.)
- **Size:** **fit-to-plot clamp** (shrink about the centroid until all 4 corners are inside the
  plot polygon) → **0/148 overhang** (was 129/148, up to 460 m on irregular/diagonal/concave
  building-limits whose OBB bounding-rect exceeds the polygon).
- **Setback / height / rotation / material:** all ✅. Z from DDA maxHeight/floors; OBB drives
  orientation + size.
- **Net: 146/148 fully clean on all 7 params.** See `_final-audit.json`, `ALL-10-onmap.png`,
  `ALL-10-overview.png`, and the `fin-*` per-plot screenshots in `docs/research/archetype-shots-v2/`.

## Open tails (deferred — do NOT fix until method decided)
1. **~5% edge cases:** 1 "sliver" (<6 m model on a pathological narrow plot) + 7 "slim towers"
   (tall buildings on narrow/asymmetric building-limits → aspect 3–7) + ~22 with extra setback
   (smaller model). All from pathological asymmetric/concave building-limits. Not broken, noted.
2. **Concave (L-shaped) plots:** a rigid box GLB can't follow a concave polygon — it covers the
   bounding rect; the fit-clamp keeps it inside the plot but it won't hug an L. Rare in DDA data.
3. **Photoreal quality:** parametric flat-colour + glass PBR = "stylized glazed/concrete massing",
   NOT photoreal "real building" at city zoom (founder's quality bar). **Real path = a 3D artist**
   (~$500, 1–2 wks, 10 consistent models) OR textured CC0 / Meshy image-to-3D. This is why merge
   is deferred — founder is choosing the 3D method.
4. **prepare-tiles.ts** hotel colour updated but **tiles NOT rebuilt** → background DDA/PMTiles
   hotels stay burgundy until a tile rebuild (cosmetic, background).

## Merge plan (when founder green-lights — NOT now)
- Flag transport: **prod default-OFF + a Layers-panel toggle** (safe gradual rollout). NOT default-ON.
- **Squash the PRODUCTION files only** into one commit on a fresh `feat/landuse-archetypes` → PR:
  `src/lib/archetypes/archetype-layer.ts`, `src/lib/archetypes/geometry.ts`,
  `src/app/parcels/map/page.tsx` (gate + 3 ghost-kill/LOD lists + colours + setSun wiring),
  `SidePanel.tsx`, `filter-state.ts`, `scripts/prepare-tiles.ts` (colour), `CLAUDE.md`,
  `public/glb/archetypes/*.glb` (10). EXCLUDE all `docs/research/**` + `scripts/_*` scratch.
- Archetypes render for ZAAHI **listings only** (~114–133 via `loadZaahiPlots`), NOT the 461K PMTiles.
- Rollback: flag default-OFF = inherently safe; hard = `git revert` the squash commit.

## Ruled-out hypotheses (don't re-try these — they failed)
- **Removing the style-G lines (pure PBR)** → looked clean in isolated navy renders but REGRESSED
  on the bright satellite map (flat boxes). Lines are required for map texture. (commit 23418c4
  reverted by b1e978b.)
- **Plot-centroid centring** → misplaced 68/148 (building-limit offset). Use footprint centroid.
- **OBB-centre placement** (the size fix's side effect) → re-broke centre on 131/148. Use centroid + clamp.
- **Meshy text-to-3D** → organic/melted, rejected. **Parametric Blender** is the clean generator.
- **Isolated/navy renders for judging** → misleading (dark bg hid the flat-box problem). Judge ONLY
  on the real satellite map at z17.

## Key files
- Layer: `src/lib/archetypes/archetype-layer.ts` · geometry helpers: `src/lib/archetypes/geometry.ts`
- Generator: `scripts/_blender_param_archetype.py` (Blender 5.1.2 headless) · GLBs: `public/glb/archetypes/`
- Repro harness: `scripts/_repro-archetype-map.ts` + `docs/research/archetype-shots-v2/_map-repro.html`
  (`?plot=<n>&pitch=&zoom=&sun=&nobg=1`); bundle via `pnpm dlx esbuild`.
- Audits: `scripts/_diag-real-plots.mts` (centre offset), `_diag-size.mts` (overhang),
  `_diag-final.mts` / `_diag-finalB.mts` (full 7-param). Data: `verify-plots-real.json`.
- Merge-readiness doc: `docs/research/archetype-MERGE-READINESS-2026-06-15.md`.

## Environment notes (carry forward)
- `pnpm dev` OOMs compiling /parcels/map on this box → use `pnpm build` to verify (build green at HEAD).
- Headless screenshot repro is flaky (ESRI tile rate-limit + a nav-race that renders a downtown
  default frame ~2.5MB); the `_diag-*.mts` programmatic audits are the reliable evidence.
- Clean up after: `pkill -f "http.server 8088"`, `rm -f glb` (the public/glb symlink).

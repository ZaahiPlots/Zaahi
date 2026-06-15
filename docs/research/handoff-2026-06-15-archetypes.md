# Handoff — Land-use archetypes (READ FIRST)

Branch `research/landuse-archetypes`, tip **`82b4c9d`** (+ this doc + CLAUDE.md/legend
fixes on top). **STOP gates: never merge to main, never touch tiles, never touch
the auth page / prod DB.** Founder reviews each archetype type one at a time.

## What this branch does

`?archetypes=1` (or default-on on preview hosts) renders the curated ZAAHI listings
as per-land-use **morphology massing** via a Three.js CustomLayer, instead of the flat
fill-extrusion. **Only RESIDENTIAL + MIXED_USE are wired in and founder-approved so
far.** The other 7 land-uses still render as the existing fill-extrusion, untouched.

## Status by type

- **RESIDENTIAL** ✅ approved — body + balcony-band terraces, green `#2D6A4F`.
- **MIXED_USE** ✅ approved — podium/body/crown (1.0 / 0.82 / 0.65, 20/60/20 height),
  purple `#6B4C9A`.
- HOTEL / EDUCATIONAL / HEALTHCARE / COMMERCIAL / INDUSTRIAL / AGRICULTURAL /
  INVESTMENT — constructors exist in `src/lib/archetypes/geometry.ts` but are **NOT**
  fed to the layer yet (the input filter in `loadZaahiPlots` admits only RES + MIXED).
  Bring them in one at a time on founder say-so.

## Architecture (where things live)

- `src/lib/archetypes/geometry.ts` — pure geometry constructors per land-use
  (`buildResidential`, `buildMixedUse`, …), `obbOf`, `scaleRing`, `clampToFootprint`.
  Returns `{ solids: (prism|gable|sawtooth)[], floorLines, ribs }`.
- `src/lib/archetypes/archetype-layer.ts` — the MapLibre CustomLayer + Three.js scene
  (`installArchetypeLayer(map) → controller`). Owns: per-building Mercator anchor,
  material, line styling, LOD, selection/visibility, context-loss handling.
- `src/app/parcels/map/page.tsx` — wiring inside `loadZaahiPlots`: builds
  `archetypeInputs` (RES+MIXED only), installs the layer, LOD, ghost-kill filter.

## Hard-won fixes baked in (do NOT regress)

1. **Per-building Mercator anchor** — each building anchored at its OWN
   `MercatorCoordinate` (group matrix `T(merc)·S(s,−s,s)`), camera = MapLibre matrix.
   A single global origin DRIFTED the model off its plot for far plots. (commit `7d60140`)
2. **Plot-polygon clamp** — every prism ring clamped to the plot ring (`b.plot`) so the
   massing never crosses the boundary on concave plots. Measured: RES 0/57, MIXED 0/59
   overhang. Audit: `scripts/_measure-all-residential.mts`.
3. **Inner tiers use `scaleRing` only** (a homothety = always a simple, fillable
   polygon). Do NOT `clampToFootprint` the inner tiers in the builder — clamping a
   concave homothety self-intersects → ExtrudeGeometry can't fill → see-through body.
4. **Solid body** — `MeshLambertMaterial`, `transparent:false`, `opacity:1`,
   `depthWrite:true`, `FrontSide`, `SRGBColorSpace`, emissive = colour×0.22 (never
   black). The near-black bug was `LinearSRGBColorSpace` + double-side alpha.
5. **Ghost-kill** — when the archetype is active, the flat plot-fill for RES+MIXED is
   set to opacity 0 (`map.__zaahiArchetypeActive` read in `applySelectionPaint`) and
   those land-uses are excluded from the `ZAAHI_BUILDINGS_3D` fill-extrusion (LOD-gated)
   → one solid layer, no double-render. `ZAAHI_PLOTS_FILL/_LINE` untouched → click /
   hover / search still work on every type.
6. **Sparse lines** — dense per-floor + per-rib lattice read as a transparent cage;
   mixed-use bands are sparse (`built.ribs` gate), residential keeps per-floor.

## Line style (founder-ratified VARIANT G, 2026-06-15)

`resolveLineVariant()` in `archetype-layer.ts`. **Default = G**: edges ×1.5 LIGHTER
(volume corners as light cants), floor bands ×1.4 LIGHTER (levels highlighted), NO
vertical ribs. All lines = the body legend colour scaled (never white). `?lv=A..H`
overrides for tuning (A lighter, B darker, C clean-floors, D ribs-only, E gold,
F edges+mid-dark floors, H edges+dark floors+sparse ribs). New types auto-pick G.

## Flag / how it turns on

- `archetypesFlagOn` logic in `loadZaahiPlots`: precedence = `?archetypes=1/0` (query,
  but Vercel SSO strips it on preview) → `localStorage["zaahi-archetypes"]` → **preview
  host default ON** (`*-zaahiplots-projects.vercel.app` only — prod aliases zaahi.io /
  www / zaahi.vercel.app stay OFF) → prod OFF. LOD: massing at zoom ≥ 14, else
  fill-extrusion.
- The current SSO-protected preview can't be screenshotted headlessly; review uses the
  standalone repro (`scripts/_repro-archetype-map.ts` + `_map-repro.html`, now on a
  satellite basemap) → `docs/research/archetype-shots-v2/*.png`. Re-render: esbuild the
  repro → `python3 -m http.server 8088` → headless-chrome screenshot (swiftshader GL).

## Colours / legend (reconciled 2026-06-15)

- CLAUDE.md legend rewritten 1-to-1 with live `ZAAHI_LANDUSE_COLOR` (was the stale
  2026-04-11 palette: residential `#FFD700` etc). Residential = `#2D6A4F` green.
- FutureDev unified to **`#A8926E`** (sandstone, distinct from brand gold `#C8A96E`)
  in `ZAAHI_LANDUSE_COLOR` + `LAND_USE_LEGEND`.
- **OPEN TAIL:** FutureDev colour still drifts in `SidePanel.tsx` (`#C8A96E`),
  `filter-state.ts` (`#84CC16` old lime), `scripts/prepare-tiles.ts` (`#C8A96E`,
  tile-build — change only on a tile rebuild). Reconcile to `#A8926E` next session.

## Open decisions / next steps

1. Bring the next land-use type into the layer (founder picks order); add it to the
   `loadZaahiPlots` input filter + the ghost-kill `["RESIDENTIAL","MIXED_USE"]` lists.
2. Reconcile the 3 FutureDev colour drifts above.
3. Wire the live map (not just preview-host default) — a UI toggle in the Layers panel
   writing `localStorage` was proposed (survives SSO redirects) but not built.
4. Eventually: does this go to prod (flag → merge), and do the tiles get rebuilt with
   archetype geometry? Both STOP-gated.

## DLRC (earlier finding, settled)

DLRC has **8** dedicated hotel plots (the `6489xxx` cluster), not 12 — confirmed via
`dlrc.geojson` (372-plot project) + live DDA GIS. See `landuse-archetypes.md §1a`.

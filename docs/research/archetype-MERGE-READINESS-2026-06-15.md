# Archetypes — Merge-Readiness Review (2026-06-15)

Branch `research/landuse-archetypes`. **Document for founder review — NOT merged.**
Live preview: `https://zaahi-git-research-landuse-archetypes-zaahiplots-projects.vercel.app/parcels/map`

---

## PART 1 — Data-variation diagnostics (on the REAL map)

Screens in `docs/research/archetype-shots-v2/`. Overviews: `ALL-9-overview.png` (isolated), `ALL-9-onmap.png` (satellite).

### 1. Plot size
| Size | Test | Result | Screen |
|---|---|---|---|
| **Small <5000 sqft** | SMALL-DEMO 22×20m (~4735 sqft) | footprint = plot (bypass), building fills plot, **inside boundary** ✓ | `diag-small-plot.png` |
| **Medium** | residential 101×92m, hotel 143×119m, healthcare 73×89m | footprint = setback-inset, gap visible, inside ✓ | `*-PBR-onmap.png` |
| **Huge >500K** | educational 301×247m (385K), industrial 314×295m (597K) | render OK, model fills footprint (acceptable for buildings) ✓ | `educational/industrial-PBR-onmap.png` |
| **Huge + agri/future-dev** | model fills the whole giant footprint → unnaturally large barn/site | ⚠️ **KNOWN TAIL** — needs fixed-size marker (no real agri/future-dev normal plot in DB; demo plots synthesized) | — |

### 2. Height / floors (Z by DDA data)
| Height | Test | Result |
|---|---|---|
| Low 1–3 fl | agricultural 9m, future-dev 3.5m (fixed), industrial 20m | not squashed, reads ✓ |
| Medium | residential ~40m, healthcare 36m/9fl | ✓ |
| Tall 60+ fl | commercial 240m/60fl, mixed-use 66fl | Z scales correctly, not ugly-stretched ✓ |

`H = maxHeightMeters > 0 ? maxHeightMeters : max(1, maxFloors) × 3.5`, then `max(3, H)`. Future-dev overridden to fixed 3.5m (it's a site marker, no GFA).

### 3. GFA / floors — height derives from DDA `maxHeightMeters` or `maxFloors×3.5`. Never auto-computed from price (per CLAUDE.md). ✓

### 4. Colours — all 9 = `ZAAHI_LANDUSE_COLOR`, recoloured at runtime
| Type | Hex | Type | Hex |
|---|---|---|---|
| Residential | `#2D6A4F` | Healthcare | `#E63946` |
| Commercial | `#1B3A5C` | Industrial | `#495057` |
| Mixed Use | `#6B4C9A` | Agricultural | `#606C38` |
| **Hotel** | **`#E8732A`** ✓ orange (not burgundy) | Future Dev | `#A8926E` |
| Educational | `#0077B6` | | |

Synced: `ZAAHI_LANDUSE_COLOR`, `LAND_USE_LEGEND`, `SidePanel`, `filter-state`, `prepare-tiles`, `CLAUDE.md`. ✓

### 5. Setbacks (`defaultSetbackM`, overridable by affection plan)
Commercial/Office/Retail **0** · Hotel **3** · Industrial/Warehouse **4** · Educational/Healthcare **5** · Agricultural **10** · Mixed Use **4** · Residential villa **3** / apt **4** · FutureDev **4**. Priority: building-limit geometry → affection-plan setbacks (avg) → land-use default. `<5000 sqft → 0`. ✓ (matches ratified rule)

### 6. Edge cases
| Case | Behaviour |
|---|---|
| No landUse | `null` → not in gate → renders as **plot outline only** (no model) ✓ |
| No height | falls back to `maxFloors×3.5` or min 3m ✓ |
| No building-limit | footprint = plot inset by setback ✓ |
| Irregular / corner plot | **procedural** res/mix follow the plot polygon (no overhang) ✓; **GLB** types (7) scale to footprint **OBB rectangle** → on highly angular plots the OBB corners can slightly exceed the footprint (usually still inside plot since footprint is setback-inset) ⚠️ minor |

---

## PART 2 — System diagnostics

| # | Check | Result |
|---|---|---|
| 1 | **Consistency** | Gate = 9 types ✓ · 3 ghost-kill match-lists = 9 ✓ · LOD filter = 9 ✓ · `ARCHETYPE_GLB` = **7** (res/mix intentionally PROCEDURAL, not a forgotten gap) ✓ |
| 2 | **LOD** | `ARCHETYPE_MIN_ZOOM=14`. z≥14 → Three.js massing on + the 9 types excluded from `ZAAHI_BUILDINGS_3D` fill-extrusion (no double-render). z<14 → `setEnabled(false)` + fill-extrusion shows all (fallback) ✓ |
| 3 | **PBR + sun** | One shared material + directional sun wired to `setSun(sunTimeOverride)` (same `getSunPosition` as the slider) → all types react ✓ |
| 4 | **Performance** | Archetypes render ONLY for ZAAHI **listings** (`loadZaahiPlots`, ~114–133 plots) — **NOT** the 461K PMTiles background. Light. ⚠️ Two scale notes: (a) each GLB is `clone(true)` per building (fine at 114; revisit if listings reach thousands → switch to InstancedMesh); (b) the layer calls `map.triggerRepaint()` every frame → **continuous repaint loop** (constant GPU; battery). Recommend gating repaint, but not a blocker at current scale. |
| 5 | **Conflicts** | Separate CustomLayer. Ghost-kill removes the 9 from fill-extrusion + zeroes their flat plot-fill (clicks still work). PMTiles background + hero deck.gl layers untouched. No conflicts ✓ |
| 6 | **tsc + build** | `tsc --noEmit` clean · `pnpm build` ✓ Compiled successfully ✓ |

---

## PART 3 — Merge plan (step-by-step, for review — DO NOT execute yet)

### 1. Flag transport in prod
Today: default-ON only on `*-zaahiplots-projects.vercel.app`; prod aliases hard-OFF; `?archetypes=1/0` + `localStorage` override.
- **(A) Layers-panel toggle, prod default OFF — RECOMMENDED.** User opts in. Risk: low; nobody sees it unless they enable → safe gradual rollout, easy to validate at scale. Needs a small UI toggle wired to the existing flag/localStorage.
- (B) default-ON in prod. Risk: every user sees archetypes immediately — any perf (continuous repaint) or visual issue hits everyone at once; no gradual validation.
- **Recommendation: A.** Ship dark, enable for self/founder first, then flip default after a soak.

### 2. Tiles
- Archetypes = **listings only**, not the 461K PMTiles → **no PMTiles rebuild required** for archetypes to work.
- Caveat: `prepare-tiles.ts` hotel colour updated to `#E8732A` but **tiles not rebuilt** → background DDA hotels stay burgundy until a future tile rebuild (cosmetic, background only, deferrable).

### 3. What merges (research branch → main)
- **Rule: do NOT merge the research branch wholesale.** 165 files differ vs main; ~150 are research PNGs / scratch scripts that must NOT land in main.
- The commits are iterative + interdependent (30+, including a regress+revert) → cherry-picking individual commits is error-prone.
- **Recommendation: squash the NET diff of the PRODUCTION files into ONE clean commit** on a fresh `feat/landuse-archetypes` branch → PR → main. Production set:
  - `src/app/parcels/map/page.tsx`
  - `src/lib/archetypes/archetype-layer.ts`
  - `src/lib/archetypes/geometry.ts`
  - `src/app/parcels/map/SidePanel.tsx`
  - `src/lib/filter-state.ts`
  - `scripts/prepare-tiles.ts` (colour only)
  - `CLAUDE.md` (legend)
  - `public/glb/archetypes/{hotel,commercial,educational,healthcare,industrial,agricultural,future_development}.glb` (7 — runtime assets)
  - (optional, for reproducibility) `scripts/_blender_param_archetype.py`
  - EXCLUDE: `residential.glb`, `mixed_use.glb` (unused), all `docs/research/**`, all `scripts/_*` scratch.

### 4. Rollback
- Default-OFF in prod (option A) = archetypes invisible unless toggled → inherent safety.
- Hard rollback: `git revert` the squash commit (one commit) → instant. Or flip the flag default to OFF without a deploy if wired to remote config.

### 5. Smoke test after merge (in addition to CLAUDE.md checklist)
- [ ] Map loads; with flag ON, 9 types render at z≥14 in legend colours.
- [ ] z<14 → fill-extrusion fallback (no Three.js massing).
- [ ] No double-render (ghost-kill: each listing once).
- [ ] Click/hover still opens side panel (opacity-0 plot-fill queryable).
- [ ] Sun toggle changes archetype light/shadow.
- [ ] Flag OFF (prod default) → behaves exactly as today (fill-extrusion).
- [ ] `GET /api/layers/...` 200; `/api/parcels/map` 401 unauth.

### 6. Open tails — before vs after merge
- **Before (none blocking)** — with flag default-OFF, safe to merge as-is.
- **After (deferred, founder call):**
  - agri / future-dev fixed-size marker on huge plots.
  - INVESTMENT — 10th legend type, not built (not in scope).
  - GLB-type OBB overhang on highly irregular plots (minor).
  - Continuous-repaint perf gating (item P2.4b).
  - `prepare-tiles.ts` hotel colour → background tile rebuild.
  - Lines thinner vs current (founder's earlier "busy" note) — current lines are needed for map texture; could tune.

---

**Status:** tsc + build green · not merged · main & tiles untouched · no credits spent.

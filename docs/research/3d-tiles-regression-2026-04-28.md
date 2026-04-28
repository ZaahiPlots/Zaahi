# 3D / PMTiles Regression — Diagnostic Report (Phase A)

**Date:** 2026-04-28
**Branch:** `research/bugs-batch-2026-04-28`
**Author:** Claude Opus 4.7 (audit agent), under founder direction
**Status:** PHASE A — diagnostic only. **No `src/**` edits.** Awaiting founder approval on path forward before Phase B.

---

## Executive summary

The "double 3D" the founder is seeing on the production map is **not a regression** in the strict sense — both rendering paths are rendering exactly what they were configured to render, in line with the 2026-04-15 ZAAHI/PMTiles opacity spec in `CLAUDE.md`. What was *not* anticipated by that spec is what happens when a **ZAAHI listing parcel and a DDA PMTiles parcel describe the same physical plot**: both layers paint, the ZAAHI Signature building (solid `opacity: 1`) sits inside the parcel polygon with setbacks, and the larger PMTiles 3D feature (transparent `opacity: 0.35`) for the *same plot* leaks out around it. Result: a translucent "ghost" enveloping each listing.

A separate but related issue is that as of late April 2026 **a third rendering system was added** — the digital-twin Buildings layer (`c9eb8e3`, `2e5ed69`, `f675ba2`, `44dcd61`, `165b8ca`) — that overlays glTF / artist-delivered models on top of selected plots (e.g. API Horizon Pointe). Some screenshots show grey/teal Buildings-layer 3D adjacent to ZAAHI plots; that is *not* the "transparent + opaque" double-render the founder is describing, but it does compound the visual noise.

For Abu Dhabi and Al Ain, heights *are* baked into PMTiles via `scripts/prepare-tiles.ts` (which itself implements ZAAHI Signature tier logic), so AD/Al Ain "wrong heights" cannot be fixed without regenerating and re-deploying PMTiles. Source GeoJSON is preserved on disk (`data/tiles/*.geojson.nl`); the pipeline (`scripts/update-tiles.sh`) is intact and re-runnable. PMTiles regeneration is *available*, just slow.

**Recommendation (subject to founder approval):** Option 3 (re-bake PMTiles minus the 114 ZAAHI listings + minor schema tightening) plus a runtime MapLibre filter as a stopgap. This costs one tile rebuild and zero `loadZaahiPlots` changes. Not Option 1 (purely DB-driven) — Option 1 would lose the 461K-plot DDA backdrop the platform depends on for the listings to feel discoverable.

---

## Pre-tile architecture (what worked before)

Before the migration commit (see "Regression root cause"), DDA / AD plots reached the map exclusively through Next.js API routes that streamed GeoJSON from `data/layers/**`. Each layer (DDA Districts, Master Plans, Al Furjan, Dubai Hills, etc.) had its own `/api/layers/dda/<slug>/route.ts` handler. ZAAHI listings lived in Postgres (Prisma `Parcel` table) and were fetched separately via `/api/parcels/map`. There was exactly **one** 3D extrusion path: ZAAHI Signature, applied to the 114-ish parcels, opacity 0.35 (per the 2026-04-11 spec, before the 2026-04-15 split).

That architecture was simple but expensive: every map open hit Next.js with multiple layer requests, raw GeoJSON for the whole emirate (≈438MB cumulative), and a corresponding Vercel egress / startup cost. The DDA-wide 99K-plot dataset was unworkable through that channel.

---

## Current state

### PMTiles inventory (`public/tiles/`)

| File | Size | Source data | Generator |
|---|---|---|---|
| `dda-land.pmtiles` | 22 MB | `data/tiles/dda-plots.geojson.nl` | `tippecanoe` via `scripts/update-tiles.sh` |
| `ad-land-adm.pmtiles` | 59 MB | `data/tiles/ad-plots-adm.geojson.nl` | same |
| `ad-land-other.pmtiles` | 78 MB | `data/tiles/ad-plots-other.geojson.nl` | same |
| `oman-land.pmtiles` | 18 MB | `data/tiles/oman-plots.geojson.nl` | same |
| **Total** | **177 MB** | | |

All four `.pmtiles` are committed to git (per the migration commit). They are served as static files from `/tiles/*.pmtiles` and consumed via `pmtiles://` protocol registered in `src/app/parcels/map/page.tsx` map-init.

### Build pipeline

`scripts/update-tiles.sh` orchestrates:

1. `scripts/fetch-dda-plots.ts` — pulls all DDA plots from `gis.dda.gov.ae` ESRI services into newline-delimited GeoJSON.
2. `scripts/fetch-ad-plots.ts` — same for Abu Dhabi.
3. `scripts/prepare-tiles.ts` — **enrichment**: derives `color` (from land use → 9-cat legend hex), `height` (from `MAX_HEIGHT_FLOORS × 3.5`, fallback to `gfaSqm/areaSqm × 3.5`), splits each plot into 1 flat (`height: 0`) + 1–3 tier features (`podium`, `body`, `crown`) using `FLOOR_H = 3.5`, `PODIUM_TOP = 14`, `CROWN_H = 7` — i.e. the same constants `loadZaahiPlots` uses for ZAAHI Signature, just baked into PMTiles instead of computed at runtime.
4. `tippecanoe` — bakes the enriched GeoJSON into `.pmtiles`.

Source GeoJSON is preserved on disk (`data/tiles/*.geojson.nl`), so a re-bake does **not** require re-fetching from DDA.

### 3D layer code

`src/app/parcels/map/page.tsx`:

* `ZAAHI_BUILDINGS_3D` — fill-extrusion fed by GeoJSON source `zaahi-plots-buildings`, populated by `loadZaahiPlots` from `/api/parcels/map`. **`fill-extrusion-opacity: 1`** (literal number, MapLibre constraint), `fill-extrusion-color: ["get", "color"]`, `fill-extrusion-height: ["get", "height"]`.
* PMTiles fill-extrusion layers (one per source) — added by `addLandTileSource(...)`. **`fill-extrusion-opacity: 0.35`** (literal number). Same `color` / `height` data-expression bindings.
* Buildings layer (`src/app/parcels/map/buildings/`) — custom MapLibre `CustomLayer` that renders glTF artist-delivered models via Three.js. *Independent* of the two extrusion paths above. Toggled on per-listing via the Buildings panel and `?buildingRotation` URL override.

The 9-category land-use → hex map (`ZAAHI_LANDUSE_COLOR`) is shared between `loadZaahiPlots` and `prepare-tiles.ts`, so both paths produce the same colour for a given category. This part of the migration was clean.

---

## Regression root cause

### "Double 3D" (transparent + opaque)

* **Where it comes from:** for every ZAAHI listing parcel that *also* exists as a DDA plot (which is most of them, since they were seeded *from* DDA), both `ZAAHI_BUILDINGS_3D` and the PMTiles `_3D` layer paint a fill-extrusion. ZAAHI's polygon is the plot polygon **shrunk by setbacks** and split into podium/body/crown by `loadZaahiPlots`; PMTiles' polygon is the **raw DDA plot footprint** with the same height. They overlap, but the PMTiles footprint is wider (no setback applied for the listings) and so peeks out around the solid ZAAHI extrusion, giving the "ghost" effect at `opacity: 0.35`.

* **Why it isn't a true regression:** opacity 1 / 0.35 is the *spec* in `CLAUDE.md` (founder spec 2026-04-15). What was missing from that spec is **filter exclusion** for the PMTiles layer when a plot is also a ZAAHI listing.

* **Filter-side check on the data:** `data/tiles/*.geojson.nl` features carry `PLOT_NUMBER`. The 114 ZAAHI listing plot numbers are queryable from Postgres (`SELECT plotNumber FROM "Parcel"`). So a runtime MapLibre filter `["!", ["in", ["get", "PLOT_NUMBER"], ["literal", [<114 numbers>]]]]` is mechanically possible without re-baking; the 114 numbers are baked into the page bundle at build time.

### Abu Dhabi / Al Ain wrong heights

* **Where it comes from:** AD heights in PMTiles are derived from whatever fields the AD ESRI source exposes. `scripts/fetch-ad-plots.ts` and `scripts/prepare-tiles.ts` (line ~236+) read `MAX_HEIGHT_FLOORS` if present and otherwise fall back to a FAR-derived guess (`gfaSqm / areaSqm × 3.5`). For AD/Al Ain plots that lack both `MAX_HEIGHT_FLOORS` and `gfaSqm`, the fallback chain ends in `height = 0` for the flat tier and skips the tiered extrusions entirely — but for plots where the FAR fallback fires with a malformed area, heights can balloon (a 484k-sqm plot with a misread 100x scaling factor will produce a 35,000 m extrusion, which the user would see as "слишком высокое").

* **Why screenshot 26-04 11:33:08 looks reasonable but 28-04 18:12:18 (API Horizon Pointe) does not:** the latter is *not* a PMTiles render — it's the digital-twin Buildings layer (custom artist model) drawn on top of a ZAAHI plot. The model's height is baked into the `glTF` and is decoupled from `Parcel.affectionPlans[].maxHeightMeters`. So the side panel says "26 floors / 120 units" (parcel data) and the rendered tower is 50+ floors (artist model). That's not a PMTiles bug — it's a Buildings-layer data binding gap.

### Three.js / fill-extrusion FBO collisions

The recent commits `f675ba2` and `44dcd61` were specifically fixes for the digital-twin `CustomLayer` colliding with MapLibre's depth pass. They are **not** related to the double-3D issue. They are tracked here for completeness because they touch the same files.

---

## Path options

| # | Option | Sketch | Pros | Cons | Effort | Risk |
|---|---|---|---|---|---|---|
| 1 | **Pure per-parcel GeoJSON** — revert PMTiles, serve all 461K plots through API routes | Re-introduce `/api/layers/*` for the full DDA / AD / Oman datasets | Editable per-plot at runtime; fixes "double 3D" trivially (one source); simpler mental model | Loses 5× egress/start-cost win; Vercel cold starts on 99K-plot endpoints; AD 362K too big to ship without pagination | XL (1–2 wks) | High — proven to be infeasible at scale, that's why we migrated |
| 2 | **Hybrid** — PMTiles for zoom < 15 overview, GeoJSON for zoom ≥ 15 editable detail | Two sources, switch on zoom; PMTiles shows DDA backdrop, GeoJSON serves editable per-plot building shapes for top zooms | Editable where it matters (close zoom), efficient at low zoom; preserves backdrop | Tile/GeoJSON consistency burden (both must match); double the rendering glue | L (3–5 days) | Medium — two systems to keep in sync |
| 3 | **Re-bake PMTiles excluding the 114 listings + add runtime filter as stopgap** | `scripts/prepare-tiles.ts` learns to drop features whose `PLOT_NUMBER` is in a hardcoded ZAAHI-listings list; rebuild + commit. Until rebuild lands, MapLibre filter on PMTiles 3D layer keyed on the 114 plotNumbers | Surgical — fixes "double 3D" exactly; no architecture change; runtime filter ships in minutes | Requires PMTiles re-bake when listings list changes (currently rare — 114 plots, slow growth) | M (1–2 days incl. rebuild + smoke + deploy) | Low — narrowly scoped, reversible |
| 4 | **Editable overlay on top of tiles** | Keep PMTiles as-is, draw an *additional* per-plot GeoJSON overlay for the 114 listings with z-index above PMTiles, and *fade out* the underlying PMTiles extrusion under each listing using `fill-extrusion-color` modulation | No tile rebuild needed | The "fade out" trick fights MapLibre's painting order (extrusions are blended in z, not in a stack); founder reviewed this earlier and the workaround was unstable | M (2–3 days) | High — fragile, depends on draw-order |

### Hosting comparison

| Host | Pricing (current usage: ≈177 MB tiles, ≈10K reads/day est.) | HTTP Range support | Notes |
|---|---|---|---|
| **Vercel static** (current) | Bundled with Vercel plan; egress counted against site bandwidth | ✓ | Currently serves from `public/tiles/`. Counts toward Vercel bandwidth. |
| **Cloudflare R2** | $0.015/GB-month storage + zero egress | ✓ | Best for high-egress / global; zero-egress is the killer feature. |
| **Supabase Storage** | $0.021/GB-month + $0.09/GB egress | ✓ | Aligns with our Supabase footprint; egress non-trivial at scale. |
| **Vercel Blob** | $0.15/GB stored + $0.40/GB egress | ✓ | Most expensive; Vercel-only (sovereignty rule violation per `CLAUDE.md`). Avoid. |

If Option 3 lands and tile size stays ≤200 MB, Vercel static is fine. If we ever go past ≈500 MB or see egress >50 GB/mo, **Cloudflare R2** is the move — sovereignty-compatible, zero-egress, range-supported, plays nice with PMTiles.

---

## Recommendation

**Option 3 (re-bake PMTiles minus the 114 listings + temporary runtime filter), single iteration.**

Rationale:
* Fixes the "double 3D" deterministically — the only place where ZAAHI listings render is `ZAAHI_BUILDINGS_3D` once we strip them from the PMTiles source.
* Doesn't touch `loadZaahiPlots`, `computeSetbackM`, `insetRingByMeters`, the podium/body/crown logic, or the 9-cat legend (the four DO-NOT-TOUCH zones in `CLAUDE.md`).
* Preserves the 461K-plot DDA backdrop the platform depends on.
* Reversible — if the rebuild is wrong, prior `.pmtiles` are recoverable from git.
* PMTiles re-bake is not a recurring tax: at 114 listings growing slowly, a rebuild every few weeks is acceptable. The pipeline is already idempotent.

**Out-of-scope for Phase B (subject to founder confirmation):**
* AD / Al Ain wrong-height fix — needs separate investigation with concrete plot examples (the audit script `scripts/audit-bugs-batch-2026-04-28.ts` only flagged 4 plots in `bug1_heightAudit_flagged`, all in Dubai; AD heights would need a per-plot review with founder pointing to specific cases).
* Buildings layer (digital-twin) height vs `Parcel.maxHeightMeters` reconciliation — this is its own bug surface, outside PMTiles.

---

## Open questions (founder)

1. **Re-bake cadence.** Each new ZAAHI listing requires re-baking PMTiles (or it'll show up as a double-3D again until the next bake). Are we OK with manually re-baking on a "few times a month" cadence, or do we want this on a CI cron?
2. **Buildings-layer data binding.** Should the digital-twin model's height be *forced* to match `Parcel.affectionPlans[].maxHeightMeters` (truncate model at that height, scale, etc.), or is artist intent meant to override DDA spec? Screenshot evidence (API Horizon Pointe) suggests current behaviour confuses users — the side panel says 26 floors and the model is visibly taller.
3. **Stopgap MapLibre filter.** Until the re-bake lands, do we want the runtime filter shipped (small `src/app/parcels/map/page.tsx` change, low-risk), or wait for the full Option 3? My recommendation is ship the filter immediately and rebake at leisure.
4. **AD/Al Ain wrong-height triage.** Before we touch PMTiles for AD, can the founder list 3–5 specific plot numbers (with expected vs actual heights) so we can root-cause without guessing? The audit didn't surface AD/Al Ain plots in the height-mismatch list because there are only 3 AD parcels in the DB and they all have `maxHeightMeters` set; the wrong-height claim must be about *PMTiles backdrop* plots, not ZAAHI listings.

---

## Phase B (NOT executed in this session)

If founder approves Option 3:

1. Add `ZAAHI_LISTING_PLOT_NUMBERS` constant export from a new `scripts/zaahi-listing-numbers.ts` (queried from DB once, frozen in repo as a TS array). Keep this in lockstep with parcel adds — add to founder's "add a plot" checklist.
2. Update `scripts/prepare-tiles.ts` to drop features whose `PLOT_NUMBER` is in that list before tippecanoe.
3. Re-run `scripts/update-tiles.sh --skip-fetch` to rebake PMTiles from existing GeoJSON.
4. (Stopgap) Add a runtime filter on the PMTiles 3D extrusion layer in `src/app/parcels/map/page.tsx` keyed on the same constant, so listings drop out immediately without waiting for the rebake to ship to Vercel.
5. Smoke-test on three plots per region (Dubai, AD, Al Ain) after rebake — visual + DevTools console verification per `CLAUDE.md` smoke-test checklist.

End of Phase A.

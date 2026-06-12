# Tile pipeline v2 — DESIGN

**Author:** agent
**Date:** 2026-06-12
**Branch:** `research/tile-pipeline-v2` (design-doc only, no code touched)
**Status:** PROPOSAL — founder reviews and decides on rebuild separately

> This document is the single deliverable of the
> `research/tile-pipeline-v2` branch. **STOP** at the end of §6 for
> founder review. No code, no R2 mutations, no tile generation has
> been performed.

---

## TL;DR

The deployed PMTiles (DDA + AD-ADM + AD-Other on R2) carry an
ad-hoc subset of the source columns, drop areas, and lose any
notion of **community / district / emirate identity**. The map page
fakes some of these by reading the (smaller) Parcel-table rows and
the Community KML at runtime, but the tiles themselves are blind:
they have `plotNumber`, `landUse`, `color`, `height`, `base`,
`tier`, `status`, an opaque `district` / `community` for AD only,
and a rounded `areaSqm`. Most other source fields never made the
trip.

v2 closes this gap with a fixed target schema (§2), a single
reproducible build command (§3), a static plot-number → coordinate
index for global search (§4), a phased migration with a working
rollback (§5), and an Oman / build-script cleanup pass (§6).

Hard constraints kept throughout:

- Tippecanoe writes **directly** to `.pmtiles` — never `.new`.
  See memory `feedback_pmtiles_verification`.
- `xxd -l 8` magic-byte check (`504d 5469 6c65 7303`) before any
  upload, decode 5 named plots, founder sign-off before commit.
- `--maximum-zoom=18` stays the canonical tippecanoe cap. Source +
  camera maxZoom locked to 18 in lockstep. Memory
  `project_pmtiles_overzoom_band` is the contract.
- Per-emirate tilesets remain separated (Dubai DLD ≠ AD ADM ≠
  AD OTHER). No cross-emirate mixing.
- Per CLAUDE.md АВТОНОМИЯ v2: any R2 *deletion* is a STOP
  (§6 details).

---

## 0. A note on what's already in the repo vs. this doc

Two pre-existing files cover adjacent territory:

- `docs/r2-migration-plan.md` (2026-05-23) — describes the *current*
  R2 setup that has since been executed (commit `68c364a`,
  2026-05-24). The R2 bucket, env var, CORS rule, and z18 rebuild
  are all live in production. **This v2 design assumes that
  infrastructure as the starting point** and does not duplicate it.
- `docs/research/dda-bulk-refresh.md` (2026-06-04) — recon for the
  Parcel-table "refresh kobonpka" task. Confirms the tile pipeline
  is a build-box operation, not a Vercel-function operation. v2
  inherits that constraint.
- `BACKLOG.md` items "update-tiles.sh — stale AD paths" (2026-05-13)
  and "feat/oman-full-removal" (2026-06-03) describe two real
  hygiene problems v2 fixes by construction.

---

## 1. INVENTORY — Sources of truth

### 1.1 DDA (Dubai)

| Aspect | Value |
|---|---|
| Live source | `https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query` |
| Fetched by | `scripts/fetch-dda-plots.ts` |
| On-disk | `data/layers/dda-plots/*.geojson` (one file per `PROJECT_NAME`, gitignored) |
| Version / date of dump | Last touched in repo: commit `2b94172` (2026-04-13) for the original 99K snapshot. Last data refresh in source: continuous, no version tag (cadastre updates ad-hoc). `data/layers/dda-plots/` does not exist in this checkout — agent runs `fetch-dda-plots.ts` against the live ArcGIS endpoint before each rebuild. |
| Plot count | ~99,235 (per `dda-bulk-refresh.md` recon, 2026-06-04) |
| Source attributes requested (`OUT_FIELDS`) | OBJECTID, PLOT_NUMBER, PROJECT_NAME, ENTITY_NAME, DEVELOPER_NAME, AREA_SQM, AREA_SQFT, GFA_SQM, GFA_SQFT, MAX_HEIGHT_FLOORS, MAIN_LANDUSE, SUB_LANDUSE, CONSTRUCTION_STATUS, IS_FROZEN, BUILDING_SETBACK_SIDE1-4, PODIUM_SETBACK_SIDE1-4 (20 fields) |

**What actually lands in the deployed `dda-land.pmtiles`** (per `prepare-tiles.ts:processDdaDir` → `emitTiers`):

| Tile feature property | Source | Notes |
|---|---|---|
| `plotNumber` | DDA `PLOT_NUMBER` | OK |
| `mainLandUse` | DDA `MAIN_LANDUSE` | OK, free-text |
| `subLandUse` | DDA `SUB_LANDUSE` | OK |
| `areaSqm` | DDA `AREA_SQM`, `Math.round` | **Rounded** — loses sub-square-metre precision (real cost: 0; flagged only because §2 mandates 1:1) |
| `areaSqft` | DDA `AREA_SQFT`, `Math.round` | **Rounded** |
| `gfaSqm` | DDA `GFA_SQM`, `Math.round` | **Rounded** |
| `status` | DDA `CONSTRUCTION_STATUS` | Raw string — "Completed" / "Under Construction" / "Pre-Construction" / "Suspended" / "Empty" / "No Data" |
| `landUse` | computed via `parseDdaLandUse` | Canonical ZAAHI category (RESIDENTIAL / COMMERCIAL / …) |
| `hasLandUse` | bool | derived |
| `source` | literal `"dda"` | OK |
| `color` | derived from `landUse` | hardcoded per category; redundant w/ `landUse` |
| `height`, `base`, `tier` | derived | OK |
| `district` / `community` / `emirate` | **MISSING** | Not in OUT_FIELDS, never in tile |
| `gfaSqft` | **MISSING** | Source has it (`GFA_SQFT`), not requested, recovered in page.tsx by ×10.7639 |
| `OBJECTID` / `ENTITY_NAME` / `DEVELOPER_NAME` / `MAX_HEIGHT_FLOORS` (raw) / `IS_FROZEN` / `BUILDING_SETBACK_SIDE1-4` / `PODIUM_SETBACK_SIDE1-4` | **DROPPED** | OUT_FIELDS requests them, `prepare-tiles.ts` ignores all except `MAX_HEIGHT_FLOORS` (used to derive `height`) |

**Source ↔ tile drift list (DDA):**

1. **No `emirate`** — page.tsx can't filter "show only Dubai PMTiles" from a tile property. Currently inferred from source-id (`DDA_LAND_TILES_SRC`).
2. **No `district` / `community`** — global search by district / community-name needs Parcel-table fallback. Cadastral context lost.
3. **`status` is the raw DDA string**, not a 5-bucket canonical. Each consumer re-parses (drone-fps aggregate script, listing-card status logic, future filter UI). Per `drone-fps-postmortem-2026-06-11.md` aggregate vocab in `/home/zaahi/scratch/drone-fps/aggregate-status-by-community.mjs`: DDA emits Completed / Under Construction / Pre-Construction / Suspended / Empty / No Data → canonical buckets `completed / underConstruction / preConstruction / suspended / empty / null`.
4. **Areas rounded** — `Math.round(areaSqm)` discards sub-square-metre precision. Recoverable from source on every rebuild but irreversible inside the tile.
5. **Developer / entity names dropped** — search by developer ("Emaar") is impossible from tiles today.

### 1.2 Abu Dhabi — Municipality (ADM)

| Aspect | Value |
|---|---|
| Live source | `https://onwani.abudhabi.ae/arcgis/rest/services/MyLand/SMARTHUB/MapServer/0/query` |
| Fetched by | `scripts/fetch-ad-plots.ts` (single fetcher, then split by `MUNICIPALITYENG`) |
| On-disk | `data/layers/ad-plots/*.geojson` (one per `DISTRICTENG`, gitignored) |
| Version / date | Same — last in-repo touch commit `2b94172` (2026-04-13). Live ArcGIS, no version tag. |
| Plot count (ADM) | ~210K (memory + `dda-bulk-refresh.md` p. 80) |
| Source attributes requested | PLOTNUMBER, DISTRICTENG, COMMUNITYENG, MUNICIPALITYENG, CALCULATEDAREA, PRIMARYUSEENGDESC, Construction_Status, MAXALLOWABLEHEIGHTS, DevCode_FAR, DevCode_MaxGFA, DevCode_Category, OWNERSHIPTYPE (12 fields) |

**Tile properties (`ad-land-adm.pmtiles`):**

| Property | Source | Notes |
|---|---|---|
| `plotNumber` | `PLOTNUMBER` | OK — but **only unique within `(DISTRICT, COMMUNITY, PLOTNUMBER)`**, not globally. |
| `district` | `DISTRICTENG` | OK, lands as a tile property — better than DDA |
| `community` | `COMMUNITYENG` | OK |
| `municipality` | `MUNICIPALITYENG` (`"ADM"`) | OK |
| `areaSqm` | `CALCULATEDAREA`, rounded | Rounded |
| `primaryUse` | `PRIMARYUSEENGDESC` | OK |
| `status` | `Construction_Status` | Raw strings: "Constructed" / "Under Construction" / "Only Boundary Wall" / "Not Constructed" |
| `landUse` | derived (strategy B for INVESTMENT) | OK |
| `source` | literal `"ad"` | OK — but does NOT distinguish ADM vs Other Other; both stamp `"ad"` |
| `MAXALLOWABLEHEIGHTS` | source | **DROPPED** — caller now uses `adDefaultHeight(primaryUse)` capped at 150 m. The zoning ceiling is gone from the tile. |
| `DevCode_FAR` / `DevCode_MaxGFA` / `OWNERSHIPTYPE` / `DevCode_Category` (raw) | source | **DROPPED** — devCategory used internally for land-use fallback but raw value not emitted. |
| `areaSqft` | **MISSING** | Source doesn't provide; page.tsx recovers via ×10.7639 |
| `emirate` | **MISSING** | Same gap as DDA |
| `plotNumberGlobal` | **MISSING** | Sequential within community → cannot be searched as a single id |

### 1.3 Abu Dhabi — AAM + WRM (Other)

Same source endpoint, fetched in the same script. Split happens at
prepare-tiles time by `MUNICIPALITYENG !== "ADM"`. Plot count ~200K
(AAM Al Ain + WRM Western Region).

Schema identical to §1.2. Tile property `municipality` carries the
actual AAM / WRM code per row (good).

### 1.4 data.dubai — Amenities (4 point overlays)

| Aspect | Value |
|---|---|
| Source | data.dubai raw JSON dumps in `docs/research/data-dubai/raw/` (gitignored) |
| Pipeline | `scripts/convert-amenities-geojson.ts` (one-off converter) → `data/layers/amenities/*.geojson` (committed) |
| Files | `ev-chargers.geojson`, `marine-stations.geojson`, `metro-stations.geojson`, `tram-stations.geojson` |
| Served via | `/api/layers/amenities/*` (public API per CLAUDE.md SECURITY rule) |
| Plot count | small (per-station POIs, not parcels) |

**Not in PMTiles.** Served as GeoJSON by the API. v2 scope does
**not** include amenities; flagged here only for inventory
completeness.

### 1.5 Community KML (Dubai community polygons)

| Aspect | Value |
|---|---|
| Source | `data/layers/Community__1_.kml` (14,339 lines, committed) |
| Filename suffix `_20260115` | Suggests a 2026-01-15 snapshot from Dubai Pulse |
| Schema fields used | `CNAME_E` (English name), `CNAME_A` (Arabic), `COMM_NUM` (community ID) |
| Used by | Map page Community layer + the drone-fps aggregate script for the spatial join (community ↔ plot polygons) |

**Not in PMTiles** today. v2's optional improvement: bake the
community spatial join into prepare-tiles.ts so every DDA tile
feature carries `community_id` directly. Closes the global-search
gap §4. See §2 for proposed property name.

### 1.6 Oman — Muscat (Seeb contract) — ORPHAN

| Aspect | Value |
|---|---|
| Live source | `https://geoportal.mm.gov.om/server/rest/services/SeebContract_MIL1/MapServer/11/query` |
| Fetched by | `scripts/fetch-oman-plots.ts` |
| Plot count | 94,640 |
| Tile | `oman-land.pmtiles` on R2 (~35 MB, last-modified 2026-05-24) |
| Currently served? | **NO.** All references in `src/app/parcels/map/page.tsx` were removed 2026-05-24. The R2 object and the build-script entries are orphan. See §6. |

### 1.7 KML layers (master plans, freezones, etc.)

`data/layers/*.kml` — Meydan Horizon, Al Furjan, Dubai Island,
Pearl Jumeirah, etc. Served as GeoJSON via `/api/layers/dda/...`,
not in PMTiles. Out of v2 scope.

### 1.8 Drift summary

| Drift | DDA | AD-ADM | AD-Other |
|---|---|---|---|
| `emirate` in tile | missing | missing | missing |
| `district` in tile | missing | present | present |
| `community` in tile | missing | present | present |
| `plot_number` globally unique | yes (7-digit) | no (within community) | no |
| `area` 1:1 | rounded | rounded | rounded |
| Physical status canonical 5-bucket | no — raw string | no — raw string | no — raw string |
| `land_use` canonical 10-cat | yes (matches CLAUDE.md) | yes | yes |
| `developer` / `project` searchable | dropped | n/a (no equivalent field) | n/a |
| Raw setbacks (DDA's 8 sides) | dropped | n/a (source has none) | n/a |

---

## 2. TARGET SCHEMA

Every v2 tile feature carries the following property bag. JSON
property names use **snake_case** (one convention, consistent
across DDA + AD + future emirates). All names below are proposals
— see open-question table at end of §2.

### 2.1 Mandatory properties (every feature, all three tilesets)

| Property | Type | Value rules | Source mapping |
|---|---|---|---|
| `plot_number` | string | The cadastral plot number as the source returns it. **No padding, no zero-stripping**, exact bytes. | DDA `PLOT_NUMBER`; AD `PLOTNUMBER` |
| `plot_id` | string | **Globally unique** within ZAAHI: `<emirate>-<district_id>-<community_id>-<plot_number>` for AD, `dda-<plot_number>` for DDA. Used by the search index (§4) as the canonical key. | derived |
| `emirate_id` | string | Canonical: `"dubai"`, `"abu_dhabi"`. Future emirates: `"sharjah"`, etc. | inferred from source (DDA → dubai; AD → abu_dhabi) |
| `district_id` | string \| null | Slug of `DISTRICTENG` for AD (e.g. `"al-reem-island"`). For DDA: the community-KML `COMM_NUM`-derived slug after spatial join (§2.4 below). | source + spatial join |
| `community_id` | string \| null | Slug of `COMMUNITYENG` for AD. For DDA: the `CNAME_E` slug (§2.4). | source + spatial join |
| `area_sqm` | number | **1:1**, not rounded. DDA emits decimal; AD emits decimal. Persisted as the raw float. | DDA `AREA_SQM`; AD `CALCULATEDAREA` |
| `area_sqft` | number | **1:1**, not rounded. DDA has `AREA_SQFT` directly; AD: compute `area_sqm * 10.7639104167` and persist. | DDA `AREA_SQFT`; AD computed |
| `land_use` | string | Canonical ZAAHI 10-category enum (uppercase, underscore form to match `ZAAHI_LANDUSE_COLOR` keys): `RESIDENTIAL` / `COMMERCIAL` / `MIXED_USE` / `HOTEL` / `INDUSTRIAL` / `EDUCATIONAL` / `HEALTHCARE` / `AGRICULTURAL` / `FUTURE_DEVELOPMENT` / `INVESTMENT`. `null` when none derivable. | derived (existing `parseDdaLandUse` / `parseAdLandUse` logic) |
| `physical_status` | string | Canonical 5-bucket enum: `COMPLETED` / `UNDER_CONSTRUCTION` / `PRE_CONSTRUCTION` / `SUSPENDED` / `EMPTY`. `null` when source is "No Data" or unknown. **Pre-mapped at build time**, not raw. | DDA `CONSTRUCTION_STATUS` → bucket; AD `Construction_Status` → bucket (per `aggregate-status-by-community.mjs` map: Constructed→COMPLETED, Under Construction→UNDER_CONSTRUCTION, Only Boundary Wall→PRE_CONSTRUCTION, Not Constructed→EMPTY; AD has no SUSPENDED equivalent) |

### 2.2 Geometry / rendering properties (every feature)

Kept from v1; renamed for consistency with the new schema:

| Property | Type | Notes |
|---|---|---|
| `tier` | enum | `"flat"` / `"podium"` / `"body"` / `"crown"`. Drives the MapLibre filter split (2D fill vs 3D extrusion). |
| `height` | number | Metres. Tier-relative top. |
| `base` | number | Metres. Tier-relative bottom. |
| `color` | hex string | Derived from `land_use` via `ZAAHI_LANDUSE_COLOR`. Kept in tile because MapLibre `match` expressions on `land_use` work too but the literal is cheaper for the renderer. |

### 2.3 Optional properties — source-of-record passthroughs (debug + future filters)

Included by default; explicit so they don't get dropped silently.

| Property | DDA source | AD source | Why keep |
|---|---|---|---|
| `gfa_sqm` | `GFA_SQM` | computed from `DevCode_MaxGFA` if present | Building density UI |
| `gfa_sqft` | `GFA_SQFT` | derived | Building density UI (current code re-derives) |
| `max_floors` | `MAX_HEIGHT_FLOORS` (parsed integer, not the raw "G+N" string) | derived from `MAXALLOWABLEHEIGHTS` | Listing-card "Floors: N" surface |
| `max_height_m` | derived from `MAX_HEIGHT_FLOORS × FLOOR_H` | `MAXALLOWABLEHEIGHTS` | Audit / filter |
| `developer_name` | `DEVELOPER_NAME` | — (n/a) | Search "find every Emaar plot" |
| `project_name` | `PROJECT_NAME` | — (n/a) | DDA-side project grouping |
| `primary_use_raw` | — (n/a) | `PRIMARYUSEENGDESC` | AD-side debug surface |
| `dev_category_raw` | — (n/a) | `DevCode_Category` | AD-side INVESTMENT fallback path debugging |
| `source` | literal `"dda"` | literal `"ad_adm"` / `"ad_other"` | Per-emirate-per-municipality routing (v1 mixed `"ad"`) |

### 2.4 Spatial join for DDA `district_id` / `community_id`

DDA tiles today have no community/district stamp. Closing this gap
at tile-build time:

1. Load `data/layers/Community__1_.kml` (2026-01-15 Dubai
   Pulse snapshot, committed).
2. Build a bounding-box-indexed array of community polygons keyed
   by `CNAME_E` + `COMM_NUM`.
3. For every DDA plot polygon, point-in-polygon test the plot
   centroid against the community polygons. (The `drone-fps`
   aggregate script does this exact join already — port that code
   path into `prepare-tiles.ts` rather than re-invent.)
4. Persist `community_id` (slug of `CNAME_E`) + `district_id`
   (slug of community-to-district lookup; DDA does not distinguish
   district from community so for Dubai `district_id ===
   community_id` — flag for founder).

> Cost: ~99K point-in-polygon tests per DDA rebuild. The
> drone-fps script does the same work in <30 s on a build box.

### 2.5 Per-emirate file layout (no cross-emirate mixing)

Per founder spec, each emirate's source-of-truth stays separate.
v2 keeps:

- `dubai-land.pmtiles` (was `dda-land.pmtiles` — renamed to reflect
  emirate, not the regulator). Single file, 99K plots, ~52 MB.
- `abu_dhabi-land-adm.pmtiles` (was `ad-land-adm.pmtiles`). ~210K
  plots, ~134 MB.
- `abu_dhabi-land-other.pmtiles` (was `ad-land-other.pmtiles`). ~200K
  plots, ~166 MB.

Three files. Legends per-emirate. Per-emirate filters operate on
`emirate_id` inside each tile (so a future "show all emirates" UI
treatment can union them client-side, but the on-disk separation
stays).

### 2.6 Open questions

| # | Question | Why it matters | Default if no answer |
|---|---|---|---|
| Q1 | Should the property naming be `snake_case` (this doc) or `camelCase` (v1 tiles use camel)? `camelCase` matches the existing `page.tsx` consumer; `snake_case` is friendlier for cross-language tools (Python aggregator, future Postgres FDW). | breaking change to consumer side either way | needs founder clarification |
| Q2 | Should DDA `district_id` equal `community_id` (DDA has no superordinate district concept), or stay null? | filter UX | needs founder clarification |
| Q3 | Is `INVESTMENT`'s strategy B (founder spec 2026-06-03) still canonical, or should the v2 build re-evaluate with fresh AD data? | ~29K AD plots category | assume yes — keep strategy B |
| Q4 | Should the build commit the spatially-joined DDA community polygon **set** (not just the property) so we can serve a Dubai-side `/api/layers/dda/community/<id>` endpoint without re-running the join? | API surface | out of scope for §2; flagged for §4 |
| Q5 | `physical_status` for AD has no SUSPENDED bucket. Map it to `null` or to a 6th bucket `"NOT_APPLICABLE"`? | filter UI | needs founder clarification |
| Q6 | `area_sqft` for AD is computed (×10.7639104167). Is that an acceptable transformation under the "1:1, no rounding" rule? Source AD has no native sqft. | precision policy | recommend yes — flag explicitly as derived |

---

## 3. PIPELINE

A single command runs the whole rebuild end-to-end. Proposed name:
`pnpm tiles:build` (npm script alias for the underlying shell
script). The script orchestrates six steps. All run on a build box
with native `tippecanoe`, `python3`+`shapely`, and `wrangler` (per
existing `dda-bulk-refresh.md` constraints — this is not a Vercel
function).

### 3.1 Step 1 — Source ingestion

Each emirate has its own fetcher (already in repo, kept):

| Emirate | Script | Output |
|---|---|---|
| Dubai (DDA) | `scripts/fetch-dda-plots.ts` (extend `OUT_FIELDS` to add `GFA_SQFT` — currently requested but worth confirming it round-trips) | `data/layers/dda-plots/<project>.geojson` (per-project files) |
| Abu Dhabi (ADM + Other) | `scripts/fetch-ad-plots.ts` (no schema change) | `data/layers/ad-plots/<district>.geojson` |

Both fetchers cache `data/layers/` so re-runs skip if `--skip-fetch`
is passed. Source-side dump date persisted to
`data/layers/<source>/_FETCHED_AT` (new — small text file recording
the UTC date of the fetch so the audit trail in §3.4 has a value to
print).

**v2 explicit change:** Oman fetcher (`fetch-oman-plots.ts`)
**stays in `scripts/` but is not invoked**. The cleanup in §6
documents what to delete and what to keep.

### 3.2 Step 2 — Normalisation (prepare-tiles.ts rewrite)

`scripts/prepare-tiles.ts` becomes the single transformer. It reads
the raw GeoJSON dumps and emits one newline-delimited GeoJSON per
output tileset, with **every feature carrying the §2 schema**.

Key v2 changes vs current `prepare-tiles.ts`:

1. **Emit `emirate_id`** on every feature.
2. **Emit canonical `physical_status`** (string → 5-bucket map) per the `aggregate-status-by-community.mjs` table:
   - DDA "Completed" → `COMPLETED`
   - DDA "Under Construction" → `UNDER_CONSTRUCTION`
   - DDA "Pre-Construction" → `PRE_CONSTRUCTION`
   - DDA "Suspended" → `SUSPENDED`
   - DDA "Empty" → `EMPTY`
   - DDA "No Data" → `null`
   - AD "Constructed" → `COMPLETED`
   - AD "Under Construction" → `UNDER_CONSTRUCTION`
   - AD "Only Boundary Wall" → `PRE_CONSTRUCTION`
   - AD "Not Constructed" → `EMPTY`
   - AD has no SUSPENDED equivalent → `null` (Q5 default)
3. **Emit `area_sqm` / `area_sqft` as raw floats** — drop the `Math.round`.
4. **DDA spatial join** for `district_id` / `community_id`. Reuse the bbox-indexed point-in-polygon code from `aggregate-status-by-community.mjs` (port into a small `src/lib/tile-build/community-join.ts` for reuse + testability). Build-side only; not shipped to runtime.
5. **Stable `plot_id`** generator (§2.1) — required by §4 search index.
6. **`source` becomes `"ad_adm"` / `"ad_other"`** instead of both `"ad"`, so consumers can route without re-checking `municipality`.
7. **Optional pass-through fields** (§2.3) emitted by default. Tippecanoe will drop properties that are empty for a given feature via `--no-tile-stats`-friendly output (no special flag needed — empty values still ship but cost <1 byte each in MVT).
8. **Inset (footprint setback)** logic unchanged — `data/layers-inset/` produced by `inset-geojson.py`, indexed by the same per-dataset key builders.
9. **`landUse` field** retained at the canonical `land_use` name; existing `ZAAHI_LANDUSE_COLOR` mirror in the file stays in lockstep with `src/app/parcels/map/page.tsx` (per CLAUDE.md "source-of-truth in code" rule).

### 3.3 Step 3 — Tippecanoe (per emirate)

Per-emirate, written **directly** to the final `.pmtiles` path
(never `.new`). Honours `feedback_pmtiles_verification`.

```bash
TIPPE_ARGS=(
  --layer=plots
  --minimum-zoom=10
  --maximum-zoom=18           # locked per project_pmtiles_overzoom_band
  --drop-densest-as-needed
  --extend-zooms-if-still-dropping
  --force
  --quiet
)

# Dubai
tippecanoe -o public/tiles/dubai-land.pmtiles --name="ZAAHI v2 — Dubai land plots" \
  "${TIPPE_ARGS[@]}" data/tiles/dubai-plots.geojson.nl

# Abu Dhabi — split by municipality to keep each <100 MB the historical
# constraint that drove the v1 split. Stays in v2 because R2 doesn't
# care but a single 300 MB PMTiles ≈ 1× full file load worst-case on
# the first range request.
tippecanoe -o public/tiles/abu_dhabi-land-adm.pmtiles \
  --name="ZAAHI v2 — Abu Dhabi land plots — ADM" \
  "${TIPPE_ARGS[@]}" data/tiles/abu_dhabi-plots-adm.geojson.nl

tippecanoe -o public/tiles/abu_dhabi-land-other.pmtiles \
  --name="ZAAHI v2 — Abu Dhabi land plots — Al Ain + Western Region" \
  "${TIPPE_ARGS[@]}" data/tiles/abu_dhabi-plots-other.geojson.nl
```

Output paths use the v2 names (renamed from `dda-` / `ad-`). The
old filenames stay on R2 untouched per §5.

### 3.4 Step 4 — Verification

Per `feedback_pmtiles_verification.md`, run **before** the upload
and **before** founder-approval pause:

```bash
# 4a. Magic-byte check — must be 504d 5469 6c65 7303 = "PMTiles\x03"
for f in public/tiles/dubai-land.pmtiles \
         public/tiles/abu_dhabi-land-adm.pmtiles \
         public/tiles/abu_dhabi-land-other.pmtiles; do
  magic=$(xxd -l 8 -p "$f")
  if [ "$magic" != "504d54696c657303" ]; then
    echo "✗ BAD MAGIC on $f: $magic — abort" >&2
    exit 1
  fi
done

# 4b. Decode 5 named plots per file
# Pre-pick 5 well-known plots per emirate from the spot-check list
# below; tippecanoe-decode → grep PLOT_NUMBER → confirm bytes match
# source expectation:
#   Dubai DDA   : Burj Khalifa (3920701), Al Habtoor Polo (...), Marasi Bay (...), DIFC Plot 4 (...), Business Bay 5 (...)
#   AD ADM      : Al Bateen 3M, Reem C5, Khalidiyah 72a, Saadiyat C2, Maryah Tower 1
#   AD Other    : Al Ain Hili 5, Al Ain Industrial 12, Madinat Zayed 3, Liwa Centre 1, Mussafah 8

# 4c. Feature-count assertions: count plots in source vs tile.
#     A divergence > 2% on any tileset is a build-error fail.
#     The 2% slop is for tippecanoe's --drop-densest-as-needed
#     dropping a handful of overlapping plots at low zoom — but never
#     at z18 (we cap there and feed the same plot one feature at each
#     tier level; drop at z18 = real bug).

# 4d. Pause for founder approval. Present:
#     - magic bytes per file
#     - feature counts per file (source / tile / delta)
#     - 5-plot decode receipt per file
#     - delta vs v1 (plots gained / lost / changed bucket)
```

### 3.5 Step 5 — R2 upload (versioned, atomic cutover)

Versioned object keys so cutover is atomic and rollback is a
config flip, not a re-upload.

```
R2 layout (proposed):
  zaahi-tiles/tiles/v1/dda-land.pmtiles                  ← current live (untouched by v2 build)
  zaahi-tiles/tiles/v1/ad-land-adm.pmtiles                ← current live
  zaahi-tiles/tiles/v1/ad-land-other.pmtiles              ← current live
  zaahi-tiles/tiles/v1/oman-land.pmtiles                  ← orphan, §6

  zaahi-tiles/tiles/v2/dubai-land.pmtiles                 ← NEW from this build
  zaahi-tiles/tiles/v2/abu_dhabi-land-adm.pmtiles         ← NEW
  zaahi-tiles/tiles/v2/abu_dhabi-land-other.pmtiles       ← NEW

  zaahi-tiles/tiles/v2/index/plot-number-index.json       ← §4 search index
  zaahi-tiles/tiles/v2/MANIFEST.json                      ← {schemaVersion: 2, builtAt, counts, magic}
```

Note v2 paths use `v2/` not `v2-2026-MM-DD/` — the per-rebuild
audit trail lives inside `MANIFEST.json` (committed alongside the
upload), and HTTP cache invalidation is handled by changing the
deployed env var (§5) rather than by busting filenames. If a
second v2 rebuild is needed before v3, write to `v2-rebuild-N/`
and bump the env var.

> **Issue with the v1 layout already on R2:** the live keys today
> are `tiles/dda-land.pmtiles` (no `v1` prefix), driven by
> `addLandTileSource(... "/tiles/dda-land.pmtiles")` in
> `page.tsx:4658`. v2 introduces the `v1`/`v2` prefixes for new
> uploads only; the existing live objects stay where they are and
> get a copy into `tiles/v1/...` as part of stage 1 of the
> migration (cp, not move). This way the live runtime never breaks
> mid-flight, and stage 5 (cleanup) can `rm tiles/dda-land.pmtiles`
> only after v2 is stable in prod for N weeks.

Upload script (replace / extend `scripts/upload-tiles-r2.sh`):

```bash
# Upload v2 alongside v1 (copy, never overwrite v1)
for f in dubai-land abu_dhabi-land-adm abu_dhabi-land-other; do
  wrangler r2 object put "zaahi-tiles/tiles/v2/${f}.pmtiles" \
    --file="public/tiles/${f}.pmtiles" \
    --content-type=application/octet-stream
done
wrangler r2 object put "zaahi-tiles/tiles/v2/index/plot-number-index.json" \
  --file="public/tiles/v2-index.json" \
  --content-type=application/json
wrangler r2 object put "zaahi-tiles/tiles/v2/MANIFEST.json" \
  --file="public/tiles/v2-MANIFEST.json" \
  --content-type=application/json

# Verify each upload — HEAD + Range smoke test
for f in dubai-land abu_dhabi-land-adm abu_dhabi-land-other; do
  curl -sI -H "Range: bytes=0-7" \
    "${CDN_BASE}/tiles/v2/${f}.pmtiles" | grep -i "^http"
done
```

### 3.6 Step 6 — Code switch

A single env-var bump on Vercel + a small `page.tsx` edit gated by
a feature flag. The blast radius is exactly one runtime constant.

```tsx
// Inside page.tsx — top-level constants block (around line 3880)
const TILES_V2 = process.env.NEXT_PUBLIC_USE_TILES_V2 === "true";

const DUBAI_LAND_TILES_URL = TILES_V2
  ? "/tiles/v2/dubai-land.pmtiles"
  : "/tiles/dda-land.pmtiles";
const AD_ADM_TILES_URL = TILES_V2
  ? "/tiles/v2/abu_dhabi-land-adm.pmtiles"
  : "/tiles/ad-land-adm.pmtiles";
const AD_OTHER_TILES_URL = TILES_V2
  ? "/tiles/v2/abu_dhabi-land-other.pmtiles"
  : "/tiles/ad-land-other.pmtiles";

// Existing addLandTileSource call sites (page.tsx:4658-4660 and
// page.tsx:5131-5133) take URL strings — swap to the constants:
addLandTileSource(map, DDA_LAND_TILES_SRC, ..., DUBAI_LAND_TILES_URL);
addLandTileSource(map, AD_ADM_TILES_SRC, ..., AD_ADM_TILES_URL);
addLandTileSource(map, AD_OTHER_TILES_SRC, ..., AD_OTHER_TILES_URL);
```

Plus the consumer-side property reads inside `addLandTileSource`
(currently mapped to `plotNumber`, `mainLandUse`, `areaSqm`, etc.)
need to learn the v2 schema. Property-name compatibility option:
either keep v1 names (Q1 default: `camelCase`) and translate at
build time, or update all reads inside the helper to v2 names. The
flag isolates this entire change to a single deploy.

**Invariants for this page.tsx edit (per `feedback_page_tsx_review_before_edit`):**

| Invariant | Preserved by |
|---|---|
| `fill-extrusion-opacity: 0.45` literal — no data expressions | unchanged |
| Source `maxzoom: 18` + camera `maxZoom: 18` — paired | unchanged |
| ZAAHI listings layer (114) overrides PMTiles via the symmetric exclusion filter | unchanged (filter applies to `plotNumber` property; v2 keeps `plot_number` value the same as v1's `plotNumber`, so the filter source-of-data is stable) |
| `addLandTileSource` is the single touchpoint for all 3 tile layers | preserved |
| Auth flow + `<AuthGuard>` untouched | confirmed — change is in render path, not auth |
| Founder review gate | this design doc + the v2 build itself trigger it |

---

## 4. SEARCH INDEX

The §3 plot of "global search by plot number across all emirates"
needs more than `querySourceFeatures` (only sees the current
viewport). Three options were considered:

### 4.1 Option A — Static JSON index served from R2 (RECOMMENDED)

A single file built alongside the tiles:

```
/tiles/v2/index/plot-number-index.json
```

Format:

```json
{
  "schemaVersion": 2,
  "builtAt": "2026-06-12T18:00:00Z",
  "totalPlots": 509235,
  "index": {
    "<plot_number>": [
      {
        "plot_id": "dubai-dda-3920701",
        "emirate": "dubai",
        "lng": 55.27,
        "lat": 25.20,
        "land_use": "COMMERCIAL"
      }
    ]
  }
}
```

Why an *array* per key: AD plot numbers are NOT globally unique
(sequential within community → e.g. plot `1` exists in every AD
community). DDA's 7-digit `PLOT_NUMBER` IS unique, but the index
treats all entries uniformly so cross-emirate ambiguity surfaces
in the UI ("we found 23 plots numbered '1' — which community?").

**Size estimate:**
- ~509,235 DDA + AD plots × ~120 bytes per entry = ~60 MB raw JSON.
- gzip-on-R2 typically compresses JSON by 4-6×. ~10-15 MB on the wire.

**Performance:**
- One fetch on page load (or first search). Background prefetch via
  `<link rel="prefetch">` is fine.
- Lookup is O(1) hash on parsed object.
- Memory: ~80-100 MB parsed in V8 heap. Acceptable on desktop;
  borderline on a 2 GB mobile. Mitigation: shard by emirate
  (`dubai-index.json` + `abu_dhabi-index.json`) and lazy-load on
  first character of the search query.

**Rationale to pick this:**
- Built once at tile-build time → free, no runtime cost.
- Cached on R2 edge → fast everywhere.
- Survives a page reload; no DB hit.
- Same "rebuild monthly" cadence as the tiles — naturally
  consistent.

### 4.2 Option B — API endpoint over the index

A Next.js route `/api/parcels/search?plot=<n>` that reads the
same JSON file from R2 (or a Postgres mirror).

**Pros:** smaller browser payload (single result per request).
**Cons:** every search hits a Vercel function (cold start);
sovereignty-readiness wins from R2 evaporate when the API becomes
the dependency.

The route already exists for ZAAHI listings only:
`/api/parcels/by-plot-number/[plotNumber]` (used by
`mapPageActions.searchPlot` at `page.tsx:5386`). The v2 plot-number
index is the matching surface for PMTiles plots. Could be a thin
wrapper around the same JSON file but that's pure overhead.

### 4.3 Option C — `map.querySourceFeatures` on the loaded tiles

What the renderer already supports. Limitation:
**viewport-bounded** — invisible to plots outside the current view.
For "I'm in Dubai, find plot X in Abu Dhabi" this fails completely.
Dishonest to pretend it solves the spec.

### 4.4 Recommendation

**Option A** — static JSON index, sharded per emirate, served
from R2 alongside the tiles. Built by `prepare-tiles.ts` (extend
`emitTiers` to also write a row to a `Map<string, IndexEntry[]>`,
serialise at the end of `main()`). The UI search input fetches
`/tiles/v2/index/<emirate>-plot-number-index.json` on first input,
caches in `sessionStorage`, looks up in O(1). Adds ~10 MB to the
first-paint critical path **only** for users who actually open
search — gate on the input focus event, not on page load.

Open question Q7: which emirate to lazy-load by default? Probably
`dubai-plot-number-index.json` since the map opens centred on
Dubai. Then prefetch `abu_dhabi-...` on idle. — needs founder
clarification (small UX decision).

---

## 5. MIGRATION PLAN

Phased rollout. Every stage has an explicit rollback command. No
stage merges to `main` without founder approval (per CLAUDE.md
АВТОНОМИЯ v2 STOP #1).

### Stage 1 — Build v2 in parallel with v1

| Action | Where | Time |
|---|---|---|
| Run the §3 pipeline end-to-end on a build box | local | ~30–60 min (per `dda-bulk-refresh.md`) |
| Upload v2 tiles + index + manifest to `zaahi-tiles/tiles/v2/...` | R2 | ~5 min |
| Copy live `tiles/dda-land.pmtiles` → `tiles/v1/dda-land.pmtiles` (and same for AD) so v1 has a versioned home for the eventual cleanup pass | R2 | ~2 min (server-side copy) |

**Code changes:** none. **Runtime impact:** none (no consumer
reads v2 yet).

**Rollback:** `wrangler r2 object delete zaahi-tiles/tiles/v2/...`
(safe — nothing reads from v2 yet). Per CLAUDE.md АВТОНОМИЯ v2
STOP #3: deleting **shared R2 objects requires explicit founder
approval**. For self-built v2 artefacts that no one consumes yet
the delete is low-risk, but the rule applies — pause and ask.

### Stage 2 — Feature flag on Preview only

| Action | Where | Time |
|---|---|---|
| Apply the §3.6 page.tsx edit on a `feat/tiles-v2` branch | code | 30 min (incl. invariant table) |
| Set `NEXT_PUBLIC_USE_TILES_V2=true` on **Preview environment only** in Vercel | env | 1 min |
| Deploy Preview, founder smokes against zaahi-{hash}.vercel.app | both | 5–10 min |

Verification checklist on Preview (founder, browser F12):

- [ ] 3D buildings render (no white holes, no missing extrusion).
- [ ] DDA spot-check plots show `district_id` / `community_id` in hover.
- [ ] AD plots show `physical_status` 5-bucket value, not raw string.
- [ ] Global plot-number search returns the right plot from any viewport.
- [ ] Feature count in browser DevTools matches the v2 manifest.

**Rollback:** `vercel env rm NEXT_PUBLIC_USE_TILES_V2 preview --yes`.
Preview reverts to v1 on next deploy. Per the 2026-06-12 incident
captured in CLAUDE.md АВТОНОМИЯ v2 STOP #3: a `preview`-scope
remove can sometimes nuke a multi-target entry — set the env var
on Preview *only* (never Preview + Production simultaneously) to
avoid that footgun.

### Stage 3 — Default-on in Production

| Action | Where | Time |
|---|---|---|
| Merge `feat/tiles-v2` → `main` via PR (founder STOP #1) | code | review + merge |
| Set `NEXT_PUBLIC_USE_TILES_V2=true` on Production env | Vercel | 1 min |
| Vercel auto-deploys; v2 is now live for all users | prod | 3 min |

Verification on prod: same checklist as Stage 2 on `zaahi.io`.

**Rollback:** `vercel env rm NEXT_PUBLIC_USE_TILES_V2 production --yes`.
Next request hits v1 again — *guaranteed clean*, no rebuild
required, no R2 mutation, no schema migration. The v1 PMTiles are
still at their original paths, the v1 tile reader code is still in
the bundle (guarded by `if (!TILES_V2)`).

This is the cleanest rollback property of the design: the feature
flag is the only thing that has to flip.

### Stage 4 — Soak

| Duration | What to watch |
|---|---|
| N weeks (founder picks N) | Real-user error rates, R2 egress bill, browser console for any "Wrong magic number" or "PMTiles archive failed", drone-fps aggregate consistency |

Stage 5 below is **gated** on Stage 4 passing — no automatic
clock.

### Stage 5 — Cleanup (R2 + code)

**STOP — explicit founder approval required** per CLAUDE.md
АВТОНОМИЯ v2 STOP #3 ("УДАЛЕНИЕ shared-ресурсов").

| Action | Command | Reversible? |
|---|---|---|
| Delete `zaahi-tiles/tiles/dda-land.pmtiles` (live-prefix v1 file) | `wrangler r2 object delete zaahi-tiles/tiles/dda-land.pmtiles` | Only via re-upload from local rebuild |
| Delete `zaahi-tiles/tiles/ad-land-adm.pmtiles` | same | same |
| Delete `zaahi-tiles/tiles/ad-land-other.pmtiles` | same | same |
| Delete `zaahi-tiles/tiles/v1/...` (the safety copies) | same | same |
| Remove the `if (!TILES_V2)` branch from page.tsx | code (separate PR, founder STOP #1) | git revert |

Each delete is its own STOP gate. The order matters: delete the
`v1/` safety copies *last*, after the runtime no longer references
the original live-prefix paths.

### Stage N — Oman cleanup (§6, decoupled)

Oman is an R2 orphan today (§1.6). Its cleanup is *independent* of
the v1→v2 cutover; can happen earlier or later. See §6 for the
plan.

---

## 6. CLEANUP

### 6.1 Oman — orphaned tile + build-script entries

`oman-land.pmtiles` exists on R2 (~35 MB, last-modified 2026-05-24)
but is not referenced by any code in `src/`. Three scripts still
build and upload it:

| File | What to remove | Lines |
|---|---|---|
| `scripts/upload-tiles-r2.sh` | line 57 (`oman-land.pmtiles` from FILES array) | −1 |
| `scripts/update-tiles.sh` | mkdir (line 62), inset pass (75–80), tippecanoe build (122–125), magic-check (132), commit-msg stats (159) | ~−15 |
| `scripts/prepare-tiles.ts` | `parseOmanLandUse` (118–135), `omanKey` (321), `processOmanDir` (469–562), `main()` wiring (575–615) | ~−100 |
| `scripts/fetch-oman-plots.ts` | keep on disk (CLAUDE.md "NEVER delete `data/`" + script may be the only reference to the Muscat endpoint) but mark `[DEPRECATED 2026-05-24]` in the header comment | 0 deletions |

**R2 object delete — STOP** per CLAUDE.md АВТОНОМИЯ v2:

```bash
# After founder approval ONLY:
wrangler r2 object delete zaahi-tiles/tiles/oman-land.pmtiles --remote
```

Founder approval gate: this is a paid-storage object (~$0.0005/mo,
trivial) but the rule applies regardless of cost.

**Data on disk** — `data/layers/oman-plots/`,
`data/tiles/oman-plots.geojson.nl` — **KEEP**. CLAUDE.md AGENT RULES:
"NEVER delete or overwrite files in the `data/` directory".

**Documentation** — the inline comments in `page.tsx:3892–3895`
("Oman PMTiles consts removed 2026-05-24") already point at this
cleanup as a deferred task. The §6 plan retires them.

### 6.2 Saudi remnants — already removed

`page.tsx:1397` confirms `saudiGovernorates`, `riyadhZones`,
`omanLandPlots` LayerDef flags are gone. No build-script entries
for Saudi remain (Saudi was never tippecanoe-built). Nothing to
clean.

### 6.3 Build-script orphans

| File / output | Status | Action |
|---|---|---|
| `scripts/rebuild-tiles-z18.sh` | Used to bootstrap z18 migration 2026-05-24; superseded by `update-tiles.sh` (now defaults to z18) | Mark `[DEPRECATED — z18 is the default in update-tiles.sh as of 68c364a]` in header comment; keep file for the audit trail |
| `scripts/upload-tiles-r2.sh` Step 4 ("Range-request smoke test on `dda-land.pmtiles`") | Targets the old `dda-land.pmtiles`; needs to also smoke-test `v2/dubai-land.pmtiles` after §3.5 | Extend in v2 build, not deleted |
| `BACKLOG.md` item "update-tiles.sh — stale AD paths" (2026-05-13) | Real bug — `update-tiles.sh` Step 4 commit-msg references `data/tiles/ad-plots.geojson.nl` (singular, doesn't exist) — fails silently because `wc -l` swallows the error | Fixed by §3 rewrite; remove from BACKLOG.md once v2 ships |
| `scripts/inset-geojson.py` Oman path | Same as §6.1 — drop the Oman branch in the loop | −5 lines |

### 6.4 Audit-trail proposals

- Add `data/layers/<source>/_FETCHED_AT` per §3.1 so each rebuild
  has a source-date receipt.
- Add `public/tiles/v2/MANIFEST.json` per §3.5 with build SHA,
  source dates, plot counts, magic bytes.
- Add a `pnpm tiles:verify` script that reads the manifest and
  re-runs the magic-byte + 5-plot decode checks against the
  *live R2 URLs* — usable as a post-deploy smoke from any dev box.

---

## STOP — Founder review gate

This design doc is the entire deliverable of
`research/tile-pipeline-v2`. No code outside this file has been
changed. No tiles built. No R2 objects mutated. No env var set.

Decisions wanted before any rebuild:

1. **Q1 (snake_case vs camelCase)** — which property convention?
2. **Q2 (DDA district vs community)** — null `district_id`, or
   equal to `community_id`?
3. **Q5 (AD SUSPENDED bucket)** — null, or new `NOT_APPLICABLE`
   bucket?
4. **Q6 (AD computed sqft)** — accept the ×10.7639104167
   derivation as "1:1"?
5. **Q7 (search-index default emirate)** — Dubai on focus,
   AD prefetched? Or both eager?
6. **Oman R2 delete** — approve §6.1 ?
7. **v1/v2 R2 copy** — approve the §5 Stage-1 server-side copy
   of live PMTiles into `tiles/v1/` for the eventual cleanup?
8. **Schedule** — go ahead with the full §3 pipeline run, or
   start with a dry-run on Dubai only?

Until founder confirms, no further work on this branch.

# Hover-card field inventory: land-use subtype, regulated height, affection-plan dates

Date: 2026-09-28. Branch `fix/map-ux-batch-1`. Note: `page.tsx` was being edited concurrently (hover-highlight work) while this was written, so its line numbers are approximate (drift of roughly 10-20 lines); grep the quoted identifiers. Read-only investigation: no DB queries, no tile or R2 changes, no migrations, `data/` untouched.

## 1. Summary (source x field)

Legend: **TILES** = already a PMTiles feature property. **API/DB** = in DB and/or an existing API response, reachable without a migration. **REBUILD** = needs a PMTiles rebuild + R2 upload. **NO** = not available in any local source.

| Source (hover card) | (a) Land-use SUBTYPE | (b) Regulated HEIGHT (not FAR/GFA-derived) | (c) Affection plan issue / expiry |
|---|---|---|---|
| DDA land plots (PMTiles `dda-land`) | **TILES**: `subLandUse` (98.0% of raw plots, 95.7-98.2% of sampled tile plots). Not read by the card today | **REBUILD**: `MAX_HEIGHT_FLOORS` ("G+2") is in local raw data (95.2% non-empty, ~82% code-like) but NOT baked into tiles. Tier `height` is derived, not regulatory | **NO** in tiles, **NO** in local raw. Live DDA layer 2 has `SITEPLAN_ISSUE_DATE` / `SITEPLAN_EXPIRY_DATE` but the bulk fetch never requested them and the service now answers 499 (see 2.1). REBUILD + re-fetch, or per-hover API fetch |
| Abu Dhabi land plots (PMTiles `ad-land-adm`, `ad-land-other`) | **NO** real subtype. `primaryUse` (19 values, main category) is in tiles and already shown. `DevCode_Category` is raw only (67.7%), coarse, not baked | **REBUILD**: `MAXALLOWABLEHEIGHTS` in local raw (97.7% non-zero) but NOT baked; looks like a zoning ceiling (66.7% of plots = 300), meaning unverified | **NO** anywhere |
| Master-plan plots | KML layers: **NO** (only CAD `Layer` name). `masterplans-land.pmtiles` (JVC+JVT, 981 plots): `subLandUse` 100% (codes such as HRG/MRA/VIL), but that file is a local artifact not wired to the map | KML: **NO**. JVC/JVT pmtiles: `maxHeightMeters` 86.7%, `maxFloors` 46.2%, but these are estimates (`hsrc`: typology/floors/none), NOT regulated | **NO** |
| ZAAHI listings (DB, `/api/parcels/map`) | **API/DB**: `plan.landUseMix[].sub` is already in the response, dropped when the client builds feature props (`page.tsx:1880-1918`). No migration | **API/DB, already shown**: `maxHeightCode`, `maxFloors`, `maxHeightMeters` (card rows exist). `maxHeightMeters` is derived from G+N x 4 m, or seeded manually | **API/DB**: issue already shown (`planDateIso = sitePlanIssue ?? fetchedAt`, so it can silently be a fetch date). Expiry: column `sitePlanExpiry` exists but `/api/parcels/map` does not select it, so an API select change only, no migration |
| Vault, owner rows | Same route and fields as ZAAHI listings | same | same |
| Vault, shared with me (`/api/vault/shared-with-me/map`) | **API/DB** when a public parcel plan exists; snapshot fallback gives `landUseMix[].sub` (uppercase SUB_LANDUSE) | plan present: code, floors, meters. Snapshot fallback: `maxFloors` only (no code, meters forced null) | plan present: issue only (expiry not selected). Snapshot fallback: neither |
| Buildings 3D layer (`useBuildingsLayer`) | no hover card (feature-state highlight only) | n/a | n/a |
| Boundary layers (communities, AD municipality/district/community, DDA projects, free zones, amenity points) | name-only popups, not plots | n/a | n/a |

Which fields can be shown without a rebuild or migration:
- DDA PMTiles card: subtype only (`subLandUse`, tile-prop, no rebuild). Height and dates need a rebuild (height) or a rebuild + re-fetch of DDA layer 2 (dates), or a DB/API fetch on hover.
- ZAAHI / vault cards: subtype (client-only change), expiry (API select change). No migration for either.
- AD PMTiles card: nothing new without a rebuild; no subtype or dates exist in the data at all.

## 2. Per-source detail

### 2.0 How the cards read their data (keys the UI step must use)

Three React hover cards, all state-driven (not maplibre popups), rendered in `src/app/parcels/map/page.tsx`. Shared row component `PmtilesHoverRow` and `formatPlanDate` (ISO to "14 Mar 2026") in `src/app/parcels/map/HoverCardParts.tsx:63,105`. Priority: ZAAHI > shared vault > PMTiles (`page.tsx:2913-2939`).

**PMTiles card** (`ddaLandHover`): state type `page.tsx:345-355`; handler `addLandTileSource` mousemove on the flat 2D fill layer only (`page.tsx:2904-2959`; filter `tier == flat`, so the 3D extrusion layers have no hover); JSX `page.tsx:5101-5188`. Keys read from `feature.properties`:
- plot number: `plotNumber`
- source badge: `source` ("dda" or "ad") plus `municipality` ("ADM" / "AAM"); shown as DDA / ADM / AAM, else "AD" (so AD "WRM" plots show plain "AD"); a source of "masterplan" would show no badge
- land use line: `mainLandUse || primaryUse` (raw strings, not the normalized `landUse` key)
- area: `areaSqm`, `areaSqft` (AD tiles have no `areaSqft`, so sqft = round(sqm x 10.7639))
- max GFA: `gfaSqm` (row hidden when 0; AD tiles have no `gfaSqm`, so never shown for AD)
- status: `status` via `formatPmtilesStatus`
- also read but not displayed: `district`
- The JSX comment at `page.tsx:5179-5184` says "Max Height + Affection Plan rows intentionally omitted" and names `MAX_HEIGHT_FLOORS + MAX_HEIGHT_METERS + AFFECTION_PLAN_DATE`. No `AFFECTION_PLAN_DATE` field exists anywhere in the data or code, so that hint is not actionable as written.

**ZAAHI card** (`zaahiHover`): state `page.tsx:300-322`; handler `page.tsx:3485-3558` (mousemove on `ZAAHI_PLOTS_FILL`); JSX `page.tsx:4917-5023`. Reads feature props `id, plotNumber, district, emirate, area, priceAed, landUse, projectName, plotAreaSqm, plotAreaSqft, maxGfaSqm, maxGfaSqft, maxFloors, maxHeightMeters, maxHeightCode, far, planDateIso`. Badge from `emirate` (Dubai=DDA, Abu Dhabi=ADDED). Rows shown: Plot Area, Max GFA, FAR, Max Height (`code · N floors · ~M m`), Affection Plan (`planDateIso`). Land use and status are NOT shown on this card (comment at 4932-4936 says no physical status field exists on Parcel/AffectionPlan).

**Vault card** (`vaultHover`): state `page.tsx:326-344`; handler `vaultMove` (`page.tsx:~3385-3445`, bound to `VAULT_SHARED_3D`); owner-side vault rows ride the ZAAHI handler. JSX `page.tsx:5024-5100`. Same rows plus Asking Price; badge "VAULT" / "SHARED".

Feature properties for ZAAHI/vault rows are built in `loadZaahiPlots` (`page.tsx:1886-1918`) and `loadVaultShared` (`page.tsx:2580-2593`).

Method for all fill rates below: local files only. Tiles read with `pmtiles@4.4.1` + `@mapbox/vector-tile@2.0.4` + `pbf@4.0.1` from `node_modules/.pnpm` (scripts in the scratchpad, nothing installed). Sample = unique `tier == flat` plot features across a tile window (PMTiles are built with `--drop-densest-as-needed`, so low-zoom tiles undercount; values are sample rates, not registry totals). Tiles sampled were the local `public/tiles/*.pmtiles`; whether the R2 copies used in production are byte-identical is unverified. "Non-empty" excludes "", null and 0.

### 2.1 DDA land plots (`public/tiles/dda-land.pmtiles`, built 2026-09-21)

Baked properties (verified from tile metadata and features): `plotNumber, mainLandUse, subLandUse, areaSqm, areaSqft, gfaSqm, status, landUse, hasLandUse, source, color, height, base, tier`. Baker: `scripts/prepare-tiles.ts:330-383` (`baseProps` at 366-377). Baked source: `data/layers/dda-plots/*.geojson`, fetched by `scripts/fetch-dda-plots.ts` (99,247 features on disk).

| Field | Where it lives | Fill rate | Example |
|---|---|---|---|
| (a) subtype | tile prop `subLandUse` (from `SUB_LANDUSE`) | Sample A (z15, +-3 tiles at 55.27,25.2): 1,731 / 1,809 = 95.7%. Sample B (z14, +-3 tiles at 55.24,25.11): 19,461 / 19,811 = 98.2%. Raw local: 97,252 / 99,247 = 98.0% | `VILLA` (62,297 raw plots), `ATTACHED VILLAS`, `APARTMENT`, `APARTMENT - RETAIL`, `SUBSTATION 11 KV`, `LANDSCAPE`, `CHILDREN NURSERY`; 393 distinct raw values, can be compound |
| main category (for reference) | tile prop `mainLandUse` | 100% / 99.9% (sample); raw 98,936 / 99,247 = 99.7% | `RESIDENTIAL`, `COMMERCIAL - HOSPITALITY - RESIDENTIAL`, `FUTURE DEVELOPMENT` |
| (b) regulated height | raw only: `MAX_HEIGHT_FLOORS` in `data/layers/dda-plots`; NOT in tile props (read at `prepare-tiles.ts:349`, consumed only to compute the derived tier `height`). `MAX_HEIGHT_METERS`, `MAX_HEIGHT`, `HEIGHT_CATEGORY` exist on the live DDA layer 2 (interface at `scripts/seed-dda-batch.ts:172-174`) but are not in `fetch-dda-plots.ts` OUT_FIELDS (lines 14-37) | Raw `MAX_HEIGHT_FLOORS`: non-empty 94,498 / 99,247 = 95.2%; but 13,202 are "N/A", 4,749 empty, 231 text ("SEE NOTES" 205, "UNLIMITED" 17, ...). Code-like (starts G/B/M/digit) about 81,065 = 81.7%. Only ~62,347 (62.8%) match the `+N$` regex that `parseDdaFloors` uses, so "G+1+R", "G+M" and "G+2P+8" are handled loosely | `G+2` (32,213), `G+1` (24,456), `G+1+R` (16,021), `G` (1,532), `G+4`, `G+14`, `G+2P+8`; 332 distinct values |
| (b') derived tier height (NOT regulatory) | tile prop `height` / `base` on tier features (podium/body/crown), layer `DDA_LAND_TILES_3D`, which has no hover | n/a | floors x 3.5, else GFA-derived (`ceil(gfa/(area x 0.6)) x 3.5`), else land-use default (`prepare-tiles.ts:355-363`); mixes three sources and cannot be told apart in the tile |
| (c) affection plan dates | not in tiles. Not in local raw (`SITEPLAN_*` keys absent from all 99,247 features). Live DDA layer 2 attrs `SITEPLAN_ISSUE_DATE`, `SITEPLAN_EXPIRY_DATE` (epoch ms) are used by seed scripts (`scripts/seed-dda-batch.ts:187-188,531-532`, `add-plot-1340498.ts:144-147`, `seed-jv-*.ts`). The DIS PlotInfo HTML has "Site Plan Issue/Expiry Date" (`src/lib/dda.ts:209-210`) | not measured (no local data) | epoch-ms number on layer 2; ISO string after `dmyToIso` |

Blocker to note for (c): `src/lib/dda-plot-lookup.ts:150-160` documents that since 2026-09-26 BASIC_LAND_BASE answers every query with HTTP 200 + `{"error":{"code":499,"message":"Token Required"}}`. I did not call DDA (read-only task), so whether SITEPLAN dates are currently retrievable in bulk is unverified.

### 2.2 Abu Dhabi land plots (`public/tiles/ad-land-adm.pmtiles`, `ad-land-other.pmtiles`, both built 2026-06-03)

Baked properties (tile metadata verified): `plotNumber, district, community, municipality, areaSqm, primaryUse, status, landUse, hasLandUse, source, color, height, base, tier` (baker `prepare-tiles.ts:404-484`, `baseProps` 457-468). ADM in `ad-land-adm`, AAM + WRM + others in `ad-land-other`. No `gfaSqm`, no `areaSqft`, no `mainLandUse`. Raw source: `data/layers/ad-plots/*.geojson` (362,007 features), fetched by `scripts/fetch-ad-plots.ts` with 12 fields (lines 14-27).

| Field | Where it lives | Fill rate | Example |
|---|---|---|---|
| (a) subtype | Not available. Closest: `primaryUse` (tile, main category, 19 values) and `DevCode_Category` (raw only, not baked) | `primaryUse` 100% in samples (ADM z14 +-2 tiles at 54.37,24.47: 16,139 plots; Al Ain z14 +-2 at 55.76,24.21: 4,535 plots). `DevCode_Category` raw: 245,145 / 362,007 = 67.7% non-empty | `primaryUse`: Residential 182,622, Agricultural 52,078, Investment 31,304, Commercial 21,905, Utility 21,075, ... No villa/apartment level exists in these fields. `DevCode_Category`: Residential, Other, Commercial, Civic, Industrial, Desert, N/A |
| (b) regulated height | raw only: `MAXALLOWABLEHEIGHTS`; read at `prepare-tiles.ts:426` into `maxHeightStr` but never used or baked. Tier `height` = per-`primaryUse` default capped at 150 m (`prepare-tiles.ts:391-402,453`), not regulatory | Raw: 353,801 / 362,007 = 97.7% non-zero (8,206 are 0) | `300` (241,348 plots = 66.7%), `150` (55,528), `200` (14,632), `64.1` (11,156), `309.8`. Unit is presumably metres (script comment calls it a "zoning cap up to 500 m"); meaning/unit unverified. The dominant "300" looks like a generic ceiling, not a per-plot value |
| (c) affection plan dates | Not available: no such field in the ADM SMARTHUB layer as fetched | n/a | n/a |

### 2.3 Master-plan plots

Two different things exist.

1. Map layers actually wired (`LAYER_REGISTRY`, `page.tsx:1364-1370`, hover at `page.tsx:3265-3285`): KML to GeoJSON line layers served by `/api/layers/masterplans/*` and `/api/layers/dubai-islands` (Dubai Islands, Meydan Horizon, Al Furjan, Intl City 2&3, Residential District, D11, Nad Al Hammer). Hover popup shows only the cleaned CAD `Layer` string (`PDF _MP_LU_MU-Residential+Retail` becomes "MU-Residential+Retail") plus the layer label. The KML `SimpleData` fields are only `fid, Layer, SubClasses, EntityHandle` (checked in all 7 KML files). Al Furjan route whitelists `Layer, fid, EntityHandle` (`src/app/api/layers/masterplans/al-furjan/route.ts`). No subtype, height or dates, and no plot numbers.
2. `data/tiles/masterplans-land.pmtiles` (JVC + JVT, built 2026-09-14, 1.5 MB, git-ignored via `data/tiles/`): no reference to it in `src/` or `scripts/` (searched for `masterplans-land` and `masterplan-plots`), so it is not shown on the map today. Built from `data/tiles/masterplan-plots.geojson.nl` by a tippecanoe command recorded in the tile metadata (the generating script for that `.nl` is not in `scripts/`; unverified who produces it). Baked properties: `plotNumber, mun, dld, source("masterplan"), community, district, block, projectName, mainLandUse, subLandUse, massing, areaSqm, areaSqft, gfaSqm, gfaSqft, far, maxFloors, maxHeightMeters, hsrc, status, gnd, geom, boundary, confidence, landUse, hasLandUse, color, height, base, tier`.

Fill rate over the 981 flat features in the `.nl` (same content as the tiles; sample = the whole file):

| Field | Fill | Example |
|---|---|---|
| `subLandUse` | 981 / 981 = 100% | `FRP` 160, `MRA` 157, `MRP` 142, `VIL` 109, `TCP` 82, `MRM` 76, `HRA` 75, `MRH` 46 (typology codes, human label is in `mainLandUse`, e.g. "High-rise residential (G series)") |
| `maxFloors` | 453 / 981 = 46.2% | 5, 17, 11 |
| `maxHeightMeters` | 851 / 981 = 86.7% | 42, 18, 60. `hsrc` says where it came from: typology 486, floors 329, none 130, observed 32, landuse 3, gfa 1. These are estimates, not regulated limits |
| `status` | 503 / 981 = 51.3% | `Completed` 281, `Vacant` 154, `Under Construction` 68 |
| affection plan dates | absent | n/a |

### 2.4 ZAAHI listings / parcels (DB via `GET /api/parcels/map`)

Route `src/app/api/parcels/map/route.ts` (auth: `getApprovedUserId`); it returns per parcel `{id, plotNumber, district, emirate, status, area, geometry, currentValuation, isVault, vaultEntryId, conflictsWithOthers, plan}`, where `plan` comes from the latest `AffectionPlan` row (`orderBy fetchedAt desc, take 1`, select at lines 60-84, mapped at 109-127).

Prisma model `AffectionPlan` (`prisma/schema.prisma:349-398`): `maxHeightCode String?` (367, "G+15"), `maxFloors Int?` (368), `maxHeightMeters Float?` (369), `landUseMix Json?` (373, `[{category, sub, areaSqm}]`), `sitePlanIssue DateTime?` (374), `sitePlanExpiry DateTime?` (375), `fetchedAt DateTime` (353). `Parcel` itself has none of these (`schema.prisma:220-267`).

| Field | Column / path | In API response? | Feature prop today | Fill rate | Example |
|---|---|---|---|---|---|
| (a) subtype | `AffectionPlan.landUseMix[].sub` (parser `src/lib/dda.ts:178-207`) | Yes, `plan.landUseMix` | No; only `deriveLandUse(landUseMix)` -> `landUse` category (`page.tsx:1880`). Type at `page.tsx:1833` already includes `sub` | not measured (no local DB dump; production DB not queried) | shape `{category:"RESIDENTIAL", sub:"VILLA"}`; `sub` may be `""`/null (parser emits `sub:''` for lists without subs; snapshot synthesis emits null). Fixture `tests/e2e/fixtures.ts:44` uses `sub: null` |
| (b) regulated height | `maxHeightCode`, `maxFloors`, `maxHeightMeters` | Yes | Yes (`page.tsx:1904-1906`), card shows `code · N floors · ~M m` | not measured | fixture: `G+12` / 12 / 42 (synthetic, `tests/e2e/fixtures.ts:32-34`). Caveat: `maxHeightMeters = maxFloors x 4` (`dda.ts:73,159`) unless the code contains "(Nm)"; seed scripts also store rendered defaults (`seed-jvc-6817016.ts:81` 80 m "default tower"; `seed-tb02-dubai-water-canal.ts:57` 189 m default for "Unlimited") |
| (c) issue date | `sitePlanIssue` (parsed from DIS PlotInfo, `dda.ts:209`) | Yes, as ISO string (`route.ts:81,120`) | `planDateIso = sitePlanIssue ?? fetchedAt` (`page.tsx:1908`); falls back to the fetch date when issue is null, so the card row "Affection Plan" is not guaranteed to be an issue date | not measured; several seed scripts write `sitePlanIssue: null` (`seed-meydan-6117231.ts:299`, `seed-9235849-al-yalayis-3.ts:280`, `seed-tb02-dubai-water-canal.ts:310`) | `2024-09-09` (`seed-jvc-6817016.ts:72`, expiry null) |
| (c) expiry date | `sitePlanExpiry` | **No.** `route.ts` does not select it | No | not measured; written by `writeAffectionPlan` (`vault-affection-plan.ts:46`), `seed-dda/route.ts:200`, refresh route, seed scripts; null in the scripts listed above | ISO date; DIS format "DD-Mon-YYYY" converted by `dmyToIso` |

So for listings: subtype = client-side change only (copy `it.plan.landUseMix` sub into feature props); expiry = add `sitePlanExpiry: true` to the Prisma select and to `plan` in the JSON (existing column, no migration, no schema change); height and issue date = already present.

For non-DDA (e.g. Abu Dhabi) listings the plan is entered by hand or parsed from a PDF (`src/app/api/parcels/parse-affection-plan/route.ts:69-97` extracts `maxHeightCode`, `sitePlanIssue`, `sitePlanExpiry` "if a date is visible"), so fill depends on what was uploaded. Not measured.

### 2.5 Vault plots

- Owner-side vault rows (VAULT_PRIVATE parcels) are served by the same `/api/parcels/map` and the ZAAHI card (`page.tsx:2523-2530` comment, handler 3485). Same fields and gaps as 2.4. `VaultEntry` (`schema.prisma:806-880`) itself stores only `landUse String?` (one category string, no subtype) plus `ddaSnapshot Json?`. The AffectionPlan row for a vault parcel is written from live DDA via `writeAffectionPlan` (`src/lib/vault-affection-plan.ts:28-50`), which persists all of code, floors, meters, `landUseMix`, `sitePlanIssue`, `sitePlanExpiry`.
- `/api/me/vault/map` selects `sitePlanIssue` but not expiry, and is not fetched by `page.tsx` (only comments mention it).
- Shared-with-me (`/api/vault/shared-with-me/map`, `route.ts:36-129`): from `publicParcel.affectionPlans[0]` it passes `maxHeightCode, maxFloors, maxHeightMeters, far, plotAreaSqft, maxGfaSqft, projectName, sitePlanIssue, buildingLimitGeometry, setbacks, landUseMix, buildingStyle` (no `sitePlanExpiry`). Client maps to `planDateIso = plan.sitePlanIssue` (no `fetchedAt` fallback), `maxHeightCode`, etc. (`page.tsx:2580-2593`); `sub` is not copied to props.
- Fallback when no public parcel plan: `synthesizeAffectionPlanFromDdaSnapshot` (`src/lib/dda-plot-lookup.ts:102-136`) yields only `maxFloors` (from `MAX_HEIGHT_FLOORS` via `parseGroundPlusFloors`, which requires `G` or `G+N`), setbacks, and `landUseMix = [{category, sub}]` (sub = uppercase `SUB_LANDUSE`). `maxHeightMeters` is forced null, and there is no `maxHeightCode` and no dates, so the shared card shows no Max Height code and no Affection Plan row for snapshot-only entries.
- The raw `ddaSnapshot.feature.properties` holds the full layer-2 record (`outFields=*`, `dda-plot-lookup.ts:220`), so it likely contains `SUB_LANDUSE`, `MAX_HEIGHT_FLOORS`, `MAX_HEIGHT_METERS`, `SITEPLAN_ISSUE_DATE`, `SITEPLAN_EXPIRY_DATE` when DDA supplied them. Not verified against any stored snapshot (no DB access), and snapshots created after the 2026-09-26 token wall would not exist.
- The local stored-plot fallback (`src/lib/dda-stored-plot-lookup.ts`, data `data/dda-plot-index.json`, snapshot date 2026-04-10) carries only `file, projectName, areaSqft, landUse` per plot: no subtype, height or dates.

### 2.6 Other hover handlers found

- Buildings 3D footprints (`src/app/parcels/map/buildings/useBuildingsLayer.ts:315-335`): mousemove sets feature-state `hover` and the cursor; no card. Click opens `BuildingCard`. `BuildingDTO` (`buildings/types.ts:20-49`) has `floors` and `heightM` but those are building facts, not regulatory limits.
- Hover highlight overlays (`src/app/parcels/map/hover-highlight.ts`): visual only; key `plotNumber` on PMTiles, `id` on ZAAHI/vault sources.
- Boundary fill layers (`page.tsx:3599-3742`) show one-line name popups: `CNAME_E` (communities), `NAMEENGLISH` (AD municipality/district), `COMMUNITYNAMEENG` (AD community), `ProjectName` (DDA projects, free zones). Amenity points use `renderPointCard` (`page.tsx:3291-3311`). `map-events.ts` has no plot hover handlers.
- No Oman layer: Oman PMTiles were dropped 2026-05-24 (comment at `page.tsx:~3474`); `oman-plots.geojson.nl` is still in `data/tiles/` but unused.

## 3. What each option needs (not done here)

1. **DDA subtype in the PMTiles card**: no rebuild. Read `pr.subLandUse` in the `addLandTileSource` handler (`page.tsx:2947-2956`), add to the `ddaLandHover` state type, render a row or append to the land-use line. Tile size unchanged (already shipped).
2. **DDA regulated height in the PMTiles card**: needs a tile rebuild. Plan: add `maxHeightFloors: floorsRaw` (raw string such as "G+2"; 332 distinct values) to `baseProps` in `processDdaDir` (`prepare-tiles.ts:366`); run `./scripts/update-tiles.sh --skip-fetch` (rebuilds from the existing `data/layers/dda-plots`, no network), verify magic bytes, then `scripts/upload-tiles-r2.sh` to R2. Size impact of the extra string prop not measured. Alternative with no rebuild: on hover, look the plot up server-side (needs a new endpoint over the local raw data or the DB), which costs a request per hover.
3. **DDA affection-plan dates in the PMTiles card**: needs new data. `SITEPLAN_ISSUE_DATE` / `SITEPLAN_EXPIRY_DATE` are not in local raw. Plan: add them to `OUT_FIELDS` in `fetch-dda-plots.ts`, re-run the full fetch (blocked while the 499 wall is up, per `dda-plot-lookup.ts:150`), bake ISO strings into `baseProps`, rebuild, upload. Not possible offline today.
4. **AD height**: bake `MAXALLOWABLEHEIGHTS` (already in raw) into `processAdDir` `baseProps`, rebuild both AD tilesets via `--skip-fetch`, upload. Confirm unit and meaning with a domain source first (66.7% of plots share the value 300). AD subtype and dates: no source data; would need a different upstream layer.
5. **ZAAHI / vault cards**: subtype = copy `landUseMix[0].sub` (or joined subs) into `loadZaahiPlots` / `loadVaultShared` feature props and the hover state; expiry = add `sitePlanExpiry` to the select and response of `/api/parcels/map` (and `/api/vault/shared-with-me/map`), add `planExpiryIso` to props. No schema change (columns exist), no migration, no rebuild. For the shared-vault snapshot fallback, extend `synthesizeAffectionPlanFromDdaSnapshot` to read `SITEPLAN_*` / `MAX_HEIGHT_*` from the snapshot (only useful if stored snapshots contain them: unverified).
6. **Master-plan plots**: if the JVC/JVT pmtiles is ever wired via `addLandTileSource`, it already has `subLandUse` and estimated height; the card's badge logic (`source`) needs a "masterplan" case. No dates exist.

## 4. Unverified / not measured

- DB fill rates for `landUseMix.sub`, `maxHeight*`, `sitePlanIssue`, `sitePlanExpiry` (no local DB dump, production DB not queried).
- Production R2 tiles identical to the local `public/tiles/*.pmtiles` copies.
- Whether DDA layer 2 still exposes `SITEPLAN_*` / `MAX_HEIGHT_METERS` / `HEIGHT_CATEGORY` with real values (endpoint returns 499 per the 2026-09-26 note; I did not call it).
- Unit and semantics of AD `MAXALLOWABLEHEIGHTS`.
- Contents of stored `VaultEntry.ddaSnapshot` rows.
- Which script generates `data/tiles/masterplan-plots.geojson.nl`.

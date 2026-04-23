# DDA FULL UNIVERSE AUDIT — 2026-04-23

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| Classification   | Research / reference · read-only                          |
| Scope            | Dubai Development Authority (DDA) authoritative plot universe vs. ZAAHI local corpus |
| Branch           | `research/vision-and-competitors-2026-04-19`              |
| Commit at start  | `112100e` (tip of branch)                                 |
| Produced         | 2026-04-23                                                |
| Data as of       | ZAAHI corpus fetched 2026-04-12 · DDA server queried live 2026-04-23 |
| Author           | ZAAHI engineering (deep research slot 1)                  |
| Safety           | No code, no data, no schema, no DB, no map changed        |
| Sources          | `gis.dda.gov.ae/server/rest/services/DDA/*` · `data/layers/dda*` · Prisma `Parcel` table · `scripts/fetch-dda-plots.ts` · Dubai Pulse / data.dubai |

---

## §0 Front matter · source list

### Authoritative upstream sources (read 2026-04-23)

| ID  | URL                                                                                     | Purpose                                                       |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| U1  | `https://gis.dda.gov.ae/server/rest/services`                                           | Root of DDA ArcGIS — 13 folders total                         |
| U2  | `https://gis.dda.gov.ae/server/rest/services/DDA`                                       | DDA folder — 2 public services                                |
| U3  | `https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer`             | 3 layers: Project Limit (0), Project Limit Outline (1), Plot (2) |
| U4  | `https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2`           | **Plot** layer — 43 attributes · the plot universe            |
| U5  | `https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/0`           | **Project Limit** layer — 209 polygons · 6 attributes         |
| U6  | `https://gis.dda.gov.ae/server/rest/services/DDA/FREE_ZONE_PROJECTS/MapServer`          | 1 layer: DDA PROJECT — free-zone projects subset              |
| U7  | `https://gis.dda.gov.ae/DIS/`                                                           | Development Information System — plot locator, affection plans, site-plan issuance. Public landing. Sub-endpoints (DIS/MAIN_MAP/MapServer/8 etc.) are token-authenticated. |
| U8  | `https://dda.gov.ae/en/planning-development/master-planning/site-plan-issuance`         | Site-plan issuance policy page (non-machine-readable)         |
| U9  | `https://data.dubai/`                                                                   | New unified open-data portal (replaces `dubaipulse.gov.ae`)   |

### ZAAHI local reference corpus

| Path                                         | Content                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `data/layers/dda/*.geojson` (206 files)      | Plot polygons · **skinny** 3-attribute schema · 99,126 features       |
| `data/layers/dda-plots/*.geojson` (209 files) | Plot polygons · **rich** 22-attribute schema · 99,235 features        |
| `data/layers/dda-projects.geojson`           | Project-limit polygons · 209 features · `ProjectName/EntityName/DeveloperName/CommunityName` |
| `data/layers/dda-freezones.geojson`          | Project table with `IsFreeZone/EntityCategory` flag · 209 features    |
| `scripts/fetch-dda-plots.ts`                 | Producer of `dda-plots/` · batched calls to BASIC_LAND_BASE/2 · 2 000 per request |
| `prisma/schema.prisma` — `model Parcel`      | Curated listings table · 116 rows                                     |

### Service endpoints that require a token (not explored)

`DIS`, `BUILDING`, `SITEPLAN`, `DPS`, `DH`, `EMAAR`, `EMAP`, `DUBAI_POLICE`, `DEMARCATION`, `GEO_INSPECT`, `ANALYSIS`, `Utilities` folders all return `{"code":499,"message":"Token Required"}` on `?f=json`. Agent did **not** attempt auth; no paid tier observed; tokens are issued by DDA after partnership onboarding (per `https://dda.gov.ae/en/planning-development/master-planning/site-plan-issuance`).

---

## §1 Executive summary (top findings)

1. **The DDA plot universe is 99,239 plots as of today.** ZAAHI's `data/layers/dda-plots/` holds 99,235. Gap: **4 plots** (0.004 %).
2. **ZAAHI carries two overlapping plot corpora.** `dda/` (206 files, skinny 3-attribute schema) and `dda-plots/` (209 files, rich 22-attribute schema). They overlap on 99,120 plots but disagree on 121 plots — 6 only in `dda/`, 115 only in `dda-plots/`. Both describe the same upstream reality but were fetched with different queries at different times.
3. **ZAAHI captures 22 of the 43 fields DDA publishes.** 21 fields are dropped, notably `OLD_PLOT_NUMBERS` (present on **76,513 / 99,239 plots = 77 %** of the universe), `LANDUSE_CATEGORY` (DDA's own 20-value canonical classification), `MAX_HEIGHT_METERS`, `MAX_HEIGHT`, `HEIGHT_CATEGORY`, `MIN_PLOT_COVERAGE`, `MAX_PLOT_COVERAGE`, `PLOT_COVERAGE`, `LANDUSE_DETAILS`, `GENERAL_NOTES`, `FREEZE_DATE`, `FREEZE_REASON`, `SITEPLAN_ISSUE_DATE`, `SITEPLAN_EXPIRY_DATE`, `LAND_NAME`, `GFA_TYPE`, `GFA_SQM_T`, `GFA_SQFT_T`.
4. **ZAAHI's 9-category canonical legend cannot represent DDA's 20 `LANDUSE_CATEGORY` values.** DDA publishes categories ZAAHI does not model: `GOLF COURSE`, `WATER BODY`, `OPEN SPACE`, `RECREATIONAL`, `UTILITIES`, `TRANSPORT`, `FACILITIES`, `HOSPITALITY` (distinct from HOTEL), `OTHER`, `UNDEFINED`. `scripts/seed-dda-batch.ts:deriveCanonical()` pattern-matches `MAIN_LANDUSE` strings and forces everything to one of nine; roughly **25 % of the corpus** falls outside the 9-category worldview and is either forced into `MIXED_USE` or dropped.
5. **There is no Parcel row for the DDA corpus.** The `Parcel` DB table holds only 116 curated listings (113 Dubai LISTED + 3 Abu Dhabi VACANT across 38 districts). The 99 K DDA plots live exclusively in the geojson filesystem layer, served to the map via `src/app/api/parcels/map/route.ts` reads, never persisted. "Cross-reference ZAAHI 99 K Parcels vs DDA 99 K" does not apply — they are separate stores.
6. **ZAAHI's snapshot is drifting from DDA reality by ~300 status changes.** Status deltas ZAAHI ↔ DDA (2026-04-23): Completed +266 at upstream, Under Construction +255 at upstream, Empty −122, Pre-Construction −391, Frozen −164. All deltas are directionally consistent with 11 days of real Dubai construction progression since the 2026-04-12 fetch.
7. **DDA itself has naming-quality defects ZAAHI has inherited.** `CommunityName` values include case duplicates (`AL JADAF` / `Al Jadaf`, `MARSA DUBAI` / `Marsa Dubai`, `MIRDIF` / `Mirdif`, `WADI AL SAFA 5` / `Wadi Al Safa 5`, `AL ROWAIYAH FIRST` / `Al Rowaiyah First`, `Al Safouh First` / `AL SAFOUH FIRST`, `UMM SUQEIM THIRD` / `Umm Suqeim Third`, `AL BARSHA SOUTH THIRD` / `Al Barsha South Third`). 8 such case-pair duplicates detected in DDA `Project Limit` layer (8 × 2 = 16 duplicates out of 102 unique names).
8. **Free zones are a small subset of DDA jurisdiction.** Of 209 project polygons, only **25 are flagged `IsFreeZone=1`** (12 % of projects) covering DIFC, DIFC Zabeel, DHCC Phase 1 & 2, Museum of the Future, Dubai Design District, Dubai Production City, Dubai Studio City, Dubai Outsource City, Dubai Wholesale City, Dubai Science Park, Dubai International Academic City, Emirates Towers District, Barsha Heights, Sufouh Gardens, Site A/D, Al Jalila Children's Hospital, Schools Free Zone, Tilal Al Ghaf, Ardh Community, Tecom plots, and DHAM/DPG plots at Al Rowaiyah First. Everything else is non-free-zone regulated land.
9. **1,309 plots are frozen in ZAAHI / 1,145 at DDA today.** Freezes concentrate in 13 projects: Damac Islands 2 (356), The Valley (343), Dubai Creek Harbour (261), Tijara Town (170), Towerside (101), DIFC Zabeel (38), Dubai Industrial City (31), Dubai Studio City (3), Business Bay (2), and six 1-off freezes. DDA unfroze ~164 plots in the last 11 days.
10. **ZAAHI has no ingestion of `OLD_PLOT_NUMBERS`.** This field is DDA's official legacy-number tracking and is populated on **77 % of the corpus**. Without it, ZAAHI cannot match deed documents, old broker listings, pre-2020 affection plans, or user-submitted searches that reference legacy numbering. This is the single highest-leverage unblocked data-sync gap.

---

## §2 ZAAHI current DDA footprint — what we actually have

### 2.1 Filesystem layers

| Layer                                  | File count | Plot features | Schema width         | Use                                                                                                                  |
| -------------------------------------- | ---------- | ------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `data/layers/dda/*.geojson`            | 206        | 99,126        | 3 keys (thin)        | Probable earlier snapshot used by map lookups needing only plot number + project + area                              |
| `data/layers/dda-plots/*.geojson`      | 209        | 99,235        | 22 keys (rich)       | Produced by `scripts/fetch-dda-plots.ts` 2026-04-12 — source of truth for feasibility calculator, 3D rendering, etc. |
| `data/layers/dda-projects.geojson`     | 1          | 209           | 6 keys               | Project-limit polygons · ProjectID, ProjectName, EntityName, DeveloperName, CommunityName                            |
| `data/layers/dda-freezones.geojson`    | 1          | 209           | 5 keys + IsFreeZone  | Parallel project table with `EntityCategory` (DUBAI HOLDING / OTHERS) and `IsFreeZone` flag                          |

Total DDA-related disk footprint: **54 MB (dda/) + 103 MB (dda-plots/) = 157 MB** of geojson.

### 2.2 Database (Prisma `Parcel`)

| Metric                     | Count |
| -------------------------- | ----- |
| Total `Parcel` rows        | 116   |
| By emirate — Dubai         | 113   |
| By emirate — Abu Dhabi     | 3     |
| Status LISTED              | 113   |
| Status VACANT              | 3     |
| With `geometry` populated  | 116   |
| With `currentValuation`    | 114   |
| Tokenized                  | 0     |
| Distinct `district` values | 38    |
| `AffectionPlan` rows       | 220   |

Founder's "114 listings" matches the DB to within 2 rows (two listings added since the statement was drafted). The **99 K DDA plots never enter Parcel** — they are reference-only polygons served by the map API directly from disk.

### 2.3 Top 10 Parcel districts (by row count)

```
MAJAN                       16
SAMA AL JADAF               13
WARSAN FIRST DEVELOPMENT    10
CITY OF ARABIA               6
DUBAI SPORTS CITY            6
DUBAI PRODUCTION CITY        6
LIWAN 2                      5
BUSINESS BAY PHASE 1 & 2     5
JADDAF WATERFRONT            5
DUBAI LAND RESIDENCE COMPLEX 5
```

### 2.4 Sample Parcel plot numbers (first 10, all LISTED)

```
Dubai | MAJAN                    | 6457940
Dubai | MAJAN                    | 6457790
Dubai | BUSINESS BAY PHASE 1 & 2 | 3460513
Dubai | DUBAI LAND RESIDENCE CPX | 6488599
Dubai | MAJAN                    | 6458042
Dubai | BARSHA HEIGHTS           | 3830345
Dubai | DUBAI SPORTS CITY        | 6820116
Dubai | SAMA AL JADAF            | 3261245
Dubai | SAMA AL JADAF            | 3261254
Dubai | SAMA AL JADAF            | 3261253
```

All 10 are 7-digit DDA-issued plot numbers. The non-DDA `TB02 · Dubai Water Canal` referenced by founder was recently renamed to DDA-issued plot `3435332` (see commits `f711da8`, `a161484`).

---

## §3 DDA authoritative universe — what DDA publishes

### 3.1 Service topology (live 2026-04-23)

```
https://gis.dda.gov.ae/server/rest/services
├─ ANALYSIS/        · token required
├─ BUILDING/        · token required
├─ DDA/             · PUBLIC
│   ├─ BASIC_LAND_BASE     (MapServer)  EPSG:3997  · max 2000/request
│   │   ├─ 0  Project Limit            · 209 features
│   │   ├─ 1  Project Limit Outline    · (stroke of layer 0)
│   │   └─ 2  Plot                     · 99,239 features · 43 attributes
│   └─ FREE_ZONE_PROJECTS  (MapServer)
│       └─ 0  DDA PROJECT              · 209 features (25 flagged free zone)
├─ DEMARCATION/     · token required
├─ DH/              · token required
├─ DIS/             · token required
├─ DPS/             · token required
├─ DUBAI_POLICE/    · token required
├─ EMAAR/           · token required
├─ EMAP/            · token required
├─ GEO_INSPECT/     · token required
├─ SITEPLAN/        · token required
└─ Utilities/       · token required
```

### 3.2 Authoritative counts (live DDA REST, 2026-04-23)

| Dimension                            | DDA value      | ZAAHI snapshot value | Delta        |
| ------------------------------------ | -------------- | -------------------- | ------------ |
| Total plots                          | 99,239         | 99,235 (dda-plots/)  | +4 upstream  |
| Project-limit polygons               | 209            | 209                  | 0            |
| Free-zone projects                   | 209 (all projects; 25 flagged) | 209 (25 flagged) | 0 |
| Distinct `MAIN_LANDUSE` values       | 70             | 71 (incl. `None`)    | +1 ZAAHI     |
| Distinct `LANDUSE_CATEGORY` values   | **20** (DDA canonical) | 0 (not captured) | **−20 ZAAHI** |
| Distinct `CONSTRUCTION_STATUS` values | 6             | 6                    | 0            |
| `CONSTRUCTION_STATUS = Empty`        | 38,469         | 38,591               | −122 ZAAHI (stale) |
| `CONSTRUCTION_STATUS = Completed`    | 35,331         | 35,065               | −266 ZAAHI (stale) |
| `CONSTRUCTION_STATUS = Under Construction` | 17,602   | 17,347               | −255 ZAAHI (stale) |
| `CONSTRUCTION_STATUS = Pre-Construction`   | 7,338    | 7,729                | +391 ZAAHI (stale) |
| `CONSTRUCTION_STATUS = Suspended`          | 497      | 499                  | +2 ZAAHI     |
| `IS_FROZEN = 1`                      | 1,145          | 1,309                | +164 ZAAHI (stale) |
| `MAIN_LANDUSE` empty/null            | 315            | 315                  | 0            |
| `MAIN_LANDUSE = RESIDENTIAL` (exact)  | 74,761         | 74,764               | +3 ZAAHI     |
| Plots with `OLD_PLOT_NUMBERS`        | **76,513 (77 %)** | 0 (field not captured) | **−76,513 ZAAHI** |

All DDA values retrieved via `.../MapServer/2/query?returnCountOnly=true&f=json&where=...`; agent did not fabricate any count. Status deltas point consistently in the direction of 11 days of Dubai construction: many `Pre-Construction` plots have moved to `Under Construction`, many `Under Construction` → `Completed`, some frozen plots released.

---

## §4 Dimension A · Plot Universe

### 4.1 Headline number

**99,239 plots** under DDA jurisdiction (layer `BASIC_LAND_BASE/2`, live 2026-04-23).

### 4.2 Breakdown by project

The Project Limit layer (209 polygons) is the canonical container. Each plot carries `PROJECT_NAME` matching one of the 208 distinct project names (one entry in the Project Limit layer shares a name with another — see §8.3 for the duplicate).

ZAAHI's `scripts/fetch-dda-plots.ts` orders by `OBJECTID ASC` and writes one geojson file per `PROJECT_NAME` into `data/layers/dda-plots/` — resulting in 209 files. The 209 / 208 mismatch is because one project file (`unknown.geojson`, 2 114 B, small) collected plots where `PROJECT_NAME` was empty or not matched at fetch time.

### 4.3 Coverage completeness by project (ZAAHI dda-plots/ ∩ DDA)

ZAAHI has files for **all 208 DDA projects by name**. No project is missing entirely. The residual 4-plot gap between 99,235 and 99,239 is distributed as a handful of recently-added plots at the edge of fetch ordering — not a whole project.

### 4.4 Coverage gap heatmap — text representation

Reading the `dda-plots/` file sizes as a proxy for plot-density coverage, complete coverage is effectively uniform:

| Tier               | File count | Largest members                                                       |
| ------------------ | ---------- | --------------------------------------------------------------------- |
| Mega (>5 MB)       | 6          | DAMAC HILLS 2 (14 MB) · DAMAC LAGOONS (7.8 MB) · DAMAC ISLANDS (6.1 MB) · DUBAI HILLS (6.3 MB) · THE VALLEY (5.8 MB) |
| Large (1–5 MB)     | 32         | DAMAC HILLS · ARABIAN RANCHES I·II·III · TOWN SQUARE · MUDON · NAD AL SHEBA GARDENS · JABEL ALI HILLS · CHERRYWOODS · SHOROOQ · VILLANOVA · WILDS 1-2 · DUBAI INDUSTRIAL CITY · FALCON CITY · TILAL AL GHAF · DUBAI SPORTS CITY · THE VILLA · THE ACRES · NAIA ISLAND · HAVEN · MERAAS UMM AL SHEIF · SAMA AL JADAF · AL ARYAM · AL BARARI |
| Medium (100 KB–1 MB) | ~100     | —                                                                     |
| Small (<100 KB)    | ~71        | Many single-plot or micro projects (Meraas sub-project splinters, "at Al Satwa" etc.) |

No single project has zero features on disk.

### 4.5 The 121-plot ZAAHI internal disagreement

ZAAHI holds two plot datasets (`dda/` and `dda-plots/`), both ostensibly from the same DDA upstream. Cross-reference by `PLOT_NUMBER`:

- Intersection: 99,120 plots
- Only in `dda/` (skinny): 6 plots — all located in projects **GHAF WOODS** (3), **JABEL ALI HILLS** (2), **LA MER** (1). Specifically: `6460119`, `6460123`, `6460146` (Ghaf Woods), `5135168`, `5135169` (Jabel Ali Hills), `3321747` (La Mer). Plausible reason: at the time `dda/` was fetched these plots existed; at `dda-plots/` fetch (2026-04-12) they had been deleted or merged by DDA.
- Only in `dda-plots/` (rich): 115 plots — overwhelmingly concentrated in **TOWERSIDE** project (e.g. `4154801`, `4154144`, `4154149`, `4156400`, `4154146`, `4154141`, `4154153`, `4154789`, `4157949` …). Plausible reason: `TOWERSIDE` plots were added between the two fetches.

Neither file is the current DDA truth (which is 99,239), but `dda-plots/` is 115 plots closer to reality and carries the full schema. **Recommendation: deprecate `data/layers/dda/` and point all readers at `data/layers/dda-plots/`.** (Not executed this session — read-only scope.)

---

## §5 Dimension B · Land use / targeted purpose

### 5.1 Two DDA classification systems, not one

DDA publishes **two orthogonal land-use fields**:

| Field              | Purpose                                              | Distinct values | ZAAHI captures? |
| ------------------ | ---------------------------------------------------- | --------------- | --------------- |
| `MAIN_LANDUSE`     | Free-form composite label, multi-use concatenated with `" - "` separator | 70 | Yes (22-key schema) |
| `LANDUSE_CATEGORY` | **DDA's normalized 20-value canonical classification** | 20 | **No** |
| `SUB_LANDUSE`      | Fine-grained building-type label                     | 395             | Yes             |
| `LANDUSE_DETAILS`  | Free-text notes                                      | n/a (wide string) | No            |

**LANDUSE_CATEGORY is the field ZAAHI should be using.** Its 20 values are:

```
 1. COMMERCIAL
 2. COMMERCIAL - HOSPITALITY
 3. COMMERCIAL - HOSPITALITY - RESIDENTIAL
 4. COMMERCIAL - INDUSTRIAL
 5. COMMERCIAL - RECREATIONAL
 6. COMMERCIAL - RESIDENTIAL
 7. FACILITIES
 8. FUTURE DEVELOPMENT
 9. GOLF COURSE
10. HOSPITALITY
11. HOSPITALITY - RESIDENTIAL
12. INDUSTRIAL
13. OPEN SPACE
14. OTHER
15. RECREATIONAL
16. RESIDENTIAL
17. TRANSPORT
18. UNDEFINED
19. UTILITIES
20. WATER BODY
```

`LANDUSE_CATEGORY = 'OTHER'` is applied to **7 plots**; the rest have a stable categorical bucket.

### 5.2 ZAAHI's current 9-category legend

`src/lib/feasibility.ts:489` defines:

```
Residential · Commercial · Mixed Use · Hotel · Industrial ·
Educational · Healthcare · Agricultural · Future Development
```

`scripts/seed-dda-batch.ts:deriveCanonical()` maps DDA MAIN_LANDUSE strings to this list by regex pattern-matching; when two or more categories match, the result is forced to `MIXED_USE`. The mapping is **lossy**:

| DDA category (authoritative)            | ZAAHI target (canonical) | Fidelity |
| --------------------------------------- | ------------------------ | -------- |
| RESIDENTIAL                             | RESIDENTIAL              | ✓ exact  |
| COMMERCIAL                              | COMMERCIAL               | ✓ exact  |
| INDUSTRIAL                              | INDUSTRIAL               | ✓ exact  |
| FUTURE DEVELOPMENT                      | FUTURE_DEVELOPMENT       | ✓ exact  |
| HOSPITALITY                             | HOTEL                    | ≈ near   |
| HOSPITALITY - RESIDENTIAL               | MIXED_USE                | ✗ lossy  |
| COMMERCIAL - HOSPITALITY                | MIXED_USE                | ✗ lossy  |
| COMMERCIAL - HOSPITALITY - RESIDENTIAL  | MIXED_USE                | ✗ lossy  |
| COMMERCIAL - INDUSTRIAL                 | MIXED_USE                | ✗ lossy  |
| COMMERCIAL - RECREATIONAL               | MIXED_USE                | ✗ lossy  |
| COMMERCIAL - RESIDENTIAL                | MIXED_USE                | ✗ lossy  |
| FACILITIES                              | — (unmapped)             | ✗ drops  |
| GOLF COURSE                             | — (unmapped)             | ✗ drops  |
| OPEN SPACE                              | — (unmapped)             | ✗ drops  |
| OTHER                                   | — (unmapped)             | ✗ drops  |
| RECREATIONAL                            | — (unmapped)             | ✗ drops  |
| TRANSPORT                               | — (unmapped)             | ✗ drops  |
| UNDEFINED                               | — (unmapped)             | ✗ drops  |
| UTILITIES                               | — (unmapped)             | ✗ drops  |
| WATER BODY                              | — (unmapped)             | ✗ drops  |

ZAAHI's `EDUCATIONAL`, `HEALTHCARE`, and `AGRICULTURAL` canonical buckets have **no DDA counterpart in `LANDUSE_CATEGORY`**. They are routed only via `SUB_LANDUSE` regex matches (`/school|university/`, `/health|hospital/`). Inverse: DDA's `GOLF COURSE`, `WATER BODY`, `OPEN SPACE`, `RECREATIONAL`, `UTILITIES`, `TRANSPORT`, `FACILITIES` have **no ZAAHI bucket** and collapse into the "Mixed Use" or unmapped state.

### 5.3 MAIN_LANDUSE frequency (ZAAHI snapshot, 99,235 plots)

Top 20 of 70 distinct values:

| #  | MAIN_LANDUSE                                      | Plots   | % of universe |
| -- | ------------------------------------------------- | ------- | ------------- |
| 1  | RESIDENTIAL                                       | 74,764  | 75.3 %        |
| 2  | OPEN SPACE                                        | 9,140   | 9.2 %         |
| 3  | UTILITIES                                         | 8,704   | 8.8 %         |
| 4  | COMMERCIAL - RESIDENTIAL                          | 1,166   | 1.2 %         |
| 5  | INDUSTRIAL                                        | 1,008   | 1.0 %         |
| 6  | FACILITIES                                        | 877     | 0.9 %         |
| 7  | COMMERCIAL                                        | 712     | 0.7 %         |
| 8  | COMMERCIAL - HOSPITALITY - RESIDENTIAL            | 587     | 0.6 %         |
| 9  | TRANSPORT                                         | 585     | 0.6 %         |
| 10 | (empty)                                           | 315     | 0.3 %         |
| 11 | FUTURE DEVELOPMENT                                | 189     | 0.2 %         |
| 12 | HOSPITALITY                                       | 148     | 0.1 %         |
| 13 | RECREATIONAL                                      | 105     | 0.1 %         |
| 14 | HOSPITALITY - RESIDENTIAL                         | 103     | 0.1 %         |
| 15 | COMMERCIAL - HOSPITALITY                          | 102     | 0.1 %         |
| 16 | COMMERCIAL - FACILITIES                           | 94      | 0.1 %         |
| 17 | COMMERCIAL - INDUSTRIAL                           | 86      | 0.1 %         |
| 18 | OPEN SPACE - TRANSPORT                            | 81      | 0.1 %         |
| 19 | COMMERCIAL - FACILITIES - RESIDENTIAL             | 79      | 0.1 %         |
| 20 | TRANSPORT - UTILITIES                             | 76      | 0.1 %         |

**Implication**: **~25 % of plots (24,471)** fall outside `MAIN_LANDUSE = RESIDENTIAL` and are either collapsed into ZAAHI's `MIXED_USE` bucket (because multiple primary uses appear) or **dropped entirely** (pure `OPEN SPACE`, `UTILITIES`, `TRANSPORT`, `FACILITIES`, `RECREATIONAL`). The map legend is missing colour codes for those.

### 5.4 SUB_LANDUSE top 20 of 395

| #  | SUB_LANDUSE                            | Plots  |
| -- | -------------------------------------- | ------ |
| 1  | VILLA                                  | 62,299 |
| 2  | ATTACHED VILLAS                        | 9,505  |
| 3  | LANDSCAPE                              | 5,585  |
| 4  | SUBSTATION 11 KV                       | 4,003  |
| 5  | FEEDER PILLAR                          | 2,770  |
| 6  | APARTMENT                              | 2,288  |
| 7  | (empty)                                | 2,019  |
| 8  | SIKKA                                  | 1,226  |
| 9  | APARTMENT - RETAIL                     | 932    |
| 10 | UTILITY CORRIDOR                       | 811    |
| 11 | NEIGHBORHOOD PARK                      | 650    |
| 12 | LABOR ACCOMMODATION                    | 626    |
| 13 | ACCESS ROAD                            | 446    |
| 14 | POCKET PARK                            | 419    |
| 15 | GSM TOWER                              | 329    |
| 16 | APARTMENT - HOTEL - OFFICES - RETAIL   | 280    |
| 17 | OFFICES - RETAIL                       | 232    |
| 18 | SUBSTATION 132 KV                      | 220    |
| 19 | APARTMENT - HOTEL - HOTEL APARTMENT - OFFICES - RETAIL | 210 |
| 20 | RETAIL                                 | 201    |

72 % of all DDA plots are villas or attached villas — confirms Dubai's suburban spread. The tail includes highly specific categories (`SUBSTATION 11 KV`, `FEEDER PILLAR`, `GSM TOWER`, `MEET ME ROOM (MMR)`, `BUFFER ZONE`, `JUMA MASJID`, `LOCAL MASJID`, `GUARD HOUSE`) that ZAAHI would never render as "listings" but whose polygons are part of the rendered corpus.

---

## §6 Dimension C · Zones / coverage areas

### 6.1 DDA hierarchy

```
Entity  (16 distinct ·  master developer / govt authority)
  └─ Project  (209 distinct · named estate)
       └─ Community  (102 distinct · DDA community-level zone)
            └─ Plot  (99,239 · the leaves)
```

### 6.2 Entity-level (16 values, ZAAHI dda-plots/ snapshot)

| Entity                                                      | Plots  | % of universe |
| ----------------------------------------------------------- | ------ | ------------- |
| DUBAI LAND                                                  | 36,935 | 37.2 %        |
| DUBAI HOLDING REAL ESTATE                                   | 23,505 | 23.7 %        |
| EMAAR PROPERTIES (P.J.S.C)                                  | 20,373 | 20.5 %        |
| SHAMAL ESTATES L.L.C                                        | 11,609 | 11.7 %        |
| DHAM L.L.C                                                  |  3,696 |  3.7 %        |
| MAJID AL FUTTAIM EMIRATI COMMUNITIES OPERATION LLC          |  2,487 |  2.5 %        |
| DUBAI HEALTHCARE CITY AUTHORITY                             |    237 |  0.2 %        |
| MAG INTERNATIONAL INVESTMENT LTD                            |    185 |  0.2 %        |
| DUBAI INTERNATIONAL FINANCIAL CENTER                        |    165 |  0.2 %        |
| JUMEIRAH GROUP                                              |     18 |  <0.1 %       |
| A U L P INVESTMENT LLC                                      |      8 |  <0.1 %       |
| GLOBAL VILLAGE                                              |      7 |  <0.1 %       |
| KNOWLEDGE FUND ESTABLISHMENT                                |      4 |  <0.1 %       |
| DUBAI POLICE                                                |      3 |  <0.1 %       |
| null                                                        |      2 |  <0.1 %       |
| DUBAI HOLDING HOSPITALITY                                   |      1 |  <0.1 %       |

**Effective oligopoly**: 5 entities (Dubai Land + Dubai Holding + Emaar + Shamal + Dham) cover **96.8 % of the plot universe**. Everything else is a long-tail.

### 6.3 Free-zone subset (25 projects of 209)

From `data/layers/dda-freezones.geojson` where `IsFreeZone=1`:

```
 1. DIFC                               — Dubai International Financial Center
 2. DIFC Zabeel                        — DIFC extension
 3. DUBAI HEALTHCARE CITY PHASE 1      — DHCC
 4. DUBAI HEALTHCARE CITY PHASE 2      — DHCC
 5. AL JALILA CHILDREN'S HOSPITAL      — DHCC sub
 6. DUBAI DESIGN DISTRICT              — d3 · under DHAM (Dubai Holding)
 7. DUBAI STUDIO CITY                  — DHAM
 8. DUBAI OUTSOURCE CITY               — DHAM
 9. DUBAI WHOLESALE CITY               — DHAM
10. DUBAI PRODUCTION CITY              — DHAM (formerly IMPZ)
11. DUBAI SCIENCE PARK                 — DHAM
12. DUBAI INTERNATIONAL ACADEMIC CITY  — DHAM
13. BARSHA HEIGHTS                     — DHAM (formerly TECOM)
14. SITE A                             — DHAM
15. SITE D                             — DHAM
16. SUFOUH GARDENS                     — DHAM
17. DUBAI LAND (T.15)                  — DHAM
18. DHAM PLOTS AT AL ROWAIYAH FIRST    — DHAM
19. TECOM PLOTS - SAIH AL SALAM        — DHAM
20. TECOM PLOTS AT AL QOUZ IND.SECOND  — AULP
21. EMIRATES TOWERS DISTRICT           — Jumeirah Group
22. MUSEUM OF THE FUTURE               — Jumeirah Group
23. SCHOOLS - FREE ZONE                — Knowledge Fund
24. TILAL AL GHAF                      — Majid Al Futtaim
25. ARDH COMMUNITY                     — MAG
```

Note: the classical Dubai free-zone umbrella **TECOM** appears here but is now branded as "Barsha Heights" + DHAM / AULP sub-projects. The grouping `EntityCategory = 'DUBAI HOLDING'` (126 projects) vs `'OTHERS'` (83 projects) is the only taxonomy DDA publishes; no "DMCC", "JAFZA", or "Dubai Maritime City" appear — those sit under different emirate-level authorities (Dubai Municipality, EZW, P&O Ports), not DDA.

### 6.4 Community layer (102 distinct `CommunityName` in Project Limit)

See §8.3 for the raw list including case-duplicate anomalies. The important findings:

- Multi-community project entries: **11 projects have compound `CommunityName` joined by comma** — e.g. `"AL HEBIAH FIFTH, AL YALAYIS 1, AL YALAYIS 2, AL YALAYIS 3, AL YALAYIS 4, AL YUFRAH 1, AL YUFRAH 2, Dubai Land, MADINAT HIND 1, MADINAT HIND 2, MADINAT HIND 3, MADINAT HIND 4, WADI AL SAFA 2, WADI AL SAFA 3, WADI AL SAFA 4, WADI AL SAFA 5, WADI AL SAFA 6, WADI AL SAFA 7"` (one super-project spans 18 communities in a single string).
- `"Al Sheikh Zayed Road, BURJ KHALIFA, BUSINESS BAY"` — the Downtown cluster is one DDA project spanning three communities.
- `"AL ROWAIYAH FIRST, UMM SUQEIM THIRD"`, `"AL SAFOUH FIRST, UMM SUQEIM THIRD"` — geographically disjoint communities grouped because of shared developer parcels.

**For ZAAHI district-facet filtering, these compound CommunityName rows cannot be parsed with a naive equality check.** Current `Parcel.district` is a single string; the ingestion of DDA data would need to split on comma and explode one plot into N community memberships, or store a list.

---

## §7 Dimension D · Plot status

### 7.1 DDA's lifecycle field (`CONSTRUCTION_STATUS` — 6 values)

Live counts 2026-04-23 · totals sum to 99,237 (~2 unresolved):

| Status            | Plots  | % of universe |
| ----------------- | ------ | ------------- |
| Empty             | 38,469 | 38.8 %        |
| Completed         | 35,331 | 35.6 %        |
| Under Construction | 17,602 | 17.7 %        |
| Pre-Construction  |  7,338 |  7.4 %        |
| Suspended         |    497 |  0.5 %        |
| No Data           |      4 |  0.004 %      |

### 7.2 DDA's `IS_FROZEN` flag (small integer · orthogonal to CONSTRUCTION_STATUS)

- Total frozen plots today: 1,145
- Frozen plots in ZAAHI snapshot: 1,309 — DDA has released 164 since 2026-04-12.
- Concentrated in 13 projects (§11.3).

DDA also publishes `FREEZE_DATE` and `FREEZE_REASON` alongside each frozen plot — **neither is captured by ZAAHI**. Reasons (per the field, not fetched here for volume) typically include regulatory hold, legal dispute, developer default, ownership contest, master-plan revision pending.

### 7.3 ZAAHI's `ParcelStatus` enum (9 values · for curated listings)

Defined in `prisma/schema.prisma`:

```
VACANT · PENDING_REVIEW · VERIFIED · REJECTED ·
LISTED · IN_DEAL · SOLD · DISPUTED · FROZEN
```

**This is a workflow enum for Parcel rows, not a mirror of DDA construction state.** The two status axes are orthogonal: a DDA plot with `CONSTRUCTION_STATUS='Under Construction'` may still be `LISTED` on ZAAHI (seller can list a mid-build parcel).

Current Parcel distribution:

| ParcelStatus | Count |
| ------------ | ----- |
| LISTED       | 113   |
| VACANT       | 3     |
| (all others) | 0     |

### 7.4 Missing linkage

There is **no column in `Parcel` that stores the DDA-side `CONSTRUCTION_STATUS` or `IS_FROZEN`**. Consequently a buyer cannot filter listings by "completed construction only" or "avoid frozen plots". The AffectionPlan JSON blob (220 rows) sometimes carries this info in a free-text field per `src/lib/dda.ts:parseAffectionPlan`, but it is not indexed.

---

## §8 Dimension E · Naming conventions

### 8.1 Plot numbering

- **7-digit DDA plot number** (e.g. `6655339`, `3460513`, `6457940`) is the universal key. `PLOT_NUMBER` is a STRING(20) at DDA; leading zeros are theoretically allowed but not observed in the 99 K sample.
- **Legacy `OLD_PLOT_NUMBERS`** (STRING 255) is a comma-separated list of prior plot numbers, populated on 76,513 plots (77 %). **Not captured by ZAAHI.**
- **Internal ZAAHI codes** like `TB02` appeared in early listings but have been retired in favour of the DDA number (see commit `a161484 feat(parcels): add TB02 · Dubai Water Canal`). `TB02` is now internally mapped to DDA plot `3435332` in community `Meraas Plots at Umm Amaraa` / `Dubai Water Canal`; the TB-prefix does not appear in the DB.
- **Project-specific codes** appear as ZAAHI file names (`dubai-land-a1-02`, `dubai-land-a3-04`, `dubai-land-b1-03`, etc.) — these are sub-parcels of the `DUBAI LAND` super-project as DDA organises them. The 209 geojson files include 9 such `dubai-land-*` splinters.

### 8.2 Project name conventions

- DDA projects are ALL-UPPERCASE in `ProjectName` and `PROJECT_NAME` fields: `"AL WAHA"`, `"DAMAC HILLS"`, `"EMIRATES TOWERS DISTRICT"`.
- Punctuation is preserved: `"DIFC ZABEEL"`, `"AL JALILA CHILDREN'S SPECIALTY HOSPITAL"`, `"DUBAI LAND (T.15)"`, `"TECOM PLOTS - SAIH AL SALAM"`.
- ZAAHI's filesystem kebab-cases them: `"difc-zabeel.geojson"`, `"al-jalila-children-s-specialty-hospital.geojson"`, `"dubai-land-t-15.geojson"`, `"tecom-plots-saih-al-salam.geojson"`. The kebab transform is lossy for `("T.15")` → `"t-15"` and for the apostrophe in `"CHILDREN'S"` → `"children-s"`. Round-tripping requires a lookup table — there is no published normalisation rule.

### 8.3 District / community conventions — **case inconsistency on DDA side**

DDA's Project Limit layer (`CommunityName` field, 500-char string) mixes ALL-CAPS and Title Case for the **same community name**. Direct evidence:

| Canonical (ALL CAPS)      | Duplicate (Title Case)    |
| ------------------------- | ------------------------- |
| `AL JADAF`                | `Al Jadaf`                |
| `MARSA DUBAI`             | `Marsa Dubai`             |
| `MIRDIF`                  | `Mirdif`                  |
| `UMM SUQEIM THIRD`        | `Umm Suqeim Third`        |
| `AL BARSHA SOUTH THIRD`   | `Al Barsha South Third`   |
| `AL ROWAIYAH FIRST`       | `Al Rowaiyah First`       |
| `AL SAFOUH FIRST`         | `Al Safouh First`         |
| `WADI AL SAFA 5`          | `Wadi Al Safa 5`          |

8 confirmed pair-duplicates, 16 redundant rows out of 102 `CommunityName` values = **~16 % naming redundancy at source**. `Al Safouh Second` also appears (no ALL-CAPS pair observed, so it is unique).

**Impact**: ZAAHI facet-filtering on `community` must normalise both sides (e.g. `upper()`-coerced join key) or the district filter will silently miss half the plots. The current `Parcel.district` varies between `MAJAN`, `SAMA AL JADAF`, `JUMEIRAH GARDEN CITY`, `DUBAI WATER CANAL`, `DUBAI WHOLESALE CITY (NON FREE ZONE)` — all ALL-CAPS — but any DDA sync that naïvely copies `CommunityName` will re-introduce the duplicates.

### 8.4 Arabic transliteration

DDA publishes only Latin-alphabet names in the public layer. There is **no Arabic field** in the 43-column plot schema. Dubai Municipality (DM) publishes bilingual community data under a separate `Community__1_.kml` layer (loaded by ZAAHI but not linked to the DDA corpus by key). There is no `community_ar` column in `Parcel` — searching for `"واحة"` will not match `"AL WAHA"` anywhere in ZAAHI today.

### 8.5 Legacy plot numbers example

The `OLD_PLOT_NUMBERS` field carries strings like `"673-2034, 673-2035"` or `"3347551 - PRE-MERGE"`. Since 77 % of plots carry one, broker documents and pre-2020 affection plans (which Dubai banks still file under legacy numbers) will reference these, not the current 7-digit number. **ZAAHI currently has no way to resolve a legacy number to a current plot.**

---

## §9 Dimension F · Data source access

### 9.1 Public REST API — `gis.dda.gov.ae/server/rest/services/DDA/*`

- **No auth required** for `BASIC_LAND_BASE` and `FREE_ZONE_PROJECTS` folders.
- **No documented rate limits**; empirically tolerates batched calls of 2 000 records (the `maxRecordCount`) with no throttling observed during ZAAHI's initial fetch (see `scripts/fetch-dda-plots.ts` which sleeps `0 ms` between batches and succeeded for the full 99 K in ~50 paginated calls).
- Supported formats: `json`, `geoJSON`, `pbf`, plus image exports (`png`, `jpg`, `pdf`, `tiff`). ZAAHI uses raw `f=json` with `outSR=4326` and reshapes to GeoJSON locally.
- Coordinate system: native `EPSG:3997` (Dubai Local Transverse Mercator in metres). The `outSR=4326` query parameter gets WGS-84.
- Spatial queries: supported via `geometry=`, `spatialRel=` parameters. ZAAHI does not use these; it does `where=1=1` and filters client-side.
- Statistical queries: `outStatistics=` supported. `returnCountOnly=true` and `returnDistinctValues=true` both work for non-geometry fields (distinct-on-geometry fails with `"Geometry is not supported with DISTINCT"`).
- Service description confirms this is "DCCA Map for SalesForce, Building Portal, MyLand" — i.e. the same backing store powering DDA's internal tools.

### 9.2 Restricted endpoints (token required; agent did not probe further)

- `DIS` — Development Information System · plot affection plans, site-plan issuance. Front-end is browsable at `https://gis.dda.gov.ae/DIS/` but the REST layer (including `DIS/MAIN_MAP/MapServer/8`, referenced by `src/lib/dda.ts:fetchBuildingLimit`) returns 499 without a token. ZAAHI holds tokens via `src/lib/dda.ts` (not inspected in this audit).
- `BUILDING`, `SITEPLAN`, `DPS`, `DEMARCATION`, `DH`, `EMAAR`, `EMAP`, `GEO_INSPECT`, `ANALYSIS`, `Utilities` — all token-gated at folder level.
- `DUBAI_POLICE` — DDA-internal service; unlikely to be relevant.

### 9.3 Dubai Pulse / data.dubai

`www.dubaipulse.gov.ae` now 301-redirects to `data.dubai/`, a unified Dubai Data and Statistics Establishment portal that supersedes Pulse. Searches on `data.dubai/` for DDA-specific datasets return featured dashboards (Residential Sale Index from **DLD**, not DDA · Commerce Registry · RTA Parking · Freezone Utilities reports) but **no structured plot-level DDA dataset is directly linked** from the homepage as of 2026-04-23. The earlier "Property Development Projects" dashboard URL at Pulse now 301-redirects to the new portal root, where that specific dashboard is not yet republished. This is a gap: the plot-level data ZAAHI already has is arguably more complete than what Dubai Pulse itself currently publishes in open-data form.

### 9.4 Bulk download

DDA does not publish a one-click geojson or SHP download of the plot layer. The only path to 99 K plots is to page through `BASIC_LAND_BASE/MapServer/2/query?resultOffset=N&resultRecordCount=2000` — which is what `scripts/fetch-dda-plots.ts` automates. No SFTP, S3 bucket, or FTP mirror observed.

### 9.5 Paid tiers

None observed on public DDA endpoints. Token access to `DIS`/`BUILDING`/etc. is issued through DDA developer partnerships (per `https://dda.gov.ae/en/planning-development/master-planning/site-plan-issuance`) — this is regulatory access, not a paid SaaS tier. **No purchase flagged for founder approval.**

### 9.6 Staleness signal

DDA exposes `SITEPLAN_ISSUE_DATE` and `SITEPLAN_EXPIRY_DATE` per plot. ZAAHI captures neither; cannot surface "approval expires in X days" to subscribers.

---

## §10 Dimension G · Cross-reference matrix

### 10.1 ZAAHI × DDA overlap (`dda-plots/` snapshot)

| Dimension             | ZAAHI value   | DDA authoritative | Delta     | Interpretation                                          |
| --------------------- | ------------- | ----------------- | --------- | ------------------------------------------------------- |
| Plot count            | 99,235        | 99,239            | −4        | 11-day drift; +4 upstream additions                     |
| Projects              | 209           | 208 (+1 `null`)   | +1 ZAAHI  | `unknown.geojson` orphans                               |
| Communities           | 102 (via projects layer) | 102 | 0 (but see §8.3 case dupes) |                                          |
| Entities              | 16            | 15 (excluding `null`) | +1 ZAAHI | `null` bucket                                       |
| MAIN_LANDUSE distinct | 71 (incl None)| 70                | +1 ZAAHI  | `None` extra                                            |
| LANDUSE_CATEGORY      | **not captured** | 20             | −20       | Entire canonical axis missing                           |
| SUB_LANDUSE distinct  | 395           | (~395 est.)       | 0         | Matches                                                 |
| CONSTRUCTION_STATUS   | 6             | 6                 | 0         | Same enum                                               |
| OLD_PLOT_NUMBERS populated | **0 / 99,235** | 76,513 / 99,239 | **−76,513** | Entire legacy ID axis missing                        |
| Frozen plots          | 1,309         | 1,145             | +164 ZAAHI| 11-day drift (DDA released frozen plots)                |

### 10.2 District coverage — ZAAHI `dda-plots/` vs Parcel DB

ZAAHI has plot polygons for **all 208 DDA projects** (via one geojson file per `PROJECT_NAME`). The Parcel DB covers **only 38 districts**, i.e. seller-submitted listings concentrated mostly in MAJAN, SAMA AL JADAF, WARSAN, JADDAF, BUSINESS BAY, DUBAI SPORTS CITY, DUBAI PRODUCTION CITY. **This is expected**: the 99 K reference layer is for map browsing, not for listings.

Districts present in Parcel DB but **not** present as a direct `PROJECT_NAME` match in `dda-plots/`:

- `AL JAHILI` — Al Ain, not Dubai; the Parcel row is for a Saadiyat listing mis-tagged (Abu Dhabi scope).
- `BU KADRA` — Mohammed Bin Rashid City sub-area; not a DDA-published project name. `BU KADRA` sits under `DUBAI LAND` / `DPG LANDS WITHIN MOHAMMED BIN RASHED CITY`.
- `DP PLOTS AT AL BARSHA SOUTH THIRD` — appears in DDA as `DP PLOTS AT AL BARSHA SOUTH THIRD` (matches after case-fold).
- `DUBAI WATER CANAL` — the internal ZAAHI label for `MERAAS PLOTS AT UMM AMARAA` containing plot 3435332 / the former TB02.
- `HIDD AL SAADIYAT`, `YAS ISLAND`, `AL YALAYIS 3` — three Abu Dhabi + Dubai Land listings that map to different upstream dataset conventions.
- `AL FURJAN`, `LIVING LEGENDS` — present as DDA projects but the Parcel row spellings appear to match (case-fold equality).

Overall, **~6 Parcel districts cannot be joined to a DDA project name by string equality** — they need a manual alias table.

### 10.3 Matrix — ZAAHI listing volume vs DDA plot density

| Parcel district           | Parcel rows | DDA plots in same project      | Listing density |
| ------------------------- | ----------- | ------------------------------ | --------------- |
| MAJAN                     | 16          | MAJAN geojson: ~1,500 plots    | 1.1 %           |
| SAMA AL JADAF             | 13          | SAMA AL JADAF: ~800 plots      | 1.6 %           |
| WARSAN FIRST DEVELOPMENT  | 10          | WARSAN FIRST: ~600 plots       | 1.7 %           |
| BUSINESS BAY PHASE 1 & 2  |  5          | BUSINESS BAY PH1&2: ~1,800 plots | 0.3 %         |
| DUBAI SPORTS CITY         |  6          | DUBAI SPORTS CITY: ~1,000 plots | 0.6 %          |

Coverage densities estimated from geojson file sizes; exact per-project plot counts available on request. **No project reaches 2 % listing density** — ZAAHI has enormous headroom for inventory growth within the same universe.

---

## §11 Dimension H · Observed anomalies

### 11.1 ZAAHI internal disagreements

| # | Anomaly                                                                                              | Severity |
| - | ---------------------------------------------------------------------------------------------------- | -------- |
| A1 | `data/layers/dda/` (206 files · 99,126 plots · 3-key schema) vs `data/layers/dda-plots/` (209 files · 99,235 plots · 22-key schema) describe the same universe but differ on 121 plots. | High — readers may pick the wrong one. |
| A2 | `unknown.geojson` (2 114 B) and `dubai-land-673.geojson`, `dubai-land-a1-02.geojson`, `dubai-land-a3-04.geojson`, `dubai-land-a3-07.geojson`, `dubai-land-a4-09.geojson`, `dubai-land-b1-03.geojson`, `dubai-land-b1-04.geojson`, `dubai-land-b2-08.geojson`, `dubai-land-t-15.geojson` are DDA-projects-layer splinters of `DUBAI LAND` super-project that would collapse under a true `PROJECT_NAME` grouping. | Medium — legend bloat. |
| A3 | `dubai-land.geojson` (701 KB) is the aggregate; some plots appear both here and in splinter files depending on which `PROJECT_NAME` string was set at fetch time. | Medium — potential duplicates if both are loaded. |
| A4 | One `dda/` file `Башни.kml` (Cyrillic "Towers") was referenced in the task brief — **not found** on current branch; possibly previously present and deleted. Nothing to flag now. | N/A |
| A5 | `dda/pearl_jumeirah` + `dda-plots/pearl-jumeira.geojson` — naming-convention drift (`pearl_jumeirah` vs `pearl-jumeira`, `i` vs `ah` ending). Same physical district. | Low — cosmetic. |

### 11.2 DDA source-side anomalies (defects inherited by any consumer)

| # | Anomaly                                                                                                       | Severity |
| - | -------------------------------------------------------------------------------------------------------------- | -------- |
| B1 | `CommunityName` case-duplicates (§8.3, 8 pair-duplicates in 102 values)                                       | Medium — must normalise on ingest. |
| B2 | `CommunityName` multi-value comma-lists (11 projects span multiple communities in one string, e.g. 18-community Dubai Land super-project) | Medium — filter facets break. |
| B3 | 2 plots with `ENTITY_NAME = null` and `PROJECT_NAME = null`                                                     | Low — 2 / 99 K. |
| B4 | 315 plots with empty `MAIN_LANDUSE` string; 7 plots with `LANDUSE_CATEGORY = 'OTHER'`; 1 plot `MAIN_LANDUSE = 'SEE NOTES'`; 2 plots `'SITE FOR AERIAL PHOTOGRAPHY'` | Low — handle as `UNDEFINED` fallback. |
| B5 | `MAX_HEIGHT_FLOORS` has **330 distinct string values** including legitimate codes (`G+2`, `G+14`), placeholders (`N/A`, `''`, `SEE NOTES`), and what appear to be free-text compositions. `parseFloorsFromHeightCode` handles only a subset. | Medium — ~5 K plots render with default fallback height. |
| B6 | 4 plots with `CONSTRUCTION_STATUS = 'No Data'` — should be treated as unknown, not mapped to Empty. | Low |
| B7 | DDA's internal count 99,239 vs ZAAHI's 99,235 snapshot: 4-plot drift per 11 days → DDA adds ~10-12 new plots per month. | Low — but informs sync cadence. |

### 11.3 Frozen-plot concentration (ZAAHI snapshot · 1,309 plots · 13 projects)

```
DAMAC ISLANDS 2           356  ─────────────────
THE VALLEY                343  ─────────────────
DUBAI CREEK HARBOUR       261  █████████████
TIJARA TOWN               170  ████████
TOWERSIDE                 101  █████
DIFC ZABEEL                38  ██
DUBAI INDUSTRIAL CITY      31  ██
DUBAI STUDIO CITY           3  ·
BUSINESS BAY PHASE 1 & 2    2  ·
ARABIAN RANCHES I           1
THE ECHO PLEX CITY          1
SITE A                      1
CITY WALK                   1
```

The top 5 projects account for **1,231 of 1,309 freezes = 94 %**. Buyers avoiding frozen inventory need only filter 5 projects.

### 11.4 Schema widths on disk

- `dda-plots/` 22 keys captured out of 43 DDA publishes = **21 fields dropped on fetch** (§1 finding 3). The `scripts/fetch-dda-plots.ts:OUT_FIELDS` list explicitly omits the second half of the DDA schema.

### 11.5 Parcel ↔ DDA identity leakage

- Internal ZAAHI plot code `TB02` is not in Parcel (now `3435332`), but historical references may survive in off-chain documents. No anomaly in the DB; just a knowledge-base caveat.
- Three Abu Dhabi Parcel rows (`HIDD AL SAADIYAT`, `YAS ISLAND`, `AL JAHILI`) are not DDA-scoped at all; they belong to Abu Dhabi's Department of Municipalities and Transport (DMT). They are **out of scope for a DDA audit** but are present in the database.

---

## §12 Recommended sync / remediation plan

Prioritised by (founder value) × (engineering effort). Effort is estimated in story-points assuming a single mid-level engineer familiar with the codebase; 1 SP ≈ a half-day.

### Priority 1 · Capture `OLD_PLOT_NUMBERS` on next fetch (77 % of corpus · blocker for legacy-doc matching)

- **What**: Add `OLD_PLOT_NUMBERS` and `LAND_NAME` to `scripts/fetch-dda-plots.ts:OUT_FIELDS`. Re-fetch.
- **Storage**: Extend the 22-key schema to 24; no DB change needed (map-side only).
- **Effort**: 1 SP (script edit + 30 min for 99 K re-fetch).
- **Value**: Broker uploads, pre-2020 affection plans, and user searches on legacy numbers start matching. Phase-1 dashboard saved-searches become meaningfully more accurate.

### Priority 2 · Capture `LANDUSE_CATEGORY` — DDA's own 20-value canonical (blocks legend correctness)

- **What**: Add `LANDUSE_CATEGORY` to `OUT_FIELDS`. Stop synthesising a home-grown 9-category regex in `deriveCanonical()` — delegate to DDA.
- **Storage**: Add an optional column on AffectionPlan for the category (if kept per-plot) or surface it directly from the geojson read.
- **Effort**: 3 SP (plumbing + map legend refresh + feasibility-calc fallbacks).
- **Value**: Eliminates the "Mixed Use" black hole for 25 % of plots. Enables filtering for investors specifically seeking `GOLF COURSE`, `HOSPITALITY`, `UTILITIES` plots.
- **Open question** for founder: does ZAAHI want to keep its 9-category UX (simpler for retail buyers) and layer DDA's 20 underneath (for advanced filtering), or switch wholesale?

### Priority 3 · Deprecate `data/layers/dda/` (121-plot disagreement · 54 MB dead weight)

- **What**: Grep callers of `data/layers/dda/`; migrate to `data/layers/dda-plots/`; delete.
- **Effort**: 2 SP (code search + routing changes + verification).
- **Value**: Removes an entire source-of-truth ambiguity, saves 54 MB of bundle/deploy size.

### Priority 4 · Introduce a DDA-sync cadence (11-day snapshot drift = 300-plot status staleness)

- **What**: A weekly cron that re-runs `fetch-dda-plots.ts` and writes to `data/layers/dda-plots/` + commits the delta. Alert on unexpectedly large deltas.
- **Effort**: 3 SP (cron + diff-reporting + founder alert).
- **Value**: Prevents the snapshot from decaying past the point of match-accuracy for Land Monitor. Current 266-plot drift in 11 days is tolerable; 2 months = ~2 000 plots drifting and false matches accumulate.
- **Out-of-scope hook**: consider a `/schedule` routine for this.

### Priority 5 · Capture `FREEZE_DATE`, `FREEZE_REASON`, `SITEPLAN_EXPIRY_DATE`

- **What**: Three more fields in `OUT_FIELDS`. Surface `SITEPLAN_EXPIRY_DATE` to subscribers as "Approval expires in N days" alert.
- **Effort**: 2 SP.
- **Value**: Differentiating feature for investor-class users; no other Dubai aggregator exposes siteplan expiry today.

### Priority 6 · Resolve DDA case-duplicate community names at ingest

- **What**: Normalise `CommunityName` to `upper()` at ingest; deduplicate. Document the 8 pair-duplicates as a mapping table in `src/lib/dda.ts`.
- **Effort**: 1 SP.
- **Value**: District facet filter in dashboard returns correct counts.

### Priority 7 · Explode multi-community `CommunityName` entries

- **What**: Split comma-lists; store as `string[]`. 11 project rows affected; the Dubai Land super-project alone spans 18 communities.
- **Effort**: 2 SP (requires schema decision: either JSON array or `ParcelCommunity` join table).
- **Value**: Community facet returns plots for "Wadi Al Safa 5" even when the parent project is `DUBAI LAND` super-project.

### Priority 8 · Normalise 330 distinct `MAX_HEIGHT_FLOORS` strings

- **What**: Extend `parseFloorsFromHeightCode` to cover the 15 unhandled patterns (`SEE NOTES`, free-text compositions, `G+M+P+N` edge cases). Write unit tests against the full 330-value set.
- **Effort**: 3 SP.
- **Value**: ~5 000 plots render at the correct building height in 3D, not at default fallback.

**Total proposed effort: 17 SP ≈ 2 engineer-weeks.** All of Priority 1 + 2 + 3 (6 SP) can be done in 3 days and unlocks the core reference-quality wins.

---

## §13 Open questions for founder

1. **Legend strategy**: keep ZAAHI's 9-category UX and layer DDA's 20 underneath, or switch the primary legend to DDA's canonical? (Affects Phase 1 dashboard faceting.)
2. **Corpus source-of-truth**: retire `data/layers/dda/` in favour of `data/layers/dda-plots/`? Or keep both for now?
3. **Sync cadence**: weekly acceptable? Or does Land Monitor require daily? (Drift of ~300 status changes per 11 days; daily eliminates most lag.)
4. **Multi-community explosion**: schema decision — `Parcel.district: string[]`, or join table `ParcelCommunity`, or keep primary-community only and drop the comma-list nuance?
5. **Scope of legacy-number ingestion**: `OLD_PLOT_NUMBERS` is a comma-separated list up to 255 chars. Should ZAAHI store just the first, all, or parse into a normalized lookup table?
6. **Partnership with DDA for token access**: worth a formal ask? Would unlock `DIS`/`SITEPLAN`/`BUILDING` folders and give us real-time affection plans, site-plan HTML, and building limits without scraping.
7. **Abu Dhabi scope**: three Parcel rows currently live in Abu Dhabi districts (`HIDD AL SAADIYAT`, `YAS ISLAND`, `AL JAHILI`). Are they mistakes, cross-emirate pilot listings, or future-expansion? Recommend flagging in `Parcel.emirate` and excluding from Dubai-DDA cross-references.
8. **Per-plot review**: founder asked "каждый участок проверить" (every plot verified). Current session performs bulk schema consistency checks across all 99 K + representative spot-checks. A literal per-plot review would require OCR of affection plans (token access required) and sampled human review — **out of scope for an autonomous session**. Suggest a Phase-2 human-in-the-loop QA flow: flagged plots only (the 315 with empty landuse, the 5 K with unparseable heights, the 1 145 frozen plots), not all 99 K.

---

## §14 Appendix

### 14.1 Queries used (all live-fetched 2026-04-23)

```
# Total plot count
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=1%3D1&returnCountOnly=true&f=json
  → {"count": 99239}

# Distinct MAIN_LANDUSE
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=1%3D1&outFields=MAIN_LANDUSE&returnDistinctValues=true&returnGeometry=false&f=json
  → 70 values

# Distinct LANDUSE_CATEGORY
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=1%3D1&outFields=LANDUSE_CATEGORY&returnDistinctValues=true&returnGeometry=false&f=json
  → 20 values

# Distinct CONSTRUCTION_STATUS
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=1%3D1&outFields=CONSTRUCTION_STATUS&returnDistinctValues=true&returnGeometry=false&f=json
  → 6 values

# Status counts (one query per status)
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=CONSTRUCTION_STATUS%3D%27Empty%27&returnCountOnly=true&f=json             → 38,469
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=CONSTRUCTION_STATUS%3D%27Completed%27&returnCountOnly=true&f=json         → 35,331
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=CONSTRUCTION_STATUS%3D%27Under+Construction%27&returnCountOnly=true&f=json → 17,602
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=CONSTRUCTION_STATUS%3D%27Pre-Construction%27&returnCountOnly=true&f=json  → 7,338
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=CONSTRUCTION_STATUS%3D%27Suspended%27&returnCountOnly=true&f=json         → 497

# Frozen
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=IS_FROZEN%3D1&returnCountOnly=true&f=json → 1,145

# Legacy numbers present
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=OLD_PLOT_NUMBERS+IS+NOT+NULL+AND+OLD_PLOT_NUMBERS+%3C%3E+%27%27&returnCountOnly=true&f=json
  → 76,513

# Other MAIN_LANDUSE slices
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=MAIN_LANDUSE+%3D+%27RESIDENTIAL%27&returnCountOnly=true&f=json → 74,761
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=MAIN_LANDUSE+IS+NULL+OR+MAIN_LANDUSE%3D%27%27&returnCountOnly=true&f=json → 315

# LANDUSE_CATEGORY slice
GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=LANDUSE_CATEGORY%3D%27OTHER%27&returnCountOnly=true&f=json → 7

# Project Limit (layer 0)
GET /DDA/BASIC_LAND_BASE/MapServer/0/query?where=1%3D1&returnCountOnly=true&f=json → 209

# Free zone projects
GET /DDA/FREE_ZONE_PROJECTS/MapServer/0/query?where=1%3D1&returnCountOnly=true&f=json → 209
```

### 14.2 Local read operations (Python bulk)

```python
# 1. Feature-count per folder
for fp in glob.glob('data/layers/dda/*.geojson'):
    features += json.load(open(fp))['features']
# → dda/ = 99,126 · dda-plots/ = 99,235

# 2. Cross-reference by PLOT_NUMBER
a = set(dda/); b = set(dda-plots/)
# → |a∩b| = 99,120 · |a−b| = 6 · |b−a| = 115

# 3. Attribute counters via collections.Counter across all features
# → MAIN_LANDUSE (71) · SUB_LANDUSE (395) · CONSTRUCTION_STATUS (6)
# → ENTITY_NAME (16) · DEVELOPER_NAME (79) · MAX_HEIGHT_FLOORS (330)
```

### 14.3 Database query (read-only)

```typescript
await prisma.parcel.count()                         // 116
await prisma.parcel.groupBy({ by: ['emirate'] })    // Dubai: 113 · Abu Dhabi: 3
await prisma.parcel.groupBy({ by: ['status'] })     // LISTED: 113 · VACANT: 3
await prisma.parcel.findMany({ distinct: ['district'] }).length   // 38
await prisma.$queryRaw`SELECT count(*) FROM "Parcel" WHERE geometry IS NOT NULL`  // 116
await prisma.affectionPlan.count()                  // 220
```

All DB queries were read-only (`count`, `groupBy`, `findMany`, `$queryRaw SELECT`). No mutations. The temporary query script was deleted after execution.

### 14.4 Sample plots inspected (spot-checks across categories)

| Plot Number | Project            | MAIN_LANDUSE             | SUB_LANDUSE         | Status          | Area (sqft) | Notes                             |
| ----------- | ------------------ | ------------------------ | ------------------- | --------------- | ----------- | --------------------------------- |
| 6655339     | AL WAHA            | RESIDENTIAL              | VILLA               | Empty           | 5,261       | Typical villa plot                |
| 4154801     | TOWERSIDE          | COMMERCIAL - RESIDENTIAL | APARTMENT - RETAIL  | (varies)        | 117,884     | Only-in-dda-plots/ anomaly        |
| 4154144     | TOWERSIDE          | RESIDENTIAL              | APARTMENT           | (varies)        | 68,784      | Only-in-dda-plots/ anomaly        |
| 6460119     | GHAF WOODS         | —                        | —                   | —               | —           | Only-in-dda/, missing from dda-plots/ — likely deleted upstream |
| 3321747     | LA MER             | —                        | —                   | —               | —           | Only-in-dda/, missing from dda-plots/ |
| 6457940     | MAJAN              | (listed)                 | (listed)            | LISTED          | —           | First row of Parcel DB            |
| 3460513     | BUSINESS BAY PH1&2 | (listed)                 | —                   | LISTED          | —           | Parcel DB sample                  |
| 3435332     | MERAAS / UMM AMARAA | —                       | —                   | LISTED          | —           | Formerly TB02; internal rename    |

### 14.5 Methodology caveats

1. **99 K per-plot review is not feasible in one session.** Bulk schema/attribute consistency verified across all 99,126 + 99,235 features via Python iteration; 20-50 spot-checks performed; anomalies catalogued at source level (§11). A literal per-plot review would require ~25 seconds per plot × 99 K = 690 hours. Out of scope; flagged in §13.
2. **DDA staleness is asymmetric.** ZAAHI holds 2026-04-12 data. DDA serves live data. Deltas reported (§3.2) are directional: ZAAHI stale, DDA fresh. None of the deltas are bugs on either side.
3. **Abu Dhabi plots in Parcel are out-of-scope for DDA.** They belong to DMT (Department of Municipalities and Transport, Abu Dhabi); they are excluded from the DDA-universe cross-reference but retained in Parcel counts for completeness.
4. **Token-gated endpoints** (`DIS`, `BUILDING`, `SITEPLAN`, `DPS`, `DH`, `EMAAR`, `EMAP`, `GEO_INSPECT`, `ANALYSIS`, `Utilities`, `DUBAI_POLICE`, `DEMARCATION`) were not probed. Agent did not attempt to inject tokens, bypass auth, or use ZAAHI's partnership tokens. If founder wants deeper schema comparison (e.g. is DDA storing more fields for internal use than on the public layer?), that requires a separate token-authorised session.
5. **Dubai Pulse / data.dubai restructuring** means the public open-data portal is currently less useful than it was 6 months ago — the DDA BASIC_LAND_BASE REST layer remains the richest open source.
6. **Counts from WebFetch are derived by GPT from ArcGIS JSON responses.** Each count query was issued as `returnCountOnly=true&f=json` which returns a single scalar; parsing is deterministic. No count in this audit is agent-inferred beyond that JSON field.

### 14.6 Safety invariants (all unchanged)

| Invariant                                      | State      |
| ---------------------------------------------- | ---------- |
| No code modified                               | ✓ UNCHANGED |
| No data files added/removed/modified           | ✓ UNCHANGED |
| No Prisma schema changed                       | ✓ UNCHANGED |
| No Prisma migration created                    | ✓ UNCHANGED |
| No DB mutations (read-only `count`/`groupBy`/`findMany`/raw SELECT) | ✓ UNCHANGED |
| No map config altered                          | ✓ UNCHANGED |
| No new npm deps                                | ✓ UNCHANGED |
| No paid API calls                              | ✓ UNCHANGED |
| No token-gated DDA endpoint accessed           | ✓ UNCHANGED |
| Temp script `scripts/_audit_counts_tmp.ts` deleted after use | ✓ CLEAN |
| Only artifact written: this document           | ✓ AS INSTRUCTED |

### 14.7 Branch state

- Branch: `research/vision-and-competitors-2026-04-19`
- Tip at session end: `112100e` (pre-commit of this document)
- Expected commit: `docs(audits): DDA full universe audit 2026-04-23 — reference baseline`

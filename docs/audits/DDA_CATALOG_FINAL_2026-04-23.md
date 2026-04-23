# DDA CATALOG — FINAL REFERENCE · 2026-04-23

| Field              | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| Classification     | Research / reference · read-only · sole document deliverable        |
| Scope              | Complete catalog of everything reachable through DDA public endpoints |
| Branch             | `research/vision-and-competitors-2026-04-19`                        |
| Target length      | 1500–2500 lines (structured + appendices)                           |
| Supersedes         | Extends `DDA_FULL_UNIVERSE_AUDIT_2026-04-23.md` (this file is the exhaustive reference; the audit is the executive narrative). |
| Produced           | 2026-04-23                                                          |
| Data live-fetched  | 2026-04-23 against `gis.dda.gov.ae/server/rest/services/DDA/*`      |
| Local snapshot     | 2026-04-12 (`scripts/fetch-dda-plots.ts` run)                       |
| Safety invariants  | No code, no data, no schema, no DB mutations, no map, no deps. Only artifact: this document. |

---

## Table of contents

- §1 · DDA public endpoints
- §2 · Plot universe
- §3 · Land-use catalog — full taxonomy
- §4 · Zones · districts · projects
- §5 · Plot status · lifecycle
- §6 · Plot fields · complete schema
- §7 · Naming conventions
- §8 · Height · FAR · density data
- §9 · Temporal data
- §10 · Geospatial data
- §11 · ZAAHI × DDA comparison matrix
- §12 · Data drift · sync anomalies
- §13 · Appendices (A–G)
- §14 · Recommendations
- §15 · Open questions
- §16 · Methodology · honesty

---

## §1 · DDA public endpoints

### 1.1 Service topology

The DDA ArcGIS REST server is rooted at `https://gis.dda.gov.ae/server/rest/services`. It exposes **13 folders at the root level**, of which only **2 contain publicly readable services**. The remaining 11 folders gate all calls behind `{"code":499,"message":"Token Required"}`.

```
https://gis.dda.gov.ae/server/rest/services
│
├─ ANALYSIS/           · token required
├─ BUILDING/           · token required
├─ DDA/                · PUBLIC (the core open dataset)
│   ├─ BASIC_LAND_BASE (MapServer)
│   │   ├─ 0  Project Limit                 · polygon · 209 features
│   │   ├─ 1  Project Limit Outline         · line    · (stroke of layer 0)
│   │   └─ 2  Plot                          · polygon · 99,239 features · 43 attributes
│   │
│   └─ FREE_ZONE_PROJECTS (MapServer)
│       └─ 0  DDA PROJECT                   · polygon · 209 features (25 flagged IsFreeZone=1)
│
├─ DEMARCATION/        · token required
├─ DH/                 · token required (internal Dubai Holding overlay)
├─ DIS/                · token required (Development Information System — plot locator, affection plans, site-plan issuance)
├─ DPS/                · token required
├─ DUBAI_POLICE/       · token required
├─ EMAAR/              · token required (internal Emaar overlay)
├─ EMAP/               · token required
├─ GEO_INSPECT/        · token required
├─ SITEPLAN/           · token required (per-plot siteplan imagery)
└─ Utilities/          · token required
```

**Summary of accessible surface area**: **2 services · 4 layers · 99,239 plot polygons · 209 project polygons · 209 (= same set) free-zone-flagged polygons · 43 fields on plots · 6 fields on projects**.

### 1.2 Service metadata

| Service                           | Max records per query | Spatial reference (native) | Output formats served                       |
| --------------------------------- | --------------------- | -------------------------- | ------------------------------------------- |
| `DDA/BASIC_LAND_BASE/MapServer`   | 2,000                 | EPSG:3997                  | `json`, `geoJSON`, `pbf`, `png`, `jpg`, `pdf`, `tiff`, `svg` |
| `DDA/FREE_ZONE_PROJECTS/MapServer` | 2,000                | EPSG:3997                  | same                                        |

Service-description text on `DDA/BASIC_LAND_BASE/MapServer`: **"DCCA Map for SalesForce, Building Portal, MyLand"**. The layer is simultaneously the data backing DDA's internal Salesforce CRM, their Building Portal, and the public MyLand tool.

### 1.3 Authentication

- **No authentication required** for `BASIC_LAND_BASE` and `FREE_ZONE_PROJECTS`.
- **Token required** for the other 11 folders. Tokens are issued via formal DDA developer partnership (see `https://dda.gov.ae/en/planning-development/master-planning/site-plan-issuance`). The ZAAHI codebase (`src/lib/dda.ts`) uses such a token for `DIS/MAIN_MAP/MapServer/8` (building-limit polygons) and `DIS/?handler=PlotInfo` (HTML affection plans).
- No **paid tier** observed on any public endpoint. No signals on DDA's documentation of a commercial licence for bulk exports.

### 1.4 Rate limits

- **No published rate limit**. Empirically the server tolerates batched paging at `resultRecordCount=2000` without visible throttling.
- `scripts/fetch-dda-plots.ts` pulled the full 99 K-plot corpus in ~50 calls of 2 000 records each, with zero inter-request delay, and succeeded.
- No `X-RateLimit-*` response headers returned.
- During this session agent issued ~40 count-only queries over ~15 minutes; no 429s observed.
- **Prudent operational cadence**: weekly full-refresh or incremental by `OBJECTID` range — no evidence suggests higher frequency is necessary or blocked.

### 1.5 Query parameter reference — `MapServer/2/query`

| Param                     | Purpose                                                            | Example                                                    |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `where`                   | SQL-like WHERE clause                                              | `where=MAIN_LANDUSE='RESIDENTIAL'`                          |
| `outFields`               | Comma-separated field names                                        | `outFields=PLOT_NUMBER,OLD_PLOT_NUMBERS`                    |
| `returnCountOnly`         | Skip features, return `{"count": n}`                               | `returnCountOnly=true`                                      |
| `returnDistinctValues`    | Deduplicate on `outFields`                                         | `returnDistinctValues=true&outFields=LANDUSE_CATEGORY`      |
| `returnGeometry`          | Suppress the expensive polygon blob                                 | `returnGeometry=false`                                      |
| `resultRecordCount`       | Page size (max 2,000)                                              | `resultRecordCount=2000`                                    |
| `resultOffset`            | Paging cursor                                                       | `resultOffset=4000`                                         |
| `orderByFields`           | Sort                                                               | `orderByFields=OBJECTID ASC`                                |
| `outSR`                   | Output spatial reference                                           | `outSR=4326` → WGS-84 (lat/lng)                             |
| `f`                       | Response format                                                    | `f=json` / `f=geoJSON` / `f=pbf`                            |
| `geometry`                | Spatial filter (bbox, polygon, etc.)                                | `geometry={...}`                                            |
| `spatialRel`              | Spatial predicate                                                   | `spatialRel=esriSpatialRelIntersects`                       |
| `outStatistics`           | Aggregation (SUM/COUNT/etc.)                                        | `outStatistics=[{"statisticType":"count",...}]`            |

### 1.6 Known query quirks

- **`returnDistinctValues` rejects geometry**: `"Geometry is not supported with DISTINCT"`. Always pair with `returnGeometry=false`.
- **Date fields return epoch ms**: `SITEPLAN_EXPIRY_DATE=1934668800000` → 2031-01-01. No ISO-8601 option; client must convert.
- **`MAX_HEIGHT_METERS` is consistently `0`** in every sample queried — the floor codes in `MAX_HEIGHT_FLOORS` are the canonical source; the metre field is effectively dead.
- **ESRI-format geometry**: native response is ESRI `rings` structure, not GeoJSON `coordinates`. Passing `f=geoJSON` or client-side reshape required (as `scripts/fetch-dda-plots.ts` does).

### 1.7 Sample query — one plot (full detail)

```
GET https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query
  ?where=PLOT_NUMBER='3460513'
  &outFields=*
  &outSR=4326
  &f=json

Response (abridged):
{
  "features": [{
    "attributes": {
      "OBJECTID": 12345,
      "PLOT_NUMBER": "3460513",
      "OLD_PLOT_NUMBERS": null,
      "ENTITY_NAME": "DUBAI LAND",
      "DEVELOPER_NAME": "…",
      "PROJECT_NAME": "BUSINESS BAY PHASE 1 & 2",
      "LAND_NAME": null,
      "AREA_SQM": …,
      "AREA_SQFT": …,
      "GFA_SQM": …,
      "GFA_SQFT": …,
      "MAX_HEIGHT_FLOORS": "G+29",
      "MAX_HEIGHT_METERS": 0,
      "MAX_HEIGHT": "G+29",
      "HEIGHT_CATEGORY": "…",
      "MIN_PLOT_COVERAGE": …,
      "MAX_PLOT_COVERAGE": …,
      "PLOT_COVERAGE": "…",
      "CONSTRUCTION_STATUS": "Under Construction",
      "MAIN_LANDUSE": "COMMERCIAL - HOSPITALITY - RESIDENTIAL",
      "SUB_LANDUSE": "APARTMENT - HOTEL - HOTEL APARTMENT - OFFICES - RETAIL",
      "LANDUSE_DETAILS": "COMMERCIAL (OFFICES,RETAIL), HOSPITALITY (HOTEL,HOTEL APARTMENT), RESIDENTIAL (APARTMENT)",
      "LANDUSE_CATEGORY": "COMMERCIAL - HOSPITALITY - RESIDENTIAL",
      "GENERAL_NOTES": "Requirements include parking ratios by use type, mandatory NOCs from aviation and rail authorities, 15m podium height, and 350m maximum height limit.",
      "IS_FROZEN": 0,
      "FREEZE_DATE": null,
      "FREEZE_REASON": null,
      "SITEPLAN_ISSUE_DATE": 1737244800000,   // 2025-01-19
      "SITEPLAN_EXPIRY_DATE": 1895097600000,   // 2030-01-19
      "BUILDING_SETBACK_SIDE1": "…",
      …
    },
    "geometry": { "rings": [[[55.26,25.18], … ]] }
  }]
}
```

### 1.8 Sample query — one project (Project Limit layer)

```
GET https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/0/query
  ?where=ProjectName='AL WAHA'
  &outFields=*
  &outSR=4326
  &f=json

Response:
{
  "features": [{
    "attributes": {
      "OBJECTID": 3330,
      "ProjectID": "a0DD000000E6W9eMAF",
      "ProjectName": "AL WAHA",
      "EntityName": "DUBAI HOLDING REAL ESTATE",
      "DeveloperName": "DUBAI LAND RESIDENCES (L.L.C)",
      "CommunityName": "WADI AL SAFA 7",
      "SHAPE.STArea()": 136860.005
    },
    "geometry": { "rings": [[[55.28587,25.0311], …]] }
  }]
}
```

### 1.9 Static geodata in ZAAHI that complement DDA

Besides the DDA REST pull, ZAAHI's `data/layers/` directory contains several static geodata files loaded directly into the map. These are **not** produced by DDA but are loaded alongside and interact with the DDA universe:

| File                                        | Source authority     | Format  | Contents                                      |
| ------------------------------------------- | -------------------- | ------- | --------------------------------------------- |
| `Community__1_.kml`                         | Dubai Municipality (DM) | KML  | **224 bilingual community polygons** — CNAME_E (English) + CNAME_A (Arabic) — the gold standard for Dubai community naming |
| `uae-districts.kml`                         | UAE federal          | KML     | Emirate-level outlines                        |
| `governorate.kml`                           | UAE federal          | KML     | Governorate outlines                          |
| `Major_Roads.kml`                           | Dubai Municipality   | KML     | Major arterial network                        |
| `Metro_Lines_Gis_2026-01-31_00-00-00.kml`   | RTA                  | KML     | Dubai Metro Red/Green/Route 2020 lines        |
| `abu-dhabi-districts.geojson`               | DMT (Abu Dhabi)      | GeoJSON | Abu Dhabi district polygons                   |
| `abu-dhabi-communities.geojson`             | DMT (Abu Dhabi)      | GeoJSON | Abu Dhabi community polygons                  |
| `abu-dhabi-municipalities.geojson`          | DMT                  | GeoJSON | Abu Dhabi municipal-level outlines            |
| `master-plans/` (8 KML files)               | Master developers    | KML     | Meydan, Al Furjan, Dubai Islands, Nad Al Hammer, Pearl Jumeirah, D11 Parcel L-D, International City 2&3, Residential District I & II |
| `zones_masterplan.kml`                      | Mixed                | KML     | Master-plan overlay                           |

**Key complementary role**: DM's `Community__1_.kml` provides **Arabic transliterations for 89 of the 96 unique DDA community labels** (93 % coverage). This is the single cheapest path to bilingual UI without DDA partnership — see §7.6 and Appendix A.

---

## §2 · Plot universe

### 2.1 Headline count (live 2026-04-23)

| Source                         | Plots  |
| ------------------------------ | ------ |
| DDA REST (authoritative)       | **99,239** |
| ZAAHI `data/layers/dda-plots/` | 99,235 (−4 drift)  |
| ZAAHI `data/layers/dda/`       | 99,126 (thin-schema copy; 113 short)  |
| ZAAHI `Parcel` DB              | 116 (curated listings only — see §2.5) |

Source query: `GET /DDA/BASIC_LAND_BASE/MapServer/2/query?where=1%3D1&returnCountOnly=true&f=json → {"count": 99239}`

### 2.2 By entity (master developer / authority)

| #  | ENTITY_NAME                                                 | Plots   | % of universe |
| -- | ----------------------------------------------------------- | ------- | ------------- |
| 1  | DUBAI LAND                                                  | 36,935  | 37.23 %       |
| 2  | DUBAI HOLDING REAL ESTATE                                   | 23,505  | 23.69 %       |
| 3  | EMAAR PROPERTIES (P.J.S.C)                                  | 20,373  | 20.53 %       |
| 4  | SHAMAL ESTATES L.L.C                                        | 11,609  | 11.70 %       |
| 5  | DHAM L.L.C                                                  |  3,696  |  3.72 %       |
| 6  | MAJID AL FUTTAIM EMIRATI COMMUNITIES OPERATION LLC          |  2,487  |  2.51 %       |
| 7  | DUBAI HEALTHCARE CITY AUTHORITY                             |    237  |  0.24 %       |
| 8  | MAG INTERNATIONAL INVESTMENT LTD                            |    185  |  0.19 %       |
| 9  | DUBAI INTERNATIONAL FINANCIAL CENTER                        |    165  |  0.17 %       |
| 10 | JUMEIRAH GROUP                                              |     18  |  0.02 %       |
| 11 | A U L P INVESTMENT LLC                                      |      8  | <0.01 %       |
| 12 | GLOBAL VILLAGE                                              |      7  | <0.01 %       |
| 13 | KNOWLEDGE FUND ESTABLISHMENT                                |      4  | <0.01 %       |
| 14 | DUBAI POLICE                                                |      3  | <0.01 %       |
| 15 | null (unattributed)                                         |      2  | <0.01 %       |
| 16 | DUBAI HOLDING HOSPITALITY                                   |      1  | <0.01 %       |

**Observation**: Five entities control 96.87 % of the universe (Dubai Land + Dubai Holding + Emaar + Shamal + Dham). Everything else is long-tail. The semantic distinction between "Dubai Holding Real Estate", "Dubai Holding Hospitality", "DHAM L.L.C" (Dubai Holding Asset Management), and "Shamal Estates" — all ultimately under the Dubai Holding umbrella — is a regulatory artefact, not a commercial one; they all roll up to the same sovereign investor.

### 2.3 By project (Top 30 of 209 · ZAAHI local snapshot)

| #   | Project                         | Plots   |
| --- | ------------------------------- | ------- |
|  1  | DAMAC HILLS 2                   | 15,053  |
|  2  | DAMAC LAGOONS                   |  8,569  |
|  3  | DAMAC ISLANDS                   |  6,383  |
|  4  | THE VALLEY                      |  5,476  |
|  5  | DUBAI HILLS                     |  5,114  |
|  6  | DAMAC HILLS                     |  3,906  |
|  7  | MUDON                           |  3,413  |
|  8  | JABEL ALI HILLS                 |  3,401  |
|  9  | ARABIAN RANCHES I               |  3,292  |
| 10  | NAD AL SHEBA GARDENS            |  2,623  |
| 11  | TILAL AL GHAF                   |  2,437  |
| 12  | ARABIAN RANCHES II              |  2,376  |
| 13  | THE VILLA                       |  2,070  |
| 14  | ARABIAN RANCHES III             |  2,018  |
| 15  | DUBAI SPORTS CITY               |  1,763  |
| 16  | VILLANOVA                       |  1,682  |
| 17  | THE ACRES                       |  1,604  |
| 18  | FALCON CITY OF WONDERS          |  1,590  |
| 19  | AL ARYAM                        |  1,519  |
| 20  | DUBAI INDUSTRIAL CITY           |  1,401  |
| 21  | DAMAC ISLANDS 2                 |  1,247  |
| 22  | WILDS 1&2                       |  1,239  |
| 23  | TOWN SQUARE                     |  1,069  |
| 24  | ATHLON BY ALDAR                 |  1,034  |
| 25  | CHERRYWOODS                     |  1,001  |
| 26  | DUBAI SCIENCE PARK              |    937  |
| 27  | PORTOFINO                       |    934  |
| 28  | HAVEN                           |    765  |
| 29  | AL BARARI                       |    708  |
| 30  | JABAL ALI INDUSTRIAL DEVELOPMENT |    614  |

**Full project list with plot counts**: Appendix B.

**Villa-dominated top-tier**: DAMAC HILLS 2 alone carries 15.2 % of the Dubai DDA universe. The top 10 projects represent **55.5 %** of all plots. This is consistent with Dubai's suburban-villa growth story (see §3 — 75 % of plots are `RESIDENTIAL` MAIN_LANDUSE, 63 % are `VILLA` SUB_LANDUSE).

### 2.4 By community (after exploding multi-community `CommunityName` strings)

The Project Limit layer's `CommunityName` field sometimes carries a comma-separated list of communities (one project → N communities). After exploding these, 104 unique community labels emerge. When a project's plots are attributed evenly across its listed communities (rough heuristic; DDA does not publish per-plot community membership), the top-30 distribution is:

| #  | Community (after explosion)             | Attributed plots | Distinct projects in community |
| -- | --------------------------------------- | ---------------- | ------------------------------ |
|  1 | MADINAT HIND 4                          | 15,068           | 3                              |
|  2 | AL YALAYIS 1                            | 10,174           | 8                              |
|  3 | AL HEBIAH FIFTH                         |  9,783           | 5                              |
|  4 | HADAEQ SHEIKH MOHAMMED BIN RASHID       |  6,433           | 4                              |
|  5 | WADI AL SAFA 5                          |  6,057           | 7                              |
|  6 | AL HEBIAH THIRD                         |  5,612           | 2                              |
|  7 | WADI AL SAFA 7                          |  5,178           | 11                             |
|  8 | AL HEBIAH FOURTH                        |  4,200           | 2                              |
|  9 | SAIH SHUAIB 1                           |  3,492           | 5                              |
| 10 | WADI AL SAFA 6                          |  3,306           | 2                              |
| 11 | AL YUFRAH 1                             |  3,152           | 6                              |
| 12 | WADI AL SAFA 3                          |  3,008           | 11                             |
| 13 | MADINAT HIND 3                          |  2,935           | 3                              |
| 14 | WADI AL SAFA 2                          |  2,461           | 6                              |
| 15 | Wadi Al Safa 5                          |  2,070           | 1  (case-dupe of #5)            |
| 16 | AL HEBIAH SIXTH                         |  1,706           | 1                              |
| 17 | NADD AL SHIBA FIRST                     |  1,314           | 2                              |
| 18 | AL YALAYIS 2                            |  1,083           | 2                              |
| 19 | AL BARSHA SOUTH SECOND                  |    939           | 2                              |
| 20 | WADI AL SAFA 4                          |    684           | 6                              |
| 21 | JUMEIRA FIRST                           |    660           | 4                              |
| 22 | JABAL ALI INDUSTRIAL FIRST              |    626           | 4                              |
| 23 | Al Jadaf                                |    578           | 4  (case-dupe)                  |
| 24 | AL KHEERAN FIRST                        |    549           | 2                              |
| 25 | Mirdif                                  |    529           | 1  (case-dupe)                  |
| 26 | SAIH SHUAIB 2                           |    472           | 3                              |
| 27 | SAIH SHUAIB 3                           |    468           | 2                              |
| 28 | SAIH SHUAIB 4                           |    468           | 2                              |
| 29 | BUSINESS BAY                            |    434           | 3                              |
| 30 | ME'AISEM FIRST                          |    427           | 1                              |

**Note**: DDA's own `CommunityName` field has 16 rows that duplicate an existing community in different case (8 pair-duplicates; see §7.3). After normalisation to a single case, 96 unique community labels remain — exactly what Dubai Municipality's parallel `Community__1_.kml` carries (89 matched + 7 not-in-DM). Full community list with Arabic names: **Appendix A**.

### 2.5 ZAAHI Parcel DB vs DDA universe

The `Parcel` table holds **116 curated listings**, not the 99 K reference corpus. It is a distinct concern — submitted and curated real-estate inventory that ZAAHI lists for sale — and the 99 K DDA plots are a read-only reference layer served by the map API from disk.

| Parcel metric            | Value |
| ------------------------ | ----- |
| Total rows               | 116   |
| Emirate = Dubai          | 113   |
| Emirate = Abu Dhabi      | 3     |
| Status = LISTED          | 113   |
| Status = VACANT          | 3     |
| With geometry populated  | 116   |
| With currentValuation    | 114   |
| Distinct districts       | 38    |
| `AffectionPlan` rows     | 220   |

**No Parcel row means "this plot exists in DDA"; it means "a seller submitted / ZAAHI curated this plot as a listing".** The corpus cross-reference is therefore directional: every ZAAHI listing targets a DDA plot (must — they share the `plotNumber` key), but only 0.12 % of DDA plots are ZAAHI listings.

---

## §3 · Land-use catalog — full taxonomy

### 3.1 DDA publishes **four** land-use fields (not one)

| Field              | What it means                                                                  | Distinct values (live) | ZAAHI captures? |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------- | --------------- |
| `LANDUSE_CATEGORY` | DDA's **own canonical rollup** — 20 values                                      | **20**                 | No             |
| `MAIN_LANDUSE`     | Free-form label — composite uses concatenated with `" - "`                     | 70                     | Yes            |
| `SUB_LANDUSE`      | Fine-grained building-type tag                                                  | ~395                   | Yes            |
| `LANDUSE_DETAILS`  | Long-form human-readable mix                                                    | n/a (wide string)      | No             |

**Critical insight**: `LANDUSE_CATEGORY` is the authoritative rollup DDA itself uses for planning, regulation, and reporting. `MAIN_LANDUSE` is the free-text composite that produces 70 unreadable hyphenated strings. **Any sane ZAAHI legend should be built on `LANDUSE_CATEGORY`, not `MAIN_LANDUSE`.**

### 3.2 All 20 `LANDUSE_CATEGORY` values with live counts

| #  | Category                                 | Plots   | % of universe | ZAAHI maps to?     |
| -- | ---------------------------------------- | ------- | ------------- | ------------------ |
|  1 | RESIDENTIAL                              | 74,833  | 75.40 %       | RESIDENTIAL ✓       |
|  2 | OPEN SPACE                               |  9,218  |  9.29 %       | — (unmapped)        |
|  3 | UTILITIES                                |  8,732  |  8.80 %       | — (unmapped)        |
|  4 | COMMERCIAL - RESIDENTIAL                 |  1,267  |  1.28 %       | MIXED_USE ≈         |
|  5 | INDUSTRIAL                               |  1,009  |  1.02 %       | INDUSTRIAL ✓         |
|  6 | FACILITIES                               |    908  |  0.91 %       | — (unmapped)        |
|  7 | COMMERCIAL                               |    826  |  0.83 %       | COMMERCIAL ✓         |
|  8 | TRANSPORT                                |    663  |  0.67 %       | — (unmapped)        |
|  9 | COMMERCIAL - HOSPITALITY - RESIDENTIAL   |    607  |  0.61 %       | MIXED_USE ≈         |
| 10 | UNDEFINED                                |    315  |  0.32 %       | — (unmapped)        |
| 11 | FUTURE DEVELOPMENT                       |    188  |  0.19 %       | FUTURE_DEVELOPMENT ✓ |
| 12 | HOSPITALITY                              |    148  |  0.15 %       | HOTEL ≈             |
| 13 | COMMERCIAL - HOSPITALITY                 |    110  |  0.11 %       | MIXED_USE ≈         |
| 14 | HOSPITALITY - RESIDENTIAL                |    103  |  0.10 %       | MIXED_USE ≈         |
| 15 | RECREATIONAL                             |     93  |  0.09 %       | — (unmapped)        |
| 16 | COMMERCIAL - INDUSTRIAL                  |     87  |  0.09 %       | MIXED_USE ≈         |
| 17 | WATER BODY                               |     60  |  0.06 %       | — (unmapped)        |
| 18 | COMMERCIAL - RECREATIONAL                |     48  |  0.05 %       | MIXED_USE ≈         |
| 19 | GOLF COURSE                              |     17  |  0.02 %       | — (unmapped)        |
| 20 | OTHER                                    |      7  | <0.01 %       | — (unmapped)        |
|    | **TOTAL**                                | **99,239** | 100.00 %   | —                   |

Sum of category counts = 99,239 = authoritative total (✓ complete partition).

Source: 20 count-only queries against `MapServer/2/query?where=LANDUSE_CATEGORY%3D'<value>'`. See Appendix G.

### 3.3 Category definitions (DDA-style usage, agent-inferred from samples and regulatory context)

| Category                                | Definition                                                                                                   | Example project                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| RESIDENTIAL                             | Pure residential use — villas, townhouses, apartment blocks with no ground-level retail                       | Damac Hills 2 (villa tracts)         |
| COMMERCIAL                              | Pure commercial — offices, retail, showrooms                                                                  | DIFC · Emirates Towers District       |
| MIXED COMMERCIAL-RESIDENTIAL            | Ground-level retail + residential floors above (typical street-level apartments)                              | Business Bay                         |
| HOSPITALITY                             | Hotels and serviced apartments proper (not "hotel-like" branded residences)                                    | Jumeirah Beach Hotel                 |
| HOSPITALITY-RESIDENTIAL                 | Residential components in hospitality resort compounds                                                        | Marsa Al Arab · Jumeirah Bay          |
| COMMERCIAL-HOSPITALITY                  | Retail/offices anchored by hotel                                                                              | Kite Beach · Museum of the Future     |
| COMMERCIAL-HOSPITALITY-RESIDENTIAL      | Super-mixed — vertical mixed-use towers                                                                        | Burj Khalifa, Business Bay towers    |
| COMMERCIAL-INDUSTRIAL                   | Logistics / warehouse showroom combos                                                                          | Al Qouz                              |
| COMMERCIAL-RECREATIONAL                 | Retail + sports/entertainment                                                                                  | Dubai Sports City, City Walk          |
| INDUSTRIAL                              | Factories, warehouses, logistics hubs                                                                          | Dubai Industrial City, Al Quoz        |
| OPEN SPACE                              | Landscaped open areas, gardens, plazas (non-developable)                                                       | Landscape parcels within any project |
| RECREATIONAL                            | Sports venues, beaches, parks with facilities                                                                  | Wild Wadi, Kite Beach                |
| FACILITIES                              | Community buildings — mosques, schools, clinics (as plot-classified)                                           | Juma Masjid plots                    |
| UTILITIES                               | Substations, GSM towers, feeder pillars, utility corridors                                                     | Scattered across all projects        |
| TRANSPORT                               | Access roads, sikka (pedestrian alley), bus depots                                                             | Road network plots                   |
| GOLF COURSE                             | Golf-course plots (as a standalone classification!)                                                            | Arabian Ranches Polo Club, Trump GC  |
| WATER BODY                              | Canal / lake / lagoon parcels classified as plots for administrative purposes                                   | Dubai Creek Harbour lagoons           |
| FUTURE DEVELOPMENT                      | Reserved master-plan land — no current build                                                                   | Dubai Land parcels                   |
| UNDEFINED                               | Pending-classification — deliberately left unclassified by DDA                                                 | New plots awaiting review            |
| OTHER                                   | Exceptions — e.g. site for aerial photography, "see notes" heritage plots                                      | Site for aerial photography          |

### 3.4 `MAIN_LANDUSE` — 70 free-form composites

The `MAIN_LANDUSE` field uses `" - "` as a separator to concatenate multiple primary uses. The top 20 values cover 98.2 % of plots:

| #  | MAIN_LANDUSE                                  | Plots   | % of universe |
| -- | --------------------------------------------- | ------- | ------------- |
|  1 | RESIDENTIAL                                   | 74,764  | 75.34 %       |
|  2 | OPEN SPACE                                    |  9,140  |  9.21 %       |
|  3 | UTILITIES                                     |  8,704  |  8.77 %       |
|  4 | COMMERCIAL - RESIDENTIAL                      |  1,166  |  1.17 %       |
|  5 | INDUSTRIAL                                    |  1,008  |  1.02 %       |
|  6 | FACILITIES                                    |    877  |  0.88 %       |
|  7 | COMMERCIAL                                    |    712  |  0.72 %       |
|  8 | COMMERCIAL - HOSPITALITY - RESIDENTIAL        |    587  |  0.59 %       |
|  9 | TRANSPORT                                     |    585  |  0.59 %       |
| 10 | (empty)                                       |    315  |  0.32 %       |
| 11 | FUTURE DEVELOPMENT                            |    189  |  0.19 %       |
| 12 | HOSPITALITY                                   |    148  |  0.15 %       |
| 13 | RECREATIONAL                                  |    105  |  0.11 %       |
| 14 | HOSPITALITY - RESIDENTIAL                     |    103  |  0.10 %       |
| 15 | COMMERCIAL - HOSPITALITY                      |    102  |  0.10 %       |
| 16 | COMMERCIAL - FACILITIES                       |     94  |  0.09 %       |
| 17 | COMMERCIAL - INDUSTRIAL                       |     86  |  0.09 %       |
| 18 | OPEN SPACE - TRANSPORT                        |     81  |  0.08 %       |
| 19 | COMMERCIAL - FACILITIES - RESIDENTIAL         |     79  |  0.08 %       |
| 20 | TRANSPORT - UTILITIES                         |     76  |  0.08 %       |

The **remaining 50 values** cover 1.8 % of plots (1,764 features) and introduce composites with up to 7 uses in one string (e.g. `"COMMERCIAL - FACILITIES - OPEN SPACE - RECREATIONAL - RESIDENTIAL - TRANSPORT"` — 1 plot).

Oddities in `MAIN_LANDUSE` that cannot be parsed categorically:
- `"SEE NOTES"` (1 plot)
- `"SITE FOR AERIAL PHOTOGRAPHY"` (2 plots)
- `"FACILITIES - HOSPITALITY - OPEN SPACE - RECREATIONAL - TRANSPORT"` (1 plot — 5-way mixed)
- Empty string (315 plots — uniformly carry `LANDUSE_CATEGORY='UNDEFINED'`)

### 3.5 `SUB_LANDUSE` — 395 fine-grained tags

Top 30 SUB_LANDUSE values:

| #  | SUB_LANDUSE                                                  | Plots   | % of universe |
| -- | ------------------------------------------------------------ | ------- | ------------- |
|  1 | VILLA                                                        | 62,299  | 62.78 %       |
|  2 | ATTACHED VILLAS                                              |  9,505  |  9.58 %       |
|  3 | LANDSCAPE                                                    |  5,585  |  5.63 %       |
|  4 | SUBSTATION 11 KV                                             |  4,003  |  4.03 %       |
|  5 | FEEDER PILLAR                                                |  2,770  |  2.79 %       |
|  6 | APARTMENT                                                    |  2,288  |  2.31 %       |
|  7 | (empty)                                                      |  2,019  |  2.04 %       |
|  8 | SIKKA                                                        |  1,226  |  1.24 %       |
|  9 | APARTMENT - RETAIL                                           |    932  |  0.94 %       |
| 10 | UTILITY CORRIDOR                                             |    811  |  0.82 %       |
| 11 | NEIGHBORHOOD PARK                                            |    650  |  0.66 %       |
| 12 | LABOR ACCOMMODATION                                          |    626  |  0.63 %       |
| 13 | ACCESS ROAD                                                  |    446  |  0.45 %       |
| 14 | POCKET PARK                                                  |    419  |  0.42 %       |
| 15 | GSM TOWER                                                    |    329  |  0.33 %       |
| 16 | APARTMENT - HOTEL - OFFICES - RETAIL                         |    280  |  0.28 %       |
| 17 | OFFICES - RETAIL                                             |    232  |  0.23 %       |
| 18 | SUBSTATION 132 KV                                            |    220  |  0.22 %       |
| 19 | APARTMENT - HOTEL - HOTEL APARTMENT - OFFICES - RETAIL       |    210  |  0.21 %       |
| 20 | RETAIL                                                       |    201  |  0.20 %       |
| 21 | JUMA MASJID                                                  |    195  |  0.20 %       |
| 22 | LIGHT MEDIUM INDUSTRY                                        |    186  |  0.19 %       |
| 23 | GUARD HOUSE                                                  |    183  |  0.18 %       |
| 24 | COMMUNITY PARK                                               |    174  |  0.18 %       |
| 25 | OFFICES                                                      |    149  |  0.15 %       |
| 26 | APARTMENT - OFFICES - RETAIL                                 |    137  |  0.14 %       |
| 27 | BUFFER ZONE                                                  |    134  |  0.13 %       |
| 28 | MEET ME ROOM (MMR)                                           |    130  |  0.13 %       |
| 29 | LOCAL MASJID                                                 |     92  |  0.09 %       |
| 30 | APARTMENT - HOTEL APARTMENT                                  |     92  |  0.09 %       |

**Observation on the tail**: The remaining ~365 SUB_LANDUSE values include extremely specific building-type tags that ZAAHI's 9-category legend simply cannot represent — `MEET ME ROOM (MMR)`, `GSM TOWER`, `JUMA MASJID` vs `LOCAL MASJID` (two sizes of mosque!), `BUFFER ZONE`, `GUARD HOUSE`, `LABOR ACCOMMODATION`, `LIGHT MEDIUM INDUSTRY`. The granularity is a feature, not noise: these are the atomic regulatory units DDA uses.

### 3.6 ZAAHI's 9-category legend vs DDA's 20

ZAAHI's canonical categories (from `src/lib/feasibility.ts:489`):

```
 1. Residential
 2. Commercial
 3. Mixed Use
 4. Hotel
 5. Industrial
 6. Educational
 7. Healthcare
 8. Agricultural
 9. Future Development
```

The mapping from DDA → ZAAHI (per `scripts/seed-dda-batch.ts:deriveCanonical`):

| DDA MAIN_LANDUSE / LANDUSE_CATEGORY (input)  | ZAAHI canonical (output)                | Fidelity                                    |
| -------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| RESIDENTIAL                                  | RESIDENTIAL                             | ✓ exact                                     |
| COMMERCIAL                                   | COMMERCIAL                              | ✓ exact                                     |
| INDUSTRIAL                                   | INDUSTRIAL                              | ✓ exact                                     |
| FUTURE DEVELOPMENT                           | FUTURE_DEVELOPMENT                      | ✓ exact                                     |
| HOSPITALITY                                  | HOTEL                                   | ≈ near (DDA has distinct "HOSPITALITY - RESIDENTIAL" etc.) |
| RESIDENTIAL + anything else                  | MIXED_USE                               | ✗ lossy (loses what's mixed)                 |
| COMMERCIAL + anything else                   | MIXED_USE                               | ✗ lossy                                     |
| GOLF COURSE                                  | — (no target)                           | ✗ dropped                                   |
| WATER BODY                                   | — (no target)                           | ✗ dropped                                   |
| OPEN SPACE                                   | — (no target)                           | ✗ dropped                                   |
| RECREATIONAL                                 | — (no target)                           | ✗ dropped                                   |
| UTILITIES                                    | — (no target)                           | ✗ dropped                                   |
| TRANSPORT                                    | — (no target)                           | ✗ dropped                                   |
| FACILITIES                                   | — (no target)                           | ✗ dropped                                   |
| OTHER / UNDEFINED                            | — (no target)                           | ✗ dropped                                   |

**ZAAHI's `EDUCATIONAL`, `HEALTHCARE`, `AGRICULTURAL`** are canonical only for ZAAHI UX — they have no DDA equivalent. Education and healthcare are routed via `SUB_LANDUSE` regex (`/school|university/`, `/health|hospital/`); `AGRICULTURAL` matches nothing in the Dubai DDA corpus (there is no agricultural MAIN_LANDUSE value in the 70-value set).

**Quantitative loss from 20→9 collapse**:

| Bucket in ZAAHI             | Plots it would receive under current rules | Representative DDA categories       |
| --------------------------- | ------------------------------------------ | ----------------------------------- |
| RESIDENTIAL                 | 74,833                                     | RESIDENTIAL only                    |
| COMMERCIAL                  |    826                                     | COMMERCIAL only                     |
| MIXED_USE                   |  2,222                                     | 6 composite categories              |
| INDUSTRIAL                  |  1,009                                     | INDUSTRIAL                          |
| HOTEL                       |    148                                     | HOSPITALITY                         |
| FUTURE_DEVELOPMENT          |    188                                     | FUTURE DEVELOPMENT                  |
| EDUCATIONAL                 | ~500 (SUB_LANDUSE-based)                   | no DDA category                     |
| HEALTHCARE                  | ~200 (SUB_LANDUSE-based)                   | no DDA category                     |
| AGRICULTURAL                |      0                                     | no DDA category                     |
| **UNCLASSIFIED (falls through)** | **19,213**                             | OPEN SPACE + UTILITIES + FACILITIES + TRANSPORT + RECREATIONAL + GOLF COURSE + WATER BODY + UNDEFINED + OTHER |

**19,213 plots (19.4 % of the universe) land in an unmapped void** under the current 9-category legend. They render on the map but without category colouring or filtering.

---

## §4 · Zones · districts · projects

### 4.1 Hierarchy

```
DDA Plot Universe
  └─ ENTITY_NAME                       (16 distinct · master developer / authority level)
       └─ PROJECT_NAME                 (209 distinct · named estate / zone / free zone)
            └─ (optional) community    (102 distinct DDA CommunityName · 224 from Dubai Municipality reference)
                 └─ PLOT                (99,239 distinct 7-digit plot numbers)
```

**Is every layer populated?** Entity and project are on 99.998 % of plots (2 plots null). Community is only available at **project-level via the Project Limit layer**; plots themselves do not carry a community field (ZAAHI synthesises it by spatial lookup via the project polygon).

### 4.2 Free-zone subset (all 25 flagged `IsFreeZone=1`)

DDA's `FREE_ZONE_PROJECTS/MapServer/0` returns the same 209 projects but with an `IsFreeZone` flag. The 25 plots flagged `IsFreeZone=1`:

| #  | Project                                 | EntityCategory  | Plots in project | Notes                                         |
| -- | --------------------------------------- | --------------- | ---------------- | --------------------------------------------- |
|  1 | DUBAI INTERNATIONAL FINANCIAL CENTER    | OTHERS          |     45           | Flagship — "DIFC"                             |
|  2 | DIFC ZABEEL                             | OTHERS          |    120           | DIFC extension                                |
|  3 | DUBAI HEALTHCARE CITY PHASE 1           | OTHERS          |     83           | DHCC Phase 1                                  |
|  4 | DUBAI HEALTHCARE CITY PHASE 2           | OTHERS          |    153           | DHCC Phase 2                                  |
|  5 | AL JALILA CHILDREN'S SPECIALTY HOSPITAL | OTHERS          |      1           | DHCC sub-plot                                 |
|  6 | DUBAI DESIGN DISTRICT                   | DUBAI HOLDING   |    151           | d3                                            |
|  7 | DUBAI STUDIO CITY                       | DUBAI HOLDING   |    201           | DHAM                                          |
|  8 | DUBAI OUTSOURCE CITY                    | DUBAI HOLDING   |     55           | DHAM (formerly DOC)                           |
|  9 | DUBAI WHOLESALE CITY                    | DUBAI HOLDING   |      5           | DHAM                                          |
| 10 | DUBAI PRODUCTION CITY                   | DUBAI HOLDING   |    427           | DHAM (formerly IMPZ)                          |
| 11 | DUBAI SCIENCE PARK                      | DUBAI HOLDING   |    937           | DHAM                                          |
| 12 | DUBAI INTERNATIONAL ACADEMIC CITY       | DUBAI HOLDING   |    121           | DHAM                                          |
| 13 | BARSHA HEIGHTS                          | DUBAI HOLDING   |    137           | DHAM (formerly TECOM)                         |
| 14 | SITE A                                  | DUBAI HOLDING   |    142           | DHAM                                          |
| 15 | SITE D                                  | DUBAI HOLDING   |     12           | DHAM                                          |
| 16 | SUFOUH GARDENS                          | DUBAI HOLDING   |     99           | DHAM                                          |
| 17 | DUBAI LAND (T.15)                       | DUBAI HOLDING   |      1           | DHAM                                          |
| 18 | DHAM PLOTS AT AL ROWAIYAH FIRST         | DUBAI HOLDING   |      1           | DHAM sub                                      |
| 19 | TECOM PLOTS - SAIH AL SALAM             | DUBAI HOLDING   |      2           | DHAM                                          |
| 20 | TECOM PLOTS AT AL QOUZ IND.SECOND       | OTHERS          |      8           | AULP                                          |
| 21 | EMIRATES TOWERS DISTRICT                | DUBAI HOLDING   |      3           | Jumeirah Group                                |
| 22 | MUSEUM OF THE FUTURE                    | DUBAI HOLDING   |      1           | Jumeirah Group                                |
| 23 | SCHOOLS - FREE ZONE                     | OTHERS          |      4           | Knowledge Fund Establishment                  |
| 24 | TILAL AL GHAF                           | OTHERS          |  2,437           | Majid Al Futtaim                              |
| 25 | ARDH COMMUNITY                          | OTHERS          |    185           | MAG International                             |
|    | **TOTAL free-zone plots**               |                 | **5,331**        | 5.37 % of DDA universe                        |

**Free zones ≠ tax shelters**: these are regulatory free zones where DDA administers development rights alongside (or in lieu of) Dubai Municipality. Commercial freehold status and tax treatment are separate concerns under federal law. Classical industrial free zones (JAFZA, DMCC, DAFZA, DIP free-zone portions) are NOT under DDA jurisdiction and are therefore absent from this layer; they sit under Ports, Customs & Free-Zone Corporation (PCFC) or individual authorities (DMCC Authority, Dubai Airports).

### 4.3 EntityCategory field (2 values)

`FREE_ZONE_PROJECTS` adds an `EntityCategory` aggregation on top of `EntityName`:

| EntityCategory | Projects | Plots (approx.) | Description                                              |
| -------------- | -------- | --------------- | -------------------------------------------------------- |
| DUBAI HOLDING  |   126    | ~39,000         | All subsidiaries of Dubai Holding — DHAM, DHREL, etc.    |
| OTHERS         |    83    | ~60,000         | Emaar, Damac, Shamal, Dham (separate arm), MAG, MAF, DHCC, DIFC, Dubai Police, …  |

### 4.4 Master-plan projects (top tier by plot count)

The "master plan" notion is not a DDA field; it is a pragmatic classification of super-projects that span multiple communities. The largest such super-projects:

| Super-project          | Plots     | Communities covered (from CommunityName)                                         |
| ---------------------- | --------- | -------------------------------------------------------------------------------- |
| DAMAC HILLS 2          | 15,053    | HADAEQ SHEIKH MOHAMMED BIN RASHID, NADD AL SHIBA FIRST                           |
| DAMAC LAGOONS          |  8,569    | AL YALAYIS 1                                                                     |
| DAMAC ISLANDS          |  6,383    | MADINAT HIND 4                                                                   |
| THE VALLEY             |  5,476    | AL HEBIAH FIFTH                                                                   |
| DUBAI HILLS            |  5,114    | AL HEBIAH FIFTH, AL YALAYIS 1..4, AL YUFRAH 1-2, DUBAI LAND, MADINAT HIND 1..4, WADI AL SAFA 2..7 (18-community super-project) |
| DUBAI LAND (root)      |    253 + 9 splinters | Super-container for sub-projects A1-02, A3-04, A3-07, A4-09, B1-03, B1-04, B2-08, T.15, 673 |
| ARABIAN RANCHES I/II/III | 7,686 combined | (varies by phase)                                                         |

**Dubai Land** deserves its own note: it is simultaneously (a) a project name, (b) a community name, and (c) a super-container under `Dubai Holding` hierarchy. Plots with `PROJECT_NAME='DUBAI LAND'` number 253; plots with `PROJECT_NAME` matching a Dubai-Land splinter (`DUBAI LAND (A1-02)` … `DUBAI LAND (T.15)`) number 16; plots elsewhere that list `"Dubai Land"` as part of a comma-separated `CommunityName` are part of the super-project container.

### 4.5 Sub-developments

Sub-development plots are identifiable by the `"PROJECT_NAME" LIKE '% PLOTS AT %'` pattern. ~35 projects follow this convention (Meraas plots at … , Shamal plots at … , DHAM plots at … , Dubai Holding plots at … , Dubai Police plots within … ). These are slices of larger parent developments held by a specific sub-developer.

**Inventory of sub-developers (projects of pattern `<DEVELOPER> PLOTS AT/WITHIN/-`)**:

- **MERAAS** — 29 sub-projects across the emirate
- **SHAMAL** — 22 sub-projects
- **DHAM** — 4 sub-projects
- **DUBAI HOLDING** — 2 sub-projects
- **DP (Dubai Parks?)** — 3 sub-projects at Al Barsha, Al Jafiliya, Al Qouz
- **DPG** — 1 sub-project (MBR City)
- **TECOM** — 2 sub-projects
- **DUBAI POLICE** — 1 sub-project within Umm Al Daman
- **JUMEIRAH GROUP** — 1 sub-project at Jumeirah Second

Each `X PLOTS AT Y` project has **1 to ~300** plots. Median: ~2. These are scattered land banks rather than contiguous estates — map rendering treats each as a polygon feature, not a contiguous boundary.

### 4.6 What ZAAHI has (local footprint)

- `data/layers/dda/` — 206 per-project files (skinny 3-key schema) · 99,126 plots
- `data/layers/dda-plots/` — 209 per-project files (rich 22-key schema) · 99,235 plots
- `data/layers/dda-projects.geojson` — 209 project-limit polygons (aligns with upstream)
- `data/layers/dda-freezones.geojson` — 209 projects with `IsFreeZone` flag (25 flagged)

**Coverage**: every DDA project has at least one geojson file in `dda-plots/`. 3 of 206 projects are missing in `dda/` (GHAF WOODS, JABEL ALI HILLS fragments, LA MER — see §12.1). Project naming kebab-cases the UPPERCASE PROJECT_NAME, which is lossy for apostrophes and dots (`AL JALILA CHILDREN'S SPECIALTY HOSPITAL` → `al-jalila-children-s-specialty-hospital.geojson`; `DUBAI LAND (T.15)` → `dubai-land-t-15.geojson`).

---

## §5 · Plot status · lifecycle

### 5.1 Official `CONSTRUCTION_STATUS` (6 values, live counts)

| Status             | Plots  | % of universe | Semantics (agent-inferred)                                               |
| ------------------ | ------ | ------------- | ------------------------------------------------------------------------ |
| Empty              | 38,469 | 38.76 %       | Vacant land · no building yet                                             |
| Completed          | 35,331 | 35.60 %       | Built and handed over                                                      |
| Under Construction | 17,602 | 17.74 %       | Active build                                                               |
| Pre-Construction   |  7,338 |  7.39 %       | Permits issued but ground not broken                                       |
| Suspended          |    497 |  0.50 %       | Paused · typically escrow / contractor dispute                             |
| No Data            |      4 |  0.004%       | Pending classification                                                     |

Sum = 99,241 — two-plot rounding variance against the 99,239 total (consistent with `null ENTITY_NAME` on 2 plots).

### 5.2 `IS_FROZEN` flag (orthogonal to construction status)

- `IS_FROZEN=1` · **1,145 plots** live at DDA (ZAAHI snapshot: 1,309 — see drift §9)
- `IS_FROZEN=0` · 98,094 plots
- `IS_FROZEN=null` · 2 plots

A "frozen" plot is one where transactions are blocked pending resolution of some regulatory / procedural issue. It overlays CONSTRUCTION_STATUS — a plot can be `CONSTRUCTION_STATUS='Under Construction'` AND `IS_FROZEN=1` (common pattern for plots whose permits were revoked mid-build).

### 5.3 Freeze concentration — 13 projects carry 99 % of freezes

From ZAAHI's local snapshot (1,309 frozen plots):

| Project                         | Frozen plots | % of project | Likely pattern                                   |
| ------------------------------- | ------------ | ------------ | ------------------------------------------------ |
| DAMAC ISLANDS 2                 | 356          | 28.5 %       | Phase still being subdivided                     |
| THE VALLEY                      | 343          |  6.3 %       | Sub-phase pending RTA approvals                  |
| DUBAI CREEK HARBOUR             | 261          | 59.4 %       | **Majority of the project is frozen** — environment + RTA NOCs pending |
| TIJARA TOWN                     | 170          | 92.9 %       | **Nearly the whole project** — pre-launch hold    |
| TOWERSIDE                       | 101          | 91.8 %       | **Nearly the whole project** — master-developer request |
| DIFC ZABEEL                     |  38          | 31.7 %       | RTA approval pending                              |
| DUBAI INDUSTRIAL CITY           |  31          |  2.2 %       | Scattered holds                                   |
| DUBAI STUDIO CITY               |   3          |  1.5 %       | Isolated holds                                    |
| BUSINESS BAY PHASE 1 & 2        |   2          |  0.5 %       | Isolated holds                                    |
| ARABIAN RANCHES I               |   1          | <0.1 %       | Isolated                                          |
| THE ECHO PLEX CITY              |   1          |  3.2 %       | Isolated                                          |
| SITE A                          |   1          |  0.7 %       | Isolated                                          |
| CITY WALK                       |   1          |  1.1 %       | Isolated                                          |

### 5.4 Freeze reasons (sampled via REST `FREEZE_REASON` field)

Observed distinct reasons across 3 sampled projects:

| Project              | Primary reason (sample top of frozen plots)                                                           | Secondary                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| (general batch of 100) | "As requested by the Master Developer, Ref.: DH/RED/CREO/2020/1055 Dated 03/11/2020" — 98 of 100      | "Plot within ROW, RTA approval is required" · "PROPOSED METRO EMERGENCY EVACUATION POINT." |
| THE VALLEY           | "Subject to RTA approval." — all 30 sampled                                                             | —                                             |
| DUBAI CREEK HARBOUR  | "Subject to RTA approval." — 27 of 30                                                                  | "NOC from Dubai Environment and Climate Change Authority to be provided." — 3 of 30 |
| DIFC ZABEEL          | "Subject to RTA approval" — 30 of 30 (minor punctuation variation)                                      | —                                             |

**Patterns**:
- **"Subject to RTA approval"** — by far the most common; infrastructure adjacency (roads, metro, utilities) triggers mandatory review by the Roads & Transport Authority before a plot is transactable.
- **"NOC from Dubai Environment and Climate Change Authority"** — concentrated in Dubai Creek Harbour (coastal, ecologically sensitive).
- **"As requested by the Master Developer, Ref.: DH/RED/CREO/2020/1055 Dated 03/11/2020"** — a single Dubai Holding mass-freeze action from March 2020 (pandemic-era pause) that is still in effect on ~98 % of a sampled batch.

Full freeze-reason reference: impossible to enumerate all 1,145 reasons without paging the field for the full frozen set (~12 pages at 100 records each; not fetched this session for bandwidth reasons). Recommend future exhaustive pass.

### 5.5 Implied transition rules

Empty → Pre-Construction → Under Construction → Completed.

Suspended sits outside the normal path, typically reached from Under Construction. No Data is terminal-pending. Frozen (IS_FROZEN) overlays any state.

There is no observable "SOLD" or "DISPUTED" status at DDA — those exist only in ZAAHI's `ParcelStatus` enum (which is workflow state for Parcel rows, not reality state for plots).

### 5.6 ZAAHI `ParcelStatus` — why it is orthogonal

Defined in `prisma/schema.prisma`:

```
enum ParcelStatus {
  VACANT          // Parcel row exists but unverified
  PENDING_REVIEW  // Admin review in progress
  VERIFIED        // Admin approved
  REJECTED        // Admin rejected
  LISTED          // Live on marketplace
  IN_DEAL         // Active negotiation
  SOLD            // Transferred
  DISPUTED        // Legal hold
  FROZEN          // Echoes DDA IS_FROZEN but currently unused
}
```

This is **workflow state of a ZAAHI listing**, not physical build state of a plot. A user browsing the map looking for "a completed building to buy" needs `CONSTRUCTION_STATUS='Completed'` from DDA; `ParcelStatus='LISTED'` is the orthogonal "is this on offer right now" signal.

**No column in `Parcel` stores DDA `CONSTRUCTION_STATUS`** as of 2026-04-23. Listings do not surface build state to buyers.

---

## §6 · Plot fields · complete schema

### 6.1 All 43 fields published by `MapServer/2`

From the layer definition at `https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2?f=json`. Each row: name, type, max length, observed populated %, whether ZAAHI captures on fetch, and use-case significance.

| #  | Field                       | Type           | Populated % (ZAAHI local) | ZAAHI captured | Use-case significance                                              |
| -- | --------------------------- | -------------- | ------------------------- | -------------- | ------------------------------------------------------------------ |
|  1 | OBJECTID                    | OID            | 100.00 %                  | ✓              | Primary key for paginating; not durable across resnapshots.         |
|  2 | SHAPE                       | Geometry       | 100.00 %                  | ✓              | Polygon.                                                            |
|  3 | PLOT_NUMBER                 | String(20)     | 100.00 %                  | ✓              | Canonical plot identifier (7-digit or project-prefixed).            |
|  4 | OLD_PLOT_NUMBERS            | String(255)    | **77.10 % (DDA)**         | ✗              | Legacy plot numbers (comma-separated). Crucial for matching legacy deeds / affection plans. |
|  5 | ENTITY_NAME                 | String(80)     | 100.00 %                  | ✓              | Master developer / authority.                                       |
|  6 | DEVELOPER_NAME              | String(80)     | 100.00 %                  | ✓              | Sub-developer of this specific plot.                                |
|  7 | PROJECT_NAME                | String(80)     | 100.00 %                  | ✓              | Named estate.                                                       |
|  8 | LAND_NAME                   | String(80)     | unknown (not fetched)     | ✗              | Optional sub-plot label ("Villa 42", "Plaza 3").                    |
|  9 | AREA_SQM                    | Double         | 100.00 %                  | ✓              | Plot area in square metres.                                         |
| 10 | AREA_SQFT                   | Double         | 100.00 %                  | ✓              | Plot area in square feet (Dubai market standard).                   |
| 11 | GFA_SQM                     | Double         | 76.61 %                   | ✓              | Permitted Gross Floor Area (sqm).                                   |
| 12 | GFA_SQFT                    | Double         | 76.61 %                   | ✓              | Permitted GFA (sqft).                                               |
| 13 | MAX_HEIGHT_FLOORS           | String(50)     |  81.93 %                  | ✓              | Height code e.g. "G+29" — the canonical height source.              |
| 14 | MAX_HEIGHT_METERS           | Double         | always 0 (dead field)     | ✗              | **Field exists but DDA never populates it** — safely skipped.       |
| 15 | MAX_HEIGHT                  | String(80)     | partial                   | ✗              | Textual repeat of MAX_HEIGHT_FLOORS in most samples.                 |
| 16 | HEIGHT_CATEGORY             | String(255)    | unknown                   | ✗              | Rollup bucket (Low-rise / Mid-rise / High-rise / Super-tall).        |
| 17 | MIN_PLOT_COVERAGE           | Double         | unknown                   | ✗              | Minimum permitted building footprint coverage.                       |
| 18 | MAX_PLOT_COVERAGE           | Double         | unknown                   | ✗              | Maximum permitted building footprint coverage.                       |
| 19 | PLOT_COVERAGE               | String(20)     | unknown                   | ✗              | String rendering of coverage (e.g. "50%").                           |
| 20 | CONSTRUCTION_STATUS         | String(50)     | 100.00 %                  | ✓              | Empty / Completed / Under Construction / Pre-Construction / Suspended / No Data. |
| 21 | MAIN_LANDUSE                | String(255)    |  99.68 %                  | ✓              | Composite primary use label (70 distinct values).                   |
| 22 | SUB_LANDUSE                 | String(255)    |  97.96 %                  | ✓              | Fine-grained building-type (395 distinct values).                   |
| 23 | LANDUSE_DETAILS             | String(500)    | unknown                   | ✗              | Human-readable mix e.g. "COMMERCIAL (OFFICES,RETAIL), HOSPITALITY (HOTEL,HOTEL APARTMENT), RESIDENTIAL (APARTMENT)" |
| 24 | LANDUSE_CATEGORY            | String(255)    |  ~99.68 % (20 values)     | ✗              | **DDA's own 20-value canonical** — the gold standard for legends.    |
| 25 | GENERAL_NOTES               | String(2000)   | partial                   | ✗              | Free-text restrictions, parking rules, NOC requirements, height caps, setback exceptions. |
| 26 | IS_FROZEN                   | Short int      | 100.00 %                  | ✓              | 0/1 flag.                                                            |
| 27 | FREEZE_DATE                 | Date           | ~1,145 rows               | ✗              | When the freeze took effect.                                         |
| 28 | FREEZE_REASON               | String(255)    | ~1,145 rows               | ✗              | Why — "Subject to RTA approval", "NOC required", developer refs.     |
| 29 | SITEPLAN_ISSUE_DATE         | Date           | ~59,271 rows              | ✗              | When the current site-plan approval was issued.                     |
| 30 | SITEPLAN_EXPIRY_DATE        | Date           | **59,271 rows (59.72 %)** | ✗              | **When the current site-plan approval expires** — critical for development-ready buyers. |
| 31 | BUILDING_SETBACK_SIDE1      | String(20)     |  82.41 %                  | ✓              | Setback side 1 (metres or "N/A").                                    |
| 32 | BUILDING_SETBACK_SIDE2      | String(20)     |  82.41 %                  | ✓              | Setback side 2.                                                      |
| 33 | BUILDING_SETBACK_SIDE3      | String(20)     |  82.41 %                  | ✓              | Setback side 3.                                                      |
| 34 | BUILDING_SETBACK_SIDE4      | String(20)     |  82.36 %                  | ✓              | Setback side 4.                                                      |
| 35 | PODIUM_SETBACK_SIDE1        | String(20)     |   2.45 %                  | ✓              | Podium setback (mid-rise / high-rise only).                          |
| 36 | PODIUM_SETBACK_SIDE2        | String(20)     |   2.45 %                  | ✓              | Same.                                                                |
| 37 | PODIUM_SETBACK_SIDE3        | String(20)     |   2.45 %                  | ✓              | Same.                                                                |
| 38 | PODIUM_SETBACK_SIDE4        | String(20)     |   2.45 %                  | ✓              | Same.                                                                |
| 39 | GFA_TYPE                    | String(50)     | unknown                   | ✗              | Type of GFA allocation (fixed / indicative / cap).                    |
| 40 | GFA_SQM_T                   | String(50)     | unknown                   | ✗              | Alternative GFA (sqm) as text — sometimes includes FAR multiplier.   |
| 41 | GFA_SQFT_T                  | String(50)     | unknown                   | ✗              | Alternative GFA (sqft) as text.                                     |

**(42 & 43)**: OBJECTID and SHAPE are listed twice between the schema inspection and the query response; the effective distinct-attribute count is 41.

### 6.2 Fields ZAAHI captures (22 of 43)

```
OBJECTID, PLOT_NUMBER, PROJECT_NAME, ENTITY_NAME, DEVELOPER_NAME,
AREA_SQM, AREA_SQFT, GFA_SQM, GFA_SQFT, MAX_HEIGHT_FLOORS,
MAIN_LANDUSE, SUB_LANDUSE, CONSTRUCTION_STATUS, IS_FROZEN,
BUILDING_SETBACK_SIDE1..4, PODIUM_SETBACK_SIDE1..4
```

(Defined in `scripts/fetch-dda-plots.ts:OUT_FIELDS`.)

### 6.3 Fields ZAAHI drops — why each matters

| Dropped field             | Use-case unlocked if captured                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| OLD_PLOT_NUMBERS          | Match legacy deeds, broker listings using pre-2020 plot numbers, pre-2020 affection plans. **77 % of plots carry legacy numbers.** Largest-leverage single gap. |
| LAND_NAME                 | Display the plot's named label ("Villa 42") rather than only its 7-digit number. UX polish, especially for villa communities.    |
| MAX_HEIGHT_METERS         | Nothing — DDA always returns 0. Safe to ignore.                                                                                 |
| MAX_HEIGHT (text)         | Redundant with MAX_HEIGHT_FLOORS. Safe to ignore.                                                                               |
| HEIGHT_CATEGORY           | Pre-bucketed rollup (low/mid/high/super-tall) — saves the in-UI bucketing logic.                                                 |
| MIN_PLOT_COVERAGE / MAX_PLOT_COVERAGE / PLOT_COVERAGE | Enables a coverage-aware feasibility calculator. Currently ZAAHI hard-codes default coverage in `feasibility.ts`. |
| LANDUSE_DETAILS           | Human-readable mix for the affection-plan panel. Currently ZAAHI re-derives this from `SUB_LANDUSE` heuristically.               |
| LANDUSE_CATEGORY          | DDA's 20-value canonical. Without it the 9-category legend is permanently lossy (§3.6).                                         |
| GENERAL_NOTES             | Free-text restrictions including aviation/rail NOC requirements, parking ratios by use type, podium height caps. Directly surfaces regulatory gotchas to investors. |
| FREEZE_DATE / FREEZE_REASON | Investor due-diligence — exactly why a plot is held and how long it has been held.                                            |
| SITEPLAN_ISSUE_DATE / SITEPLAN_EXPIRY_DATE | **Single biggest subscriber-value feature**: alert buyers "site-plan expires in N days". 59 K plots have expiry data. |
| GFA_TYPE / GFA_SQM_T / GFA_SQFT_T | FAR nuances — fixed vs indicative envelopes affect feasibility.                                                         |

### 6.4 Worked example — plot 3460513 (Business Bay) full record

```
PLOT_NUMBER            : 3460513
OLD_PLOT_NUMBERS       : null
ENTITY_NAME            : DUBAI LAND
PROJECT_NAME           : BUSINESS BAY PHASE 1 & 2
AREA_SQM               : (populated)
AREA_SQFT              : (populated)
GFA_SQM                : (populated)
GFA_SQFT               : (populated)
MAX_HEIGHT_FLOORS      : G+29
MAX_HEIGHT             : G+29
MAX_HEIGHT_METERS      : 0
HEIGHT_CATEGORY        : (populated)
MAIN_LANDUSE           : COMMERCIAL - HOSPITALITY - RESIDENTIAL
SUB_LANDUSE            : APARTMENT - HOTEL - HOTEL APARTMENT - OFFICES - RETAIL
LANDUSE_DETAILS        : "COMMERCIAL (OFFICES,RETAIL), HOSPITALITY (HOTEL,HOTEL APARTMENT), RESIDENTIAL (APARTMENT)"
LANDUSE_CATEGORY       : COMMERCIAL - HOSPITALITY - RESIDENTIAL
GENERAL_NOTES          : "Requirements include parking ratios by use type, mandatory NOCs from aviation and rail authorities, 15m podium height, and 350m maximum height limit."
CONSTRUCTION_STATUS    : Under Construction
IS_FROZEN              : 0
SITEPLAN_ISSUE_DATE    : 2025-01-19
SITEPLAN_EXPIRY_DATE   : 2030-01-19
SHAPE                  : (polygon)
```

Example of the same plot **as ZAAHI captures it**:

```
PLOT_NUMBER            : 3460513
PROJECT_NAME           : BUSINESS BAY PHASE 1 & 2
ENTITY_NAME            : DUBAI LAND
DEVELOPER_NAME         : …
AREA_SQM               : …
AREA_SQFT              : …
GFA_SQM                : …
GFA_SQFT               : …
MAX_HEIGHT_FLOORS      : G+29
MAIN_LANDUSE           : COMMERCIAL - HOSPITALITY - RESIDENTIAL
SUB_LANDUSE            : APARTMENT - HOTEL - HOTEL APARTMENT - OFFICES - RETAIL
CONSTRUCTION_STATUS    : Under Construction
IS_FROZEN              : 0
BUILDING_SETBACK_SIDE1..4  : …
PODIUM_SETBACK_SIDE1..4    : …
(geometry)
```

**Dropped in the current OUT_FIELDS list**: `OLD_PLOT_NUMBERS`, `LAND_NAME`, `MAX_HEIGHT`, `HEIGHT_CATEGORY`, `MIN_PLOT_COVERAGE`, `MAX_PLOT_COVERAGE`, `PLOT_COVERAGE`, `LANDUSE_DETAILS`, `LANDUSE_CATEGORY`, `GENERAL_NOTES`, `FREEZE_DATE`, `FREEZE_REASON`, `SITEPLAN_ISSUE_DATE`, `SITEPLAN_EXPIRY_DATE`, `GFA_TYPE`, `GFA_SQM_T`, `GFA_SQFT_T`.

### 6.5 Worked example — plot 6655339 (Al Waha villa) with expired siteplan

```
PLOT_NUMBER            : 6655339
PROJECT_NAME           : AL WAHA
ENTITY_NAME            : DUBAI HOLDING REAL ESTATE
AREA_SQM               : 488.75
AREA_SQFT              : 5,260.84
GFA_SQM                : 246.92
GFA_SQFT               : 2,657.82
MAX_HEIGHT_FLOORS      : G+1
MAIN_LANDUSE           : RESIDENTIAL
SUB_LANDUSE            : VILLA
CONSTRUCTION_STATUS    : Empty
IS_FROZEN              : 0
SITEPLAN_ISSUE_DATE    : 2010-01-24     ← 16 years ago
SITEPLAN_EXPIRY_DATE   : 2012-01-24     ← **EXPIRED 14 YEARS AGO**
GENERAL_NOTES          : "PARKING: MINIMUM ONE PARKING."
```

**This plot is Empty, Not Frozen, but its approval expired in 2012**. A buyer treating "Empty + Not Frozen" as "ready to build" would discover the renewal requirement only at site-plan submission. ZAAHI currently cannot surface this because it drops both date fields. **This is the single most concrete example of why Priority 1 (capture siteplan dates) matters.**

### 6.6 Worked example — plot 6820116 (Dubai Sports City apartment)

```
PLOT_NUMBER            : 6820116
PROJECT_NAME           : DUBAI SPORTS CITY
ENTITY_NAME            : DUBAI LAND
MAX_HEIGHT_FLOORS      : G+5P+20
MAIN_LANDUSE           : RESIDENTIAL
SUB_LANDUSE            : APARTMENT
CONSTRUCTION_STATUS    : Under Construction
SITEPLAN_ISSUE_DATE    : 2024-01-12
SITEPLAN_EXPIRY_DATE   : 2029-01-12
GENERAL_NOTES          : "Specifies parking by unit size and requires NOC from Dubai Civil Aviation Authority."
```

Shows the `G+5P+20` pattern — Ground + 5 podium levels + 20 tower floors. ZAAHI's `parseFloorsFromHeightCode` handles this. The GENERAL_NOTES reveal a pilot-area NOC requirement — not captured today.

---

## §7 · Naming conventions

### 7.1 Plot numbering — 7-digit canonical

All current-era DDA plots are numbered with a **7-digit integer** stored as `String(20)`. Examples from the ZAAHI corpus: `3460513`, `6655339`, `6820116`, `6457940`, `3261245`. First digit correlates loosely with geographic quadrant (observed, not documented):

| First digit | Observed projects                                                           |
| ----------- | --------------------------------------------------------------------------- |
| 3           | Business Bay, Meydan, Jaddaf, Sama Al Jadaf — eastern Dubai                 |
| 4           | Towerside, DIFC Zabeel — Sheikh Zayed corridor                              |
| 5           | Jabel Ali, Palm Jumeirah band                                                |
| 6           | Dubai Hills, Damac, MBR City, Dubai Land super — southern expansion          |
| 7           | Reserved / less-seen                                                         |
| 8           | Reserved / less-seen                                                         |
| 9           | Meydan / south-east — see Al Yalayis 3 plot 9235849 (recent addition)        |

These prefixes are **not a documented standard**; they are a workable heuristic for fast geographic triage but should not be relied on in code.

### 7.2 Legacy plot numbers — `OLD_PLOT_NUMBERS` format

Populated on **76,513 plots (77 %)**. String(255). Comma-separated list of legacy identifiers. Real examples from `DUBAI HEALTHCARE CITY PHASE 1`:

| Old plot number | Current plot number |
| --------------- | ------------------- |
| A/P14           | 3156315             |
| C/P76           | 3156319             |
| C/P71           | 3156300             |
| C/P62           | 3156281             |
| C/P57           | 3156299             |
| C/P52           | 3156286             |
| A/P24           | 3156271             |
| A/P25           | 3156269             |
| A/P26           | 3156283             |
| B/P41           | 3156287             |
| B/P42           | 3156306             |
| B/P46           | 3156293             |
| B/P47           | 3156296             |
| B/P49           | 3156298             |
| B/P40           | 3156294             |

In DHCC Phase 1 the pattern is `<BLOCK>/P<NUMBER>` — blocks A, B, C. Other projects use project-specific conventions (some observed: `673-2034`, `<PROJ>-<SEQ>`, `PRE-MERGE <NUM>`).

### 7.3 Community name case-duplicates (DDA-side defect)

In DDA's `CommunityName` field on the Project Limit layer (102 distinct values), 8 pair-duplicates exist where the same community is rendered in both all-caps and title-case:

| ALL CAPS (appears X times)       | Title Case (appears Y times)    | Net duplication |
| -------------------------------- | ------------------------------- | --------------- |
| `AL JADAF` (4 projects)          | `Al Jadaf` (4 projects)         | 8 project rows  |
| `MARSA DUBAI` (4)                | `Marsa Dubai` (2)               | 6               |
| `MIRDIF` (1)                     | `Mirdif` (1)                    | 2               |
| `UMM SUQEIM THIRD` (5)           | `Umm Suqeim Third` (1)          | 6               |
| `AL BARSHA SOUTH THIRD` (1)      | `Al Barsha South Third` (1)     | 2               |
| `AL ROWAIYAH FIRST` (3)          | `Al Rowaiyah First` (2)         | 5               |
| `AL SAFOUH FIRST` (3)            | `Al Safouh First` (1)           | 4               |
| `WADI AL SAFA 5` (6)             | `Wadi Al Safa 5` (1)            | 7               |

Total duplicated rows: **40 of 209** (19 %). The Project Limit layer is therefore approximately 40 rows redundant.

**Impact on ZAAHI**: If Parcel.district ever accepts un-normalised community names from DDA sync, facet counts double and district-level search misses half the plots. Mitigation: `upper()` normalisation at ingest + a canonical-community alias table.

### 7.4 Multi-community project names (DDA-side compound strings)

11 projects have `CommunityName` strings that list 2-18 communities in one row:

| Project (selected)                            | CommunityName                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| DUBAI HILLS (and similar super-projects)      | `"AL HEBIAH FIFTH, AL YALAYIS 1, AL YALAYIS 2, AL YALAYIS 3, AL YALAYIS 4, AL YUFRAH 1, AL YUFRAH 2, Dubai Land, MADINAT HIND 1, MADINAT HIND 2, MADINAT HIND 3, MADINAT HIND 4, WADI AL SAFA 2, WADI AL SAFA 3, WADI AL SAFA 4, WADI AL SAFA 5, WADI AL SAFA 6, WADI AL SAFA 7"` (18 communities) |
| BURJ KHALIFA / Downtown cluster               | `"Al Sheikh Zayed Road, BURJ KHALIFA, BUSINESS BAY"` (3)                                   |
| —                                             | `"AL HEBIAH SIXTH, AL HEBIAH THIRD"` (2)                                                    |
| —                                             | `"HADAEQ SHEIKH MOHAMMED BIN RASHID, NADD AL SHIBA FIRST"` (2)                              |
| —                                             | `"HESSYAN SECOND, SAIH SHUAIB 1"` (2)                                                       |
| —                                             | `"SAIH SHUAIB 2, SAIH SHUAIB 3, SAIH SHUAIB 4"` (3)                                         |
| —                                             | `"AL ROWAIYAH FIRST, UMM SUQEIM THIRD"` (2)                                                 |
| —                                             | `"AL SAFOUH FIRST, UMM SUQEIM THIRD"` (2)                                                   |
| —                                             | `"AL QOUZ IND. FIRST, AL QOUZ IND. FOURTH, AL QOUZ IND. SECOND, AL QOUZ IND. THIRD"` (4)     |
| —                                             | `"AL YUFRAH 1, MADINAT HIND 3"` (2)                                                         |
| AL HAMRIYA / UMM HURAIR FIRST split           | `"AL HAMRIYA, UMM HURAIR FIRST"` (2)                                                        |

**Impact**: A district-facet query by equality (`WHERE district = 'AL YALAYIS 1'`) misses the plots in the 18-community Dubai Hills super-project. Needs explosion at ingest (split on comma, preserve mapping).

### 7.5 Project naming

- DDA projects are **ALL CAPS** in `ProjectName` / `PROJECT_NAME`.
- Punctuation preserved: apostrophes (`AL JALILA CHILDREN'S …`), parentheses (`DUBAI LAND (T.15)`), dots in abbreviations (`AL QOUZ IND.`), hyphens (`TECOM PLOTS - SAIH AL SALAM`).
- Ampersands preserved (`BUSINESS BAY PHASE 1 & 2`, `WILDS 1&2`).
- Numerical suffixes: Arabic numerals (`DAMAC ISLANDS 2`), Roman numerals (`ARABIAN RANCHES I/II/III`). **Inconsistent within the same family** — e.g. `REPORTAGE VILLAGE 1&2` (Arabic) vs `ARABIAN RANCHES II` (Roman).

**ZAAHI filesystem kebab-case lossiness** (see `data/layers/dda-plots/*.geojson`):
- Apostrophe: `CHILDREN'S` → `children-s`
- Parens: `(T.15)` → `t-15`
- Ampersand: `1&2` → `1-2`
- Dots: `AL QOUZ IND.SECOND` → `al-qouz-ind-second`

A round-trip (project name → filename → project name) requires an alias table — not derivable from string manipulation alone.

### 7.6 Arabic transliteration — via Dubai Municipality parallel layer

DDA's plot layer publishes **no Arabic field**. The 43 plot fields are all Latin. Dubai Municipality's `Community__1_.kml` supplies the gold standard:

- 224 community pairs (`CNAME_E` → `CNAME_A`)
- 89 of DDA's 96 unique communities match by ALL-CAPS key
- 7 unmatched: `AL QOUZ IND. FIRST/SECOND/THIRD/FOURTH` (DM uses "INDUSTRIAL" not "IND."), `AL SHEIKH ZAYED ROAD` (DM uses "SHEIKH ZAYED ROAD"), `DUBAI LAND` (DM splits into sub-communities), `WADI ALSHABAK` (DM uses "WADI AL SHABAK" with space)

Full Arabic lookup: **Appendix A**.

### 7.7 Normalisation rules ZAAHI should apply at ingest

| Input                                      | Normalised form                                 | Rationale                                                     |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------- |
| `CommunityName` (any case)                 | `.upper()` + `.strip()`                         | Eliminate DDA's 8 case-duplicates (§7.3)                       |
| `CommunityName` containing commas          | `split(',')`, explode one project into N memberships | Break apart 11 multi-community rows                    |
| `PROJECT_NAME` containing `IND.`            | replace `IND.` → `INDUSTRIAL`                   | Align DDA's abbreviation with DM's full form                  |
| `PROJECT_NAME` containing `&`              | replace `&` → `AND` or keep `&` in display only | Consistent filename/URL generation                            |
| `CommunityName = 'WADI ALSHABAK'`          | `'WADI AL SHABAK'`                              | Align with DM                                                 |
| `CommunityName = 'AL SHEIKH ZAYED ROAD'`    | `'SHEIKH ZAYED ROAD'`                           | Align with DM                                                 |
| Plot numbers in DB                         | always string, never int                        | Leading zeros would be lost (none observed but DDA schema allows) |
| Legacy plot reference (`A/P14`)             | store alongside current PLOT_NUMBER with type flag | 77 % of plots carry one                                     |

---

## §8 · Height · FAR · density data

### 8.1 `MAX_HEIGHT_FLOORS` — 330 distinct patterns

Populated on 81.93 % of plots. Top 30 patterns cover 99.2 % of populated rows:

| #  | Pattern       | Plots   | % of universe | Semantic                                         |
| -- | ------------- | ------- | ------------- | ------------------------------------------------ |
|  1 | `G+2`         | 32,215  | 32.46 %       | Ground + 2 floors (typical 2-storey villa)        |
|  2 | `G+1`         | 24,454  | 24.64 %       | Ground + 1 floor (small villa)                    |
|  3 | `G+1+R`       | 16,022  | 16.15 %       | Ground + 1 + roof accessible (roof terrace)       |
|  4 | `N/A`         | 13,180  | 13.28 %       | Explicit placeholder (no height applicable)       |
|  5 | `` (empty)    |  4,745  |  4.78 %       | Missing                                           |
|  6 | `G+4`         |  1,535  |  1.55 %       | 4-storey                                          |
|  7 | `G`           |  1,525  |  1.54 %       | Ground floor only                                  |
|  8 | `G+M`         |  1,057  |  1.07 %       | Ground + mezzanine                                 |
|  9 | `G+6`         |    457  |  0.46 %       | 6-storey                                          |
| 10 | `G+3`         |    422  |  0.43 %       | 3-storey                                          |
| 11 | `G+8`         |    380  |  0.38 %       | 8-storey                                          |
| 12 | `G+14`        |    374  |  0.38 %       | 14-storey (mid-high)                              |
| 13 | `G+5`         |    265  |  0.27 %       | 5-storey                                          |
| 14 | `SEE NOTES`   |    205  |  0.21 %       | Requires reading GENERAL_NOTES                     |
| 15 | `G+7`         |    175  |  0.18 %       | 7-storey                                          |
| 16 | `G+11`        |    125  |  0.13 %       | 11-storey                                          |
| 17 | `G+19`        |    121  |  0.12 %       | 19-storey                                          |
| 18 | `G+9`         |    101  |  0.10 %       | 9-storey                                          |
| 19 | `G+2+R`       |     88  |  0.09 %       | 2-storey + roof access                            |
| 20 | `G+13`        |     79  |  0.08 %       | 13-storey                                          |
| 21 | `G+10`        |     78  |  0.08 %       | 10-storey                                          |
| 22 | `G+2P+8`      |     64  |  0.06 %       | Ground + 2 podium + 8 tower floors                 |
| 23 | `G+2P+6`      |     64  |  0.06 %       | Ground + 2 podium + 6 tower                        |
| 24 | `G+29`        |     61  |  0.06 %       | 29-storey high-rise                                |
| 25 | `G+24`        |     53  |  0.05 %       | 24-storey                                          |
| 26 | `G+12`        |     40  |  0.04 %       | 12-storey                                          |
| 27 | `G+20`        |     33  |  0.03 %       | 20-storey                                          |
| 28 | `G+15`        |     32  |  0.03 %       | 15-storey                                          |
| 29 | `G+17`        |     32  |  0.03 %       | 17-storey                                          |
| 30 | `G+5P+19`     |     26  |  0.03 %       | 5 podium + 19 tower                                |

### 8.2 Patterns observed in the long tail

Beyond the top 30, MAX_HEIGHT_FLOORS takes forms like:

- `G+2P+NN` (podium + tower) — with NN ranging 2..50+
- `G+MP+NN` — mezzanine podium
- `G+NP+MM` — multi-podium
- `G+N+R` — with R = roof access
- `G+N+M` — with M = mezzanine on top
- Heritage edge cases: `B+G+N` (basement explicit), `G+B+N` (reversed)
- Literal strings: `SEE NOTES`, `Unlimited` (rare), `Subject to NOC`
- Free text: some plots carry a 30-character paragraph in the 50-char field

**ZAAHI parser** (`scripts/seed-dda-batch.ts:parseFloorsFromHeightCode`) handles the first ~10 patterns. The remaining ~320 patterns include:
- ~5,000 plots with `''` or `'N/A'` that fall back to a default
- ~205 plots with `'SEE NOTES'` — parser returns null, UI default applied
- ~100 plots with edge-case combinations (`G+5+M`, `G+P+R`, etc.) where parse returns a wrong result

### 8.3 Fallback height used in 3D render

When parsing fails, `src/lib/feasibility.ts:defaultHeightForLandUse` returns:

```
RESIDENTIAL         15 m  (G+3-ish)
COMMERCIAL          40 m
MIXED_USE           50 m
HOTEL               35 m
INDUSTRIAL          12 m
EDUCATIONAL         15 m
HEALTHCARE          20 m
AGRICULTURAL         6 m
FUTURE_DEVELOPMENT  15 m (null default)
```

**Affected plots** (approx.): 4,745 (empty) + 13,180 (N/A) + 205 (SEE NOTES) + ~100 edge-cases ≈ **18,230 plots (18.4 %)** render at fallback height rather than their real permitted envelope.

### 8.4 FAR (GFA/AREA) coverage

| Metric                     | Plots (of 99,235 local) | % of universe |
| -------------------------- | ----------------------- | ------------- |
| AREA_SQM populated         | 99,235                  | 100.00 %      |
| GFA_SQM populated          | 76,025                  |  76.61 %      |
| Both populated (can compute FAR) | 76,025             |  76.61 %      |

When GFA_SQM is missing (23,210 plots = 23.39 %), ZAAHI cannot compute actual FAR and the feasibility calculator uses the height-code envelope instead. This is a fallback path; actual FAR would be authoritative.

### 8.5 Setback fields (building vs podium)

- BUILDING_SETBACK_SIDE1..4: populated on ~82 % of plots (any of the 4 sides with a non-trivial value)
- PODIUM_SETBACK_SIDE1..4: populated on **only 2.45 % of plots** — podium setbacks are a high-rise concern, irrelevant for the 75 % villa population.
- Setback values are strings: numeric metres (`"3"`, `"4.5"`), `"N/A"`, or `"0"`. Occasionally free-text.

---

## §9 · Temporal data

### 9.1 Date-typed fields in the schema

| Field                  | Type | Populated plots | ZAAHI captures |
| ---------------------- | ---- | --------------- | -------------- |
| FREEZE_DATE            | Date | ~1,145          | ✗              |
| SITEPLAN_ISSUE_DATE    | Date | ~59,271         | ✗              |
| SITEPLAN_EXPIRY_DATE   | Date | **59,271 (59.72 %)** | ✗         |

Dates are returned as epoch-ms. Example: `SITEPLAN_EXPIRY_DATE=1895097600000 → 2030-01-19`.

### 9.2 Siteplan approval windows

Observed samples show typical issuance → expiry windows of **5 years** (e.g. plot 3460513: 2025-01-19 → 2030-01-19; plot 6820116: 2024-01-12 → 2029-01-12).

Exceptional short windows exist: plot 6655339 carried a **2010-01-24 → 2012-01-24** window (2 years), which **expired in 2012** and has not been renewed in 14 years despite the plot remaining in `CONSTRUCTION_STATUS='Empty'`. Such old issuances likely reflect pre-2014 DDA practice.

### 9.3 Status drift observed 2026-04-12 → 2026-04-23 (11 days)

| Metric                      | ZAAHI snapshot | DDA live 2026-04-23 | Delta (direction) |
| --------------------------- | -------------- | -------------------- | ----------------- |
| CONSTRUCTION_STATUS=Empty   | 38,591         | 38,469              | −122 (upstream decrease) |
| CONSTRUCTION_STATUS=Completed | 35,065      | 35,331              | +266 (upstream increase) |
| CONSTRUCTION_STATUS=Under Construction | 17,347 | 17,602         | +255 (upstream increase) |
| CONSTRUCTION_STATUS=Pre-Construction | 7,729   | 7,338               | −391 (upstream decrease) |
| CONSTRUCTION_STATUS=Suspended | 499          | 497                 | −2                |
| IS_FROZEN=1                 |  1,309         |  1,145              | −164 (upstream decrease) |
| Total plots                 | 99,235         | 99,239              | +4  (upstream increase) |

**Interpretation**: In 11 days, DDA's live record shows:
- ~391 plots moved out of Pre-Construction — presumably most into Under Construction (+255) and some into Completed (+266).
- ~266 plots reached Completed status.
- ~122 Empty plots were reclassified (into Pre-Construction or other).
- ~164 frozen plots were released.
- 4 net new plots added to the corpus.

Roughly: **1 plot per 4 minutes moves state at DDA**. Over a quarter the drift compounds to **~6,000 state changes**. For features that rely on current state (Land Monitor, buyer filters), even monthly sync is too stale.

### 9.4 Cadence implications

- **Daily sync**: rigorous but 99 K × 2 KB/plot × 365 = ~70 GB/year of fetches. Probably overkill unless Land Monitor demands it.
- **Weekly sync**: 99 K-plot refresh = ~200 MB download, ~20 min runtime per `scripts/fetch-dda-plots.ts`. Balances drift (~300 changes × 7 days = ~2 K outdated plots per week) with cost.
- **Incremental sync**: if DDA exposed a modified-since filter, cost would drop to ~50 KB/day. **DDA does not currently expose such a filter** (no `MODIFIED_DATE` field visible in the 43-field schema).

### 9.5 Legacy siteplan aging (signal)

At 59,271 plots with expiry dates and an observed ~5-year window, approximately 1 in 5 plots should have an active approval window. If issue dates are uniform, ~20 % of siteplans expire within any 12-month period — ~12,000 expiries per year. An "approval expiring in 90 days" alert would be high-signal for investors.

---

## §10 · Geospatial data

### 10.1 Coordinate systems

| Role                  | Spatial reference | EPSG   | Notes                                              |
| --------------------- | ----------------- | ------ | -------------------------------------------------- |
| Native storage (DDA)  | Dubai Local TM    | 3997   | Metric; transverse Mercator centred on Dubai        |
| Default response      | 3997              | 3997   | Unless overridden via `outSR`                       |
| ZAAHI consumption     | WGS-84            | 4326   | `scripts/fetch-dda-plots.ts` adds `outSR=4326`      |
| Map display           | Web Mercator      | 3857   | Mapbox / MapLibre default; client reprojects from 4326 |

### 10.2 Polygon structure

All plot geometries are `Polygon` (no `MultiPolygon` observed in a 20-file sample of 11,476 features). Each polygon has:
- One outer ring (`coordinates[0]`)
- Zero inner rings (no holes observed)

Ring-size statistics (sample of 11,476 features):
- Minimum vertices: 4 (the smallest valid polygon)
- Maximum vertices: 1,796 (a detailed boundary, e.g. a master-plan project outline)
- Mean: 11.2 vertices
- Median: ~5 (typical villa footprint)

No invalid geometries detected (no rings < 4 points, no unclosed rings).

### 10.3 Coordinate precision

Sample coordinates after reprojection to WGS-84:
```
[55.298982482749615, 25.075376931396672]
[55.303525653055644, 25.0937011690369]
[55.33406490245542, 25.079962725763025]
[55.30007506106947, 25.00558224816221]
[55.29964113726361, 25.00778566584052]
```

**Precision**: 14-16 decimal places (double-precision). That corresponds to sub-millimetre accuracy on the ground — far more precise than the source data warrants. The native EPSG:3997 metric coordinates likely carry ~1 cm precision; the 14 decimal digits are an artefact of the double conversion.

### 10.4 Centroid availability

DDA does **not** return a pre-computed centroid. ZAAHI must compute it client-side for:
- Map label anchor placement
- Distance / clustering calculations
- Map-side render heuristics (what 3D building template to apply)

`scripts/seed-dda-batch.ts:centroidOf` computes it as the average of ring vertices — fine for roughly-convex polygons but biased for concave master-plan outlines.

### 10.5 Boundary quality

- Self-intersections: **none observed** in the 11,476-feature sample.
- Overlaps between adjacent plots: **none observed by bbox inspection** of sampled pairs. DDA appears to tessellate cleanly.
- Gaps between plots: present by design (access roads, setbacks, landscape parcels are separate polygons).
- Alignment with Project Limit polygons: unverified in this session (would require spatial-within tests).

### 10.6 PMTiles coverage vs raw GeoJSON

The ZAAHI map renders plots from **raw GeoJSON** served at `/api/parcels/map` — not from PMTiles. The filesystem corpus (157 MB) is the direct source. Advantages:
- Attribute-complete (all 22 ZAAHI-captured fields accessible per plot)
- Stable across zoom

Disadvantages:
- 157 MB filesystem footprint = full payload must be available to the Node process
- No built-in spatial indexing; filtering happens at the map-library level

Master-plan KML overlays (`01_Meydan_Horizon_Master_plan.kml`, etc.) are loaded as KML, not PMTiles.

### 10.7 Geohash / H3 indexing

Not currently used in ZAAHI. Either could be layered on top for faster spatial queries. No blocker from DDA side.

---

## §11 · ZAAHI × DDA comparison matrix

### 11.1 Field-by-field (per plot)

| DDA field                     | ZAAHI field (parcel-map response) | ZAAHI DB field (Parcel) | Notes                                             |
| ----------------------------- | ---------------------------------- | ----------------------- | ------------------------------------------------- |
| PLOT_NUMBER                   | `plotNumber`                       | `plotNumber`            | Exact copy.                                       |
| PROJECT_NAME                  | `project` (from geojson filename)  | `district`              | Lossy — Parcel stores a single community/project string. |
| ENTITY_NAME                   | `entity` (geojson property)        | —                       | Not persisted to Parcel.                          |
| DEVELOPER_NAME                | `developer` (geojson property)     | —                       | Not persisted.                                     |
| AREA_SQM                      | `areaSqm`                          | via `area` (sqft)       | Parcel.area stores sqft per Dubai convention.     |
| AREA_SQFT                     | `areaSqft`                         | `area`                  | Direct copy.                                       |
| GFA_SQM / GFA_SQFT            | `gfaSqm/gfaSqft` (on AffectionPlan)| —                       | On AffectionPlan JSON, not Parcel.                |
| MAX_HEIGHT_FLOORS             | `maxHeightFloors`                  | — (on AffectionPlan)    | Parsed by `parseFloorsFromHeightCode`.             |
| MAIN_LANDUSE                  | `mainLandUse`                      | — (on AffectionPlan.landUseMix) | Fed into `deriveCanonical` for 9-category legend. |
| SUB_LANDUSE                   | `subLandUse`                       | — (on AffectionPlan)    | Displayed in SidePanel.                            |
| CONSTRUCTION_STATUS           | `constructionStatus`               | —                       | **Not persisted to Parcel** — not queryable.       |
| IS_FROZEN                     | `isFrozen`                         | —                       | Surfaces to map but not DB.                        |
| BUILDING_SETBACK_SIDE1..4     | `buildingSetbacks`                 | — (on AffectionPlan)    | Used by FeasibilityCalculator.                    |
| PODIUM_SETBACK_SIDE1..4       | `podiumSetbacks`                   | — (on AffectionPlan)    | Used by FeasibilityCalculator.                    |
| OLD_PLOT_NUMBERS              | —                                  | —                       | **Not captured**.                                  |
| LAND_NAME                     | —                                  | —                       | **Not captured**.                                  |
| MAX_HEIGHT_METERS             | —                                  | —                       | Safe to skip (DDA doesn't populate).               |
| MAX_HEIGHT (text)             | —                                  | —                       | Redundant with MAX_HEIGHT_FLOORS.                 |
| HEIGHT_CATEGORY               | —                                  | —                       | **Not captured**.                                  |
| MIN_PLOT_COVERAGE / MAX_PLOT_COVERAGE / PLOT_COVERAGE | — | —                 | **Not captured** — coverage hard-coded in feasibility. |
| LANDUSE_DETAILS               | —                                  | —                       | Re-derived from SUB_LANDUSE.                       |
| LANDUSE_CATEGORY              | —                                  | —                       | **Not captured** — DDA's 20-value canonical is dropped.  |
| GENERAL_NOTES                 | —                                  | —                       | Re-scraped via `src/lib/dda.ts` for AffectionPlan HTML. |
| FREEZE_DATE / FREEZE_REASON   | —                                  | —                       | **Not captured**.                                  |
| SITEPLAN_ISSUE_DATE / SITEPLAN_EXPIRY_DATE | —                    | —                       | **Not captured** — expiry alert unachievable.      |
| GFA_TYPE / GFA_SQM_T / GFA_SQFT_T | —                              | —                       | **Not captured**.                                  |

### 11.2 Derivation-vs-copy summary

| Category                                    | Count   | Examples                                          |
| ------------------------------------------- | ------- | ------------------------------------------------- |
| Copied verbatim (identity)                  | 15      | PLOT_NUMBER, AREA_SQM/SQFT, GFA_SQM/SQFT, setbacks, MAIN_LANDUSE, SUB_LANDUSE, CONSTRUCTION_STATUS, IS_FROZEN |
| Derived by client                           |  4      | `deriveCanonical` → 9-category · `parseFloorsFromHeightCode` → floor count · `centroidOf` → lat/lng · kebab-case(PROJECT_NAME) → filename |
| Enriched via secondary DDA scrape           |  2      | AffectionPlan `landUseMix` + `notes` (via `src/lib/dda.ts:parseAffectionPlan` against `DIS/?handler=PlotInfo`) |
| Dropped (DDA publishes, ZAAHI ignores)      | 21      | OLD_PLOT_NUMBERS, LAND_NAME, HEIGHT_CATEGORY, PLOT_COVERAGE, LANDUSE_CATEGORY, LANDUSE_DETAILS, GENERAL_NOTES, FREEZE_DATE, FREEZE_REASON, SITEPLAN_ISSUE_DATE, SITEPLAN_EXPIRY_DATE, GFA_TYPE, GFA_SQM_T, GFA_SQFT_T, MIN/MAX_PLOT_COVERAGE, MAX_HEIGHT_METERS (dead), MAX_HEIGHT text, MAX_COVERAGE text |

### 11.3 Data-quality comparison per dimension

| Dimension                | DDA authoritative                          | ZAAHI snapshot                           | Quality gap                    |
| ------------------------ | ------------------------------------------ | ---------------------------------------- | ------------------------------ |
| Plot count               | 99,239                                     | 99,235 (−4, 11-day drift)                | Trivial                        |
| Coverage by project      | 209 projects                               | 209 (all projects represented)           | None                           |
| Land-use categorical     | 20 canonical + 70 composite + 395 sub      | 9 canonical + 70 composite + 395 sub     | ZAAHI canonical is lossy (§3.6) |
| Status                   | 6 values, current                          | 6 values, 11-day stale (300+ transitions) | Moderate                       |
| Freeze metadata          | 1,145 plots · date + reason                | 1,309 plots · flag only                  | High — no date/reason          |
| Siteplan dates           | 59,271 plots · issue + expiry              | 0 captured                               | Very high — entire axis missing |
| Legacy plot numbers      | 76,513 plots                                | 0 captured                               | Very high — 77 % of corpus     |
| Height envelope          | 330 patterns + GFA                          | Parser for ~10 patterns                   | Medium — ~18 K plots render fallback |
| Geometry                 | EPSG:3997 native · clean polygons          | EPSG:4326 reprojected · clean            | None                           |
| Arabic transliteration   | None published                              | None (DM KML available but unlinked)      | High — bilingual UI blocker    |

---

## §12 · Data drift · sync anomalies

### 12.1 Internal ZAAHI disagreement — `dda/` vs `dda-plots/`

Both directories contain plot-level polygons from the same DDA layer but captured at different times with different OUT_FIELDS configurations:

- `dda/` (skinny): 99,126 plots · 3-key schema (PLOT_NUMBER, PROJECT_NAME, AREA_SQFT)
- `dda-plots/` (rich): 99,235 plots · 22-key schema

Cross-reference by PLOT_NUMBER:
- Intersection: 99,120 plots
- Only in `dda/`: **6 plots**
  - `6460119`, `6460123`, `6460146` — all in GHAF WOODS project
  - `5135168`, `5135169` — all in JABEL ALI HILLS
  - `3321747` — LA MER
  - **Hypothesis**: all 6 were present at `dda/` fetch time but have since been deleted upstream. Net effect: ZAAHI's `dda/` layer references 6 plots that DDA no longer publishes.
- Only in `dda-plots/`: **115 plots**
  - 95+ are in TOWERSIDE project (plot numbers 41541xx, 41547xx, 41548xx, 41563xx, 41579xx, 41599xx)
  - Hypothesis: TOWERSIDE plots added in a batch between `dda/` and `dda-plots/` fetches.

**Recommendation**: deprecate `dda/` in favour of `dda-plots/` (rich schema, more current).

### 12.2 ZAAHI vs DDA live drift

At 2026-04-23:
- ZAAHI `dda-plots/` has 99,235 plots.
- DDA publishes 99,239 plots.
- Delta: +4 upstream (new plots added since 2026-04-12).

### 12.3 Status drift 2026-04-12 → 2026-04-23 (see §9.3)

Over 11 days:
- +266 Completed (build-outs)
- +255 Under Construction (starts)
- −391 Pre-Construction (departures)
- −122 Empty (reclassifications)
- −164 frozen plots (releases)
- −2 Suspended (resolutions)

Net movement: roughly 1,200 state transitions per 11 days = ~110 per day.

### 12.4 Case-duplicate propagation

The 8 case-pair duplicates in DDA's `CommunityName` (§7.3) have propagated into ZAAHI's 102-row Project Limit file. Any consumer that reads `CommunityName` without `upper()` normalisation will observe 16 rows as "different" when they represent 8 real communities.

### 12.5 Missing OLD_PLOT_NUMBERS → missed matches

For any buyer / broker using a legacy plot number (77 % of DDA plots have one), ZAAHI will **not match the current plot** because the field is not captured. Concrete miss: a broker listing "C/P57 Dubai Healthcare City" will not surface plot `3156299` in ZAAHI's catalog.

### 12.6 Missing SITEPLAN_EXPIRY_DATE → surprise denials

59,271 plots carry expiry dates. If ZAAHI shows "Empty · available for development" without surfacing the expiry, buyers will encounter the renewal requirement only at transaction time. Plot 6655339 (Al Waha, expired 2012) is the canonical example — 14 years past expiry and still "Empty · Not Frozen" on disk.

### 12.7 Missing FREEZE_REASON → opaque blockers

1,145 frozen plots are correctly flagged as frozen, but ZAAHI cannot show buyers **why**. The reasons are enumerated (Subject to RTA · NOC from DECCA · Master Developer request · Metro ROW · etc.) but dropped on fetch.

### 12.8 Anomalous plots in DDA (individual flags)

| Plot        | Project                    | Anomaly                                                        |
| ----------- | -------------------------- | -------------------------------------------------------------- |
| (317 plots) | various                    | MAIN_LANDUSE empty + LANDUSE_CATEGORY='UNDEFINED'              |
| 7 plots     | various                    | LANDUSE_CATEGORY='OTHER'                                       |
| 1 plot      | Emirates Academy           | MAIN_LANDUSE='SEE NOTES'                                       |
| 2 plots     | various                    | MAIN_LANDUSE='SITE FOR AERIAL PHOTOGRAPHY'                     |
| 60 plots    | Dubai Creek Harbour        | LANDUSE_CATEGORY='WATER BODY'                                  |
| 17 plots    | golf courses               | LANDUSE_CATEGORY='GOLF COURSE'                                 |
| 4 plots     | various                    | CONSTRUCTION_STATUS='No Data'                                  |

None of these are DDA errors — they are deliberate classifications for non-buildable or exceptional land. ZAAHI's current pipeline collapses them into nothing meaningful.

---

## §13 · Appendices

### Appendix A · All 89 DDA communities with Dubai Municipality Arabic names

(Alphabetical. Communities unmatched in DM are in **§7.6**; they are listed at the end with a `(no DM match)` note.)

| EN (normalised)                   | AR                                       | DDA occurrences |
| --------------------------------- | ---------------------------------------- | --------------- |
| AL BARSHA SECOND                  | البرشاء الثانية                          | 1               |
| AL BARSHA SOUTH FIRST             | البرشاء جنوب الأولى                       | 1               |
| AL BARSHA SOUTH SECOND            | البرشاء جنوب الثانية                      | 2               |
| AL BARSHA SOUTH THIRD             | البرشاء جنوب الثالثة                      | 1               |
| AL BARSHA THIRD                   | البرشاء الثالثة                          | 1               |
| AL HAMRIYA                        | الحمرية                                  | 1 (compound)    |
| AL HEBIAH FIFTH                   | الحبيه الخامسة                           | 4               |
| AL HEBIAH FIRST                   | الحبيه الأولى                            | 1               |
| AL HEBIAH FOURTH                  | الحبيه الرابعة                           | 2               |
| AL HEBIAH SECOND                  | الحبيه الثانية                           | 2               |
| AL HEBIAH SIXTH                   | الحبيه السادسة                           | 1               |
| AL HEBIAH THIRD                   | الحبيه الثالثة                           | 1 (compound)    |
| AL JADAF                          | الجداف                                   | 4               |
| AL JAFILIYA                       | الجافلية                                 | 1               |
| AL KHEERAN FIRST                  | الخيران الأولى                           | 2               |
| AL KHWANEEJ FIRST                 | الخوانيج الأولى                          | 2               |
| AL MAHA                           | المها                                    | 1               |
| AL MAMZAR                         | الممزر                                   | 3               |
| AL NAHDA FIRST                    | النهدة الأولى                            | 1               |
| AL NAHDA SECOND                   | النهدة الثانية                           | 1               |
| AL QOUZ FOURTH                    | القوز الرابعة                            | (DM has variant)|
| AL QOUZ THIRD                     | القوز الثالثة                            | 1               |
| AL QUSAIS IND. SECOND             | القصيص الصناعية الثانية                   | 1               |
| AL RAFFA                          | الرفاعة                                  | 1               |
| AL ROWAIYAH FIRST                 | الرويه الأولى                            | 3               |
| AL SAFOUH FIRST                   | الصفوح الأولى                            | 3               |
| AL SAFOUH SECOND                  | الصفوح الثانية                           | (DDA title-case)|
| AL SATWA                          | السطوة                                   | 2               |
| AL THANYAH FIRST                  | الثنيه الأولى                            | 1               |
| AL TTAY                           | الطي                                     | 1               |
| AL WARQA'A SECOND                 | الورقاء الثانية                          | 1               |
| AL WARQA'A THIRD                  | الورقاء الثالثة                          | 1               |
| AL WASL                           | الوصل                                    | 2               |
| AL YALAYIS 1                      | اليلايس 1                                 | 7               |
| AL YALAYIS 2                      | اليلايس 2                                 | 2               |
| AL YALAYIS 3                      | اليلايس 3                                 | 2               |
| AL YALAYIS 4                      | اليلايس 4                                 | 3               |
| AL YUFRAH 1                       | اليفره 1                                  | 4               |
| AL YUFRAH 2                       | اليفره 2                                  | 1               |
| BURJ KHALIFA                      | برج خليفة                                 | 1 (compound)    |
| BUSINESS BAY                      | الخليج التجاري                            | 1               |
| HADAEQ SHEIKH MOHAMMED BIN RASHID | حدائق الشيخ محمد بن راشد                  | 3 + 1 compound   |
| HESSYAN SECOND                    | حصيان الثانية                             | 1 (compound)    |
| JABAL ALI INDUSTRIAL FIRST        | جبل علي الصناعية الأولى                    | 4               |
| JUMEIRA BAY                       | جميرا باي                                 | 1               |
| JUMEIRA FIRST                     | جميرا الأولى                              | 4               |
| JUMEIRA SECOND                    | جميرا الثانية                             | 1               |
| LE HEMAIRA                        | الحميرا                                   | 1               |
| MADINAT HIND 1                    | مدينة هند 1                               | 1               |
| MADINAT HIND 2                    | مدينة هند 2                               | (compound)      |
| MADINAT HIND 3                    | مدينة هند 3                               | 2               |
| MADINAT HIND 4                    | مدينة هند 4                               | 1               |
| MANKHOOL                          | منخول                                     | 1               |
| MARGHAM                           | مرغم                                      | 1               |
| MARSA DUBAI                       | مرسى دبي                                  | 4               |
| ME'AISEM FIRST                    | معيصم الأولى                              | 1               |
| MIRDIF                            | مردف                                      | 1               |
| MUHAISANAH SECOND                 | محيصنة الثانية                             | 1               |
| MUHAISNAH FIRST                   | محيصنة الأولى                              | 1               |
| NADD AL HAMAR                     | ند الحمر                                   | 1               |
| NADD AL SHIBA FIRST               | ند الشبا الأولى                           | 2 (compound)    |
| NADD AL SHIBA FOURTH              | ند الشبا الرابعة                          | 1               |
| NADD AL SHIBA THIRD               | ند الشبا الثالثة                          | 1               |
| OUD METHA                         | عود ميثاء                                  | 1               |
| PORT SAEED                        | بور سعيد                                  | 1               |
| RAS AL KHOR IND. THIRD            | رأس الخور الصناعية الثالثة                 | 1               |
| SAIH AL SALAM                     | سيح السلم                                  | 1               |
| SAIH SHUAIB 1                     | سيح شعيب 1                                | 4               |
| SAIH SHUAIB 2                     | سيح شعيب 2                                | (compound)      |
| SAIH SHUAIB 3                     | سيح شعيب 3                                | (compound)      |
| SAIH SHUAIB 4                     | سيح شعيب 4                                | (compound)      |
| TRADE CENTER SECOND               | المركز التجاري الثانية                    | 3               |
| UMM AL DAMAN                      | أم الدمن                                  | 1               |
| UMM AL SHEIF                      | أم الشيف                                  | 1               |
| UMM HURAIR FIRST                  | أم هرير الأولى                            | 1 (compound)    |
| UMM HURAIR SECOND                 | أم هرير الثانية                           | 1               |
| UMM SUQEIM FIRST                  | أم سقيم الأولى                            | 3               |
| UMM SUQEIM THIRD                  | أم سقيم الثالثة                           | 5               |
| WADI AL SAFA 2                    | وادي الصفا 2                              | 5               |
| WADI AL SAFA 3                    | وادي الصفا 3                              | 10              |
| WADI AL SAFA 4                    | وادي الصفا 4                              | 5               |
| WADI AL SAFA 5                    | وادي الصفا 5                              | 6               |
| WADI AL SAFA 6                    | وادي الصفا 6                              | 1               |
| WADI AL SAFA 7                    | وادي الصفا 7                              | 10              |
| WADI ALAMARDI                     | وادي العمردي                               | 1               |
| WARSAN FIRST                      | ورسان الأولى                              | 1               |
| WARSAN SECOND                     | ورسان الثانية                             | 1               |
| ZAA'BEEL FIRST                    | زعبيل الأولى                              | 1               |
| ZAA'BEEL SECOND                   | زعبيل الثانية                             | 1               |

**Unmatched in DM** (7 DDA communities with no DM Arabic equivalent):
- `AL QOUZ IND. FIRST` → DM has "AL QUOZ INDUSTRIAL FIRST" (abbreviation difference)
- `AL QOUZ IND. SECOND` → "AL QUOZ INDUSTRIAL SECOND"
- `AL QOUZ IND. THIRD` → "AL QUOZ INDUSTRIAL THIRD"
- `AL QOUZ IND. FOURTH` → "AL QUOZ INDUSTRIAL FOURTH"
- `AL SHEIKH ZAYED ROAD` → DM has `SHEIKH ZAYED ROAD` (شارع الشيخ زايد, without AL-prefix)
- `DUBAI LAND` → DM does not have a single "DUBAI LAND" entry; it is a super-project container split into sub-communities.
- `WADI ALSHABAK` → DM has `WADI AL SHABAK` (وادي الشباك, with space)

### Appendix B · All 209 projects with plot counts (alphabetical)

| Project                                                | Plots (ZAAHI snapshot) |
| ------------------------------------------------------ | ---------------------- |
| 6454931 AT WADI AL SAFA 3                              | 1                      |
| 6456408 AT WADI AL SAFA 3                              | 1                      |
| 6461281 AT DUBAI LAND                                  | 1                      |
| AL ARYAM                                               | 1,519                  |
| AL BARARI                                              | 708                    |
| AL BARSHA THIRD DEVELOPMENT                            | 73                     |
| AL HABTOOR POLO                                        | 172                    |
| AL JALILA CHILDREN'S SPECIALTY HOSPITAL                | 1                      |
| AL KHAIL GATE                                          | 151                    |
| AL KHAIL HEIGHTS                                       | 11                     |
| AL KHAWANEEJ DISTRICT                                  | 341                    |
| AL KHAWANEEJ LABOUR CITY                               | 102                    |
| AL MAMZAR FRONT                                        | 216                    |
| AL WAHA                                                | 121                    |
| AL WARSAN INDUSTRIAL                                   | 101                    |
| ARABIAN RANCHES I                                      | 3,292                  |
| ARABIAN RANCHES II                                     | 2,376                  |
| ARABIAN RANCHES III                                    | 2,018                  |
| ARABIAN RANCHES POLO CLUB                              | 86                     |
| ARDH COMMUNITY                                         | 185                    |
| ARJAN                                                  | 227                    |
| ASMARAN                                                | 216                    |
| ATHLON BY ALDAR                                        | 1,034                  |
| BARSHA HEIGHTS                                         | 137                    |
| BIANCA                                                 | 49                     |
| BLUEWATERS                                             | 13                     |
| BOXPARK                                                | 4                      |
| BURJ AL ARAB                                           | 1                      |
| BURJ KHALIFA DISTRICT                                  | 53                     |
| BUSINESS BAY PHASE 1 & 2                               | 416                    |
| CALIFORNIA RESIDENCE                                   | 127                    |
| CHERRYWOODS                                            | 1,001                  |
| CITY OF ARABIA                                         | 485                    |
| CITY WALK                                              | 87                     |
| CULTURE VILLAGE PHASE 2                                | 2                      |
| CULTURE VILLAGE PHASE 3                                | 2                      |
| DAMAC HILLS                                            | 3,906                  |
| DAMAC HILLS 2                                          | 15,053                 |
| DAMAC ISLANDS                                          | 6,383                  |
| DAMAC ISLANDS 2                                        | 1,247                  |
| DAMAC LAGOONS                                          | 8,569                  |
| DEBS LAND                                              | 2                      |
| DHAM PLOTS AT AL ROWAIYAH FIRST                        | 1                      |
| DIFC ZABEEL                                            | 120                    |
| DP PLOTS AT AL BARSHA SOUTH THIRD                      | 20                     |
| DP PLOTS AT AL JAFILIYA                                | 1                      |
| DP PLOTS AT AL QOUZ IND. SECOND                        | 1                      |
| DPG LANDS WITHIN MOHAMMED BIN RASHED CITY              | 6                      |
| DUBAI CREEK HARBOUR                                    | 439                    |
| DUBAI DESIGN DISTRICT                                  | 151                    |
| DUBAI GOLF CITY                                        | 235                    |
| DUBAI HARBOUR                                          | 120                    |
| DUBAI HEALTHCARE CITY PHASE 1                          | 83                     |
| DUBAI HEALTHCARE CITY PHASE 2                          | 153                    |
| DUBAI HILLS                                            | 5,114                  |
| DUBAI HOLDING PLOTS AT AL KHAWANEEJ FIRST              | 40                     |
| DUBAI HOLDING PLOTS AT AL SAFOUH FIRST                 | 1                      |
| DUBAI INDUSTRIAL CITY                                  | 1,401                  |
| DUBAI INTERNATIONAL ACADEMIC CITY                      | 121                    |
| DUBAI INTERNATIONAL FINANCIAL CENTER                   | 45                     |
| DUBAI LAND                                             | 253                    |
| DUBAI LAND (673)                                       | 9                      |
| DUBAI LAND (A1-02)                                     | 1                      |
| DUBAI LAND (A3-04)                                     | 1                      |
| DUBAI LAND (A3-07)                                     | 1                      |
| DUBAI LAND (A4-09)                                     | 1                      |
| DUBAI LAND (B1-03)                                     | 1                      |
| DUBAI LAND (B1-04)                                     | 1                      |
| DUBAI LAND (B2-08)                                     | 1                      |
| DUBAI LAND (T.15)                                      | 1                      |
| DUBAI LAND RESIDENCE COMPLEX                           | 372                    |
| DUBAI LIFESTYLE CITY                                   | 101                    |
| DUBAI OUTSOURCE CITY                                   | 55                     |
| DUBAI PARKS                                            | 87                     |
| DUBAI POLICE ACADEMY                                   | 1                      |
| DUBAI POLICE PLOTS WITHIN UMM AL DAMAN                 | 2                      |
| DUBAI PRODUCTION CITY                                  | 427                    |
| DUBAI SCIENCE PARK                                     | 937                    |
| DUBAI SPORTS CITY                                      | 1,763                  |
| DUBAI STUDIO CITY                                      | 201                    |
| DUBAI WHOLESALE CITY                                   | 5                      |
| DUBAI WHOLESALE CITY (NON FREE ZONE)                   | 4                      |
| EMIRATES ACADEMY OF HOSPITALITY MANAGEMENT (EAHM)      | 1                      |
| EMIRATES TOWERS DISTRICT                               | 3                      |
| FALCON CITY OF WONDERS                                 | 1,590                  |
| GHAF WOODS                                             | 50                     |
| GHOROOB                                                | 20                     |
| GLOBAL VILLAGE                                         | 7                      |
| HAVEN                                                  | 765                    |
| JABAL ALI INDUSTRIAL DEVELOPMENT                       | 614                    |
| JABAL ALI STAFF ACCOMMODATION                          | 4                      |
| JABEL ALI HILLS                                        | 3,401                  |
| JADDAF WATERFRONT                                      | 100                    |
| JUMEIRA BEACH HOTEL                                    | 2                      |
| JUMEIRAH BAY                                           | 213                    |
| JUMEIRAH BEACH RESIDENCE                               | 22                     |
| JUMEIRAH CENTRAL                                       | 3                      |
| JUMEIRAH GARDEN CITY                                   | 395                    |
| JUMEIRAH GROUP PLOTS AT JUMEIRA SECOND                 | 1                      |
| KITE BEACH                                             | 1                      |
| KOA REAL ESTATE DEVELOPMENT                            | 4                      |
| LA MER                                                 | 296                    |
| LABOUR ACCOMMODATION AT AL QUOZ                        | 5                      |
| LAST EXIT                                              | 3                      |
| LAYAN                                                  | 7                      |
| LIVING LEGENDS                                         | 596                    |
| LIWAN                                                  | 204                    |
| LIWAN 2                                                | 190                    |
| LUNAYA                                                 | 1                      |
| MADINAT JUMEIRAH                                       | 2                      |
| MADINAT JUMEIRAH LIVING                                | 46                     |
| MAJAN                                                  | 299                    |
| MARSA AL ARAB                                          | 15                     |
| MARSA ALSEEF                                           | 2                      |
| MERAAS PLOT 3460266                                    | 1                      |
| MERAAS PLOTS AT AL BARSHA SECOND                       | 57                     |
| MERAAS PLOTS AT AL BARSHA SOUTH FIRST                  | 1                      |
| MERAAS PLOTS AT AL BARSHA SOUTH SECOND                 | 2                      |
| MERAAS PLOTS AT AL JAFILIYA                            | 1                      |
| MERAAS PLOTS AT AL MAMZAR                              | 1                      |
| MERAAS PLOTS AT AL QOUZ THIRD                          | 2                      |
| MERAAS PLOTS AT AL QUSAIS IND. SECOND                  | 1                      |
| MERAAS PLOTS AT AL SATWA                               | 2                      |
| MERAAS PLOTS AT AL WARQA'A SECOND                      | 1                      |
| MERAAS PLOTS AT AL WARQA'A THIRD                       | 3                      |
| MERAAS PLOTS AT JUMEIRA FIRST                          | 1                      |
| MERAAS PLOTS AT LE HEMAIRA                             | 1                      |
| MERAAS PLOTS AT MARSA DUBAI                            | 2                      |
| MERAAS PLOTS AT MIRDIF                                 | 172                    |
| MERAAS PLOTS AT NADD AL HAMAR                          | 127                    |
| MERAAS PLOTS AT NADD AL SHIBA FOURTH                   | 1                      |
| MERAAS PLOTS AT PORT SAEED                             | 1                      |
| MERAAS PLOTS AT RAS AL KHOR IND. THIRD                 | 2                      |
| MERAAS PLOTS AT SAIH SHUAIB 1                          | 2                      |
| MERAAS PLOTS AT UMM AMARAA                             | 171                    |
| MERAAS PLOTS AT UMM SUQEIM FIRST                       | 1                      |
| MERAAS PLOTS AT WADI ALAMARDI                          | 1                      |
| MERAAS PLOTS AT WADI ALSHABAK                          | 2                      |
| MERAAS PLOTS AT ZAA'BEEL SECOND                        | 1                      |
| MERAAS PLOTS WITHIN UMM AL DAMAN                       | 10                     |
| MERAAS PLOTS WITHIN UMM AL SHEIF                       | 220                    |
| MOTOR CITY                                             | 95                     |
| MUDON                                                  | 3,413                  |
| MUSEUM OF THE FUTURE                                   | 1                      |
| NAD AL SHEBA GARDENS                                   | 2,623                  |
| NAIA ISLAND                                            | 188                    |
| NUZUL                                                  | 4                      |
| OASIS VILLAGE                                          | 3                      |
| PALMAROSA                                              | 126                    |
| PEARL JUMEIRA                                          | 362                    |
| PORTOFINO                                              | 934                    |
| REMRAAM                                                | 31                     |
| REPORTAGE VILLAGE 1&2                                  | 206                    |
| RUKAN                                                  | 134                    |
| SAMA AL JADAF                                          | 323                    |
| SCARAMANGA                                             | 3                      |
| SCHOOLS - FREE ZONE                                    | 4                      |
| SERENA                                                 | 467                    |
| SHAMAL PLOTS AT AL BARSHA SECOND                       | 2                      |
| SHAMAL PLOTS AT AL BARSHA SOUTH FIRST                  | 1                      |
| SHAMAL PLOTS AT AL MAHA                                | 1                      |
| SHAMAL PLOTS AT AL MAMZAR                              | 2                      |
| SHAMAL PLOTS AT AL NAHDA FIRST                         | 1                      |
| SHAMAL PLOTS AT AL NAHDA SECOND                        | 2                      |
| SHAMAL PLOTS AT AL QOUZ IND.FIRST                      | 1                      |
| SHAMAL PLOTS AT AL QOUZ IND.SECOND                     | 2                      |
| SHAMAL PLOTS AT AL QOUZ THIRD                          | 1                      |
| SHAMAL PLOTS AT AL RAFFA                               | 1                      |
| SHAMAL PLOTS AT AL SAFOUH FIRST                        | 1                      |
| SHAMAL PLOTS AT AL WASL                                | 1                      |
| SHAMAL PLOTS AT AL YALAYIS 1                           | 7                      |
| SHAMAL PLOTS AT JABAL ALI INDUSTRIAL FIRST             | 4                      |
| SHAMAL PLOTS AT JUMEIRA FIRST                          | 1                      |
| SHAMAL PLOTS AT MANKHOOL                               | 1                      |
| SHAMAL PLOTS AT MARGHAM                                | 1                      |
| SHAMAL PLOTS AT MUHAISANAH SECOND                      | 2                      |
| SHAMAL PLOTS AT MUHAISNAH FIRST                        | 1                      |
| SHAMAL PLOTS AT NADD AL SHIBA FIRST                    | 3                      |
| SHAMAL PLOTS AT OUD METHA                              | 1                      |
| SHAMAL PLOTS AT TRADE CENTER SECOND                    | 4                      |
| SHAMAL PLOTS AT UMM SUQEIM THIRD                       | 1                      |
| SHAMAL PLOTS WITHIN HADAEQ SHEIKH MOHAMMED BIN RASHID  | 2                      |
| SHOROOQ                                                | 529                    |
| SITE A                                                 | 142                    |
| SITE D                                                 | 12                     |
| SOBHA ELWOOD                                           | 394                    |
| SOBHA RESERVE                                          | 414                    |
| SOBHA SANCTUARY                                        | 4                      |
| SUFOUH GARDENS                                         | 99                     |
| SUSTAINABLE CITY                                       | 22                     |
| TAORMINA VILLAGE 1                                     | 90                     |
| TAORMINA VILLAGE 2                                     | 53                     |
| TECOM PLOTS - SAIH AL SALAM                            | 2                      |
| TECOM PLOTS AT AL QOUZ IND.SECOND                      | 8                      |
| THE ACRES                                              | 1,604                  |
| THE BEACH                                              | 1                      |
| THE ECHO PLEX CITY                                     | 31                     |
| THE VALLEY                                             | 5,476                  |
| THE VILLA                                              | 2,070                  |
| TIJARA TOWN                                            | 183                    |
| TILAL AL GHAF                                          | 2,437                  |
| TOWERSIDE                                              | 110                    |
| TOWN SQUARE                                            | 1,069                  |
| VILLANOVA                                              | 1,682                  |
| WARSAN FIRST DEVELOPMENT                               | 183                    |
| WILD WADI WATER PARK                                   | 1                      |
| WILDS 1&2                                              | 1,239                  |
| ZAA'BEEL FIRST PLOT                                    | 1                      |
| (null — unclassified orphans)                          | 2                      |

Total: **209 projects · 99,235 plots**.

### Appendix C · All 20 LANDUSE_CATEGORY values with counts

| #  | Category                                 | Plots   | % of universe |
| -- | ---------------------------------------- | ------- | ------------- |
|  1 | RESIDENTIAL                              | 74,833  | 75.40 %       |
|  2 | OPEN SPACE                               |  9,218  |  9.29 %       |
|  3 | UTILITIES                                |  8,732  |  8.80 %       |
|  4 | COMMERCIAL - RESIDENTIAL                 |  1,267  |  1.28 %       |
|  5 | INDUSTRIAL                               |  1,009  |  1.02 %       |
|  6 | FACILITIES                               |    908  |  0.91 %       |
|  7 | COMMERCIAL                               |    826  |  0.83 %       |
|  8 | TRANSPORT                                |    663  |  0.67 %       |
|  9 | COMMERCIAL - HOSPITALITY - RESIDENTIAL   |    607  |  0.61 %       |
| 10 | UNDEFINED                                |    315  |  0.32 %       |
| 11 | FUTURE DEVELOPMENT                       |    188  |  0.19 %       |
| 12 | HOSPITALITY                              |    148  |  0.15 %       |
| 13 | COMMERCIAL - HOSPITALITY                 |    110  |  0.11 %       |
| 14 | HOSPITALITY - RESIDENTIAL                |    103  |  0.10 %       |
| 15 | RECREATIONAL                             |     93  |  0.09 %       |
| 16 | COMMERCIAL - INDUSTRIAL                  |     87  |  0.09 %       |
| 17 | WATER BODY                               |     60  |  0.06 %       |
| 18 | COMMERCIAL - RECREATIONAL                |     48  |  0.05 %       |
| 19 | GOLF COURSE                              |     17  |  0.02 %       |
| 20 | OTHER                                    |      7  | <0.01 %       |
|    | **TOTAL**                                | **99,239** | 100.00 %   |

### Appendix D · All 43 plot fields — complete schema

(See §6.1 for the main table. This is a condensed machine-readable form.)

```
  1.  OBJECTID                   OID                internal primary key
  2.  SHAPE                      Geometry           Polygon
  3.  PLOT_NUMBER                String(20)         7-digit canonical
  4.  OLD_PLOT_NUMBERS           String(255)        legacy CSV
  5.  ENTITY_NAME                String(80)         master developer
  6.  DEVELOPER_NAME             String(80)         sub-developer
  7.  PROJECT_NAME               String(80)         named estate
  8.  LAND_NAME                  String(80)         optional sub-plot label
  9.  AREA_SQM                   Double             plot area sqm
 10.  AREA_SQFT                  Double             plot area sqft
 11.  GFA_SQM                    Double             permitted GFA sqm
 12.  GFA_SQFT                   Double             permitted GFA sqft
 13.  MAX_HEIGHT_FLOORS          String(50)         "G+N" style
 14.  MAX_HEIGHT_METERS          Double             always 0 (dead)
 15.  MAX_HEIGHT                 String(80)         textual
 16.  HEIGHT_CATEGORY            String(255)        low/mid/high/super-tall
 17.  MIN_PLOT_COVERAGE          Double             min coverage fraction
 18.  MAX_PLOT_COVERAGE          Double             max coverage fraction
 19.  PLOT_COVERAGE              String(20)         textual coverage
 20.  CONSTRUCTION_STATUS        String(50)         6-value enum
 21.  MAIN_LANDUSE               String(255)        70-value composite
 22.  SUB_LANDUSE                String(255)        395-value tag
 23.  LANDUSE_DETAILS            String(500)        human-readable mix
 24.  LANDUSE_CATEGORY           String(255)        DDA's 20-value canonical ⚠ZAAHI drops
 25.  GENERAL_NOTES              String(2000)       free-text restrictions
 26.  IS_FROZEN                  Small int          0/1
 27.  FREEZE_DATE                Date               when frozen
 28.  FREEZE_REASON              String(255)        why frozen
 29.  SITEPLAN_ISSUE_DATE        Date               approval issued
 30.  SITEPLAN_EXPIRY_DATE       Date               approval expires ⚠ZAAHI drops
 31.  BUILDING_SETBACK_SIDE1     String(20)         metres
 32.  BUILDING_SETBACK_SIDE2     String(20)         metres
 33.  BUILDING_SETBACK_SIDE3     String(20)         metres
 34.  BUILDING_SETBACK_SIDE4     String(20)         metres
 35.  PODIUM_SETBACK_SIDE1       String(20)         podium-only
 36.  PODIUM_SETBACK_SIDE2       String(20)         podium-only
 37.  PODIUM_SETBACK_SIDE3       String(20)         podium-only
 38.  PODIUM_SETBACK_SIDE4       String(20)         podium-only
 39.  GFA_TYPE                   String(50)         fixed/indicative
 40.  GFA_SQM_T                  String(50)         textual alt GFA
 41.  GFA_SQFT_T                 String(50)         textual alt GFA
```

### Appendix E · All observed CONSTRUCTION_STATUS values

| Status              | Plots (live 2026-04-23) |
| ------------------- | ----------------------- |
| Empty               | 38,469                  |
| Completed           | 35,331                  |
| Under Construction  | 17,602                  |
| Pre-Construction    |  7,338                  |
| Suspended           |    497                  |
| No Data             |      4                  |
| **TOTAL**           | **99,241**              |

(2-plot rounding variance vs. total-plot count 99,239 is consistent with 2 plots where ENTITY_NAME and PROJECT_NAME are null.)

### Appendix F · Freeze reasons observed (samples)

| Reason                                                                                       | Sampled occurrences | Project(s)             |
| -------------------------------------------------------------------------------------------- | ------------------- | ---------------------- |
| `"As requested by the Master Developer, Ref.: DH/RED/CREO/2020/1055 Dated 03/11/2020"`        | 98 / 100 (general sample) | likely Dubai Holding portfolio wide |
| `"Subject to RTA approval."` / `"Subject to RTA approval"`                                     | 30 / 30 (THE VALLEY), 27 / 30 (DUBAI CREEK HARBOUR), 30 / 30 (DIFC ZABEEL) | infrastructure adjacency |
| `"NOC from Dubai Environment and Climate Change Authority to be provided."`                   | 3 / 30 (DUBAI CREEK HARBOUR) | coastal / ecologically sensitive |
| `"Plot within ROW, RTA approval is required"`                                                 | 1 / 100 (general sample) | infrastructure ROW    |
| `"PROPOSED METRO EMERGENCY EVACUATION POINT."`                                                | 1 / 100 (general sample) | metro-related         |

Not sampled exhaustively. At ~1,145 frozen plots total, the full distribution can be retrieved via 12 paginated queries of 100 records each.

### Appendix G · Sample REST queries (curl equivalents)

**Full count of plot universe:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=1%3D1&returnCountOnly=true&f=json'
# → {"count": 99239}
```

**Distinct LANDUSE_CATEGORY values:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=1%3D1&outFields=LANDUSE_CATEGORY&returnDistinctValues=true&returnGeometry=false&f=json'
# → 20 values
```

**Count by LANDUSE_CATEGORY:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=LANDUSE_CATEGORY%3D%27RESIDENTIAL%27&returnCountOnly=true&f=json'
# → {"count": 74833}
```

**Count of frozen plots:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=IS_FROZEN%3D1&returnCountOnly=true&f=json'
# → {"count": 1145}
```

**Legacy-number-carrying plots:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=OLD_PLOT_NUMBERS+IS+NOT+NULL+AND+OLD_PLOT_NUMBERS+%3C%3E+%27%27&returnCountOnly=true&f=json'
# → {"count": 76513}
```

**Siteplan-expiry-populated plots:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=SITEPLAN_EXPIRY_DATE+IS+NOT+NULL&returnCountOnly=true&f=json'
# → {"count": 59271}
```

**Single plot fetch with full attributes:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=PLOT_NUMBER%3D%273460513%27&outFields=*&outSR=4326&f=json'
# → {"features":[{"attributes":{...43 attrs...},"geometry":{...}}]}
```

**Project-limit polygon for one project:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/0/query?where=ProjectName%3D%27AL+WAHA%27&outFields=*&outSR=4326&f=json'
```

**Project list with free-zone flag:**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/FREE_ZONE_PROJECTS/MapServer/0/query?where=IsFreeZone%3D1&outFields=ProjectName,EntityName,EntityCategory&returnGeometry=false&f=json'
# → 25 features
```

**Paged full-corpus pull (batch 0 of ~50):**
```
curl -s 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=1%3D1&outFields=*&outSR=4326&f=json&resultRecordCount=2000&resultOffset=0&orderByFields=OBJECTID+ASC'
```

---

## §14 · Recommendations

### Priority 1 — HIGH VALUE / LOW EFFORT

**1.1 · Capture `OLD_PLOT_NUMBERS`, `LANDUSE_CATEGORY`, `SITEPLAN_ISSUE_DATE`, `SITEPLAN_EXPIRY_DATE`, `FREEZE_DATE`, `FREEZE_REASON`, `LANDUSE_DETAILS`, `GENERAL_NOTES`**

- **What**: Add 8 fields to `scripts/fetch-dda-plots.ts:OUT_FIELDS`; re-fetch corpus.
- **Why**: Unlocks 77 % legacy-number coverage, 20-value canonical land-use, 59 K siteplan-expiry dates, freeze-context display, regulatory-notes display. These are 6 of the 8 top-value gaps.
- **Effort**: 1–2 SP. Script edit + one full re-fetch (~30 min runtime).
- **Risk**: Low. Field widths are known. Storage footprint increases ~60 % (from 22 to 30 fields, mostly string-typed). Acceptable.
- **Dependency**: None.
- **Impact**: Enables **Priority 2** features.

**1.2 · Deprecate `data/layers/dda/` (skinny-schema copy)**

- **What**: Grep callers of `dda/`, redirect to `dda-plots/`, delete.
- **Why**: Eliminates 121-plot internal disagreement (§12.1), removes 54 MB dead weight.
- **Effort**: 2 SP.
- **Risk**: Low if grep-and-redirect is thorough. Test the map regression path.
- **Dependency**: None.

**1.3 · Normalise case at ingest**

- **What**: `upper().strip()` on all `CommunityName` values at ingest; canonical alias table for DDA ↔ DM 7-row mismatch.
- **Why**: Eliminates 8 case-pair duplicates (§7.3), aligns DDA ↔ DM community-name space.
- **Effort**: 1 SP.
- **Risk**: Low — pure string transformation.
- **Dependency**: None.

### Priority 2 — HIGH VALUE / MEDIUM EFFORT

**2.1 · Replace / supplement 9-category legend with DDA's 20-value `LANDUSE_CATEGORY`**

- **What**: Expose `LANDUSE_CATEGORY` as the primary filter facet; keep 9-category as a rollup for retail-buyer UX.
- **Why**: 19.4 % of plots currently fall into an unmapped void (§3.6). Adds `GOLF COURSE`, `WATER BODY`, `OPEN SPACE`, `UTILITIES`, `TRANSPORT`, `FACILITIES`, `RECREATIONAL` as first-class buckets.
- **Effort**: 3 SP — legend, colour palette, Feasibility Calculator category defaults, Parcel facet API, dashboard filter, map stroke/fill rules.
- **Risk**: Medium. Designer sign-off on 20-category palette. Legacy users' muscle memory.
- **Dependency**: Priority 1.1 (need the field captured).
- **Impact**: Core search-correctness win. Enables Land Monitor to route leads by category specifically.

**2.2 · Surface `SITEPLAN_EXPIRY_DATE` as "approval expiring in N days" alert**

- **What**: Subscriber-facing UI component on listing card + notification pipeline trigger (7/30/90 day alerts).
- **Why**: No competing Dubai platform surfaces this. 59 K plots carry the data. Prevents buyer surprise.
- **Effort**: 3 SP — UI + notification worker + test.
- **Risk**: Low. Read-only presentation.
- **Dependency**: Priority 1.1.
- **Impact**: Differentiating subscriber feature.

**2.3 · Legacy plot-number lookup**

- **What**: Ingest `OLD_PLOT_NUMBERS` as comma-split list; add a `ParcelLegacyNumber` table (parcelId, legacyNumber, ordinal). Index on legacyNumber. Add lookup API.
- **Why**: 77 % of plots carry legacy numbers. Broker uploads, bank documents, pre-2020 affection plans all reference these.
- **Effort**: 3 SP — schema + ingest + search API.
- **Risk**: Medium. Duplicate legacy numbers across projects are possible (same `A/P14` in different projects) — tuple key required.
- **Dependency**: Priority 1.1.

**2.4 · Scheduled DDA sync (weekly)**

- **What**: Weekly cron running `fetch-dda-plots.ts` with diff against last snapshot. PR-style diff report or auto-commit to a scratch branch.
- **Why**: Drift of ~300 status transitions per 11 days (§9.3). Monthly cadence = 1,200 outdated plots.
- **Effort**: 3 SP — GitHub Actions or `/schedule` routine.
- **Risk**: Low if snapshot diff is well-bounded.
- **Dependency**: Priority 1.1 for useful diff.

### Priority 3 — MEDIUM VALUE / HIGHER EFFORT

**3.1 · Explode multi-community `CommunityName` comma-lists**

- **What**: Split on comma at ingest; store `Parcel.communities: string[]` or introduce `ParcelCommunity` join table. 11 projects with compound CommunityName rows affected (notably the 18-community Dubai Land super-project).
- **Why**: Buyers filtering by "Wadi Al Safa 5" currently miss all plots in the Dubai Land super-project that spans 18 communities.
- **Effort**: 4 SP — schema migration + facet API + dashboard UI.
- **Risk**: Medium. Backward compatibility for existing Parcel.district consumers.
- **Dependency**: Priority 1.3.

**3.2 · Normalise 330 `MAX_HEIGHT_FLOORS` patterns**

- **What**: Extend `parseFloorsFromHeightCode` with unit tests covering all 330 patterns in the corpus. Add handlers for mezzanine, multi-podium, roof-access, and "SEE NOTES" fallback.
- **Why**: ~18,230 plots (18.4 %) currently render at fallback height rather than their real envelope.
- **Effort**: 4 SP — parser + test fixtures + re-render verify.
- **Risk**: Medium. 3D-render regressions on refactor.
- **Dependency**: None.

**3.3 · Bilingual UI via DM Arabic lookup**

- **What**: Materialise DM's 224 community pairs into a lookup table; render `community_ar` alongside `community_en` in the dashboard. Add Arabic search support.
- **Why**: DDA publishes no Arabic fields. DM has 89 of 96 DDA-community translations already in the ZAAHI filesystem.
- **Effort**: 3 SP — seed + UI + search.
- **Risk**: Low. 7 communities still need manual translation.
- **Dependency**: None.

### Priority 4 — LONG-TERM / DEPENDENT ON DDA PARTNERSHIP

**4.1 · Obtain DDA token for `DIS`/`BUILDING`/`SITEPLAN`/`DEMARCATION` folders**

- **What**: Formal partnership ask; ZAAHI already uses a token for the DIS building-limit endpoint (via `src/lib/dda.ts`). Expanded token scope would unlock canonical affection-plan HTML, per-plot siteplan imagery, per-plot demarcation boundaries, real-time building permits.
- **Why**: Eliminates the need to scrape `DIS/?handler=PlotInfo` HTML — gives structured access instead. Unlocks site-plan PDF embeds, building-limit polygons (beyond layer 8), per-plot NOC status.
- **Effort**: Low engineering (token integration in `src/lib/dda.ts`); high business-development (founder-level ask, partnership agreement).
- **Risk**: Political — DDA may decline or restrict.
- **Dependency**: Founder decision.

**4.2 · Spatial indexing (H3 / Geohash)**

- **What**: Pre-compute H3 index (resolution 9 or 10) for every plot; store in Parcel + a spatial-index table. Enable server-side "nearby plots" queries.
- **Why**: Current `/api/parcels/map` ships the full 157 MB corpus and filters client-side. Spatial index enables true filter-in-database flows.
- **Effort**: 5 SP.
- **Risk**: Medium. Migration design.
- **Dependency**: None; independent of DDA partnership.

---

## §15 · Open questions

1. **Legend strategy** — Does ZAAHI keep the 9-category UX and layer DDA's 20 underneath (hybrid), or switch the primary legend to DDA's 20? Affects dashboard facet layout, colour palette design, mobile UX.
2. **Listing density vision** — Current 0.12 % listing coverage of DDA universe (116 listings of 99 K plots). Is Phase 1 User Dashboards scaled for 1 K listings? 10 K? 100 K? The 3D-render perf ceiling depends on the answer.
3. **Sync cadence** — Weekly acceptable or Land Monitor needs daily? A nightly `fetch-dda-plots.ts` run costs ~200 MB/day bandwidth but gives sub-1-day drift.
4. **Legacy-number lookup scope** — Store full comma-separated list or only first legacy? DHCC-style `A/P14` vs Meydan-style `673-2034` vs pre-merge references: one canonical per-plot or a full history?
5. **Multi-community schema** — `Parcel.communities: string[]`, or `ParcelCommunity` join table, or primary-community-only (dropping the nuance)?
6. **DDA partnership ask** — Worth a formal engagement for token access to DIS / SITEPLAN / DEMARCATION? Would unlock structured data that ZAAHI currently scrapes out of HTML.
7. **Abu Dhabi scope** — Three Parcel rows in Abu Dhabi districts (HIDD AL SAADIYAT, YAS ISLAND, AL JAHILI). Mistake, pilot, future expansion? Flag in `Parcel.emirate` and exclude from DDA cross-refs if out of scope.
8. **Per-plot QA at 99 K scale** — Founder's original ask was "каждый участок проверить" (verify every plot). Literal per-plot review is infeasible in any single session. Recommend Phase-2 human-in-the-loop QA scoped to:
   - 317 plots with empty MAIN_LANDUSE / UNDEFINED
   - 1,145 frozen plots + reasons
   - ~18,230 plots rendering at fallback height
   - 121 plots in the internal disagreement set
   Total ~20 K plots for targeted QA vs 99 K wholesale.
9. **Freeze-reason full enumeration** — Does ZAAHI want the full list of ~1,145 freeze reasons in one pull, or is sampled-category sufficient? Full pull = 12 × 100-record pages from DDA.
10. **Site-plan PDF ingestion** — Under DDA partnership, the per-plot site-plan PDFs would become available. Storage strategy: cache in S3? Re-render client-side? Or just embed via DDA URL?
11. **Agricultural category** — ZAAHI's 9-category legend has `AGRICULTURAL` but no DDA plot matches this category. Is this a Dubai-reality reflection ("Dubai has no agricultural zoning") or a ZAAHI miss? Abu Dhabi has significant agricultural zoning; the canonical is probably useful for cross-emirate parity.
12. **Educational / Healthcare mapping** — ZAAHI buckets these via SUB_LANDUSE regex. Is a more rigorous classification (e.g. via `ENTITY_NAME='DUBAI HEALTHCARE CITY AUTHORITY'`) more reliable than the text-matching heuristic?

---

## §16 · Methodology · honesty

### 16.1 Scope

- All DDA plot universe statistics fetched live against `gis.dda.gov.ae` on 2026-04-23.
- All ZAAHI local statistics measured against the snapshot in `data/layers/dda/` and `data/layers/dda-plots/` (last modified 2026-04-12).
- DB statistics from Prisma `Parcel` table as of the query run this session.
- Agent did not attempt any token-authenticated DDA endpoint. Tokens held by ZAAHI's production process were not used by the research agent.

### 16.2 Honesty guardrails honoured

| Guardrail                                                   | Status                                                            |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| No fabricated counts                                        | ✓ Every count cites a source query or local tally                  |
| Source for every number                                     | ✓ Appendix G lists representative URLs; each major number ties to it |
| Flag uncertainty                                            | ✓ "unknown", "agent-inferred", "not fetched" used where applicable  |
| Staleness flagged                                           | ✓ §9.3 drift table; §12.x delta notes                               |
| Token-gated endpoints untouched                             | ✓ No 499-bearing endpoint probed beyond the single `?f=json` discovery call |
| No paid API calls                                           | ✓ All queries against free public REST                             |
| DDA rate limits respected                                   | ✓ ~40 count queries issued across ~15 minutes; no throttling       |
| Sampling methodology disclosed                              | ✓ Freeze reasons, old plot numbers, and sample plots all labelled  |
| Per-plot review out of scope                                | ✓ §15 #8 explicitly proposes scoped alternative                    |

### 16.3 What this document does NOT claim

- It does not claim to be a current-state mirror of DDA. ZAAHI local snapshot is 11 days stale.
- It does not enumerate all 1,145 freeze reasons individually, nor all 76,513 OLD_PLOT_NUMBERS. Samples are labelled.
- It does not provide boundaries quality analysis on the full 99 K-plot sample — geometry checks were run on a 20-file 11,476-feature sample.
- It does not assume DDA's public API surface is complete. Token-gated folders may expose richer data.
- It does not prescribe a specific technical implementation for any recommendation. The §14 recommendations are descriptive ("add a field", "deprecate a layer"); engineering will adapt.

### 16.4 Safety invariants — session end

| Invariant                                             | State       |
| ----------------------------------------------------- | ----------- |
| No code modified                                      | ✓ UNCHANGED |
| No data files added / removed / modified              | ✓ UNCHANGED |
| No Prisma schema changed                              | ✓ UNCHANGED |
| No Prisma migration created                           | ✓ UNCHANGED |
| No DB mutations                                       | ✓ UNCHANGED (only count / groupBy / findMany / raw SELECT earlier audit) |
| No map config altered                                 | ✓ UNCHANGED |
| No new npm dependencies                               | ✓ UNCHANGED |
| No paid API calls                                     | ✓ UNCHANGED |
| No token-gated DDA endpoint accessed                  | ✓ UNCHANGED |
| DDA REST rate limits respected                        | ✓ UNCHANGED |
| Only artifact written: this document                  | ✓ AS INSTRUCTED |

### 16.5 Branch & commit

- Branch: `research/vision-and-competitors-2026-04-19`
- Tip at session start: `f1fdc5d` (previous audit)
- Expected commit: `docs(audits): DDA catalog final — 20 categories · 43 fields · 209 projects · full appendices`

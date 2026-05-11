# data-dubai/ — local research dumps

Files in this directory are **data.dubai portal exports** held locally
for research. They are **not version-controlled** (see `.gitignore` at
repo root) because total size is ~244 MB and the data is regenerable
from the source portal. This index is the only tracked file.

**Source:** `data.dubai` (successor to Dubai Pulse), accessed by
founder with full download permissions, May 2026.

**Format note:** files downloaded from `data.dubai` with a `.json`
extension are actually **gzip-compressed despite the extension**.
The local copies here have been decompressed (suffix `.json` is real
JSON) **except** for `dld_transactions_full_2026-04-29.json.gz`,
which is kept compressed because the decompressed form is **2.66 GB**.

## File inventory

| File | Issuer | Rows | Geo signal | Size | ZAAHI relevance |
|---|---|---:|---|---:|---|
| `dewa_ev_green_charger_2026-05-08.json` | DEWA | **335** | **lat/lng** | 119 KB | **HIGH** — direct map layer |
| `dewa_annual_statistics_2026-05-11.json` | DEWA | 972 | none | 178 KB | MED — context / marquee |
| `dewa_water_supply_points_2026-05-11.json` | DEWA | **5** | **none** (NOT geocoded) | 835 B | **LOW** — water-tanker fuelling points, not utility infra |
| `dewa_peak_water_production_2026-05-11.json` | DEWA | 1 | none | 152 B | LOW — single macro stat |
| `dld_transactions_full_2026-04-29.json.gz` | DLD | **1,697,783** | `area_id` + `area_name_en` | 208 MB (2.66 GB raw) | **HIGH** — historical sales for comparables |
| `dld_transactions_recent_2026-04-12.csv` | DLD | 6,886 | `AREA_EN` | 1.5 MB | HIGH — recent window, easier to ingest |
| `dld_lands_2026-04-12.csv` | DLD | 254,041 | `AREA_EN` + `ZONE_EN` | 28 MB | MED — land registrations, area-level only |
| `dld_lands_2026-04-12_v2.csv` | DLD | 127,727 | same as above | 15 MB | (duplicate subset — keep one) |

## Critical correction to prior research

The earlier `UTILITY_LAYERS_AND_ADIS_2026.md` claimed
`dewa_water_supply_points-open` was a "geocoded points of water-supply
infrastructure" layer. **It is not.** Inspection of the actual download
shows 5 rows — they are *water tanker fuelling distribution points*
(Jebel Ali Industrial, Port Jebel Ali, Creek Jetty, Port Rashid,
Hatta) with text addresses but **no latitude/longitude fields**.
Useful for tanker logistics, not for plot-level utility overlays.

## Schemas (key columns)

### `dewa_ev_green_charger_2026-05-08.json`
```
devicedb_id, hubelean_id, location_name, location_address,
longitude (string), latitude (string),
totalnbofconnectors (string), connectortype, load_timestamp
```

### `dld_transactions_full_2026-04-29.json.gz` (47 columns)
```
transaction_id, procedure_id, trans_group_id, trans_group_ar/en,
procedure_name_ar/en, instance_date,
property_type_id, property_type_ar/en,
property_sub_type_id, property_sub_type_ar/en,
property_usage_ar/en, reg_type_id, reg_type_ar/en,
area_id, area_name_ar/en,
building_name_ar/en, project_number, project_name_ar/en,
master_project_ar/en,
nearest_landmark_ar/en, nearest_metro_ar/en, nearest_mall_ar/en,
rooms_ar/en, has_parking,
procedure_area (sqm), actual_worth (AED), meter_sale_price (AED/sqm),
rent_value, meter_rent_price,
no_of_parties_role_1/2/3, load_timestamp
```

### `dld_transactions_recent_2026-04-12.csv` (22 columns)
```
TRANSACTION_NUMBER, INSTANCE_DATE, GROUP_EN, PROCEDURE_EN,
IS_OFFPLAN_EN, IS_FREE_HOLD_EN, USAGE_EN, AREA_EN,
PROP_TYPE_EN, PROP_SB_TYPE_EN,
TRANS_VALUE, PROCEDURE_AREA, ACTUAL_AREA, ROOMS_EN, PARKING,
NEAREST_METRO_EN, NEAREST_MALL_EN, NEAREST_LANDMARK_EN,
TOTAL_BUYER, TOTAL_SELLER, MASTER_PROJECT_EN, PROJECT_EN
```

### `dld_lands_2026-04-12.csv` (12 columns)
```
LAND_TYPE_EN, PROP_SUB_TYPE_EN, ACTUAL_AREA,
IS_OFFPLAN_EN, PRE_REGISTRATION_NUMBER, IS_FREE_HOLD_EN,
DM_ZIP_CODE, MASTER_PROJECT_EN, PROJECT_NUMBER, PROJECT_EN,
AREA_EN, ZONE_EN
```

## Data-quality notes

- All 4 DEWA `.json` files are **gzip-compressed despite the
  extension** as downloaded from `data.dubai`. Either decompress
  on ingest (with `zcat` / Node's `zlib`) or rename to `.json.gz`
  for clarity. Local copies in this directory are decompressed.
- DLD transactions JSON full dump is **2.66 GB decompressed**. Plan
  ingest with a **streaming parser**, not `JSON.parse` of the whole
  file. Recommended approach: stream + aggregate into a Prisma
  rollup table (avg / median / count by `area_name_en` × month).
- All DLD CSV files use a **BOM** (`﻿`) on the first header cell.
  CSV parser must strip it or the first column name becomes
  garbage.
- The two `lands` CSV files appear to be a full export (254k rows)
  and a filtered subset (128k rows) — same 12-column schema, smaller
  one likely a filter (Residential / Free Hold only — to verify).
  Keep the 254k one; the 128k is redundant.
- All files use `load_timestamp` as the ingestion-side timestamp
  (when the data.dubai platform refreshed the cache). Treat as
  upper-bound staleness indicator.

## What's NOT in these dumps (must download still)

See the parent research doc, §2.5 "Download queue."

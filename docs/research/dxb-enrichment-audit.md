# DXB Interact + data.dubai enrichment audit

**Date:** 2026-10-11 · **Branch:** `research/sold-plots-layer` (docs only) · **Companion:**
`docs/specs/sold-plots-layer.md`. Every count is measured unless marked **assumed**.

Scope: every field we hold from DXB Interact exports/pages or the data.dubai (DLD open data) dump that
is **not yet on the platform**, with its value, coverage and effort; plus the registered-project
link test. "On the platform today" = the consolidated list in §4 (hover card, `SidePanel`, vault
panel, `/api/parcels/map`, DDA lookup).

---

## 1. Already on the platform (baseline to diff against)

plotNumber · oldNumber · emirate · district · community · projectName (DDA master development) ·
masterDeveloper · geometry · lat/lng · area sqft/sqm · landUse (10 categories) · subLandUse /
landUseMix[] · maxGfa sqm/sqft · FAR · maxFloors / maxHeightCode / maxHeightMeters · setbacks[] ·
buildingLimitGeometry · buildingStyle · sitePlanIssue/Expiry · plotGuidelinesUrl / Plot Details PDF ·
notes · status (ParcelStatus incl. SOLD; DDA construction status in tiles) · currentValuation (manual,
fils) · derived ppsf (plot & GFA) · vault askingPrice + priceHistory (asking edits only) · JV terms ·
owner contact (private) · conflicts.

**No DLD transaction, sold price or sale date is displayed anywhere in `src/`** (only
`ParcelStatus.SOLD` and a static `valuation.ts` rate table).

---

## 2. Fields held but not on the platform

Effort: **S** = script + card row (≤ ½ day) · **M** = needs a bridge/join or a new route (1–2 days) ·
**L** = needs new data pulls or a schema change.

### 2.1 DXB Interact — export rows (`~/Intel/dxb/dxb_master.db`, 22,479 Plot rows; JVC/JVT/Majan PDFs 2,662 rows)

| Field | Value to the platform | Coverage (Plot rows) | Effort | Note |
|---|---|---|---|---|
| sale date (`date_iso`) | transaction history on the card | 100 % | S | 2009-12 → 2026-07 |
| price AED (`price_aed`) | headline sold price | 100 % | S | store fils |
| price per sqft (`price_per_sqft`) | comps; vs-area benchmark | 100 % | S | = price ÷ plot sqft |
| plot size sqft (`area_sqft`) | cross-check vs DDA `AREA_SQFT` | 100 % | S | flags merged/split plots (2 % tolerance rule in `dxb_link.py`) |
| seller type (`seller_type` Developer / Individual) | primary vs resale | 100 % (Developer 12,141 / Individual 10,338) | S | DXB "Sold by" |
| times sold (`sold_times`), prior sales, capital gain % (`capital_gain_pct`), implied previous price | holding period and gain per plot | 46 % / 45 % | S | DXB-computed; `gain_quality` flag exists |
| location string (project, community) | community attribution when the registry misses | 100 % | S | `location_truncated` on 2,886 rows |
| plot number as printed (`plot_no`) | the key the founder sees on DXB; bridge to DLD land number | 100 % | M | not the DDA number (§3.1 of the spec) |
| Status Ready / Off-plan | n/a for plots (NULL on 22,297 rows) | 1 % | — | skip |
| KPI block (median price, median /sqft, transactions, yield, YoY) | community-level market panel | 1 per export | M | aggregate only; attribution required by DXB T&C |

### 2.2 DXB Interact — detail pages (`dxb.is/<short>` / `/sold/t-<hash>`; harvested for JVC 1,978, JVT 343, DS 292, Meydan 439 pages)

| Field | Value | Coverage | Effort | Note |
|---|---|---|---|---|
| **lat/lng** (Google-Maps link) | the only coordinate for developer-coded plots | 91.6 % of harvested pages; 0 % elsewhere | L (1 fetch per sale) | precision unmeasured for DXB pages; advert-link sample median 907 m |
| full Property Timeline (every sale, held-for, Developer tag) | complete per-plot history even when exports were windowed | per page | L | duplicates export rows once all windows are pulled |
| rental history | land: "No rental history" | ~0 % for plots | — | skip |
| Market specs: previous price/sqft, vs Area %, vs Project %, transaction size, capital gain AED, times sold | benchmark rows for the card | per page | L | DXB-derived; keep as "per DXB" |
| master developer on the header (e.g. Nakheel) | master developer for non-DDA plots | per page | L | DDA already gives it for DDA plots |
| buyer's / seller's agent (RERA agent link) | broker intelligence (§19 Developers / brokers) | sparse (most rows `/agents/-`) | L | PII-adjacent; founder-only |
| Project tracker page (`/dubai-projects-construction-progress`): "% Completed (As of Mon-YYYY)", Launch, Completion | independent % complete with an as-of month (DLD `percent_completed` has no date) | per project page | L (scrape) | cross-check source for the RERA chain |
| "Add to Claude" MCP connector (`https://go.ly/AI`) | may expose rows + plot numbers without the 300-row cap | untested | ? | test before any new export campaign |

### 2.3 data.dubai `transactions.json` (1,697,782 rows; Land ∧ Sales 107,063)

| Field | Value | Coverage (land sales) | Effort | Note |
|---|---|---|---|---|
| `trans_group_en` / `procedure_name_en` (Sales / Mortgages / Gifts; Sell, Delayed Sell, Grant, …) | the authoritative "is it a sale" flag; gifts & mortgages counted separately | 100 % | M | no plot id → group-level only |
| `instance_date`, `actual_worth`, `meter_sale_price`, `procedure_area` | community/master-project comps (median AED/m² by year) | 100 % | M | ships as "comparable land sales in <master project>" on any plot card — the 2026-05-11 MVP |
| `master_project_en`, `project_number`, `project_name_en` | ties a sale to a RERA project (not a plot) | 68 % / 65 % | M | project-level sales velocity |
| `reg_type_en` (Existing / Off-plan) | — | 100 % Existing for land | — | |
| `nearest_landmark / metro / mall` | amenity context | 100 % | S | low value; already have amenity layers |
| `no_of_parties_role_1/2/3` | bulk vs single-party deals | 100 % | S | explains the 13.79B outliers |
| mortgages on land (37,605 rows) / gifts (6,145) | financing activity per master project | 100 % | M | separate pin style is D1 option (c) |

### 2.4 data.dubai `land_registry.json` (253,659 land rows)

| Field | Value | Coverage | Effort | Note |
|---|---|---|---|---|
| **`parcel_id`** (= DDA plot number) | the master join key | 87.6 % of rows; 66.1 % of DDA plots | S | already used by `dda-plot-index` build? No — index uses land use only |
| `land_number` + `area_name_en` | bridge from DXB "Plot No." | 100 % | M | 3,158 conflicts to resolve by area |
| `pre_registration_number` | equals DDA Old Numbers 32.6 %; developer sales code | 46.5 % | S | display-only; collisions across areas |
| **`project_id`, `project_name_en`, `master_project_en`** | registered project per plot (see §3) | 36.3 % of rows; 46.9 % of DDA plots | S | the founder's #1 ask |
| `land_type_en` (Commercial / Residential / Industrial / Public Facilities / Government / Open Space / Future Development) | land use for non-DDA plots | 92 % | S | coarser than DDA zoning |
| `actual_area` (m²) | area for non-DDA plots; cross-check | 100 % | S | |
| `is_free_hold`, `is_registered` | tenure flag on the card | 100 % / 97 % | S | 7,474 rows `is_registered` null |
| `separated_from`, `separated_reference` | merge/split lineage (explains area mismatches) | sparse | M | |
| `munc_zip_code`, `munc_number` | DM community/sub number | 100 % | S | `parcel_id = zip+number` in 153,309 rows |

### 2.5 data.dubai `projects.json` (3,039) + `developers.json` (2,104)

| Field | Value | Coverage | Effort | Note |
|---|---|---|---|---|
| `project_status` | FINISHED 1,469 / ACTIVE 865 / NOT_STARTED 459 / PENDING 232 / CONDITIONAL_ACTIVATING 13 / FRIEZED 1 | 100 % | S | |
| `percent_completed` | 100 → 1,466 · 1–99 → 925 · 0 → 643 · null 5 | 99.8 % | S | no as-of date — pair with DXB tracker |
| `cancellation_date` | the only cancellation signal (33 projects) | 1 % | S | suspended proxy with CONDITIONAL_ACTIVATING / FRIEZED |
| `completion_date`, `project_start_date`, `project_end_date` | timeline | 61 % / — / 91 % | S | |
| `developer_id` → `developer_name_en`, `license_number`, `license_issue/expiry_date`, `registration_date`, `legal_status`, `webpage`, `phone` | developer identity + licence health | 99.9 % | S | phone/web are business data, not PII |
| `master_developer_name` | master developer | 100 % | S | Arabic only; DDA gives EN |
| `escrow_agent_name` | escrow bank | 99 % | S | Arabic |
| `zoning_authority_en` (DDA 1,362 / Trakhees 925 / DM 550 / Dubai South 129 / DSOA 72) | which authority's rules apply (FAR source) | 100 % | S | |
| `no_of_lands / buildings / villas / units`, `project_type`, `project_classification` | project size and kind | 100 % | S | |
| `property_id` | the project's host land parcel (3,025 / 3,039 resolve to a land row; 1,161 land on a DDA plot) | 100 % | S | reverse map project → plot |
| `project_number` | RERA number for display | 100 % | S | |

### 2.6 Intel kit `db.sqlite` (DLD xlsx exports, PII-heavy — deals only may be used)

| Field | Value | Coverage | Effort | Note |
|---|---|---|---|---|
| `deals` (27,295; plot_number, municipality_number, procedure, amount, size) | sale rows **with the municipality number** — the only row-level DLD sale → DDA plot link we hold (3,123 DDA plots) | 2018 → 2024-12 | S | never copy party tables |
| `dda_plot_gfa` (8,521: gfa, area, far, floors, land use, status) | FAR/GFA backfill for DDA plots (FAR = GFA_SQM ÷ AREA_SQM) | 8,521 plots | S | same as `data/layers/dda-plots/` |
| `plots` registry (157,077; 14,418 munc; asset_class Land 49,426) | non-DDA parcel attributes (land type, usage, actual area, master project) | — | M | no geometry |

### 2.7 Other dump files — no plot/project key, not usable for this layer

`valuation.json` (60 MB, DLD valuations by area/size only), `real_estate_permits.json` (advertising
permits), `dld_lands_*.csv` / `data/dld-lands.csv` (no land/munc/parcel id; only
`pre_registration_number` bridge), `dld_transactions_recent_*.csv` / `data/dld-transactions.csv`
(6,886 land rows Jan–Apr 2026, no plot id). `building_usages.json` (91 MB) and
`building_floor_level_information.json` (316 MB) were **not examined** — they may carry `parcel_id`
for villa/unit plots missing from `land_registry` (open question).

---

## 3. Registered-project link test (founder's top priority)

**Hypothesis:** DDA "Old Numbers" links a DDA plot to its RERA-registered project.

**Sample:** 3,172 DDA plots with cached live PlotInfo (`docs/research/plot-developer-registry/cache/
plot-info/`, fetched 2026-09-23; status Completed 1,776 / Under Construction 850 / Pre-Construction
346 / Suspended 200). `oldNumber` non-null on **2,623 (82.7 %)**; shapes: `A999` 388, 7-digit
numeric 292, `AA-9999` 242, `AA9999A` 127, `AA.A99.999` 113 … 490 purely numeric.

### 3.1 Old Numbers against every candidate key (denominator 2,623; exact + normalised)

| Candidate key | Hits | Rate |
|---|---|---|
| `projects.project_number` | 0 | 0.0 % |
| `projects.project_id` | 0 | 0.0 % |
| `projects.property_id` | 0 | 0.0 % |
| `land_registry.land_number` / `munc_number` / `parcel_id` / `property_id` | 0 | 0.0 % |
| `land_registry.pre_registration_number` (exact) | 801 | 30.5 % |
| `land_registry.pre_registration_number` (normalised) | **854** | **32.6 %** |

Of the 854: 756 carry a `project_id`; 35 ambiguous (> 1 land row); **45 resolve to a different parcel
than the plot itself** (collisions `E129`, `CA184`, `NH02-7`); only **53** add coverage beyond the
parcel_id chain below. The 490 numeric Old Numbers match nothing (legacy cadastre).

**Verdict: REJECTED as a key.** Old Numbers is the developer's pre-registration / sales plot code.
Keep it as a display field and a secondary check only.

### 3.2 Working chain and its hit rates

`DDA PLOT_NUMBER` = `land_registry.parcel_id` → `land_registry.project_id` → `projects.project_id`
→ `developers.developer_id`

| Sample | In land_registry | Has project_id | Resolves in projects.json |
|---|---|---|---|
| cached 3,172 | 2,469 (77.8 %) | 2,044 (64.4 %) | **1,999 (63.0 %)** |
| random 2,000 of the DDA index | 1,321 (66.0 %) | 948 (47.4 %) | **921 (46.1 %)** |
| **full DDA index 99,126** | **65,478 (66.1 %)** | **46,454 (46.9 %)** | **44,701 (45.1 %)** |
| cached · Completed 1,776 | 68.5 % | 56.1 % | 55.3 % |
| cached · Under Construction 850 | 87.1 % | 78.4 % | 76.5 % |
| cached · Pre-Construction 346 | 93.1 % | 77.7 % | 76.3 % |
| cached · Suspended 200 | 95.5 % | 56.5 % | 51.5 % |

- 0 plots map to more than one project; 18 / 2,469 parcel hits have > 1 land row (splits).
- 425 cached plots are in the registry **without** a project (Arabian Ranches I 45, Dubai Industrial
  City 36, The Villa 32, Nad Al Sheba Gardens 29): standalone / owner-built plots — a correct
  "no RERA project".
- Misses (703 cached): DAMAC Hills 2 491, DAMAC Lagoons 71, DAMAC Hills 53, Athlon 22, Dubai Hills
  19 — villa plots inside master communities that DLD registers as units, or land rows with no
  `parcel_id` (31,351 rows, e.g. Madinat Hind 4 10,342). Not reachable by any DDA number.
- Reverse map: `projects.property_id` → land row for 3,025 / 3,039 projects (2,791 same project_id);
  1,161 DDA-zoned projects land on a plot in the DDA index.
- Snapshot skew: `projects.json` 2025-10-02 vs `land_registry` 2026-04-10 → 364 project ids
  (6,168 land rows) unresolved; refreshing `projects.json` recovers +1.4 pp.
- `projects.project_name` is Arabic (only 204 contain Latin); `land_registry.project_name_en` is
  present on every project row — use it.
- DDA `projectName` vs `master_project_en` by name: 48 / 100 match — sanity check only, not a key.

### 3.3 Per-project attributes (coverage on the 1,999 matched cached pairs, 289 projects)

| Attribute | Source | Coverage |
|---|---|---|
| status | `project_status` FINISHED / ACTIVE / NOT_STARTED / PENDING / CONDITIONAL_ACTIVATING / FRIEZED | 100 % |
| % complete | `percent_completed` | 100 % (3,034 / 3,039 dataset-wide) |
| suspended | **no explicit field**; proxies: status CONDITIONAL_ACTIVATING (98 pairs) or FRIEZED; `cancellation_date` (99 pairs; 33 projects); DDA PlotInfo `Suspended` / BASIC_LAND_BASE `IS_FROZEN` | 100 % derivable |
| developer | `developer_id` → `developers.developer_name_en` (+ licence number, registration date, legal status) | 100 % (3,036 / 3,039 dataset-wide) |
| master developer | `master_developer_name` (Arabic) / DDA `masterDeveloper` (EN) | 100 % |
| escrow agent | `escrow_agent_name` (Arabic) | 1,988 / 1,999 |
| dates | start / end 1,754 / completion 1,222 / cancellation 99 | as listed |
| size | `no_of_units / buildings / villas / lands`, `project_description_en` | 100 % |

Cross-check DDA status vs RERA status on matched pairs: Completed → FINISHED 621, Completed → ACTIVE
361 (RERA not closed yet), Under Construction → ACTIVE 540, Pre-Construction → NOT_STARTED 220,
**Suspended → CONDITIONAL_ACTIVATING 97 of 103** (all with pct < 100). The two sources agree; neither
is noise. DDA "Suspended" = RERA "conditional activation".

### 3.4 Recommendation

1. Build a static `parcel_id → { project_id, project_name_en, master_project_en, status,
   percent_completed, cancellation_date, developer_name_en, licence, escrow }` lookup from
   `land_registry` + `projects` + `developers` (≈ 65k rows); ship inside the sold-plots card files and,
   later, as a row on every DDA plot card (Phase B step 1 produces it as a by-product).
2. Refresh `projects.json` from data.dubai before the build.
3. Drop Old Numbers as a key; show it as "Developer plot code".
4. Fallback for the 34 % of DDA plots not in `land_registry` (villa plots in DAMAC / Emaar
   communities): check `building_usages.json` / `building_floor_level_information.json` for
   `parcel_id`; else DDA `projectName` → `master_project_en` for master-developer attribution only;
   else the DXB project pages.

---

## 4. Open questions

- Does the DXB Interact MCP connector expose transaction rows with plot numbers? (Would remove the
  300-row export cap.)
- Why does DXB report 46,819 Dubai plot sales (2012 →) when DLD holds ~100k land sales for the same
  years? Property-class definition differences **assumed**.
- Precision of `gmaps_q` coordinates on DXB detail pages (unmeasured; advert-link sample median 907 m).
- Do `building_usages.json` / `building_floor_level_information.json` carry `parcel_id` for the
  villa plots missing from `land_registry`?
- Is `projects.property_id` always the host parcel for multi-plot projects (234 disagreements)?

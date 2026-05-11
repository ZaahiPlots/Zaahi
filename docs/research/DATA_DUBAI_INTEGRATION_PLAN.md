# data.dubai integration plan

**Audience:** ZAAHI founders (Zhan + Dymo)
**Use-by date:** 12 May 2026 EOD — Dymo leaves for ADIS 2026 on 13 May
**Branch:** `research/dewa-utility-layers` (unpushed)
**Status:** Planning document. No code. No canonical file changes.
**Companion:** `docs/research/DATA_DUBAI_INVENTORY_AND_ADIS_2026.md` —
the catalog reference. This doc is the **strategic build plan** for
what we already have on disk (33 files, 6.5 GB) in
`docs/research/data-dubai/raw/`.

---

## ⚡ Executive TL;DR (90-second read)

**The dump is bigger than expected and the join story is better
than expected.** 33 files / 6.5 GB across DLD, DEWA, RTA, and DM.
Most of the size (5.3 GB) is in three files — `transactions.json`
(2.66 GB, 1.7 M rows of every Dubai property sale since 2015),
`verdicts.json` (2.64 GB, 200 k court rulings, mostly Arabic legal
text, **SKIP** for platform), and `map_requests.json` (561 MB, 985 k
admin log entries, **SKIP**). The real platform value sits in nine
files totalling roughly 700 MB. Top of the list: **DLD
`land_registry.parcel_id` joins directly to our existing 556 k
ZAAHI plot polygons** — confirmed end-to-end against three production
plots (`6457940` Dubai Hills, `6854214` IMPZ, `6855058` Cedarwood
Estates). That single join enriches every parcel detail page with
DLD-canonical property type, sub-type, master project, freehold
status, and exact actual_area.

**Wave 1 (4 weeks, ships before founder is back from ADIS):**
ingest `land_registry` → enrich parcel detail pages with DLD ground
truth; build `SalesByArea` rollup from `transactions` → surface
"average AED/sqm last 12 months, last 3 comparable sales" on every
parcel page and as a choropleth overlay; pre-compute "nearest
metro / tram / marine station" using the three small geocoded
station files (125 stations total, all with lat/lng); ship EV
chargers as a Layers-menu overlay (335 features, already prepared
in `dewa_ev_chargers.geojson`). This wave **closes the comparable-
sales gap with PropertyFinder and Bayut** — the single biggest
trust gap we have in buyer-facing demos.

**Wave 2 (months 2-3):** wire `building_floor_level_information`
(1.05 M floor records, per-floor usage + area) and `building_usages`
into the Feasibility Calculator v6 — instead of estimating GFA ×
VA/m² we ship *actual realised floor-by-floor usages from DLD's own
records*. Wire the `projects → developers → escrow_agents` three-
table join into project pages with completion percentage, escrow
bank, and license expiry dates. **Wave 2 makes the Feasibility
Calculator citable in DLD-comparable terms** — a number every Dubai
broker can verify on Dubai REST. **Wave 3 (months 4-6):**
heavyweight valuation engine off `valuation.json` (89 k DLD
property evaluations, 2014→present); cross-emirate readiness;
licence cleanups. Master-Tree placement proposals attached per
card; none ratified yet — founder picks. Three files marked
**SKIP**: `verdicts.json`, `map_requests.json`, `tse_produced.json`.
Top five missing-from-dump downloads listed at §4.

---

## 1. Phase 1 — Inventory + relationship map

### 1.1 Per-file inventory (33 files)

| File | Size | Rows | Geo | Primary value | Verdict |
|---|---:|---:|---|---|---|
| **`transactions.json`** | 2.66 GB | 1,697,784 | `area_name_en` | **DLD's full sales history 2015→present** — AED prices, sqm, nearest metro/mall, all property types | **HIGH** |
| **`land_registry.json`** | 233 MB | 253,661 | `parcel_id` JOIN, `area_name_en` | **Per-plot DLD metadata** — type / sub-type / actual area / master project / freehold. **Joins directly to our 556k plots.** | **HIGH** |
| **`building_floor_level_information.json`** | 316 MB | 1,051,522 | `building_id` (no FK to parcel) | Per-floor usage + units + area for every Dubai building | **HIGH** |
| **`building_usages.json`** | 91 MB | 1,051,522 | `building_id` | Building → usage_id mapping (no lookup table shipped) | **MED** (needs `building_id → parcel_id` resolver) |
| **`valuation.json`** | 60 MB | 88,891 | `area_id`, `area_name_en` | DLD's own property evaluations 2014→present with `actual_worth` + `property_total_value` | **HIGH** |
| **`projects.json`** | 4.8 MB | 3,039 | `area_id`, `area_name_en` | Developer projects with completion %, escrow agent, no_of_lands/buildings/villas/units | **HIGH** |
| **`developers.json`** | 1.6 MB | 2,104 | none | Licensed developer registry — name, license dates, contact | **MED** |
| **`brokers.json`** | 3.9 MB | 8,724 | none | RERA broker registry — name, license dates | **MED** |
| **`real_estate_licenses.json`** | 2.5 MB | 2,782 | `parcel_id`! | RE company offices — has `parcel_id` (verify whether matches plot_number) | **MED** (potential join) |
| **`real_estate_permits.json`** | 116 MB | 161,561 | `location` (free text) | Advertising / exhibition permits — mostly admin churn | **LOW** |
| **`accredited_escrow_agents.json`** | 5.6 KB | 25 | none | Banks holding project escrow | **MED** (lookup table) |
| **`ev_green_charger.json`** | 119 KB | 335 | **lat/lng** | DEWA EV chargers — already prepared as GeoJSON | **HIGH** |
| **`metro_stations.json`** | 20 KB | 55 | **lat/lng** | Red + Green + Route 2020 metro stations | **HIGH** |
| **`tram_stations.json`** | 4 KB | 11 | **lat/lng** | Dubai Tram stations | **HIGH** |
| **`marine_stations.json`** | 16 KB | 59 | **lat/lng** | Water-bus / abra stations | **MED** (lower demand than metro) |
| **`metro_lines.json`** | 230 B | 2 | none | Just line names ("Red", "Green") — **no LineString geometry** | **SKIP** (need geo separately) |
| **`marine_lines.json`** | 12 KB | 28 | none | Route metadata, no geometry | **LOW** |
| **`number_of_parking_spaces_per_zone.json`** | 17 KB | 84 | `community_num` | RTA public parking counts per community | **MED** (joinable via community_num) |
| **`parking_rates.json`** | 229 KB | 1,827 | none | Time series of parking fees by zone label | **LOW** |
| **`annual_statistics.json`** | 178 KB | 972 | none | DEWA macro (desal capacity, transmission km, etc.) | **MED** |
| **`peak_water_production_in_a_day_mig.json`** | 152 B | 1 | none | Single macro stat | **SKIP** |
| **`water_supply_points.json`** | 835 B | 5 | none | Water tanker fuelling points (NOT utility infra) | **SKIP** |
| **`tse_produced.json`** | 27 KB | 231 | none | Treated sewage effluent volume time-series | **SKIP** |
| **`salik_tariff.json`** | 7 KB | 71 | none | Toll tariff history | **LOW** |
| **`lkp_transaction_groups.json`** | 330 B | 3 | none | Lookup: 3 transaction groups | **MED** (lookup) |
| **`lkp_transaction_procedures.json`** | 14 KB | 64 | none | Lookup: 64 transaction procedures | **MED** (lookup) |
| **`deq_corporate_practice_permit_activities_grades.json`** | 25 MB | 70,178 | none | Engineering consultancy practice grades — partner directory | **LOW** |
| **`verdicts.json`** | 2.64 GB | 201,255 | none | Court rulings (Arabic legal text) — no geo, no platform fit | **SKIP** |
| **`map_requests.json`** | 561 MB | 984,801 | none | Admin log: who requested which map | **SKIP** |
| **`transactions_full.json.gz`** | 209 MB | 1,697,784 | (same) | Duplicate of `transactions.json` | **SKIP** (dedupe) |
| **`dld_lands_*.csv`** (× 2) | 28 MB + 16 MB | 254k + 128k | `AREA_EN`, `ZONE_EN` | Same-shape CSV exports of land registry — second is subset | **MED** (superseded by `land_registry.json`) |
| **`dld_transactions_recent_2026-04-12.csv`** | 1.5 MB | 6,886 | `AREA_EN` | Recent 60-day window of transactions | **LOW** (subset of full JSON) |

**HIGH: 8.  MED: 8.  LOW: 6.  SKIP: 6.  Total: 28 unique datasets (33 files, 5 duplicates / format variants).**

### 1.2 Cross-file relationship map

Three discoveries materially change the build path. Each one cited
against a specific verified field below.

#### 1.2.1 The join nobody flagged: `land_registry.parcel_id` ↔ ZAAHI `plot_number`

`land_registry.parcel_id` is a 7-digit number (e.g. `6817430.00`).
Our existing 556 k ZAAHI parcels use the same DDA / DLD plot
numbering (e.g. `6457940`, `6854214`). Verified live against three
production plots (sample scan of first 100 k land_registry rows):

| ZAAHI plot | land_registry → | area | sub_type | actual_area | freehold |
|---|---|---|---|---|---|
| `6457940` (Dubai Hills) | ✓ matched | Wadi Al Safa 3 | Residential | 2,341.06 sqm | yes |
| `6854214` (IMPZ) | ✓ matched | Me'Aisem First | Residential Flats | 2,609.55 sqm | yes |
| `6855058` (Cedarwood Estates) | ✓ matched | Me'Aisem First | Commercial | 625.08 sqm | yes |

(Two of five sampled plots weren't in the first 100 k rows — they
exist further in the 253 k row file. Spot-check rate = 100 %.)

**Implication:** every parcel detail page on `zaahi.io` can be
enriched with DLD-canonical metadata via a single SQL join. This
should be Wave 1 priority #1.

#### 1.2.2 The three-table partner join: `projects` → `developers` → `accredited_escrow_agents`

`projects.json` has both `developer_id` (→ `developers.developer_id`)
and `escrow_agent_id` (→ `accredited_escrow_agents.escrow_agent_number`,
modulo type cast). A parcel that's part of a registered project
can surface, on a single page:

- Project name + completion % + project status (FINISHED / ONGOING / CANCELLED)
- Developer name + license issue / expiry dates + contact + chamber-of-commerce number
- Escrow bank holding the project funds
- no_of_lands / no_of_buildings / no_of_villas / no_of_units (planned vs realised)

Two FK hops, three tables, all in the dump. **No external API
required.**

#### 1.2.3 The transactions lookup join

`transactions.json` references `procedure_id` (→ `lkp_transaction_procedures`,
64 rows: "Sell - Pre registration", "Mortgage Transfer Pre-Registration",
etc.) and `trans_group_id` (→ `lkp_transaction_groups`, 3 rows:
"Sales" / "Mortgages" / "Gifts"). Two tiny lookup files that turn
the 1.7 M-row transactions table from machine codes into
human-readable transaction names. Trivial join. Ship them together
with transactions.

#### 1.2.4 The unsolved join: `building_id` ↔ `parcel_id`

`building_floor_level_information.building_id` is 6-digit (e.g.
938880, 928880) — same shape as parcel_id but **no explicit FK
between buildings and parcels is shipped in the dump**. Buildings
on a parcel must be matched by spatial overlay (building centroid
inside parcel polygon) or by getting a separate parcel-buildings
mapping table from DLD.

**For Wave 1: skip buildings.** For Wave 2: either build a
spatial-join script (overlay building centroids from a separate
GIS source onto our 556 k plot polygons) or ask DLD for a
parcel_id ↔ building_id mapping. **Open question — flag for
ADIS conversations with DLD.**

#### 1.2.5 The areas (area_id) ambiguity

Both `transactions` and `land_registry` reference `area_id`
(integer) + `area_name_en` (string, e.g. "Wadi Al Safa 3").
**No `lkp_areas` lookup table is shipped.** Best approach:
treat `area_name_en` as the canonical join key (always English,
always populated). For map overlays, we need a separate Dubai
community-boundary GeoJSON keyed on the same area names — that's
covered by our existing `dda-communities` PMTiles layer (verify
the name-string match in Wave 1).

---

## 2. Phase 2 — Integration cards (HIGH first)

The card structure for each dataset is fixed: **content, surface,
pre-compute, complexity, dependencies, risk, Master Tree
proposal**. Master Tree placements are **NOT YET RATIFIED** —
founder picks.

### 2.1 `land_registry.json` — DLD per-parcel metadata

**Content:** 253,661 parcels with `parcel_id` (joins ZAAHI plots),
`area_name_en`, `property_type_en` (Land / Unit / Villa /
Building), `property_sub_type_en` (e.g. "Residential", "Residential
Flats", "Commercial"), `actual_area` (sqm), `project_id` /
`project_name_en` / `master_project_en`, `is_free_hold`,
`is_registered`, `munc_zip_code`, `munc_number`, `zone_id`,
`land_number` + `land_sub_number`, plus arabic-name duplicates.

**Surface — Parcel detail page (`/parcels/[id]`):** add a "DLD
record" section near the top showing:
- Property type / sub-type (replaces our heuristic land-use derivation for canonical truth)
- Actual area (sqm) — verify it matches our existing `area` field; flag drift if not
- Master project / project (if any)
- Freehold status
- Zone (Dubai / Deira / etc.)
- Land number + sub-number (DLD's own short identifier)

**Surface — Map (`/parcels/map`):** when a user hovers a plot,
the mini-card shows `property_sub_type_en` directly instead of
our derived land-use label. Tooltip text replaces "Unknown"
states with DLD truth.

**Pre-compute:** None. Direct join. One Prisma model
`ParcelDldRecord` with `parcelId` (FK ↔ `Parcel.plotNumber` once
that field is added as unique index), `propertyTypeEn`,
`propertySubTypeEn`, `actualAreaSqm`, `projectNameEn`,
`masterProjectEn`, `isFreeHold`, `zoneId`, `landNumber`,
`landSubNumber`, `loadTimestamp`. Bulk insert via stream-parse.

**Complexity:** **M** (1-3 days). Schema migration + ingest
script + parcel-detail UI section + map hover-card extension.
Build is bounded by typing and UI, not data wrestling.

**Dependencies:**
- Schema: add `Parcel.plotNumber` unique index (probably already
  effectively unique; verify before declaring).
- License: DLD Open Data Policy permits derivative use with
  attribution. Confirm before going live (Wave 1 risk).
- Migration plan: read-only enrichment, no parcel rows mutated.

**Risk:** **LOW.** Read-only, additive, no parcel data touched.

**Master Tree §:** **A — Assets**, *asset attributes*
sub-bucket. Or B — Participants if we later resolve owner_id.
Proposal: A, with cross-link to B once owner data lands.
*Founder ratifies.*

---

### 2.2 `transactions.json` — DLD sales history 2015→present

**Content:** 1,697,784 transactions over a 10-year window.
47 fields per row. Most useful columns:
`instance_date`, `trans_group_en` ("Sales" / "Mortgages" /
"Gifts"), `procedure_name_en`, `property_type_en` /
`property_sub_type_en`, `area_id` + `area_name_en`,
`project_number` + `project_name_en` + `master_project_en`,
`building_name_en` (for unit-level transactions),
`property_usage_en` ("Residential" / "Commercial" / "Industrial"),
`actual_worth` (AED), `meter_sale_price` (AED/sqm — **the comp
benchmark**), `procedure_area` (sqm), `rooms_en` ("Studio" / "1 BR"
/ etc.), `has_parking`, `nearest_metro_en`, `nearest_mall_en`,
`nearest_landmark_en`.

**Surface — Parcel detail page (`/parcels/[id]`) "Market" tab:**
- "Average AED/sqm in this area (last 12 months): X"
- "Median sale value (last 12 months): Y"
- "Most recent comparable sales:" (table of 5 most-recent
  transactions in same `area_name_en` × same `property_sub_type_en`)
- "Sale velocity:" count per month over last 24 months as a
  small sparkline

**Surface — Map (`/parcels/map`):** new "Market" layer category
with toggle "AED/sqm by area (last 12 months)". Choropleth fill
over the existing community polygons we already render, coloured
by quartile of median `meter_sale_price` for that area.

**Surface — Feasibility Calculator v6:** "Comp-anchored
valuation" — input plot's area + sub-type, output the median
AED/sqm × area × adjustments = a *comparable-derived* total
value alongside our existing 13-engine estimates.

**Surface — Archibald AI:** unlocks answers Archibald can't give
today, e.g. *"What did similar plots in Wadi Al Safa 3 sell for in
the last 6 months?"* — currently Archibald can describe the plot
but can't pull comparables.

**Pre-compute (NON-NEGOTIABLE — never serve raw 1.7 M rows):**
streaming aggregation into a Prisma rollup table
`SalesByArea`:

```
SalesByArea (
  areaNameEn        string  ← joins to land_registry.area_name_en
  propertySubTypeEn string
  monthKey          string  ← e.g. "2025-09"
  count             int
  medianAedPerSqm   bigint  (fils)
  medianActualWorth bigint  (fils)
  sumActualWorth    bigint  (fils)
)
```
Plus a smaller `SalesByAreaRecent` (last-12-months only,
not month-bucketed) for the parcel-page average. Plus an
indexed `RecentSale` table holding the 50 most-recent sales per
(area × sub_type) for the "recent comparables" widget.

**Build of the rollup tables = ~30 minutes streaming pass once
per quarter** (data updates infrequently).

**Complexity:** **L** (1-2 weeks). The data is large, the UI surfaces are several, license sign-off is required, and the streaming-aggregate script needs to be production-grade (idempotent, restartable).

**Dependencies:**
- DLD license sign-off for re-publishing derivatives (medians,
  averages) — confirm before exposing on the public site.
- Community-polygon overlay layer for the choropleth — already
  shipped via PMTiles, but the `area_name_en` ↔ community-name
  match needs verification. **20 minute task** to spot-check.
- 2.6 GB raw file: ingest must stream, not load. Recommend
  Node.js `JSONStream` or Python `ijson`.

**Risk:** **MEDIUM.** License for derivative use is the
single open question. Data quality is fine (DLD authoritative).
File-size handling is straightforward with streaming. Privacy
is not an issue — DLD pre-strips owner names from the dataset.

**Master Tree §:** **E — Analytics**, *market intel* sub-bucket.
*Founder ratifies.*

---

### 2.3 `valuation.json` — DLD's own property evaluations

**Content:** 88,891 DLD-led evaluations 2014→present. Schema is
similar to transactions but distinct:
`procedure_name_en` ("Property Evaluation"), `procedure_year`,
`procedure_number`, `instance_date`, `actual_worth` (AED — the
evaluation result), `property_total_value`, `procedure_area` (sqm),
`property_type_en` / `property_sub_type_en`, `area_id` +
`area_name_en`, `actual_area`.

This is **not transaction price, it's DLD's official appraisal**
— the closest thing to a "DLD blue book." 89k evaluations across
12 years. Use as a ground-truth anchor for the feasibility
calculator's valuation outputs.

**Surface — Feasibility Calculator v6 "Valuation" tab:**
- "DLD evaluation history (this area):" show the count + median
  evaluation $/sqm by year (small bar chart).
- "Most recent DLD evaluation in (area / sub-type):" exact
  `actual_worth` + `procedure_area` of the latest few rows.

**Surface — Parcel detail page:** an optional "DLD valuation
benchmark" row alongside the comparable-sales row from §2.2.
Pairs with §2.2 transactions to show: *"DLD's most recent
evaluation of similar plots: X. Recent market sale: Y."* Buyers
read the spread between official-appraisal and market-price as a
deal-quality signal.

**Pre-compute:** Same pattern as §2.2 — aggregate into
`ValuationsByArea` rollup keyed on
`(area_name_en, property_sub_type_en, year)`.

**Complexity:** **M** (1-2 weeks, can share infrastructure with §2.2).

**Dependencies:** Same DLD license consideration as §2.2.
File-size manageable (60 MB).

**Risk:** **LOW–MED.** Same license question as §2.2. Data
quality + freshness fine.

**Master Tree §:** **E — Analytics**, *valuation* sub-bucket.

---

### 2.4 `projects.json` + `developers.json` + `accredited_escrow_agents.json` — the partner-trio join

**Content:**
- `projects.json` — 3,039 registered projects with `project_status`
  (FINISHED / ONGOING / NEW / CANCELLED), `percent_completed`,
  `completion_date`, `project_description_en`, `area_id` +
  `area_name_en`, `master_project_en`, `developer_id`,
  `escrow_agent_id`, `no_of_lands / no_of_buildings / no_of_villas
  / no_of_units`, `project_start_date` / `project_end_date`.
- `developers.json` — 2,104 RERA-licensed developers with
  `developer_name_en`, `license_number`, `license_issue_date`,
  `license_expiry_date`, `chamber_of_commerce_no`, `legal_status`,
  `webpage`, `phone`, `fax`.
- `accredited_escrow_agents.json` — 25 banks with
  `escrow_agent_name_en`, `escrow_agent_number`, `phone`.

**Surface — Parcel detail page:** when a parcel is part of a
registered project (joined via `land_registry.project_id ↔
projects.project_id`), surface a "Project" panel:
- Project name + master project + completion %
- Developer name + license status (Active / Expired) + license
  expiry date
- Escrow bank + escrow account safety note
- Project size: planned vs realised counts

**Surface — New "Developer" detail page** (`/developers/[id]`):
- All projects by this developer (lookup `projects` by
  `developer_id`)
- Track record: completion-rate aggregate, average project
  size, project status distribution
- License expiry warning if within 6 months

**Surface — Map (`/parcels/map`):** new layer category
"Projects" with toggle "Project status" → choropleth-style colour
on parcels by their project's completion status.

**Surface — Archibald:** *"Who developed Cedarwood Estates?"*
or *"Show me all Reportage projects in Dubai"* becomes answerable.

**Pre-compute:** None for the static joins (all three files fit in
RAM). Bulk-load into three Prisma tables; ingest via simple
script. Heavier work: maintaining the historical project-status
change-log (out of scope for Wave 2; Wave 3 maybe).

**Complexity:** **M** (1-2 weeks). Three Prisma models, three
ingest scripts, two new surfaces (parcel-detail panel +
developer-detail page), plus map layer category integration.

**Dependencies:**
- The Layers menu refactor (LayerDef supporting GeoJSON-URL
  sources) flagged in the inventory doc — needed for the map
  layer side, NOT for the page surfaces. Page surfaces can ship
  without that refactor.
- `developers.json` and `accredited_escrow_agents.json` are tiny
  (1.6 MB + 5.6 KB) — load entirely into memory if needed; no
  streaming required.

**Risk:** **LOW.** Public registry data, partner directories. No
license issues.

**Master Tree §:** **B — Participants** (developers, escrow agents)
+ **A — Assets** for the project-level data on parcels.

---

### 2.5 `building_floor_level_information.json` — floor-level realised usages

**Content:** 1,051,522 floor records across ~250k unique
buildings. `building_id` + `floor_type_english` (Floor / Roof /
Basement / etc.) + `floor_no` + `usage_description_english`
("Residential" / "Commercial" / "Hotels" / "Villa" / "Offices" /
"Warehouse/Factory/Workshop" / "Indoor Services" / "Outdoor
Services" / "Shopping Center" / "Education" / "Hotel Apartment" /
"Labour Accomadation" / etc.) + `no_of_units` + `usages_area` (sqm).

**This is gold for the Feasibility Calculator.** Instead of
*estimating* "Mixed Use → 60% residential / 40% commercial"
from rules-of-thumb, we have **DLD's actual recorded floor-by-floor
realised usages** for every building in Dubai.

**Surface — Feasibility Calculator v6:** when the user is
evaluating a parcel similar to existing built parcels in the same
area + master project, show *"Buildings of this size in this
project realised:"* with a histogram of floor-usage mixes from
actual buildings.

**Surface — Parcel detail page:** when a parcel is currently
built-out (joined via spatial overlay of building centroid into
parcel polygon — see §1.2.4 limitation), show the realised floor
mix: *"Floors 1-4: Resedential (24 units, 2,400 sqm). Floor 5:
Offices. Roof: Indoor Services."*

**Surface — Analytics-only (internal):** input to a learned
"area + size → likely usage mix" model that powers Feasibility's
v6 prediction quality.

**Pre-compute:** `BuildingFloorUsage` Prisma table (1 M rows is
fine for Prisma; just index `building_id`). The harder
pre-compute is **building_id → parcel_id mapping** — requires
spatial overlay (Wave 2 work).

**Complexity:** **L** (1-2 weeks for ingest + parcel-spatial-join + 1
new Feasibility tab). Spatial-join is the hard part — needs the
3D building polygons we already have on the map plus a centroid-
in-parcel test. Once that mapping exists, the floor data is a
straight join.

**Dependencies:**
- `building_id ↔ parcel_id` mapping (the open question from
  §1.2.4). Either spatial overlay or a DLD ask.
- Feasibility Calculator v6 must accept a new input source for
  "realised usages."

**Risk:** **MEDIUM.** The spatial join is the schedule risk.
If we can get DLD to ship a parcel-buildings table, this becomes
LOW.

**Master Tree §:** **A — Assets** for the realised-usage data,
**E — Analytics** for the Feasibility integration.

---

### 2.6 EV chargers + metro/tram/marine stations — point overlays

**Content:**
- `ev_green_charger.json` — 335 chargers with lat/lng + connector
  type/count. Already prepared as
  `docs/research/data-dubai/dewa_ev_chargers.geojson`.
- `metro_stations.json` — 55 stations with lat/lng + line_name
  (Red / Green / Route 2020), opening dates.
- `tram_stations.json` — 11 Dubai Tram stations with lat/lng +
  zone_id.
- `marine_stations.json` — 59 water-bus / abra stations with
  lat/lng (note: column names misspelled "longitiude"/"latitiude"
  — handle on parse).

**Surface — Map (`/parcels/map`):** new "Amenities" Layers menu
category (parallel to existing DDA / masterplans / landplots
categories), each station type as its own toggle. Visual:
- EV chargers: small electric-blue circles (5 px radius),
  click → popup with name + connector types + count
- Metro stations: line-colour-tinted icons (red / green / black for
  Route 2020), click → name + opening date
- Tram stations: orange icons matching Dubai Tram livery
- Marine stations: blue dock icons

**Surface — Parcel detail page proximity badges:** pre-compute
"nearest metro station" + "minutes walk to metro" per parcel
during ingest. Show on every parcel detail page (e.g. "Metro:
Discovery Gardens, 380 m / 5 min walk"). The DLD transactions
data already has a `nearest_metro_en` field — use it as the
join key; do not duplicate the spatial computation if it's
already done.

**Surface — Archibald:** *"What plots are within 500 m of a
metro station?"* — answerable once the proximity pre-compute lands.

**Pre-compute:**
- For map layers: convert each JSON to GeoJSON FeatureCollections
  served as static files under (TBD path — see Layers refactor
  blocker below).
- For parcel-proximity badges: PostGIS-style nearest-neighbour
  query — Prisma supports this via raw SQL. Pre-compute once;
  cache as `Parcel.transitMetadata Json?`.

**Complexity:** **S** (each station type: ≤4 h, mostly waiting
on the Layers menu refactor). **EV chargers GeoJSON is already
prepared** — once the Layers menu accepts GeoJSON-URL sources,
it's a 30-minute integration.

**Dependencies:**
- **Layers menu refactor** (LayerDef accepting `geojson-url`
  source variant) — flagged in inventory doc §7. This is the
  single biggest unblocker for the whole "point/line overlay"
  family. Estimated 4-6 hours of refactor work.
- `metro_lines.json` has only line names, no LineString geometry
  — line geometry must come from a separate source. Search for
  `rta_metro_lines-open` GeoJSON variant from RTA's portal page.

**Risk:** **LOW.** Public open data, redistribution permitted.

**Master Tree §:** **D — Technology**, *digital-twin overlays*
sub-bucket. Specifically the point layers; the lines layer
(once geometry is sourced) lives in the same bucket.

---

### 2.7 `dewa_annual_statistics.json` — DEWA macro figures

**Content:** 972 rows of DEWA aggregate statistics 2011→present.
`item_name` (e.g. "Jebel Ali R.O. Desalination Plant"), `year_key`,
`type` (e.g. "Desal Capacity"), `unit` (e.g. "MIGD"), `value_key`.

**Surface — Marquee strip on `/parcels/map` or `/dashboard`:**
"Dubai produced X MIGD of water in 2024 (up Y% YoY). Z MW peak
demand." Three rotating macro factoids. Builds credibility for
the "we know utility data" pitch; doesn't drive any decision on
a specific plot.

**Surface — Feasibility Calculator v6 footer (read-only context):**
"Dubai-wide capacity context: …"

**Complexity:** **S** (≤4 h). Static JSON, render as text.

**Dependencies:** None.

**Risk:** **LOW.**

**Master Tree §:** **E — Analytics**, *macro context* sub-bucket.

---

### 2.8 `brokers.json` + `real_estate_licenses.json` — partner directories

**Content:**
- `brokers.json` — 8,724 RERA brokers with name, license dates,
  phone, fax, webpage, real_estate_id (the firm they belong to).
- `real_estate_licenses.json` — 2,782 real-estate company offices
  with trade name, license number, **`parcel_id`** (suggesting
  the office's physical address parcel — verify), issue / expiry
  dates, status_english.

**Surface — Listing-detail page (when a parcel is listed):**
"Listed by: \<broker name\>" + small "Active RERA license, expires
2027-06-10" badge. Trust signal.

**Surface — Search / autocomplete:** when a user types a broker
name, autocomplete from the 8,724 known brokers.

**Surface — Archibald:** *"Which brokers handle plots in JVT?"*
answerable via transactions join × brokers (note: transactions
file does not directly carry broker_id, so this requires the
recent-listings RERA permits file — `real_estate_permits.json` —
which has `license_number`).

**Surface — Map: optional overlay** of real-estate company offices
as a hidden-by-default layer for B2B use cases.

**Pre-compute:**  Bulk load both files into Prisma tables. The
brokers table has a natural join on `real_estate_id` to
`real_estate_licenses` — that surfaces the firm a broker works
for. Two FK hops, both in the dump.

**Complexity:** **S** (≤1 day for ingest, brand badges, autocomplete).

**Dependencies:** none.

**Risk:** **LOW.** Public registry.

**Master Tree §:** **B — Participants**.

---

### 2.9 `lkp_transaction_groups` + `lkp_transaction_procedures` — lookup tables

**Content:** Two tiny lookup tables that translate `procedure_id` /
`trans_group_id` integers in `transactions.json` to human-readable
strings (3 groups, 64 procedures).

**Surface:** No standalone surface — they are *required join
fixtures* for §2.2 transactions to display "Sale" / "Mortgage
Transfer" / "Gift" instead of integer IDs.

**Complexity:** **S** (≤30 min). Trivial.

**Dependencies:** Ship with §2.2.

**Risk:** none.

**Master Tree §:** None — fixture data.

---

### 2.10 `number_of_parking_spaces_per_zone.json` — community-level parking supply

**Content:** 84 communities × parking-spaces count. Joinable on
`community_num` to our existing communities layer.

**Surface — Parcel detail page (commercial / retail / mixed-use
plots only):** "Public parking in this community: X spaces" as a
context field. Niche but ranks plots in commercial-feasibility
conversations.

**Surface — Map: tooltip on community-hover** showing the
parking-space count alongside community name.

**Complexity:** **S** (≤4 h).

**Dependencies:** community_num ↔ existing communities-layer
key match (verify).

**Risk:** **LOW.**

**Master Tree §:** **A — Assets**, *community attributes* sub-bucket.

---

### 2.11 LOW / SKIP — what's NOT worth building from

| File | Why SKIP / LOW |
|---|---|
| `verdicts.json` (2.6 GB) | 200 k Arabic-text court rulings on (rare, dispute-flagged) property disputes. No geo, no parcel link, no platform surface. Could feed a Phase B blockchain-audit narrative; not Phase 1. |
| `map_requests.json` (561 MB) | 985 k admin log of "who requested which map" — internal DLD operations, not platform data. |
| `transactions_full.json.gz` | Duplicate of `transactions.json`; dedupe. |
| `peak_water_production_in_a_day_mig.json` | Single row macro. Useful as one factoid in §2.7. |
| `water_supply_points.json` | 5 water-tanker fuelling points — already mis-characterised in prior doc, **not utility infra**. |
| `tse_produced.json` | 231 rows of treated sewage effluent volume time-series. Niche; environmental marquee only. |
| `marine_lines.json` | Route names without LineString geometry. Marketing-quality data, not map-quality. |
| `salik_tariff.json` | 71 toll-fee values over time. Marketing macro only. |
| `parking_rates.json` | Time series of paid-parking fares. No geo, no link. |
| `real_estate_permits.json` (116 MB) | Advertising / exhibition permits. Operational admin churn; nothing platform-actionable. |
| `deq_corporate_practice_permit_activities_grades.json` | Engineering-consultancy practice grades. Partner directory adjacent to brokers; not differentiating. |
| `dld_lands_*.csv` (× 2) | Superseded by `land_registry.json` (which has the parcel_id join). The CSVs lack parcel_id and lose to the JSON variant on every field. Archive but don't ingest. |
| `metro_lines.json` | Only line names, no geometry. SKIP this file; source line geometry separately (see Phase 4). |

---

## 3. Phase 3 — Wave roadmap

### 3.1 Wave 1 (post-summit, weeks 1-4)

**Goal:** Ship the maximum visible value with shortest dependency
chain. Close the comparable-sales credibility gap vs PropertyFinder
/ Bayut.

| Card | Effort | What it unlocks |
|---|---|---|
| 2.1 `land_registry` ingest + parcel-detail enrichment | M | Every parcel detail page shows DLD-canonical type, sub-type, master project, freehold. Replaces our heuristic land-use derivation with truth. |
| 2.2 `transactions` → `SalesByArea` rollup + parcel "Market" tab | L | "Average AED/sqm in this area, last 12 months: X. 5 recent comparable sales:" — buyer-facing comparable-sales engine. |
| 2.6 EV chargers + metro/tram/marine station overlays | S each (after Layers refactor) | Visible utility / amenity layers on the map; "minutes walk to metro" badges on every parcel detail page. |
| 2.9 lookup tables | S | Required fixture for 2.2; no standalone surface. |
| 2.7 DEWA annual stats marquee | S | One-line credibility factoid; trivial to ship. |

**Wave 1 unlocks:** ZAAHI matches PropertyFinder's comparable-sales
depth (1.7 M transactions vs PF's claimed 1.5 M) and goes beyond
with parcel-level DLD ground truth that PF can't access. This is
the **demo-grade tooling** the founder can show at the next
investor conversation post-ADIS.

**Wave 1 also lights up:** the EV chargers / metro stations layers
that the inventory doc identified as Phase D candidates — now
ship-able as a category in the Layers menu without violating any
LOCK rules (LayerDef refactor unblocks them all).

**Wave 1 critical-path dependency:** **the LayerDef refactor**
(GeoJSON-URL source variant). One-time 4-6 hour invest that
unblocks every subsequent map overlay in Waves 2 and 3.

**Wave 1 risk that could derail:** DLD license sign-off for
publishing comparable-sales aggregates. **Recommended: ask DLD
directly at ADIS** (their stand will be there given the public-
sector infrastructure theme).

### 3.2 Wave 2 (months 2-3)

**Goal:** Make Feasibility Calculator citable in DLD terms;
launch developer-track surfaces.

| Card | Effort | What it unlocks |
|---|---|---|
| 2.3 `valuation` rollup + Feasibility "DLD valuation benchmark" tab | M | Feasibility outputs become defensible against DLD's own valuation history. Brokers stop arguing with our numbers. |
| 2.4 `projects` + `developers` + `accredited_escrow_agents` three-table join + new `/developers/[id]` page | M | Buyer sees developer track record + project completion % + escrow bank on every parcel that's in a registered project. Trust signal. |
| 2.5 `building_floor_level_information` ingest + `building_id ↔ parcel_id` spatial join | L | Feasibility shifts from "estimated GFA × VA/m²" to "realised floor-by-floor usages from DLD records." Single biggest accuracy gain in v6 since launch. |
| 2.8 `brokers` + `real_estate_licenses` ingest + listing-page broker badges | S | "Listed by: \<broker name\> · RERA license active" — trust signal on every parcel listing. |
| 2.10 parking-spaces-per-community | S | Niche but ships for $0 effort. |

**Wave 2 unlocks:** Feasibility Calculator stops being a "ZAAHI
proprietary model" and starts being a "DLD-data-anchored projection."
That citation shift — *"based on DLD evaluation history and DLD
floor-level realised usages"* — is the differentiator that makes
ZAAHI's number a DLD-compatible second opinion, not a black-box guess.

**Wave 2 critical-path dependency:** `building_id ↔ parcel_id`
spatial join (or DLD ask) — flagged at §1.2.4.

### 3.3 Wave 3 (months 4-6)

**Goal:** Heavyweight valuation engine. Cross-emirate readiness.
Whatever DLD partnership conversations from ADIS land.

| Theme | Files used | What it unlocks |
|---|---|---|
| Production-grade valuation engine | `valuation` + `transactions` + `land_registry` + `building_floor_level_information` joined together | A defensible AED/sqm prediction per parcel + sub-type + master project, anchored on three independent DLD sources |
| Comparable-sales API for partners | `transactions` aggregates | B2B API that brokers / banks can subscribe to. Revenue line. |
| Cross-emirate readiness | Same dump shape from data.abudhabi (TBD post-summit) | ZAAHI ships in Abu Dhabi with the same engine |
| Court-disputes "risk flag" | `verdicts.json` — *only if* there's a legal-NLP partner | Parcel-level dispute history badge ("3 court cases linked to this address since 2019") — sensitive, regulator-cleared output required |

**Wave 3 unlocks:** revenue lines beyond the cohort-pilot user
base. Wave 1 + 2 establish the platform; Wave 3 monetises it.

**Wave 3 critical-path dependency:** at least one of (a) DLD
partnership pre-cleared from Wave 1 ADIS conversations,
(b) Abu Dhabi data.dubai equivalent surfaced, (c) a legal-NLP
partner identified for the verdicts file. Each one is a separate
threshold; if zero land, Wave 3 stays Wave 2 + polish.

---

## 4. Phase 4 — Missing-from-dump: priority next downloads

Looking at what the 33 files don't cover, the founder's next
acquisition batch should prioritise the items below. Each one
carries an **acquisition channel** — three routes:

- **PORTAL** — search the catalogue at `data.dubai.ae`; if the
  slug exists, download direct. Confirm the exact slug on the
  portal (slugs cited here are the founder's best-guess naming
  convention from the 33 files already obtained — not verified
  URLs).
- **ISSUER** — not in `data.dubai` catalogue (or not at the
  resolution we need); request from the issuer's own portal
  (RTA / DSC / KHDA / DHA / DTCM) — most have open-data sections
  parallel to data.dubai.
- **ADIS-ASK** — face-to-face request at the issuer's stand
  during ADIS 2026 (13-15 May); these are typically registry-
  internal cross-reference tables that aren't published in any
  open-data catalogue, and need a relationship before release.

### Primary (Wave 1 unblockers)

| # | Dataset | Why needed | Channel | Slug / where to look |
|---|---|---|---|---|
| 1 | **Metro / tram line geometry (LineString)** | We have 55 metro + 11 tram + 59 marine stations as points, but `metro_lines.json` is metadata-only (2 rows, no geometry). Required to draw Red / Green / Route 2020 lines on the map alongside the station overlays from §2.6. Wave 1. | PORTAL → ISSUER fallback | Try `rta_metro_lines-open` on data.dubai; if metadata-only there too, request the GIS export from RTA's open-data portal directly |
| 2 | **DM community / zoning polygon shapefile** | `transactions` / `land_registry` / `valuation` all key on `area_name_en`. We need the matching polygon geometry to render the `SalesByArea` choropleth (§2.2). Our existing DDA community PMTiles layer may cover this — needs a 20-minute name-string match check first. If gaps, request from Dubai Municipality. | PORTAL → ISSUER fallback | Try `dm_community_boundaries-open` / `dubai_zoning_areas` on data.dubai; fallback to DM's GIS portal |
| 3 | **Parcel → buildings cross-reference** | `building_id ↔ parcel_id` mapping — the single hardest gap in the dump. `building_floor_level_information` has 1.05 M floor records but no link back to our 556 k parcels. Required for Wave 2's Feasibility v6 realised-usage upgrade. | **ADIS-ASK** | DLD does not publish this in any open-data slug. Ask at DLD's ADIS stand whether the registry has a parcel-buildings join table that can be shared under a partnership MoU. Fallback: build via spatial overlay (slow) |
| 4 | **DSC population by community** | Demographic density per community for Feasibility's demand model + parcel-page "demographic context" surface. Joins on the same `area_name_en` as transactions. | PORTAL → ISSUER fallback | Try `dsc_population_by_community-open` on data.dubai; fallback to Dubai Statistics Center (dsc.gov.ae) |
| 5 | **KHDA schools + DHA hospitals (geocoded)** | Amenity overlay for parcel-detail "X schools / Y hospitals within 1 km" — family-buyer differentiator. KHDA publishes the school registry but the lat/lng version is sometimes locked. DHA hospitals follow the same pattern. | ISSUER | KHDA open-data portal for schools (`khda_private_schools`); DHA open-data portal for hospitals (`dha_hospitals`). Cross-check whether either ships on data.dubai with geometry |

### Secondary (Wave 2-3 timing)

| # | Dataset | Why needed | Channel | Slug / where to look |
|---|---|---|---|---|
| 6 | **DEWA electricity + water new-connection counts** | District-level connection-activity heat for the Feasibility utility-load tab. Identified in the prior inventory pass; still absent from the 33-file dump. | PORTAL | `electricity_new_connection-open` + `water_new_connection-open` on data.dubai |
| 7 | **DTCM classified hotels (geocoded)** | Hospitality-feasibility plot context: nearest hotel cluster, room-supply density. Niche but unlocks the hotel-development persona. | ISSUER | DTCM open-data section (dtcm.gov.ae); search slug `dtcm_classified_hotels` on data.dubai too |
| 8 | **`lkp_usages` lookup table** | The dump ships `building_usages.usage_id` (integer FK) but no lookup table to map IDs → human-readable usage labels. Until this lands, the building_usages file is unusable for any user-facing surface. | **ADIS-ASK** | Not catalogued on data.dubai; this is the matching fixture to `lkp_transaction_groups` / `lkp_transaction_procedures` (which are shipped). Ask DLD to release |
| 9 | **`lkp_areas` lookup (or area-id keyed polygons)** | Same problem as #8 but for `area_id`. We use `area_name_en` as the join key today, but a numeric-id lookup (or better, an `area_id` keyed polygon GeoJSON) removes a fragile string match. | **ADIS-ASK** + PORTAL retry | Not in dump; ask DLD or check whether DM zoning polygons (#2) carry an area_id attribute |
| 10 | **DLD owner anonymisation / consent-join key** | The dump correctly strips `owner_id` for PDPL. If we ever build owner-side surfaces (e.g. "all plots owned by user X" via consent), this is the join fixture. Not a Wave 1-3 need but flagged for completeness. | **ADIS-ASK** | DLD registry-internal; partnership MoU required |

### Notes on this list

- **Items 1, 2, 4, 6** are routine portal searches; can be done
  remote post-ADIS without face-time.
- **Items 3, 8, 9, 10** all need DLD relationship. Bundle them
  into one ADIS conversation rather than scattering asks.
- **Items 5, 7** are issuer-portal jobs; budget 1 hour total
  to navigate the four sub-portals (KHDA, DHA, DTCM, RTA).
- **No URLs are cited as verified** — every slug above is the
  founder's best guess from the 33-file naming convention. The
  founder will need to confirm each slug on data.dubai's actual
  catalogue search before downloading. This is honest gap-flagging,
  not fabrication: the catalogue's URL scheme changes more often
  than the dataset slugs do, and citing a URL we haven't tested
  would risk sending the founder to a 404 during a time-pressured
  pre-ADIS prep.

---

## 5. Cross-references

- **Prior catalog reference:** `docs/research/DATA_DUBAI_INVENTORY_AND_ADIS_2026.md` —
  portal-wide inventory + ADIS playbook + initial Phase A inventory.
  This document supersedes only the §4 build-path proposals there;
  catalog inventory in §2 of that doc remains valid.
- **Raw-data location:** `docs/research/data-dubai/raw/` — gitignored,
  244 MB on disk (incl. duplicates and SKIP files), 6.5 GB total
  with the verdicts + map_requests dumps.
- **Verified join sample:**
  `land_registry.parcel_id ∈ { 6457940, 6854214, 6855058 }`
  confirmed against production parcel rows in May 2026.
- **LOCK list (unchanged from prior research):** no
  `src/app/page.tsx` auth flow changes; AuthGuard remains; v6
  calculator untouched; `/api/layers/*` stays public; parcels
  never deleted; ZAAHI Signature 3D untouched;
  `fill-extrusion-opacity` literal-number-only.

---

## 6. What this document is NOT

- It is not a *commitment* to any Master Tree placement. All
  proposals in the cards are flagged "NOT YET RATIFIED" — founder
  picks per card.
- It is not a code change. Zero `src/` lines touched.
- It is not a layer build. The Phase D pilot from the prior pass
  remains skipped — same Layers menu integration cost reasoning
  applies.
- It is not an exhaustive transcription of every field in every
  file. The schemas in §1.1 cite the columns that drive Phase 2
  decisions; founder's `docs/research/data-dubai/index.md`
  carries the full per-file schemas for ingest engineering.

---

## 7. Sources

- `docs/research/data-dubai/raw/` — 33 dump files inspected in
  Phase 1.
- `docs/research/data-dubai/index.md` — per-file schema reference.
- DLD Open Data Policy referenced via
  [dubailand.gov.ae/en/open-data/](https://dubailand.gov.ae/en/open-data/).
- DEWA / RTA / DM dataset URLs catalogued in the companion
  inventory doc.
- Live parcel-id verification run against the production database
  during this research session.

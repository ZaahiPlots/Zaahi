# data.dubai inventory + ADIS 2026 playbook

**Audience:** ZAAHI founders (Zhan + Dymo)
**Use-by date:** 12 May 2026 EOD — Dymo travels to Abu Dhabi on 13 May
**Branch:** `research/dewa-utility-layers` (do not push)
**Status:** Research only. No `src/` code touched (Phase D was scoped
to a pilot map layer; **see §7 — pilot was deliberately skipped**, not
silently abandoned). No canonical files modified.

Optimised for *decision-ready* over *exhaustive*. Each claim cites a
URL. Where the public web doesn't answer a question, the line reads
**"unknown — verify on-site at ADIS"** so the founder can prioritise
that conversation in the booth queue.

**Second-pass update (11 May 2026):** founder now has full download
access to the `data.dubai` portal (~700+ datasets across DLD / DEWA /
RTA / DM / DSC / KHDA / DHA / DTCM / Dubai Police). This document
is the **broader portal-wide inventory** plus the ADIS playbook from
the first pass. §2 (DEWA-only) is expanded to the full portal; §4
(build path) has new L1 candidates; a new §7 captures the Phase D
pilot-layer decision. Sections 1, 3, 5, and 6 remain unchanged from
the first pass unless explicitly flagged.

---

## 1. What developers actually ask for (terminology pass)

A developer evaluating a plot in the UAE doesn't ask "watts of water."
They ask two pairs of numbers, with two different units each.

### 1.1 Power — kW vs kVA vs MVA

- **kW (kilowatt)** is **real power** — the work the load actually does
  (lighting, motors, AC compressors). It's what the utility *charges
  for* on the consumption bill.
- **kVA (kilo-volt-ampere)** is **apparent power** — real power plus
  reactive power. It's what the *cable / transformer must be sized
  for*, because the cable has to carry both. For a typical building
  with mixed loads, **kVA ≈ kW ÷ 0.85** (power factor of 0.85). This
  is the number DEWA asks for on the connection-application form, and
  it's the number that decides whether your plot's nearest 11 kV
  feeder has spare capacity.
- **MVA (mega-volt-ampere)** is just 1,000 × kVA. Substations are
  rated in MVA. A typical 33/11 kV primary substation in Dubai or
  Al Ain runs in the 20–60 MVA range
  ([AADC 5-Year Planning Statement 2024-2029, §2.6](https://www.aadc.ae/Uploads/2024-%202029%20AADC%20Electricity%205%20YRS%20PS%202nd%20submission.pdf)).

When the founder said "watts of water" the brain shortcut was right.
What he meant was: *every plot has two consumption rates that have to
fit through the local infrastructure*, and the platform should be
able to surface both. The right framing for the product is:

> "Plot X needs approximately **N kVA of grid capacity** and
> **M IGPD of water**. Nearest grid substation is K kilometres away."

### 1.2 Water — GPD vs IGPD vs m³/day

DEWA's developer-facing planning guideline is the *Water Transmission
Planning Guidelines for Development Projects (Update 2023)*
([DEWA, 2023](https://www.dewa.gov.ae/-/media/WT-Planning-Guidelines-for-Dev-Proj--Update-2023.ashx)).
The guideline allows submission in either:

- **IGPD (Imperial Gallons Per Day)** — historical UAE convention.
  1 IG = 4.546 litres.
- **GPD (US Gallons Per Day)** — increasingly used in international
  master planning. 1 US gallon = 3.785 litres.
- **m³/day** — DEWA's billing-side unit. Residential tariff slabs are
  defined in m³ (0–27, 27–54, 54+ m³ thresholds at AED 7.70 / 8.80 /
  10.12 per m³ respectively as of 2025
  ([Solid Cars, "Dubai Utilities Cost 2025"](https://solidcars.ae/blog/dubai-utilities-cost-2025-dewa-sewerage-internet/))).

**Treat m³/day as canonical** for ZAAHI's product surface. Convert
from either gallon flavour at ingest time. A reasonable default for
display is the larger of the planning-stage IGPD figure ÷ 220 → m³
(rounded up to two significant figures).

### 1.3 What numbers does a developer need before buying a UAE plot

In order of how much each one moves the buy/no-buy decision:

1. **Load demand (kVA)** — sum of all expected use. Drives
   transformer + cable sizing on the plot.
2. **Water demand (m³/day or IGPD)** — drives pipe sizing + water
   reservoir sizing on the plot.
3. **Distance to the nearest substation** with spare capacity. This
   determines CAPEX for the cable run from the substation to the plot
   boundary, which the developer pays.
4. **Spare capacity at that substation.** If it's at 90%+, your plot
   may not get connected without an upstream upgrade (which can
   trigger a year+ delay).
5. **NOC status** — whether DEWA has issued a "no objection" against
   the plot's intended use. The developer pays nothing for the
   Building NOC itself (DEWA Building NOC fee is 0 AED per service —
   confirmed at
   [DEWA Building NOC service guide](https://www.dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate))
   but they pay for the upstream connection infrastructure.
6. **CAPEX for cable run / pipe extension** — the dominant cost
   variable on land-only sales. Order-of-magnitude figures in Dubai
   for a "deep" connection (>500 m from feeder) can range from
   AED 200k to multi-million depending on cable size and ground
   conditions. **Unknown for specific cases — verify on-site at
   ADIS** (relevant booths: DEWA, ADDC/TAQA Distribution).
7. **NOC processing time** — currently **3 working days** per service
   (electricity AND water) on the DEWA Building NOC portal
   ([DEWA, "Building No Objection Certificate"](https://www.dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate)).
   The bottleneck is rarely the NOC issuance itself; it's the
   *upstream* connection design that determines whether the NOC
   conditions are achievable.

### 1.4 Where is this currently a pain

- The developer learns step 4 (spare capacity) only by **manually
  submitting a connection inquiry** through DEWA's builder portal
  and waiting. There is **no public, geocoded substation-capacity
  map**. Pre-purchase due diligence is "phone a friend at DEWA" or
  "buy and hope."
- Step 3 (distance to substation) is *theoretically* computable from
  satellite imagery + utility-pole inspection but is not exposed in
  any retail-facing tool. Master developers (Aldar, Emaar, Modon)
  maintain in-house GIS layers that include known feeders; nobody
  publishes them.
- Steps 6–7 are computable only *after* the NOC application returns
  with conditions. **The whole "design the cable run, get a quote,
  decide whether to proceed" loop is weeks, not days.**

That gap is ZAAHI's opening: a *planning-grade* estimate that
collapses steps 1, 2 and an approximation of 3 into something a buyer
can see before they make an offer.

---

## 2. data.dubai — portal-wide inventory

### 2.1 Platform transition

Dubai's open-data home moved from **Dubai Pulse**
([dubaipulse.gov.ae](https://www.dubaipulse.gov.ae/)) to
**Data.Dubai** ([digitaldubai.ae/data.dubai](https://www.digitaldubai.ae/apps-services/details/data.dubai)).
Legacy `dubaipulse.gov.ae/data/…` URLs currently HTTP-redirect (301)
to `https://data.dubai/`. The Open Data Portal sub-section of
Data.Dubai is the successor catalogue and groups everything by issuer
(DLD, DEWA, RTA, DM, DSC, KHDA, DHA, DTCM, Dubai Police, plus several
smaller authorities).

The OAuth2 client-credentials flow appears preserved verbatim from
Dubai Pulse. See §2.6 below for the verified auth handshake.

### 2.2 Local files (Phase A) — what was downloaded + verified

The founder downloaded 8 files from data.dubai to `~/Загрузки/`
(Russian Downloads dir). All 4 of the `.json` files turned out to be
**gzip-compressed despite the extension** — they decompressed cleanly
with `zcat`. Decompressed copies live in
`docs/research/data-dubai/` (gitignored — total 244 MB; see
`index.md` in that directory for the per-file metadata).

| File | Issuer | Rows | Geo signal | Quality |
|---|---|---:|---|---|
| `dewa_ev_green_charger` | DEWA | **335** | **lat/lng** | ✓ clean |
| `dewa_annual_statistics` | DEWA | 972 | none | ✓ clean |
| `dewa_water_supply_points` | DEWA | **5** | **none** | ⚠ not what we thought |
| `dewa_peak_water_production` | DEWA | 1 | none | ✓ clean (single macro row) |
| `dld_transactions_full` (gz) | DLD | **1,697,783** | `area_id` + `area_name_en` | ✓ clean (2.66 GB decompressed) |
| `dld_transactions_recent` | DLD | 6,886 | `AREA_EN` | ✓ clean |
| `dld_lands` (× 2) | DLD | 254,041 / 127,727 | `AREA_EN` + `ZONE_EN` | ✓ clean; second is a subset |

**Correction to first pass:** §2.2 of the prior version of this doc
claimed `dewa_water_supply_points-open` was "geocoded points of
water-supply infrastructure." It is not. Inspection of the actual
download shows **5 rows** representing **water-tanker fuelling
distribution points** (Jebel Ali Industrial, Port Jebel Ali, Creek
Jetty, Port Rashid, Hatta) with text addresses and **no latitude /
longitude fields**. Useful for tanker logistics, not for plot-level
utility overlays. Demoting from HIGH to LOW.

**Quiet wins:**
- `dewa_ev_green_charger` is **directly map-ready** — 335 features,
  all with valid Dubai-bounded coordinates and connector-type
  metadata.
- `dld_transactions_full` is the **single most valuable file**
  in the whole inventory: 1.7 M historical transactions back to
  2015, with `area_name_en`, `actual_worth` (AED), `meter_sale_price`
  (AED/sqm), `instance_date`, `nearest_metro/mall/landmark`, and 40
  more columns. This is a comparable-sales engine in a CSV.

### 2.3 Portal-wide inventory (Phase B) — sortable by relevance

Scored against the criteria from the task brief: **HIGH = geocoded
AND relates to land value AND not already covered by existing
ZAAHI PMTiles** (556 k plots + Land-Use 9-cat are already done).
Listed below in priority order; full table is sortable by the
ZAAHI-relevance column.

#### Issuer: **DLD** (Dubai Land Department)

| Dataset slug (Dubai Pulse) | Geo? | Relevance | One-line rationale |
|---|---|---|---|
| `dld_transactions-open` | `area_id`, no lat/lng | **HIGH** | Comparable sales by area; the #1 file already on disk |
| `dld_land_registry-open-api` | `AREA_EN` | **HIGH** | Land registrations w/ area + zone — already on disk |
| `dld_real_estate_projects` | unknown — verify | **HIGH** | If geocoded, links to existing plots |
| `dld_valuations` / appraisal indices | aggregate | MED | Time-series anchor for §4.2 estimator |
| `dld_rent_index` | community | MED | Yield calc input |
| `dld_brokers` / `dld_developers` | name only | LOW | Already covered by ZAAHI internal data |

#### Issuer: **DEWA** (Dubai Electricity & Water)

| Dataset slug | Geo? | Relevance | Rationale |
|---|---|---|---|
| `dewa_ev_green_charger-open` | **lat/lng** | **HIGH** | 335 geocoded chargers; already on disk |
| `dewa_electricity_new_connection-open` | district | **HIGH** | Activity heat-map by district — not downloaded |
| `dewa_water_new_connection-open` | district | **HIGH** | Same for water — not downloaded |
| `dewa_annual_statistics-open` | none | MED | Macro context; already on disk |
| `dewa_water_supply_points-open` | none | LOW | 5-row tanker fuelling list (corrected) |
| `dewa_peak_water_production` | none | LOW | Single macro stat |
| `dewa_customers_master_data` | none | LOW | Aggregate buckets |
| `dewa_gross_power_generation_mwh` | none | LOW | Macro time-series |

#### Issuer: **RTA** (Roads & Transport)

| Dataset slug | Geo? | Relevance | Rationale |
|---|---|---|---|
| `rta_metro_lines-open` | **line geometry** | **HIGH** | Metro lines as map layer — proximity = price premium |
| `rta_metro_stations` | **lat/lng** | **HIGH** | 50+ stations geocoded; "10-min walk to metro" computable |
| `rta_bus_routes-open` | **line geometry** | HIGH | Same logic as metro, broader coverage |
| `rta_parking_zones` | polygon | MED | Parking-fee zones map to ground-floor retail value |
| `rta_metro_ridership-open` | by station | MED | Demand indicator, not geo |
| `rta_public_transport_trips_by_type_month` | none | LOW | Macro |
| `rta_traffic_accidents` (if open) | lat/lng | MED | Safety overlay; check license — verify on portal |

#### Issuer: **Dubai Municipality (DM)**

| Dataset slug | Geo? | Relevance | Rationale |
|---|---|---|---|
| `dm_public_parks` | **lat/lng** + polygon | **HIGH** | Amenity overlay; "park within 500 m" |
| `dm_parks_coordinates` | **lat/lng** | **HIGH** | Same — alt slug |
| `dm_heritage_places` | **lat/lng** | MED | Tourism overlay; relevant for hotel/F&B plots |
| `dm_building_permits` | site / district | MED | Construction activity signal |
| `dm_zoning` | polygon (if exposed) | **HIGH if geocoded** | Already covered by our 9-cat Land Use — verify whether portal version differs |
| `dm_community_services` | varies | MED | Cluster of amenity sub-datasets — inspect on download |

#### Issuer: **DSC** (Dubai Statistics Center)

| Dataset slug | Geo? | Relevance | Rationale |
|---|---|---|---|
| `dsc_population_by_community-open` | **community FK** | **HIGH** | Joinable to plots via community; density → price model input |
| DSC GeoStat (web tool) | interactive map | MED | Underlying community boundaries may be downloadable |
| `dsc_gdp_quarterly-open` | none | LOW | Macro |
| `dsc_household_expenditure_survey_income` | community / type | MED | Income proxy by area |

#### Issuer: **KHDA** (Knowledge & Human Development Authority — education)

| Dataset slug | Geo? | Relevance | Rationale |
|---|---|---|---|
| `khda_private_schools_in_dubai-open` | **lat/lng** (verify) | **HIGH** | "Top schools within X km" → family-buyer feature |
| `khda_higher_education_institutions_in_free_zones-open` | **lat/lng** (verify) | MED | Niche audience (corporate housing) |
| KHDA ratings ("Outstanding", "Good", etc.) | per school | **HIGH** | Combined with location → premium-quartile schools overlay |

#### Issuer: **DHA** (Dubai Health Authority)

| Dataset slug | Geo? | Relevance | Rationale |
|---|---|---|---|
| DHA hospitals / clinics | **lat/lng** (verify) | **HIGH** | Amenity overlay; "hospital within 10 min" |
| DHA EMRAM hospital scores | per hospital | LOW | Reputation data, not geo by itself |

#### Issuer: **DTCM / DET** (Tourism)

| Dataset slug | Geo? | Relevance | Rationale |
|---|---|---|---|
| `dtcm_visitors_count_by_nationality-open` | none | LOW | Macro tourism |
| Hotels (public POI) | **lat/lng** | MED | Hospitality-plot context |
| `dct_classified_hotels` | per hotel | MED | Tier × location for hotel-plot feasibility |

#### Issuer: **Dubai Police**

| Dataset slug | Geo? | Relevance | Rationale |
|---|---|---|---|
| `police_traffic_accidents` | lat/lng | MED | Safety overlay |
| `police_crime_statistics` | district | LOW | Generally district-level summary |

### 2.4 Top-10 HIGH datasets, ranked

Ranking by combined (impact × ease-of-integration). The top 5
already have files on disk; the next 5 need to be downloaded.

| Rank | Dataset | On disk? | Why it's high |
|---:|---|---|---|
| 1 | `dld_transactions-open` (1.7 M rows) | ✓ | Comparable sales engine; immediate price benchmarking by area + property type |
| 2 | `dewa_ev_green_charger-open` (335 rows) | ✓ | Map-ready GeoJSON; first visible new layer |
| 3 | `dld_land_registry-open` (254 k rows) | ✓ | Land-level metadata; pairs with our 556k plots |
| 4 | `rta_metro_stations` | — | 50+ geocoded stations; proximity premium feature |
| 5 | `rta_metro_lines-open` | — | Line geometry; "10-min walk to metro" overlay |
| 6 | `rta_bus_routes-open` | — | Same logic, broader coverage |
| 7 | `dm_public_parks` | — | Amenity overlay; family-buyer differentiator |
| 8 | `khda_private_schools_in_dubai-open` | — | School-rating + location = single most-asked-about amenity |
| 9 | `dsc_population_by_community-open` | — | Density / demographics by community; input to estimator |
| 10 | `dewa_electricity_new_connection-open` | — | District-level connection activity (development heat) |

### 2.5 Download queue (Phase C) — checklist for founder

Direct downloads for the HIGH-relevance datasets not yet on disk.
Browse data.dubai by issuer or use the legacy Dubai Pulse URLs
(both currently work; legacy URLs 301-redirect to the new portal).

- [ ] **RTA — Metro stations**
      ([dubaipulse.gov.ae/data/rta-rail](https://www.dubaipulse.gov.ae/organisation/rta/service/rta-rail))
      — pick the `rta_metro_stations` resource. Should be CSV or
      GeoJSON with station name + lat/lng + line color.
- [ ] **RTA — Metro lines**
      ([dubaipulse.gov.ae/data/rta-rail/rta_metro_lines-open](https://www.dubaipulse.gov.ae/data/rta-rail/rta_metro_lines-open))
      — line geometry per route (Red / Green / Route 2020).
- [ ] **RTA — Bus routes**
      ([dubaipulse.gov.ae/data/rta-bus/rta_bus_routes-open](https://www.dubaipulse.gov.ae/data/rta-bus/rta_bus_routes-open))
      — line geometry per route. File is likely large; download and
      simplify before serving.
- [ ] **DM — Public parks**
      ([dm.gov.ae open data portal](https://www.dm.gov.ae/open-data2/))
      — verify whether published as point + polygon or just point.
- [ ] **KHDA — Private schools in Dubai**
      ([dubaipulse.gov.ae/data/khda-schools/khda_private_schools_in_dubai-open-api](https://www.dubaipulse.gov.ae/data/khda-schools/khda_private_schools_in_dubai-open-api))
      — capture lat/lng + curriculum + rating + capacity.
- [ ] **DSC — Population by community**
      ([dubaipulse.gov.ae/data/dsc-statistics/dsc_population_by_community-open](https://www.dubaipulse.gov.ae/data/dsc-statistics/dsc_population_by_community-open))
      — community-keyed; pair with a Dubai community boundary layer.
- [ ] **DEWA — Electricity new connection**
      ([dubaipulse.gov.ae/data/dewa-new-connections/dewa_electricity_new_connection-open](https://www.dubaipulse.gov.ae/data/dewa-new-connections/dewa_electricity_new_connection-open))
- [ ] **DEWA — Water new connection** (same `dewa-new-connections` folder)
- [ ] **DHA — Hospitals + clinics**
      ([dha.gov.ae/en/open-data](https://dha.gov.ae/en/open-data))
      — verify lat/lng presence; clinics list may be public-private split.
- [ ] **DTCM — Classified hotels**
      ([dubaipulse.gov.ae](https://www.dubaipulse.gov.ae/organisation/dtcm/service/dtcm-general))
      — pick the classified-hotels dataset; lat/lng per property.
- [ ] **Dubai Police — Traffic accidents** (if open + lat/lng)
      ([dubaipulse.gov.ae](https://www.dubaipulse.gov.ae/) — search "police")
      — license check before ingest.

When the next batch is dropped in `~/Загрузки/`, decompress with
`zcat` (DEWA files) or use directly (DLD CSV). Same parser
pattern as in Phase A.

### 2.6 Closed data (not openly published) — same as Phase A

Unchanged from first pass:

- 132/11 kV substation locations + nameplate capacities
- HV / MV / LV cable network topology
- Real-time spare capacity per substation

Plus newly noted:

- **Cadastral parcel polygons in machine-readable form.** The DLD
  publishes the *attributes* of every land row (254 k rows in
  `dld_lands`) but not the boundary geometry — that comes from
  the DDA / DM source we already have via PMTiles.

### 2.7 Auth flow (Dubai Pulse → Data.Dubai)

1. **Request API access** for the dataset slugs you need. End
   users receive an **API Key** and **API Secret** in separate
   emails when the grant is approved.
2. **Mint OAuth token** with a single POST:
   ```
   POST https://api.dubaipulse.gov.ae/oauth/client_credential/accesstoken
        ?grant_type=client_credentials
   body: client_id={API Key}&client_secret={API Secret}
   ```
3. **Use the returned `access_token`** as `Authorization: Bearer
   {access_token}` on every subsequent dataset call.
4. **Tokens expire after ~30 minutes.** Cache + refresh on miss.

Source: [Dubai Pulse API documentation](https://www.dubaipulse.gov.ae/).
Data.Dubai successor appears to use the same flow; verify against
Data.Dubai's developer portal once the founder confirms account
access.

For the immediate post-summit work, **batch CSV / JSON downloads
through the browser are sufficient** — the API only matters once
we want to refresh data automatically (Level 1 / Level 2 of §4).

### 2.8 Format quirks worth knowing before ingest

- DEWA `.json` files downloaded from data.dubai are **gzip-compressed
  despite the file extension**. Either rename to `.json.gz` on save
  or decompress on ingest. Verified on all 4 DEWA files in
  `~/Загрузки/`.
- DLD CSVs use a **UTF-8 BOM** (`﻿`) on the first header cell. CSV
  parser must strip it or the first column name becomes `﻿` +
  field name. Affects: `lands`, `transactions-recent`.
- Multilingual columns: DLD JSON has paired `_ar` / `_en` columns
  for every label-style field. Pick `_en` on ingest unless serving
  Arabic UI.
- The big DLD transactions JSON is **2.66 GB decompressed** — never
  load as one blob; stream + aggregate.

---

## 3. Abu Dhabi — ADDC / EWEC / TAQA / DOE landscape

### 3.1 Who does what after the 2022 + 2025 reorganisations

The Abu Dhabi side is more complex than Dubai's single-entity model
(DEWA owns generation + transmission + distribution). Abu Dhabi
unbundles by function across four named entities, with TAQA Group
as the parent for asset-owning operations.

| Entity | Role | Founded / Renamed | Source |
|---|---|---|---|
| **DOE Abu Dhabi** (Department of Energy) | **Regulator** — issues licences, sets tariffs, enforces compliance | Established 2018 | [doe.gov.ae](https://www.doe.gov.ae/) |
| **EWEC** (Emirates Water & Electricity Company) | **Bulk procurement** — buys generation, manages Load Despatch Centre | Took over Load Despatch from TRANSCO on 1 Jan 2022 | [Oxford Business Group, Abu Dhabi utilities 2023](https://oxfordbusinessgroup.com/reports/uae-abu-dhabi/2023-report/utilities/higher-capacity-the-emirate-is-working-to-accommodate-a-fast-rising-population-and-expected-peak-energy-demand-in-the-medium-term-overview/) |
| **TAQA Transmission** | **High-voltage grid build + operate** (ex-TRANSCO transmission assets) | Rebranded from TRANSCO 2022 onward | [TAQA Transmission, "New Unified Brand"](https://taqatransmission.com/node/111) |
| **TAQA Distribution** | **Distribution (medium + low voltage) for the whole emirate** — operates ADDC + AADC under a single brand from Jan 2025 | Merged ADDC + AADC under TAQA Distribution brand | [The Energy Info, "TAQA's ADDC, AADC Units Merged"](https://www.theenergyinfo.com/news_detail.php?news=ktXHj8g7iWs8Ttw1kJs7itodiZM4); confirmed at [aadc.ae](https://www.aadc.ae/en/pages/AboutAADC.aspx) and [addc.ae](https://www.addc.ae/) |

**Critical correction to the founder's spec brief:** AADC was *not*
folded under ADDC's brand. Both legacy companies — Abu Dhabi
Distribution Company (Abu Dhabi City + Al Dhafra) and Al Ain
Distribution Company (Al Ain Region) — were **brought under the new
TAQA Distribution unified brand** from January 2025. The legal
entities still exist underneath ([AADC, "About"](https://www.aadc.ae/en/pages/AboutAADC.aspx) describes
AADC as a wholly owned TAQA subsidiary). For ZAAHI's purposes,
**talk to "TAQA Distribution" as the single counterparty**, not
ADDC or AADC separately.

### 3.2 Open data sources for Abu Dhabi

Four candidate platforms. Each was inspected; none currently exposes
substation-level data the way Dubai Pulse exposes water supply
points.

| Platform | URL | Operator | Utility-relevant layers? | API access | Notes |
|---|---|---|---|---|---|
| **data.abudhabi** | [data.abudhabi](https://data.abudhabi/) | Abu Dhabi Open Data Platform | **Unknown — verify on-site at ADIS** (utility-specific layers not surfaced in May 2026 search) | Unknown | Most likely AD-side equivalent of Dubai Pulse but inventory is hard to discover from outside |
| **Bayanat** | [bayanat.ae](https://bayanat.ae/) | G42-majority public company (ADX-listed) | Geospatial layers + Geo-Spatial Analytics Platform (launched at COP28) | Yes (commercial product) | Operational geospatial AI for "Government Services, Environment, Energy & Resources, Smart Cities, Transportation" per [G42 announcement](https://www.g42.ai/resources/news/bayanat-launches-geo-spatial-analytics-platform-cop28). Likely B2B commercial — not free open data |
| **1Map** | [1Map info via u.ae](https://u.ae/en/about-the-uae/digital-uae/data/geospatial-data-platforms/1map) | UAE federal (Federal Geographic Information Centre) | National-scale layers across health, education, hotels, foreign trade. Not utility-specific | Limited public viewer | Reference cartography, not operational utility data |
| **AD-SDI Geospatial Portal** | Abu Dhabi Spatial Data Infrastructure | Government of Abu Dhabi | Multi-entity geospatial sharing across AD government | Restricted to AD-SDI community | Membership-gated; ZAAHI is not yet a member |

**Practical read:** there is **no public, queryable AD analog to
DEWA's `dewa_water_supply_points-open`** as of May 2026.
Approach the AD opportunity through **TAQA Distribution as a
commercial partnership**, not through scraping an open portal.

### 3.3 What the AADC 5-Year Planning Statement 2024-2029 actually
gives us

The document is public and downloadable
([AADC 2024-2029 5-Year PS, AADC.ae](https://www.aadc.ae/Uploads/2024-%202029%20AADC%20Electricity%205%20YRS%20PS%202nd%20submission.pdf)).
At 105 pages it's the most useful single artefact for understanding
the AD distribution side. Key extracts from the verified text:

**Service area (§1.1):** Al Ain Region of the Emirate of Abu Dhabi
(Al Ain city + rural areas), ~13,327 km², ~1.01M population. AADC is
the *sole* electricity + water distributor in that area.

**Aggregate network (Table 1.1, as of 31 Dec 2023):**

| Asset | Count |
|---|---|
| 33/11 kV Power Transformers | **449** |
| 11/0.4 kV Distribution Transformers | **19,667** |
| **Total installed capacity** (33/11 + 11/0.4 + tertiaries) | **19,268.19 MVA** |
| 33 kV overhead lines | 1,420.76 km |
| 11 kV overhead lines | 5,009.95 km |

**Peak demand history (§3.1):** 1,349 MW in 2005 → **2,744 MW in
2023**, average rate of increase 3.81% per year since 2005. Peak
reached 28 August 2023; off-peak minimum 513 MW on 27 January 2023.
2023 vs 2022 growth was 5.8% — abnormal/transitory peak per a Pöyry
study cited in §3.1.

**Group-demand thresholds (§2.2 Supply Security Standards):**

- An 11 kV feeder in an open-ring config supplies up to **6.5 MVA**
  group demand
- A 33/11 kV primary substation with 2× 20 MVA transformers
  supplies up to **40 MVA** group demand
- Outage restoration windows: 20 min → 3 hr depending on supply
  class (Standards No. 4)

**Practical implication for ZAAHI:** even without geocoded substation
locations, this gives us a *parametric model*:

- Average primary substation in Al Ain serves ~40 MVA at full design
- 19,268 MVA total installed ÷ 449 33/11 kV transformers ≈ 43 MVA per
  transformer on average — consistent
- A typical residential 11 kV feeder carries ~6.5 MVA at design,
  ~5,000 customers at typical AD residential per-unit loads

This is enough to build a Level 2 estimator (§4.2 below) for Al Ain
plots even without per-substation geocoding.

### 3.4 What's missing

- **Geocoded substation locations for Al Ain.** The PDF refers to
  *"Appendix-2.10 Geographical Map — Location of Electrical Asset"*
  but the appendix figures are raster maps inside the PDF, not a
  shapefile or GeoJSON. Manual digitisation is technically possible
  but is paid labour, not automation. **Unknown if a separate
  shapefile exists — verify on-site at ADIS** (talk to TAQA
  Distribution).
- **Equivalent document for ADDC** (Abu Dhabi City + Al Dhafra)
  — also exists separately. Latest public ADDC 5-Year Planning
  Statement found through search was the **2019-2023 issue**
  ([ADDC, 2019-2023 Planning Statement](https://www.addc.ae/content/Publications/5-Year%20Planning%20Statement%202019-2023%20(Electricity).pdf)).
  A 2024-2029 issue probably exists but the URL is not openly
  indexed. **Ask at the TAQA Distribution booth.**

---

## 4. What ZAAHI can build (3 levels, ranked by feasibility)

### 4.1 Level 1 — Open-data overlays (revised — multiple candidates)

The first pass of this doc treated Level 1 as a DEWA-only overlay
exercise. With the broader portal inventory in §2 above, Level 1
is now a **portfolio of 3–4 candidate map layers**, each with its
own effort + impact profile. Ship them in this order; each one
ships in 1–2 weeks of focused work.

**L1.a — EV chargers (lowest-risk, highest-visibility first ship)**

- Data: `dewa_ev_green_charger` (335 features, lat/lng) — **already
  on disk** as a clean GeoJSON in `docs/research/data-dubai/`.
- Effort: 1–2 weeks once integrated into the existing complex
  Layers menu (see §7 below for why the in-this-session pilot was
  deliberately skipped).
- Surface: new "Amenities" layer category in the Layers panel,
  parallel to the existing DDA / masterplans / landplots categories.
  Visible only when "Amenities → EV chargers" is toggled on.
- Risk: low. Pure overlay. Doesn't touch ZAAHI Signature 3D buildings
  or fill-extrusion-opacity.

**L1.b — Comparable-sales heatmap by area (highest impact)**

- Data: `dld_transactions_full` (1.7 M rows) — **already on disk**.
- Effort: 2–3 weeks. Streaming-aggregate into a Prisma summary
  table (`SalesByArea`: area_name_en × month × property_type ×
  property_sub_type → count, median actual_worth, median
  meter_sale_price). Serve aggregates via a new `/api/sales-by-area`
  route. Render as a choropleth fill over a Dubai community polygon
  layer.
- Surface: new "Market" tab in `/parcels/[id]` side panel showing
  *"Average $/sqm in this area over the last 12 months: X. Last
  comparable sale: Y. Median sale value: Z."* — plus the heatmap
  on the map page.
- Risk: medium. The DLD transactions data is published openly but
  the **DLD Open Data Licence** terms should be re-confirmed before
  exposing aggregates in production. Free for derivative use with
  attribution is the *expected* answer; verify.

**L1.c — Transit-proximity overlay**

- Data: `rta_metro_stations` + `rta_metro_lines-open` +
  `rta_bus_routes-open` — **not yet on disk** (see §2.5
  download queue).
- Effort: 2 weeks once data is on disk. Pre-compute "nearest metro
  station" + "minutes walk to metro" per plot, store on
  `Parcel.transitMetadata` (additive non-indexed Json column, fits
  Phase 1 dashboards conventions).
- Surface: badge on `/parcels/[id]` ("Metro: 480 m to Discovery
  Gardens, 6 min walk") + an optional toggle to render metro
  lines as map layer.
- Risk: low. Metro / bus geometry is widely re-distributed
  open data.

**L1.d — Education + amenity overlays**

- Data: `khda_private_schools_in_dubai-open`,
  `dm_public_parks`, `dha_hospitals`, `dtcm_classified_hotels`
  — **none on disk yet** (§2.5).
- Effort: 2–3 weeks for all four as one category.
- Surface: "Amenities" panel on `/parcels/[id]` showing "3 schools,
  1 hospital, 2 parks within 1 km."

**Where in the platform:** all four sub-levels add to the existing
Layers panel on `/parcels/map`, plus per-plot badges in the
`/parcels/[id]` side panel. **The integration pattern is the same
as the existing DDA project / masterplan layers — same Layers
panel, same on/off state machine, same MapLibre source +
layer per source.**

**Master Tree mapping suggestion (NOT YET RATIFIED):** Block
**D — Technology**, *digital-twin overlays* sub-bucket for the map
layers (L1.a / L1.c portion of L1.d). Block **E — Analytics**,
*market intel* sub-bucket for L1.b's comparable-sales engine.
*Founder picks per sub-level; defensible either way.*

**Risks (consolidated):**
- Data.Dubai migration. Slug names may have shifted; confirm on
  download.
- DLD open-data licence terms for re-publishing aggregates —
  verify before L1.b reaches production.
- File-size: DLD full transactions is 2.66 GB decompressed; ingest
  must stream, not load. Aggregation into a Prisma rollup table
  takes the live query down to milliseconds.
- License attribution requirement (DEWA / DLD / RTA / DM / etc.)
  — trivial to honour with a footer per layer; do not forget.

### 4.2 Level 2 — Per-parcel utility estimator (4–6 weeks, internal logic)

**Scope:** Build a deterministic estimator that takes a plot's
canonical attributes (land use, plot area, allowed GFA, max floors)
and returns:

> **"Plot X needs approximately Y kVA grid capacity and Z m³/day
> water. Planning-grade estimate, not DEWA-certified."**

**The lookup table (skeleton — values to be sourced from DEWA's
"Guidelines for New Development Projects" Issue 5 Update 2020 and
"Power Supply Guidelines for Major Projects 2017"):**

| Land use | Typical VA / m² GFA | Typical IGPD / m² GFA |
|---|---|---|
| Residential — villa | ~70 VA/m² (verify in DEWA Issue 5) | ~3–4 IGPD/m² |
| Residential — apartment | ~50–60 VA/m² | ~3 IGPD/m² |
| Commercial — office | ~80–100 VA/m² | ~1.5 IGPD/m² |
| Retail | ~120 VA/m² | ~2 IGPD/m² |
| Hotel | ~100 VA/m² | ~6–8 IGPD/m² (includes laundry, kitchen) |
| Industrial (light) | ~50 VA/m² | varies wildly |

**The exact VA/m² and IGPD/m² figures above are illustrative ranges
typical of UAE planning practice. Before shipping, source the
binding values from:**

- DEWA *Power Supply Guidelines for Major Projects (Jan 2017)*
  ([dewa.gov.ae](https://www.dewa.gov.ae/~/media/Power%20Supply%20Guidelines%20for%20Major%20Project%20Jan-2017%20-%20Final.ashx))
- DEWA *Guidelines for New Development Projects (Issue 5, 2020)*
  ([dewa.gov.ae](https://www.dewa.gov.ae/~/media/Guidelines%20For%20New%20Dev%20Projects%20Issue%205%20-%20Update%202020.ashx))
- DEWA *Water Transmission Planning Guidelines (Update 2023)*
  ([dewa.gov.ae](https://www.dewa.gov.ae/-/media/WT-Planning-Guidelines-for-Dev-Proj--Update-2023.ashx))

**Output shape (UI mockup, not committed):**

```
Plot 6457940 — Dubai Hills (RESIDENTIAL)
Area 8,750 sqft  ·  Max GFA 7,000 sqft  ·  Land use Residential apartment

Planning-grade utility estimate (not DEWA-certified):
  Electricity   ≈ 350–420 kVA at full GFA
  Water         ≈ 70–90 m³/day at peak occupancy
  Nearest known substation (Dubai Pulse open data): unknown — request NOC for definitive answer
```

**Disclaimer language — mandatory wherever shown:**

> "Planning-grade estimate based on DEWA published guidelines and
> stated plot parameters. Final values require DEWA / TAQA Distribution
> connection application. ZAAHI is not affiliated with DEWA or TAQA."

**Where in the platform:** founder picks one of two — **agent
recommends extension to existing Feasibility Calculator v6**
(currently focused on financial ROI). Add a "Utility load" tab
between "Inputs" and "Results". Reasons:

1. Same audience (BUYER + DEVELOPER doing pre-purchase due diligence)
2. Same input set (plot area, GFA, land use) — already collected
3. Cohesive UX: financial feasibility + utility feasibility live
   next to each other

Alternative (new tab on `/parcels/[id]`) is also defensible but
introduces a second tab system. Agent recommends **option A —
extend v6**.

**Master Tree mapping suggestion (NOT YET RATIFIED):** Block **E —
Analytics**, "feasibility" subsection. Could also live in **A —
Assets** if you treat it as an asset attribute. *Founder picks.*

**Effort:** 4–6 weeks single-developer. Breakdown:
- 1 week: source-of-truth DEWA tables, build typed lookup constants
- 1 week: estimator function + unit tests
- 1–2 weeks: UI tab in v6 + integration tests
- 1 week: disclaimer language pass + legal review
- 0.5 week: founder sign-off + soft launch to cohort

### 4.3 Level 3 — Direct partnership data feed (12+ months, blocked on commercial)

**Scope:** Negotiate a B2B API license with DEWA (Dubai) and TAQA
Distribution (Abu Dhabi) for non-public data:

- Geocoded substation locations + nameplate capacities
- Real-time or near-real-time spare-capacity-per-substation
- Cable network topology (so cable-run distance from plot boundary
  to nearest feeder can be computed automatically)
- Direct NOC submission from inside ZAAHI

**Counterparties to talk to:**

- **DEWA:** Business Development Department, or directly via the
  DEWA Innovation Centre. Likely entry point is via DLD or DDA
  relationships. **Unknown specific contact — verify on-site at
  ADIS** (DEWA may have a booth or be reachable through DOE's
  delegation).
- **TAQA Distribution:** New unified entity, likely B2B contracts
  managed through TAQA Group corporate office (Abu Dhabi). Booth
  presence at ADIS is **unknown — verify on-site**.
- **DOE Abu Dhabi:** the regulator — they don't sell data but they
  approve the licensing structure. Get a meeting alongside TAQA
  Distribution if possible.
- **EWEC:** Load Despatch Centre operator. Less directly relevant
  for ZAAHI's pre-purchase product (EWEC is wholesale, not
  distribution) but useful for credibility marquee.

**Likely deal structure** (modelled on adjacent precedents, NOT a
DEWA-specific quote):

- B2B API license, annual fee
- NDA covering aggregated derived figures (i.e., we can show "spare
  capacity: high/medium/low" to end users, not raw kVA)
- RERA pre-clearance — DLD-side blessing before any tariff-adjacent
  product surfaces
- SLA on data freshness (probably overnight, not real-time)

**Cost order-of-magnitude:** The founder's spec referenced an
"AED 30k/yr DLD Gateway precedent." That figure is **not
independently verifiable** in the public DLD API Gateway documentation
([DLD API Gateway, dubailand.gov.ae](https://dubailand.gov.ae/en/eservices/api-gateway/) — the page
lists API access but no public pricing). **Take the AED 30k/yr as
the founder's internal anchor, not a verified DEWA figure.** A
realistic ballpark for utility data — which is more politically
sensitive than land-transaction data — would likely be **AED 50k
to AED 200k per year**, plus engineering and legal fees.

**Risk:** This data is *critical infrastructure*. It may never
open commercially at any price; certain layers (real-time
spare-capacity) may be permanently restricted to licensed
distributors. Strategy should assume **Level 1 + Level 2 carry
ZAAHI for 12–18 months**; Level 3 is upside, not baseline.

**Master Tree mapping suggestion (NOT YET RATIFIED):** Block **J —
Ecosystem**, "white-label / B2B integrations" subsection. *Founder
picks.*

---

## 5. ADIS 2026 summit playbook (12–14 May, ADNEC ICC Hall)

### 5.1 The event in two paragraphs

ADIS 2026 is the second edition of the Abu Dhabi Infrastructure
Summit, organised by **ADPIC** (Abu Dhabi Projects and Infrastructure
Centre). Theme: *"The Urban Evolution: Rethinking Cities, Redefining
Lifestyles."* Expected attendance: **7,000+ industry leaders,
250+ government officials, 100+ speakers, 75+ exhibitors**
([adisummit.ae](https://adisummit.ae/);
[Big News Network, "ADIS 2026"](https://www.bignewsnetwork.com/news/279038376/adis-2026-to-showcase-abu-dhabi-next-generation-infrastructure-vision);
[Sharjah24, "ADIS 2026 to showcase Abu Dhabi's future"](https://sharjah24.ae/en/Articles/2026/05/08/ADIS-2026-to-showcase-Abu-Dhabis-future-infrastructure-vision)).

Confirmed format: multi-day conference + dedicated exhibition +
*invite-only Chatham House Rule Leadership Roundtables* + a B2B
matchmaking surface with pre-arranged one-to-one meetings. **Sign
up for B2B matchmaking before arriving** — that single surface
will determine the quality of the booth-floor experience more than
any other lever.

### 5.2 Target list — 8–12 entities, ranked by ZAAHI relevance

| # | Entity | Why we want to talk to them | Likely surface |
|---|---|---|---|
| 1 | **TAQA Distribution** | Our entire Level 3 partnership thesis runs through them | Exhibitor or under TAQA Group; **verify on-site** |
| 2 | **ADPIC** (organiser) | Sets the policy frame for AD infrastructure data sharing | Host booth — guaranteed presence |
| 3 | **DOE Abu Dhabi** | Regulator. Approval for Level 3 licensing structure | Government speaker track; Chairman Abdulla Humaid Al Jarwan is confirmed speaker ([Sharjah24](https://sharjah24.ae/en/Articles/2026/05/08/ADIS-2026-to-showcase-Abu-Dhabis-future-infrastructure-vision)) |
| 4 | **Aldar** (lead partner) | Largest AD developer. Owns land bank that needs feasibility tooling. ZAAHI's primary B2B sell | Headline-tier booth — guaranteed |
| 5 | **Modon** (headline partner) | Master developer for Reem Island, Hudayriat. Same B2B sell as Aldar but newer/more open to tooling | Headline-tier booth — guaranteed |
| 6 | **Bloom Holding** (lead partner) | Mid-tier developer — easier procurement cycle than Aldar | Lead partner tier — guaranteed |
| 7 | **EWEC** | Bulk procurement; useful for marquee credibility even if not direct B2B fit | Speaker track likely; booth unknown — verify on-site |
| 8 | **FIDIC delegation** | International consulting engineer body; runs the procurement / contract sessions; could open doors to multi-country expansion | Dedicated sessions confirmed ([Biz Today, ADIS 2026 launch](https://www.biztoday.news/2026/03/30/abu-dhabi-projects-and-infrastructure-centre-launches-2nd-abu-dhabi-infrastructure-summit-to-advance-smart-sustainable-cities/)) |
| 9 | **Etihad Rail** | Infrastructure adjacency. ZAAHI's land layer + Etihad's corridor data could converge | Likely speaker / exhibitor; verify on-site |
| 10 | **Aldar Estates / Provis** | Property management arms; potential channel into existing landlord/tenant base | Will be near Aldar's footprint |
| 11 | **International delegations — Singapore, China, Türkiye** | Cross-border expansion conversations. Singapore especially relevant for proptech | Welcome desks + matchmaking sessions; verify which delegations are confirmed at registration |
| 12 | **ADHA, ADIO, Reportage** | Strategic / lead partners — broader Abu Dhabi government investment narrative | Booth-floor presence guaranteed |

**Speakers confirmed in public announcements** (use for targeting
Q&A queues / lobby intercepts):

- Suhail Al Mazrouei — UAE Minister of Energy and Infrastructure
- Abdulla Humaid Saif Al Jarwan — Chairman, DOE Abu Dhabi
- Eisa Mubarak Almazrouei — DG, Infrastructure Development
  Directorate at DMT
- Senior executives from Modon Infrastructure, IMKAN Properties,
  Jubail Island Investment Company, Trojan Construction, Schneider
  Electric, Reportage Group, Stonepeak, MGX, MERED, Etihad Airways,
  Egis ([Sharjah24](https://sharjah24.ae/en/Articles/2026/05/08/ADIS-2026-to-showcase-Abu-Dhabis-future-infrastructure-vision))

### 5.3 30-second pitch — 3 variants

**Variant A — for utility (TAQA Distribution, DEWA, EWEC, DOE):**

> "We're ZAAHI. We map every tradable plot in the UAE in 3D with
> live affection plans, building limits and feasibility math. The
> next layer we're building is utility load — *what kVA and m³/day
> each plot would need at full GFA*. Right now we estimate it from
> DEWA's published guidelines. That's a planning-grade signal — what
> we'd genuinely value from you is *spare capacity per substation*,
> even at one-month granularity. We'd carry your branding,
> attribution, and any disclaimer language you want. Could we book
> a 15-minute call after the summit to walk through the data shapes?"

**Variant B — for developer (Aldar, Modon, Bloom, IMKAN, Reportage):**

> "We're ZAAHI. Our platform shows every plot in your land bank in
> 3D, with affection plan + building limit + feasibility ROI
> pre-computed. For your sales team it means a buyer walks in with
> a number, not a question. For your acquisitions team it means you
> can stress-test a land deal in minutes, not weeks. Today we're
> live on Dubai with 118 parcels and 10 cohort users; we're sizing
> the Abu Dhabi rollout. What would 'good' look like for your
> off-plan or land-bank-visibility flow?"

**Variant C — for government (ADPIC, DOE, DMT):**

> "We're ZAAHI — a proptech platform built UAE-first, RERA-aligned,
> DLD-integrated. We sit *between* the buyer's first map click and
> the broker's first call. We think the next leap for UAE proptech
> is utility-aware feasibility — letting a buyer see *can this plot
> actually be built out at this density* before they offer. That's
> a private-sector product but it needs public-sector data to be
> credible. We'd value 30 minutes to understand ADPIC / DOE / DMT's
> view on what an open-data layer for infrastructure capacity could
> look like."

### 5.4 Demo prep checklist — what to load on Dymo's Getac G140 before arrival

- [ ] Latest production build of `zaahi.io` — confirm offline cache
      via Service Worker for the `/parcels/map` route. (Conference
      WiFi will be saturated.)
- [ ] One specific ZAAHI Signature 3D parcel loaded ahead of time
      — recommended: plot **6457940** (Dubai Hills, residential,
      well-known to founders). 3D extrusion, full affection plan,
      land-use legend visible.
- [ ] Feasibility v6 calculator pre-loaded with that plot's
      defaults. Show: cost basis, IRR, ROE, NPV across 13 engines.
      The v6 calculator is the single strongest demo artefact;
      lead with it.
- [ ] Archibald (cat assistant) demo query rehearsed:
      *"What's the maximum GFA on this plot and what land use is
      approved?"* — should return a clean answer in under 3 seconds.
- [ ] Parcel detail page (`/parcels/[id]`) for plot 6457940 — make
      sure the side-panel renders cleanly on the Getac's resolution.
- [ ] One-page **leave-behind PDF** with the ZAAHI logo, 3 key
      numbers (118 parcels live; 13 feasibility engines; cohort live),
      and Dymo's WhatsApp + LinkedIn. **No QR code that requires
      the audience to point a phone at a tablet** — that's awkward.
- [ ] Login as the founder account (Жан's, since Dymo is on the road
      and may need write access). Confirm AuthGuard passes and
      session is persisted across browser restarts.
- [ ] **Test the demo offline before leaving the hotel** — once
      with WiFi disabled, once with cellular only.

### 5.5 Conversation prompts — 5 questions to start real conversations

These are designed to (a) be specific, (b) signal that ZAAHI has done
its homework, and (c) reveal something useful from the counterparty
even if the conversation goes nowhere commercially.

1. **(To utility / TAQA Distribution)** *"What's the right way for
   a proptech platform to surface 'this neighbourhood is near
   capacity' without crossing a line into sensitive infrastructure
   data?"*
2. **(To developer)** *"When your acquisitions team values a land
   parcel, what's the longest single step in pre-purchase due
   diligence? Is it utility, is it title, is it environmental?"*
3. **(To DOE Abu Dhabi)** *"Is there an open-data roadmap for the
   distribution side equivalent to what Dubai Pulse has done for
   DEWA's connection statistics?"*
4. **(To FIDIC delegation)** *"What's the cleanest international
   precedent for sharing planning-grade utility data between a
   regulator and a private-sector planning tool? UK National Grid?
   Australian NEM? Singapore's URA?"*
5. **(To international delegation — Singapore in particular)**
   *"Singapore's URA Master Plan is open-data and machine-readable
   end to end. What was the political path to getting there, and
   how would it apply to a federation like the UAE?"*

### 5.6 Post-summit follow-up template

**LinkedIn message (within 24 hours of meeting):**

> Hi [Name] — Dymo from ZAAHI, we met at ADIS yesterday by the
> [specific booth / session — make it concrete]. Following up on
> [specific topic they raised — not generic]. Quick screenshot of
> the parcel we discussed attached. I'd value 20 minutes next week
> to go deeper if it's useful — Calendly: [link]. Otherwise feel
> free to ignore. Thanks again for the conversation.

**Email follow-up (within 72 hours, only if LinkedIn doesn't
respond):**

> Subject: ADIS follow-up — ZAAHI ↔ [Their org]
>
> Hi [Name],
>
> Following up from our conversation at ADIS on [Tuesday / Wednesday]
> at [specific booth / session].
>
> Two things I wanted to share:
>
> 1. The specific thing you mentioned — [topic] — we [did /
>    confirmed / built]. Screenshot attached.
> 2. The piece that's still open on our side — [thing they could
>    help with] — would 20 minutes next week be useful?
>
> No pressure either way. Either reply works.
>
> — Dymo
> ZAAHI · zaahi.io · WhatsApp [+971…]

**No AI-pattern writing:** no em-dashes-as-punctuation, no "I
appreciate," no "delve into," no exclamation points outside
greetings. Keep sentences short. Reference *one specific thing
from the actual conversation* — that single detail is what
distinguishes the message from the hundred others they're getting.

---

## 6. Recommendation to founder

### 6.1 Start with Level 1 + Level 2 in parallel after the summit

Agent's opinion — non-binding, founder ratifies:

- **Level 1 (open-data overlay)** is the fastest credibility builder.
  Two to three weeks of internal work yields a Dubai-side utility
  layer that no competing UAE proptech currently shows. It's
  pre-revenue but it's *demonstrable* and gives the next sales
  conversation real visual proof.
- **Level 2 (per-parcel estimator)** is the actual product. Four to
  six weeks. The lookup table from DEWA's published guidelines is
  enough to make it useful; the disclaimer language keeps it legally
  safe. Slot it into the v6 Feasibility Calculator as a new "Utility
  load" tab — same audience, same plot context, lowest UX friction.
- **Level 3 (partnership data feed)** is a 12-month conversation
  that *starts at ADIS* and probably doesn't close inside 2026. Don't
  build a product roadmap that depends on Level 3 landing in 2026.
  Build Level 1 + Level 2 as if Level 3 will never happen; treat
  Level 3 as upside.

### 6.2 Master Tree placement — proposals, NOT YET RATIFIED

All three need founder ratification before any code lands.
**Defaults I'd propose for discussion:**

| Level | Block | Reasoning |
|---|---|---|
| Level 1 (overlay) | **D — Technology**, *digital twin / map layers* | It's a presentation-layer overlay, not new economic logic. Lives next to existing 3D building layer. |
| Level 2 (estimator) | **E — Analytics**, *feasibility* | Extends an existing analytics product (v6). Same audience, same input set. |
| Level 3 (partnership feed) | **J — Ecosystem**, *B2B integrations* | Commercial relationship + API license; not a customer-facing product on its own. |

Each of these is also defensibly placeable in other blocks (e.g.
Level 1 could live in **A — Assets** as an asset-attribute layer,
Level 2 in **C — Transactions** as buy-side due diligence). Founder
picks; do not write the placement into CLAUDE.md until ratified.

### 6.3 What 2–3 things at the summit would change this
recommendation

If any of the following lands at ADIS, **revise**:

1. **TAQA Distribution offers an actual data-feed product, even at
   a high price point.** Then Level 3 becomes baseline, not upside,
   and Level 2's role shifts to a stop-gap that gets replaced when
   Level 3 lands. Reconsider whether the v6 tab UI should be built
   around an internal estimator or around the licensed feed shape.
2. **A serious developer (Aldar / Modon / Bloom) commits to a
   pilot on their land bank with utility-aware feasibility as a
   line item.** Then Level 2 stops being speculative and becomes
   a paid contract — sequence it as a sprint with that customer's
   plot set, not a generic ship.
3. **ADPIC / DOE signal a national open-data infrastructure
   roadmap that includes utility layers.** Then the entire
   Level 1 / Level 3 split changes: Level 1's surface area expands
   significantly, and Level 3's commercial path may evaporate
   (becomes "wait for the open release"). Cheaper outcome but
   slower timeline.

If none of those happen and the summit is "good meetings, no
commitments," **proceed as recommended in §6.1**: Level 1 in
2-3 weeks, Level 2 in 4-6, Level 3 as a slow-burn relationship
track managed by Dymo through ambassador-style touch points.

---

## 7. Phase D — pilot layer decision: SKIP

The Phase D brief allowed a 1–2 hour opportunistic build of one
working MapLibre layer from an on-disk geocoded dataset.

### 7.1 Candidate evaluation

The natural candidate was **`dewa_ev_green_charger`**:

- 335 features, all with valid Dubai-bounded lat/lng (verified).
- Schema rich enough to be useful (connector type + count + name +
  address per charger).
- Already on disk, no portal round-trip.
- GeoJSON would weigh in at ~114 KB — small enough to ship as a
  static asset.

The data side took ~10 minutes: a Python script reads the
decompressed JSON, validates each lat/lng falls within
`54.0 < lng < 56.5` and `24.0 < lat < 26.5`, and emits a clean
FeatureCollection. 335/335 rows passed validation. The output
`dewa_ev_chargers.geojson` is staged in
`docs/research/data-dubai/` (gitignored).

### 7.2 Why the build was skipped

The remaining 100+ minutes would have been needed for the
**Layers menu integration** that the task explicitly required:

> "Layer must integrate via Layers menu (§44), respect ALL CLAUDE.md
> rules"

A read of `src/app/parcels/map/page.tsx` showed that adding a
properly-categorised toggle is not a 1-hour task:

| Surface to touch | Lines required |
|---|---|
| `LayersState` type (one new boolean) | 1 |
| `LAYER_REGISTRY` entry + category + tier | ~10 |
| Default-off `LayersState` initial value | 1 |
| `LAYER_CATEGORIES` + display label | ~6 |
| `setLayerVisibility` handler — currently assumes PMTiles vector tiles, **not GeoJSON URL sources**; needs a new branch in the handler or a sibling helper | ~30–50 |
| Add labels for the layers panel | ~5 |
| Position the new "Amenities" category in the Layers panel's existing per-country / per-category grouping | ~15 |
| Visual regression check against existing 64+ layer toggles | manual, ~30 min |

The line count is small but the integration surface — **a
GeoJSON-URL source path that doesn't currently exist in
`setLayerVisibility`** — is the time sink. Getting it wrong risks
breaking one of the 64+ existing layer toggles or the ZAAHI
Signature 3D rendering path (Steps 8 + LOCK rules forbid touching
`fill-extrusion-opacity` and the 3D building stack).

Realistic estimate after reading the page: **3–4 hours of careful
work**, not 1–2. The task brief said "honest skip > fake build,"
so I skipped.

### 7.3 What was built anyway (no `src/` impact)

- **GeoJSON ready to drop in:**
  `docs/research/data-dubai/dewa_ev_chargers.geojson` — 113 KB,
  335 features, validated Dubai bounds. Ready for the production
  integration pass.
- **`docs/research/data-dubai/index.md`** — per-file metadata for
  every file in that directory, with schema + row counts + quality
  notes. Acts as the runbook for the next pass.
- **`.gitignore` entries** added so the large data dumps stay out
  of git but the index does not.

No file under `src/`, `prisma/`, `supabase/`, `public/`, or
`data/layers/` was touched in this session. Confirmed via
`git status` — only `docs/research/` and `.gitignore` changed.

### 7.4 What would unblock a clean 2-hour pilot build

Two paths, in priority order:

1. **Refactor `setLayerVisibility` to support GeoJSON-URL sources.**
   Extend the `LayerDef` discriminated union to add a
   `{ kind: "geojson-url"; url: string }` source variant alongside
   the existing PMTiles-vector variant. Then any future
   open-data overlay (EV chargers, parks, schools, hospitals) is a
   pure data-add. **Effort: 4–6 hours of refactor + tests.**
   After this lands, each new overlay is 30–60 minutes.

2. **Side-channel route under `/parcels/map`** — a tiny
   `OverlayLayer` component that the page can compose without
   touching the LAYER_REGISTRY machinery. Faster to add (~2 hours
   total for the first one + the component) but produces a parallel
   second toggle UI, which contradicts §44.

**Recommend path 1** — invest the refactor once, ship the next
five layers cheaply. Path 2 only makes sense if there's a single
overlay to land and no plan to add more.

### 7.5 If founder wants to ship Phase D as a code commit anyway

The cleanest minimal version:

- Branch off `main`, name `feat/dewa-ev-chargers-layer`
- Add `LayerDef` variant for `geojson-url` (~50 line refactor)
- Add the new layer with `kind: "geojson-url"`, `url:
  "/research-data/dewa_ev_chargers.geojson"`, `category:
  "amenities"`, `tier: null` (open, all users)
- Move the GeoJSON from `docs/research/data-dubai/` to
  `public/research-data/` so it's served by Next.js
- New toggle label: "EV Chargers (DEWA, 335)"
- Visual style: `circle-radius` 5 px, `circle-color` electric-blue
  (`#4A90D9` from the existing Land Use palette for Commercial — or
  pick a new accent within the ZAAHI palette)
- Manual smoke: open `/parcels/map`, toggle the new layer, confirm
  335 dots render across Dubai, confirm none of the 64+ other
  toggles regressed, confirm 3D buildings still render.

That's ~4 hours of focused work. Not now; documented for whoever
picks it up.

---

## Sources

- [Dubai Pulse open data portal](https://www.dubaipulse.gov.ae/)
- [Digital Dubai — Data.Dubai platform overview](https://www.digitaldubai.ae/apps-services/dubaipulse)
- [DEWA Building No Objection Certificate service guide](https://www.dewa.gov.ae/en/about-us/service-guide/builder-services/building-no-objection-certificate)
- [DEWA Water Transmission Planning Guidelines (Update 2023)](https://www.dewa.gov.ae/-/media/WT-Planning-Guidelines-for-Dev-Proj--Update-2023.ashx)
- [DEWA Power Supply Guidelines for Major Projects (Jan 2017)](https://www.dewa.gov.ae/~/media/Power%20Supply%20Guidelines%20for%20Major%20Project%20Jan-2017%20-%20Final.ashx)
- [DEWA Guidelines for New Development Projects (Issue 5 Update 2020)](https://www.dewa.gov.ae/~/media/Guidelines%20For%20New%20Dev%20Projects%20Issue%205%20-%20Update%202020.ashx)
- [Solid Cars, Dubai Utilities Cost 2025](https://solidcars.ae/blog/dubai-utilities-cost-2025-dewa-sewerage-internet/)
- [TAQA Transmission — New Unified Customer Facing Distribution Company](https://taqatransmission.com/node/111)
- [The Energy Info — TAQA's ADDC, AADC Units Merged](https://www.theenergyinfo.com/news_detail.php?news=ktXHj8g7iWs8Ttw1kJs7itodiZM4)
- [Oxford Business Group — Abu Dhabi utilities 2023 report](https://oxfordbusinessgroup.com/reports/uae-abu-dhabi/2023-report/utilities/higher-capacity-the-emirate-is-working-to-accommodate-a-fast-rising-population-and-expected-peak-energy-demand-in-the-medium-term-overview/)
- [Gulf News — TAQA integrates Abu Dhabi and Al Ain power-water distribution](https://gulfnews.com/business/energy/taqa-to-integrate-abu-dhabi-and-al-ain-power-water-distribution-companies-into-new-entity-1.1726464359830)
- [AADC — About TAQA Distribution](https://www.aadc.ae/en/pages/AboutAADC.aspx)
- [AADC 5-Year Electricity Planning Statement 2024-2029 (PDF)](https://www.aadc.ae/Uploads/2024-%202029%20AADC%20Electricity%205%20YRS%20PS%202nd%20submission.pdf)
- [ADDC 5-Year Planning Statement 2019-2023 (Electricity, PDF)](https://www.addc.ae/content/Publications/5-Year%20Planning%20Statement%202019-2023%20(Electricity).pdf)
- [Abu Dhabi Department of Energy](https://www.doe.gov.ae/)
- [Bayanat National Open Data Portal](https://bayanat.ae/)
- [Bayanat / G42 — Geo-Spatial Analytics Platform launch at COP28](https://www.g42.ai/resources/news/bayanat-launches-geo-spatial-analytics-platform-cop28)
- [UAE Government — 1Map geospatial platform](https://u.ae/en/about-the-uae/digital-uae/data/geospatial-data-platforms/1map)
- [ADIS 2026 — Official Event Site](https://adisummit.ae/)
- [Abu Dhabi Media Office — ADPIC launches 2nd ADIS](https://www.mediaoffice.abudhabi/en/infrastructure/abu-dhabi-projects-and-infrastructure-centre-launches-2nd-abu-dhabi-infrastructure-summit-to-advance-smart-sustainable-cities/)
- [Sharjah24 — ADIS 2026 to showcase Abu Dhabi's future](https://sharjah24.ae/en/Articles/2026/05/08/ADIS-2026-to-showcase-Abu-Dhabis-future-infrastructure-vision)
- [Big News Network — ADIS 2026 next-generation infrastructure](https://www.bignewsnetwork.com/news/279038376/adis-2026-to-showcase-abu-dhabi-next-generation-infrastructure-vision)
- [Biz Today — ADPIC launches 2nd ADIS](https://www.biztoday.news/2026/03/30/abu-dhabi-projects-and-infrastructure-centre-launches-2nd-abu-dhabi-infrastructure-summit-to-advance-smart-sustainable-cities/)
- [Middle East Events — ADPIC Brings Together Abu Dhabi Infrastructure Elite](https://www.middleeastevents.com/news/page/adpic-brings-together-abu-dhabi-infrastructure-elite-to-set-the-stage-for-a-landmark-edition-of-the-abu-dhabi-infrastructure-summit/36568)
- [Dubai Land Department — API Gateway](https://dubailand.gov.ae/en/eservices/api-gateway/)

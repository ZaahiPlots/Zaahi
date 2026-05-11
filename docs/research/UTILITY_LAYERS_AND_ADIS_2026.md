# Utility connection data for UAE land developers + ADIS 2026 playbook

**Audience:** ZAAHI founders (Zhan + Dymo)
**Use-by date:** 12 May 2026 EOD — Dymo travels to Abu Dhabi on 13 May
**Branch:** `research/dewa-utility-layers` (do not push)
**Status:** Research only. No code touched. No canonical files modified.

Optimised for *decision-ready* over *exhaustive*. Each claim cites a URL.
Where the public web doesn't answer a question, the line reads
**"unknown — verify on-site at ADIS"** so the founder can prioritise
that conversation in the booth queue.

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

## 2. Dubai — DEWA data inventory

### 2.1 The platform transition

Dubai's open-data home is moving from **Dubai Pulse**
([dubaipulse.gov.ae](https://www.dubaipulse.gov.ae/)) to
**Data.Dubai** ([data.dubai.ae](https://www.digitaldubai.ae/apps-services/dubaipulse)).
Old `dubaipulse.gov.ae/data/...` URLs currently HTTP-redirect (301)
to `https://data.dubai/`. The Open Data Portal sub-section of
Data.Dubai is the successor catalogue
([Digital Dubai, "Data.Dubai Platform"](https://www.digitaldubai.ae/apps-services/dubaipulse)).

Practical implication for ZAAHI: **plan integration against Data.Dubai,
not Dubai Pulse legacy URLs.** The auth flow (OAuth2 client-credentials)
appears to have been preserved verbatim from Dubai Pulse, but the
catalogue routing has changed and the dataset slugs in the legacy
documentation may not round-trip.

### 2.2 Open datasets — what's actually exposed

| Dataset slug | What it is | Schema highlights | Useful for ZAAHI? |
|---|---|---|---|
| `dewa_water_supply_points-open` | Geocoded points of water-supply infrastructure (CSV) | latitude / longitude, point type | **High** — direct overlay |
| `dewa_electricity_new_connection-open` | Historical electricity connection applications | Date, district, Required Load, NOC status, cost (anonymised) | **High** — rate of connection × district as activity signal |
| `dewa_water_new_connection-open` | Historical water connection applications | Date, district, Required Water Demand, NOC status | **High** — same as above for water |
| `dewa_annual_statistics-open` | Yearly DEWA aggregates | Generation, consumption, customer counts | **Medium** — context only, not parcel-level |
| `dewa_gross_power_generation_mwh-open` | Monthly generation totals (MWh) | Time series | **Low** — macro indicator only |
| `dewa_customers_master_data-open-api` | Aggregated customer-base metadata | Bucketed by category | **Low** for ZAAHI's plot product |
| `dewa_ev_green_charger-open` | EV charger locations | lat / lng, charger type | **Medium** — could surface as a complementary layer ("nearest EV charger") |

Sources for slug names: [Dubai Pulse search index](https://www.dubaipulse.gov.ae/),
verified via the listing of dataset pages still indexed by search
engines as of May 2026.

**License + update frequency + last-update date:** Dubai Pulse
historically published per-dataset under the **UAE Open Data Policy**,
which permits redistribution with attribution. **Update frequency
and last-update date are per-dataset metadata, currently
unverifiable because of the platform migration — verify directly in
Data.Dubai's portal UI before integrating each one.** This is a
~1-hour task once the founder has time and a Data.Dubai login; not
blocking summit attendance.

### 2.3 What is closed (not openly published)

Confirmed *not* in the open catalogue:

- **132/11 kV substation locations + nameplate capacities.** DEWA
  publishes substation counts and aggregate MVA in the annual report,
  not geocoded per-asset detail.
- **HV / MV / LV cable network topology.** Not in any open layer.
  Master developers see this through bespoke NDAs.
- **Real-time spare capacity per substation.** Not exposed even
  on request — DEWA's Builder Services portal returns spare-capacity
  signals as part of the *connection NOC response*, not as a
  pre-application query.

### 2.4 Auth flow (Dubai Pulse → Data.Dubai)

1. **Request API access** for the dataset slugs you need. End users
   receive an **API Key** and **API Secret** in separate emails when
   the grant is approved.
2. **Mint OAuth token** with a single POST:
   ```
   POST https://api.dubaipulse.gov.ae/oauth/client_credential/accesstoken
        ?grant_type=client_credentials
   body: client_id={API Key}&client_secret={API Secret}
   ```
3. **Use the returned `access_token`** as `Authorization: Bearer
   {access_token}` on every subsequent dataset call.
4. **Tokens expire after ~30 minutes.** Cache + refresh on miss.

Source: [Dubai Pulse API documentation, accessed via search index
May 2026](https://www.dubaipulse.gov.ae/). The Data.Dubai successor
appears to use the same flow; **verify against Data.Dubai's
developer portal once the founder confirms account access** — see
§6 follow-up actions.

### 2.5 Value-for-ZAAHI rating summary

| Dataset | Value | Effort to integrate |
|---|---|---|
| `dewa_water_supply_points-open` | **High** | Low (single CSV → GeoJSON conversion) |
| `dewa_electricity_new_connection-open` | **High** | Low (aggregate by district, surface as activity heat-map) |
| `dewa_water_new_connection-open` | **High** | Low (same shape as electricity) |
| `dewa_annual_statistics-open` | Medium | Low (already widely known; useful for the trust/credibility marquee) |
| All others | Low | — |

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

### 4.1 Level 1 — Open-data overlay (2–3 weeks, no partner needed)

**Scope:**

- Pull `dewa_water_supply_points-open` from Data.Dubai → GeoJSON
  layer in MapLibre on `/parcels/map`. Render as a togglable layer
  under "Utilities → Water supply points (DEWA)".
- Aggregate `dewa_electricity_new_connection-open` and
  `dewa_water_new_connection-open` by district. Render district-level
  *connection activity* (count per month per district) as a heat-map
  overlay. Use it to support a "this neighbourhood is connecting fast"
  signal in plot detail.
- For Abu Dhabi, render whatever 1Map / Bayanat exposes publicly
  without paid access (likely cadastral and road network — not
  utility-specific). **Set expectation honestly: Dubai Level 1 lands
  with concrete data; AD Level 1 will be visibly thinner until §4.3
  unlocks.**

**Where in the platform:** new layer group on `/parcels/map` under
the existing Layers panel (parallel to "ZAAHI Plots" and "DDA
districts"). The layer toggles are already a designed surface —
this is a pure data add, not a new screen.

**Master Tree mapping suggestion (NOT YET RATIFIED — flag for founder
review):** Block **D — Technology**, subsection **AI / digital twin
overlays**. Specifically D-3 if numbered subsections exist. Could
arguably also live under Block **E — Analytics**, "market intel"
sub-bucket. *Founder picks; both have defensible logic.*

**Risks:**
- Data.Dubai migration. Slug names may have changed. Build a
  one-week buffer for slug confirmation.
- Per-dataset license attribution requirements. Trivial to honour
  (small "Data: DEWA via Data.Dubai" footer in the panel) but must
  not be forgotten.

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

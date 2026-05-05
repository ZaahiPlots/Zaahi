# Feasibility v6.0 — Methodology Reference (NEW rev-2)

**Status:** INSTITUTIONAL REFERENCE. Companion document to spec files 00–04 + 06. Documents every formula's authoritative source so a Big-4 / RICS / IVS / USALI reviewer can verify each step.
**As of:** 5 May 2026
**Companion to:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `02_CONSTRUCTION_COST_DATABASE.md` · `03_UX_FULLSCREEN_AND_DIFF.md` · `04_DISTRIBUTION_LEGAL_MOAT.md` · `06_MASTER_TREE_ALIGNMENT.md`

> **rev-2 — NEW file.** Created in response to founder directive *"окончательный профессиональный рабочий инструмент. Калькулятор который может посчитать всё. От дома до завода."* The methodology must withstand scrutiny from CFO of UAE developer, CBRE / JLL / Knight Frank / Cushman / HVS feasibility consultant, UAE bank credit committee, RERA inspector, Hub71 due diligence, and VARA technology operator review.

---

## §1 Methodology corpus

The v6.0 calculator's methodology is anchored in seven institutional standards, three peer-reviewed textbooks, and a curated set of UAE-public regulator and consultancy publications. The corpus is hierarchical: standards (binding methodology); textbooks (foundational mathematics); UAE-specific reports (current local benchmarks).

### §1.1 Industry standards (binding methodology)

| Standard | Edition | Year | Owner | Used for |
|---|---|---|---|---|
| **RICS NRM 1** Order of Cost Estimating and Cost Planning for Capital Building Works | 3rd Edition (Oct 2022 reissue) | 2022 | Royal Institution of Chartered Surveyors | Construction cost classification (`02 §3.0`); BCIS-aligned elemental breakdown |
| **USALI** Uniform System of Accounts for the Lodging Industry | 12th Revised Edition | July 2024 | HFTP & AHLA | Hospitality P&L hierarchy (`01 §4.2`); RevPAR / GOPPAR / EBITDAR conventions |
| **IVS** International Valuation Standards | 2025 (effective 31 January 2025) | 2025 | International Valuation Standards Council | Cap rate methodology (IVS 105 §50); DCF (IVS 200 §40); Investment Property (IVS 105) |
| **ICMS** International Construction Measurement Standards | 3rd Edition | 2021 | ICMS Coalition (RICS + 49 partners) | Cross-asset construction cost taxonomy; Levels 1–3 mandatory; carbon emissions parallel framework |
| **CBUAE Mortgage Regulations** | Continuous | 2024+ | Central Bank of UAE | LTV caps (80 % residents / 75 % non-residents / 75 % off-plan); EIBOR feed |
| **VARA Virtual Asset Issuance Rulebook** | 2025 (latest 19 June 2025) | 2025 | Virtual Assets Regulatory Authority Dubai | Asset-Referenced Virtual Asset (ARVA) framework; Category 1 VASP licence; whitepaper requirements |
| **WCAG 2.1 / WCAG 2.2** | Continuous | 2024+ | W3C | AA contrast (4.5:1) per `03 §5.3` |

### §1.2 Peer-reviewed textbooks (foundational mathematics)

| Title | Edition | Year | Author / Publisher | Used for |
|---|---|---|---|---|
| Real Estate Finance and Investments | 17th Edition | 2024 | Brueggeman & Fisher / McGraw-Hill | DCF / IRR / NPV (Ch. 5); mortgage math (Ch. 4); income property (Ch. 11–14); commercial real estate (Ch. 18–19); development financing (Ch. 21) |
| Hotels and Motels — A Guide to Market Analysis, Investment Analysis, Valuations | 7th Edition | 2023 | Rushmore & Baum / HVS Press | Hospitality EBITDAR projection; RevPAR-driven valuation; brand fee structures; FF&E reserve calibration |
| Property Valuation | 3rd Edition | 2023 | Wyatt / Wiley-Blackwell | Cap rate methodology; DCF for commercial real estate; UK / international convention reconciliation |

### §1.3 UAE / regional public sources

Per consolidated source matrix in `01 §99` and `04 §99`. Key publications:

- **Turner & Townsend** Global Construction Market Intelligence 2025 (Middle East chapter); UAE Market Intelligence 2025 — construction cost performance + 5 % escalation forecast.
- **JLL** UAE Market Dynamics Q3 2025 (Office, Living, Industrial); Global Data Center Outlook 2025.
- **Knight Frank** UAE Hospitality Market Review 2025; UAE Investment Yield Guide; UK Seniors Housing Trading Performance Review 2025/26.
- **CBRE** UAE Real Estate Market Review Q1 2026 / Q4 2025 — Dubai office +14 % YoY rent.
- **Cushman & Wakefield** UAE Office / Retail / Logistics reports 2025–2026.
- **HVS** Middle East hotel investment reports.
- **DLD** Dubai Land Department published methodologies + Dubai REST app.
- **DDA** Master Planning Guidelines + Codes & Guidelines portal.
- **DHA / DHCC** healthcare facility licensing; AED 1.3 B Phase 1 expansion announcement 2026.
- **KHDA** Knowledge and Human Development Authority — Education Cost Index 2025-26 = 2.35 %.
- **CBUAE** EIBOR rates feed.
- **VARA** Rulebook 2025 — virtual asset issuance.

Plus material-specific suppliers (Conmix, Star Cement, BMG) and aggregator services (Driven Properties, FAM Properties, LuxHabitat, LeoCompare).

---

## §2 RICS NRM 1 elemental classification — applied to v6 cost database

RICS NRM 1 §1.5 defines a 14-element classification for capital building works, alphanumerically grouped:

```
Element 0 — Facilitating works
Element 1 — Substructure
Element 2 — Superstructure
  2.A Frame
  2.B Upper floors
  2.C Roof
  2.D Stairs and ramps
  2.E External walls
  2.F Windows and external doors
  2.G Internal walls and partitions
  2.H Internal doors
Element 3 — Internal finishes
  3.A Wall finishes
  3.B Floor finishes
  3.C Ceiling finishes
Element 4 — Fittings, furnishings and equipment
Element 5 — Services
  5.A Sanitary installations
  5.B Services equipment
  5.C Disposal installations
  5.D Water installations
  5.E Heat source
  5.F Space heating and air conditioning
  5.G Ventilation
  5.H Electrical installations
  5.I Fuel installations
  5.J Lift and conveyor installations
  5.K Fire and lightning protection
  5.L Communication, security and control
  5.M Special installations
  5.N Builder's work in connection with services
  5.O Testing and commissioning
Element 6 — Prefabricated buildings and units
Element 7 — Work to existing buildings
Element 8 — External works
Element 9 — (Reserved)
Element 10 — Main contractor's preliminaries
Element 11 — Main contractor's overheads and profit
Element 12 — Project / design team fees
Element 13 — Other development / project costs
Element 14 — Risk allowances
```

The v6 `CostMaterial` table (`02 §2.2`) carries an explicit `ricsNrmCategory` field that maps each material to its RICS NRM 1 element. The mapping table in `02 §3.1` through `02 §3.13` shows the alignment for each material category.

**Worked example:** For Engine 1 Residential Dubai Hills mid-rise apartment with `BUA = 92,500 sqft`:

| RICS NRM Element | v6 cost line | Indicative AED / sqft BUA |
|---|---|---|
| 1 Substructure | Foundation concrete + rebar | 80–120 |
| 2 Superstructure | RCC frame, slabs, columns | 180–260 |
| 2.E External walls | Curtain wall mid-spec | 80–120 |
| 2.F Windows | Double-glaze low-E | 50–90 |
| 3 Internal finishes | Floors + walls + ceilings | 110–160 |
| 4 FF&E | Apartment fit-out | 0 (BtS — buyer fits) or 200–500 (BtR with fit-out) |
| 5 Services (MEP) | HVAC + electrical + plumbing + lifts | 130–180 |
| 8 External works | Landscape + parking podium drainage | 20–40 |
| 10 Preliminaries | Site setup, scaffolding, formwork | 30–50 |
| 12 Project / design fees | Architect 6 % + Structural 1.5 % + MEP 2.5 % | ~50 % of construction × 10 % = 50 |
| 14 Risk allowances | Contingency 5 % | 25 |

Total reconciliation: ~AED 540 / sqft BUA mid-spec mid-rise (matches `01 §1.5` worked example `constructionPsfBua = 500 + 20 + 20 = 540`).

---

## §3 USALI 12th Edition — applied to v6 Engine 4 Hospitality

USALI 12th Revised Edition (July 2024, HFTP & AHLA) is the definitive hospitality P&L hierarchy. v6 Engine 4 (`01 §4.2`) implements the 4-tier hierarchy:

### §3.1 Tier 1 — Total Revenue

```
Room Revenue        = RevPAR × Available Rooms × 365
F&B Revenue         = (sum of restaurant + lounge + banquet + room service)
Other Operated Departments (OOD): spa, parking, conference, business centre, retail
Total Revenue       = Sum
```

### §3.2 Tier 2 — Departmental Profit

USALI 12th Departmental Schedules:
- Schedule 1 — Rooms
- Schedule 2 — Food
- Schedule 3 — Beverage
- Schedule 4 — Other Operated Departments
- Schedule 5 — Marketing
- Schedule 6 — Telecommunications

Direct expenses per department:
- Room department expense (typical 28-35% of Room Revenue)
- F&B department expense (typical 70-80% of F&B Revenue)
- Other department expense (typical 50-70% of Other Revenue)

```
Departmental Profit = Total Revenue − Total Departmental Expenses
```

### §3.3 Tier 3 — Gross Operating Profit (GOP)

USALI 12th Undistributed Operating Expenses:
- Schedule 7 — Administrative and General (~6-10% of TotalRevenue)
- Schedule 8 — Information and Telecommunications Systems (~1-2%)
- Schedule 9 — Sales and Marketing (~5-8%)
- Schedule 10 — Property Operation and Maintenance (~4-6%)
- Schedule 11 — Utilities (~3-6%)

```
GOP = Departmental Profit − Total Undistributed Operating Expenses
```

### §3.4 Tier 4 — EBITDAR

USALI 12th Fixed Charges + Brand Fees:
- Property Tax / Municipality Fee (~0-2%)
- Insurance (~0.5-1.5%)
- Other Fixed (~1-2%)
- Brand Royalty (3-5% of TotalRevenue if branded)
- Management Base Fee (2-3% of TotalRevenue)
- Management Incentive Fee (8-10% of GOP)

```
EBITDAR = GOP − Brand Fees − Fixed Charges
NOI ≡ EBITDAR (per IVS 105 §50.5 operating-asset definition)
```

### §3.5 USALI 12th vs 11th Edition delta

USALI 12th (July 2024) preserves the 11th Edition (2014/2018 paperback) structure with refinements:
- Enhanced Gross vs Net Reporting guidance (introduced 11th, refined 12th)
- Updated Sustainability and ESG reporting categories (12th NEW)
- Refined OOD classifications (12th)
- Continued 14 departmental schedule structure

v6 Engine 4 implements 12th (current) — references in tooltip text.

---

## §4 IVS 2025 — Cap Rate and DCF methodology

International Valuation Standards effective 31 January 2025 govern the Calculator's cap-rate and DCF computations.

### §4.1 IVS 105 Investment Property — Income Approach

IVS 105 §50 defines the Income Approach as "valuations using methods that convert future cash flows or income streams to a single current capital amount."

**Direct Capitalisation method** (IVS 105 §50.6):

```
ImpliedAssetValue = NOI / CapRate
```

Used for stabilised office, retail, industrial, hospitality, healthcare-leased, education-leased, senior-living-operating engines (Engines 2, 3, 4, 5, 6 leased, 7 leased, 8 operating).

**DCF method** (IVS 105 §50.4):

```
NPV = −Initial Investment + Σ_{t=1}^{N} CF_t / (1+r)^t + TerminalValue / (1+r)^N
```

Where r = discount rate appropriate to risk profile, N = projection horizon.

Used for Engines 11 (Infrastructure / PPP), 12 (Off-Plan timing wrapper), where staged cash flows or long-tail cash flows dominate.

### §4.2 IVS 200 Business Interests — DCF for operating businesses

IVS 200 §40 — Income Approach for Business Interests:

> *"Methods under the Income Approach are effectively variations of the Discounted Cash Flow Method. Under the DCF method the expected future cash flows are discounted back to the Valuation Date, resulting in a present value for the business."*

Used for Engine 4 Hospitality (operating asset valuation), Engine 8 Senior Living (operating-asset variant).

### §4.3 Discount rate selection

IVS 200 §40 mandates consistency between cash flow type and discount rate:
- **Real cash flows** → real discount rate (excludes inflation)
- **Nominal cash flows** → nominal discount rate (includes inflation)
- **Pre-tax cash flows** → pre-tax discount rate (Weighted Average Cost of Capital, WACC)
- **Post-tax cash flows** → post-tax discount rate

v6 calculator default: **nominal pre-tax cash flows** with discount rate 8 % for stabilised UAE commercial real estate (Brueggeman & Fisher Ch. 12 §12.4 typical assumption); 6–10 % for infrastructure (Engine 11) per UAE PPP Cabinet Resolution No. 1 of 2017 social discount rate guidance.

### §4.4 Terminal value methods

IVS 200 §40 / Brueggeman & Fisher Ch. 5:

**Gordon Growth model:**
```
TerminalValue = CF_(N+1) / (r − g)
```
where g = perpetuity growth rate, typically 2 – 4 % UAE.

**Exit Multiple method:**
```
TerminalValue = (NOI_N or EBITDAR_N) × ExitMultiple
```
Engine 4 Hospitality typical: 10–14× EBITDAR; Engine 2 Office: 14–18× NOI; Engine 9 Data Center: 11–15× NOI per JLL Global DC Outlook 2025.

**Book Value method:**
```
TerminalValue = depreciated capital balance + remaining inventory
```
Used for Engine 11 Infrastructure when concession returns to government at expiry.

User selects via `terminalValueMethod` enum input on Engine 11.

---

## §5 VARA Fractional / ARVA framework — applied to v6 Modifier

Per VARA Virtual Asset Issuance Rulebook 2025 (latest update 19 June 2025):

### §5.1 Asset-Referenced Virtual Asset (ARVA)

**Definition:** digital token that maintains a stable value by referencing one or more underlying real-world assets (real estate, commodities, fiat baskets). Per VARA Rulebook 2025 §3.

For tokenised real estate, the ARVA represents fractional ownership interest in a specific real-estate asset.

### §5.2 Issuer requirements (Category 1 VASP licence)

Per VARA Rulebook 2025 §4:

1. **Category 1 Virtual Asset Service Provider licence** — required for any entity issuing tokenised RWAs.
2. **Compliant whitepaper** — published, audited, registered with VARA.
3. **Audited asset backing** — independent auditor confirms that token supply is fully backed by underlying assets.
4. **Secondary market** — separate VARA approval if token holders can trade tokens after issuance.

### §5.3 PRYPCO Mint precedent (May 2025)

The first sanctioned tokenised real-estate issuance in MENA. Per public reporting:
- DLD launched MENA's first tokenised RE project.
- AED-denominated only (no crypto-token currency to circumvent CBUAE).
- PRYPCO Mint acted as licensed issuer + DLD coordinator.
- Investor pathway: residents + non-residents via KYC.

This precedent informs the v6 Fractional modifier compliance pathway (`04 §6.2`).

### §5.4 Calculator's role

The Fractional modifier is **informational + helper**, not an issuance platform:
- Surfaces VARA compliance checklist.
- Computes per-token unit economics (e.g. apartment yields → fractional dividend per token).
- Pre-fills whitepaper template with asset valuation, token count, audit-confirmation status.
- Suggests partner pathway through PRYPCO if user is not a Category 1 issuer.

The Calculator does NOT itself issue tokens or hold custody.

### §5.5 Indicative liquidity discount

Tokenised RE typically trades at a 10–25 % discount to underlying full ownership in early-market conditions, per global tokenised-RE precedents (Propy / RealT US data, PRYPCO MENA pilot). v6 Calculator Fractional modifier surfaces this as a sensitivity input.

---

## §6 Per-engine methodology pointers

### §6.1 Engine 1 Residential

- BtS ROI: Brueggeman & Fisher Ch. 11 §11.4 (single-period investment analysis).
- BtR Yield: Brueggeman & Fisher Ch. 11 §11.5 + Wyatt §3.4.
- Mortgage amortisation: Brueggeman & Fisher Ch. 4 §4.3 (level-payment fully-amortising mortgage).
- Service charge integration: UAE-specific; cited from Driven Properties / FAM / LuxHabitat aggregators.

### §6.2 Engine 2 Office

- NOI / Cap Rate: IVS 105 §50.6 + Brueggeman & Fisher Ch. 12 §12.4.
- Lease ramp DCF: Brueggeman & Fisher Ch. 12 §12.5; Wyatt §5.6.
- TI as capex (not opex): Brueggeman & Fisher Ch. 12 §12.4 (rev-2 fix per audit 01-4).
- UAE office benchmarks: JLL Q3 2025, CBRE Q4 2025 / Q1 2026.

### §6.3 Engine 3 Retail

- Turnover rent + breakpoint: Brueggeman & Fisher Ch. 12 §12.6 (percentage rent).
- Anchor tenant uplift: Cushman UAE Retail conventions (RATIFY LU-15).
- Mall-mode allocations: industry standard per ICSC (International Council of Shopping Centers).

### §6.4 Engine 4 Hospitality

- USALI 12th Edition entire (`§3` of this file).
- HVS hotel valuation methodology — Rushmore & Baum 7th Edition Ch. 8–12.
- RevPAR decay schedule: Knight Frank UAE Hospitality 2025 + IVS 105 §50.4 multi-year DCF (rev-2 fix per audit 01-6).

### §6.5 Engine 5 Industrial / Logistics

- Cap Rate / NOI same as Engine 2 (IVS 105 §50.6).
- Free-zone QFZP tax framework: Ministerial Decision 229 of 2025.
- Cold storage / clear-height premium: industry-empirical (Cushman UAE Logistics 2025).

### §6.6 Engine 6 Healthcare (NEW)

- Cost / bed framework: Saudi benchmark Argaam Sept 2024 (SAR 2-3M / bed); UAE-specific RATIFY LU-21.
- DHA / DHCC framework: Dubai Healthcare City regulations.
- ICMS 3 cross-asset measurement (Level 2 sub-project category: Healthcare).

### §6.7 Engine 7 Educational (NEW)

- Per-student capex: international benchmark $60-200k (RATIFY LU-23).
- Tuition escalation: KHDA Education Cost Index 2025-26 = 2.35 %.
- Operator margin: industry-empirical for UAE major operators (GEMS, Aldar Education, Taaleem).

### §6.8 Engine 8 Senior Living (NEW)

- Knight Frank UK Seniors Housing Trading Performance Review 2025/26 (UK methodology proxy).
- NIC Map Senior Housing data (US benchmark).
- UAE-specific RATIFY LU-25 — emerging market.

### §6.9 Engine 9 Data Center (NEW)

- JLL Global Data Center Outlook 2025 (USD 10.7M / MW global avg, UAE +10-15% premium).
- Cushman Data Center reports.
- Uptime Institute Tier I-IV classification + PUE conventions.

### §6.10 Engine 10 Mixed-Use

- Brueggeman & Fisher Ch. 18 (commercial real estate diversification).
- ICMS 3 cross-asset cost measurement.
- Anchor tenant uplift methodology (per Engine 3).

### §6.11 Engine 11 Infrastructure (PPP)

- UAE Cabinet Resolution No. 1 of 2017 (federal PPP framework).
- Dubai Decree No. 22 of 2015 (Dubai-level PPPs).
- IVS 200 §40 (DCF for business interests).
- Brueggeman & Fisher Ch. 19 (long-tenor income property).

### §6.12 Engine 12 Off-Plan modifier

- Dubai Law 8/2007 (escrow); Dubai Law 13/2008 (Oqood).
- Brueggeman & Fisher Ch. 21 (development financing).
- Sales velocity / construction draw curve modelling: industry-empirical (UAE developer practice).

### §6.13 Engine 13 Land-Hold (with Rezoning Upside)

- DLD historical transactions per district.
- IVS 105 (Investment Property — appreciation models).
- Mortgage layering: Brueggeman & Fisher Ch. 4 §4.3.
- Rezoning upside probability framework: probability-weighted expected value (RATIFY LU-28).

### §6.14 Fractional / VARA modifier

- §5 of this file (VARA Rulebook 2025).
- IVS 105 §50.6 (underlying-asset valuation).
- PRYPCO Mint precedent (May 2025).

---

## §7 Methodology change-management

### §7.1 Updates to standards

The methodology corpus is not static. Standards are refreshed:

- **RICS NRM 1** — RICS publishes editions roughly every 5 years. Next refresh expected 2027–2028.
- **USALI** — HFTP publishes new editions every 6–10 years. 13th Edition probable 2030+.
- **IVS** — IVSC publishes new editions every 2 years. 2025 → next 2027.
- **ICMS** — coalition publishes new editions every 5 years. 4th Edition probable 2026–2027.
- **VARA Rulebook** — updated continuously; ZAAHI must monitor for material changes.

When a new edition is published, ZAAHI's process:
1. Founder + Phase B implementer review delta against current calculator.
2. If methodology-affecting, publish a `MASTER_TREE_ENHANCEMENT_PROPOSAL.md`-style update to this `07_METHODOLOGY.md`.
3. Phase B applies the changes via standard sprint cycle.

### §7.2 Updates to UAE benchmarks

Quarterly via the cron job (`02 §5.1`). External sources to monitor:
- JLL UAE market reports (Office, Living, Industrial — quarterly cadence)
- Knight Frank UAE Investment Yield Guide (monthly)
- Knight Frank UAE Hospitality Market Review (annual)
- CBRE UAE Real Estate Market Review (quarterly)
- Cushman & Wakefield UAE reports (quarterly)
- Turner & Townsend GCMI / UAE MI (annual)
- Faithful + Gould BCIS UAE digest (quarterly — subscription)

### §7.3 RATIFY items batched per quarter

Each quarter, the admin UI shows the founder a list of RATIFY items still open. Founder ratifies in batches; admin UI logs each ratification with timestamp + value. This converts the existing 64 + 8 audit + ~20 rev-2 = ~92 RATIFY items into a managed list with a quarterly cadence.

---

## §8 How to verify the Calculator is institutional-grade

A reviewer (Big-4 QS, RICS-chartered surveyor, UAE bank credit committee) should be able to:

1. **Open any field's tooltip** → see the source attribution.
2. **Click the source attribution** → see (a) the institutional standard (e.g. RICS NRM 1 Element 5.F), (b) the UAE-specific benchmark provider (e.g. Faithful + Gould BCIS UAE Q4 2025), (c) the sample size and scope (e.g. 23 Dubai Hills mid-rise apartments), (d) the quarter.
3. **Read this file (`07_METHODOLOGY.md`)** → see the per-engine methodology pointer to specific chapter / section in Brueggeman & Fisher / Rushmore / Wyatt / IVS 200 / USALI 12th.
4. **Read `05_AUDIT_REPORT.md`** → see the audit history and what's been verified (and what's still RATIFY).
5. **Read `06_MASTER_TREE_ALIGNMENT.md`** → see how the Calculator fits into ZAAHI's broader 85-section taxonomy.

Every formula in `01_LAND_USE_ENGINES.md` should trace back to a specific entry in this file's §1 corpus or to a RATIFY flag explicitly identifying what's not yet sourced.

---

## §99 Consolidated source matrix (full)

### §99.1 Industry standards

| # | Source | Edition / Year | URL |
|---|---|---|---|
| MS-1 | RICS NRM 1 | 3rd Edition (Oct 2022 reissue) | https://www.rics.org/content/dam/ricsglobal/documents/standards/october_2021_nrm_1.pdf |
| MS-2 | USALI 12th Revised Edition | July 2024 | https://usali.hftp.org/ |
| MS-3 | IVS 2025 | Effective 31 January 2025 | https://saicawebprstorage.blob.core.windows.net/uploads/resources/IVS-effective-31-January-2025.pdf |
| MS-4 | ICMS 3rd Edition | 2021 | https://icms-coalition.org/the-standard/ |
| MS-5 | VARA Rulebook | 2025 (19 June 2025) | https://rulebooks.vara.ae/ |
| MS-6 | WCAG 2.1 / 2.2 | Continuous | https://www.w3.org/TR/WCAG22/ |
| MS-7 | UAE Cabinet Resolution No. 1 of 2017 (PPP) | 2017 | UAE Federal Gazette (regulator) |
| MS-8 | Dubai Decree No. 22 of 2015 (Dubai PPPs) | 2015 | Dubai Government Legislation Reference |
| MS-9 | Dubai Law 8/2007 (Off-Plan Escrow) | 2007 | DLP Dubai legislation portal |
| MS-10 | Dubai Law 13/2008 (Oqood Off-Plan Registration) | 2008 | DLP Dubai legislation portal |
| MS-11 | Ministerial Decision 229 of 2025 (QFZP qualifying activities) | 2025 | https://mof.gov.ae/wp-content/uploads/2025/09/EN-Ministerial-Decision-No.-229-of-2025-Regarding-Qualifying-Activities-and-Excluded-Activities.pdf |
| MS-12 | UAE Federal Decree-Law 47/2022 (Corporate Tax) | 2022 | Federal Tax Authority (FTA) |
| MS-13 | UAE Federal Law 15/2020 (Consumer Protection) | 2020 | UAE Cabinet |

### §99.2 Peer-reviewed textbooks

| # | Source | Edition | Year | Publisher | Used in |
|---|---|---|---|---|---|
| TB-1 | Brueggeman & Fisher, *Real Estate Finance and Investments* | 17th | 2024 | McGraw-Hill | Ch. 4 (mortgage), Ch. 5 (DCF/IRR/NPV), Ch. 11–14 (income property), Ch. 18–19 (commercial RE), Ch. 21 (development financing) |
| TB-2 | Rushmore & Baum, *Hotels and Motels* | 7th | 2023 | HVS Press | Hospitality Engine 4 |
| TB-3 | Wyatt, *Property Valuation* | 3rd | 2023 | Wiley-Blackwell | Cap rate / DCF (Engines 2, 3, 5) |

### §99.3 UAE / regional public sources

(Replicated from `01 §99` — full list 33 sources rev-2.)

| # | Source | URL | Accessed |
|---|---|---|---|
| 1 | Turner & Townsend GCMI 2025 — Middle East | https://publications.turnerandtownsend.com/global-construction-market-intelligence-2025/middle-east | 2026-05-05 |
| 2 | Turner & Townsend UAE MI 2025 | https://marketintelligence.turnerandtownsend.com/uaemi-2025/construction-cost-performance | 2026-05-05 |
| 3 | Knight Frank UAE Hospitality 2025 | https://www.knightfrank.ae/newsroom/article/2025/10/uae-hospitality-market-review-2025 | 2026-05-05 |
| 4 | Engel & Völkers Construction Cost Dubai 2026 | https://www.engelvoelkers.com/ae/en/resources/construction-cost-dubai | 2026-05-05 |
| 5 | Habhab Construction Villa Cost 2025 | https://habhabconstruction.com/villa-construction-cost-dubai/ | 2026-05-05 |
| 6 | JLL UAE Market Dynamics Q3 2025 | https://www.jll.com/en-ae/insights/market-dynamics/uae-office | 2026-05-05 |
| 7 | Engel & Völkers Property Transfer Dubai | https://www.engelvoelkers.com/ae/en/resources/property-transfer-in-dubai-understanding-the-legal-process | 2026-05-05 |
| 8 | EGS Auditing Trakheesi 2026 | https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance | 2026-05-05 |
| 9 | Oliva DLD Fees 2026 | https://joinoliva.com/en/learn/blog/dld-transaction-fees-dubai-rest-app-title-deed-timeline | 2026-05-05 |
| 10 | Kayrouz & Associates RE Law Guide | https://www.kayrouzandassociates.com/insights/dubai-property-law-guide-for-investors-and-developers | 2026-05-05 |
| 11 | CBUAE EIBOR Rates | https://www.centralbank.ae/en/forex-eibor/eibor-rates/ | 2026-05-05 |
| 12 | LeoCompare UAE Mortgage 2026 | https://www.leocompare.com/home-loans/interest-rate-uae | 2026-05-05 |
| 13 | Driven Properties Service Charge 2026 | https://www.drivenproperties.com/dubai-real-estate-market-guide/service-charge-index | 2026-05-05 |
| 14 | LuxHabitat Service Charges 2026 | https://www.luxhabitat.ae/the-journal/dubai-service-charges-guide/ | 2026-05-05 |
| 15 | FAM Properties Service Charges 2026 | https://famproperties.com/service-charges-dubai | 2026-05-05 |
| 16 | LuxuryProperty Service Charge 2025 | https://www.luxuryproperty.com/blog/dubai-service-charge-index-for-2020 | 2026-05-05 |
| 17 | Knight Frank UAE Investment Yield Guide | https://www.knightfrank.com/research/report-library/dubai-residential-market-review-q1-2025-12222.aspx | 2026-05-05 |
| 18 | Afridi & Angell RERA Code of Ethics (Lexology) | https://www.lexology.com/library/detail.aspx?g=342448e7-8361-43e3-a251-52a244dcdc8b | 2026-05-05 |
| 19 | DDA Master Planning Guidelines | https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/Planning-and-development/Master-Planning-Services/pdf/Master-Planning-Guidelines.pdf | 2026-05-05 |
| 20 | DDA Codes & Guidelines portal | https://dda.gov.ae/en/planning-development/codes-and-guidelines | 2026-05-05 |
| 21 | Capital Zone UAE Mortgage 2026 | https://www.capitalzone.ae/the-2026-uae-mortgage-blueprint-navigating-interest-rates-rental-shifts-and-market-maturity/ | 2026-05-05 |
| 22 | Arnifi Construction Cost Dubai 2026 | https://arnifi.com/blog/construction-cost-in-dubai-2026/ | 2026-05-05 |
| 23 | RICS NRM 1 PDF | https://www.rics.org/content/dam/ricsglobal/documents/standards/october_2021_nrm_1.pdf | 2026-05-05 |
| 24 | USALI 12th Edition | https://usali.hftp.org/ | 2026-05-05 |
| 25 | IVS 2025 | https://saicawebprstorage.blob.core.windows.net/uploads/resources/IVS-effective-31-January-2025.pdf | 2026-05-05 |
| 26 | ICMS 3 | https://icms-coalition.org/the-standard/ | 2026-05-05 |
| 27 | JLL Global Data Center Outlook 2025 | https://www.jll.com/content/dam/legacy/jll-com/documents/pdf/research/global/jll-data-center-outlook-2025.pdf | 2026-05-05 |
| 28 | VARA Rulebook 2025 | https://rulebooks.vara.ae/ | 2026-05-05 |
| 29 | KHDA Education Cost Index 2025-26 | https://web.khda.gov.ae/en/About-Us/News/2025/Education-Cost-Index | 2026-05-05 |
| 30 | DHCC Phase 1 expansion 2026 | https://www.dhcc.ae/media/news/dubai-healthcare-city-authority-unveils-aed13-billion-development-plan | 2026-05-05 |
| 31 | Knight Frank UK Seniors Housing 2025/26 | https://www.knightfrank.co.uk/site-assets/research/report-pdfs/senior-housing-trading-performance-review/seniorhousing-2025_final2_single.pdf | 2026-05-05 |
| 32 | Saudi Healthcare Cost (Argaam Sept 2024) | https://argaamplus.s3.amazonaws.com/64fe4807-4e9f-413c-a813-ebb2d4606430.pdf | 2026-05-05 |
| 33 | CBRE UAE Q1 2026 Office Market | https://economymiddleeast.com/news/uae-office-market-maintains-growth-in-q1-2026-as-rents-surge-14-percent-in-dubai-12-percent-in-abu-dhabi/ | 2026-05-05 |

### §99.4 Anti-bot / scraping cost references

| # | Source | URL |
|---|---|---|
| AB-1 | Anti-Captcha pricing | https://anti-captcha.com/mainpage |
| AB-2 | 2Captcha API pricing | https://2captcha.com/2captcha-api |
| AB-3 | Bright Data residential proxies pricing 2025 | https://brightdata.com/proxy-types/residential-proxies |

---

## §100 Reviewer's checklist — institutional-grade verification

For Big-4 / RICS / IVS / USALI reviewer:

1. **Cost classification:** open `02 §3.0` and verify each cost line maps to RICS NRM 1 element. Cross-reference with `02 §3.1`–`02 §3.13` material tables.
2. **Hospitality P&L:** open `01 §4.2` and verify the 4-tier hierarchy matches USALI 12th Edition §1–§3. Worked example in `01 §4.6`.
3. **Cap Rate methodology:** open `01 §2.2` (Office), `01 §3.2` (Retail), `01 §5.2` (Industrial) and verify direct capitalisation per IVS 105 §50.6. Multi-year DCF per IVS 105 §50.4.
4. **DCF for Infrastructure:** open `01 §11.2` and verify NPV / IRR per IVS 200 §40 + Brueggeman & Fisher Ch. 5.
5. **TI as capex:** open `01 §2.2.2` and verify Tenant Improvements treated as capex (year-1 outflow), not opex (recurring NOI subtraction). Per Brueggeman & Fisher Ch. 12 §12.4 (rev-2 fix).
6. **Off-Plan timing:** open `01 §12.2` and verify cash-flow timeline aligns with Dubai Law 8/2007 escrow + Law 13/2008 Oqood.
7. **VARA Fractional:** open `01 §14` and `04 §6` and verify ARVA framework per VARA Rulebook 2025.
8. **UAE benchmarks:** open `01 §99` and `04 §99` and `07 §99.3` for the 33-source consolidated matrix. Each engine's worked example cites specific UAE benchmark source.
9. **RATIFY items:** open `05_AUDIT_REPORT.md` §5 and `01 §100` for the consolidated RATIFY list. Approximately 92 items pending founder validation; rev-2 closes ~18 via deep research.
10. **Audit history:** open `05_AUDIT_REPORT.md` (frozen at commit `e6df5ed`) for the 32-finding audit pass that informed rev-2.

---

*End of methodology reference. This file is the canonical bridge between v6.0's product surface and the institutional methodology corpus that backs every formula.*

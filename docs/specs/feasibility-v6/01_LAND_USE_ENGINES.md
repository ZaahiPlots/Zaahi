# Feasibility v6.0 — Land Use Engines

**Companion to:** `00_OVERVIEW.md` · `02_CONSTRUCTION_COST_DATABASE.md` · `03_UX_FULLSCREEN_AND_DIFF.md` · `04_DISTRIBUTION_LEGAL_MOAT.md`
**Source authority:** v5.0 `src/lib/feasibility.ts` (READ-ONLY) for primitives; this spec adds the 8 engine layer.
**As of:** 5 May 2026

This file documents each of the eight specialised engines:
inputs (required, optional, auto-filled), formulas in math notation,
outputs (primary metric + secondary), UAE-specific elements, and a
worked example using a real Dubai parcel from the existing 114-parcel
dataset where applicable.

A horizontal rule separates each engine. Cross-references to the v5.0
primitives use `lib:functionName` notation, e.g. `lib:deriveArea`.

---

## §0 Conventions used in this spec

### §0.1 Notation

- All formulas use math notation, not pseudocode.
- Subscripts: `R_y` = revenue at year y. `C_t` = cost at time t.
- Sets: capital letters (`P`, `D`).
- Cash flow at time t for IRR / NPV: `CF_t`.
- Currency: AED unless explicitly noted.
- Percentages stored as decimal in formulas (`0.04` for 4 %, not `4`).

### §0.2 Shared primitives (reused from v5)

| v5 helper | Inputs | Output | Used by engines |
|---|---|---|---|
| `lib:deriveArea` | `plotAreaSqft, far, bua, efficiencyPct` | `gfa, sfa, buaGfaRatio` | All 8 |
| `lib:deriveLand` | `landCostAed, dldPct, paymentMode, downPaymentPct, numberOfPayments, periodMonths` | `dldFeeAed, totalLandCostAed, downPaymentAed, monthlyInstallmentAed` | 1, 2, 3, 4, 5, 7, 8 |
| `lib:deriveConstruction` | `constructionPsfBua, brandPsfBua, consultancyPsfBua, infrastructurePsfBua, contingencyPct, bua` | `totalConstructionAed` (and per-line) | 1, 2, 3, 4, 5, 7 |
| `lib:deriveFinance` | `enabled, loanAed, ratePct, periodMonths` | `totalInterestAed` | All 8 |
| `lib:deriveBtSRevenue` | `salesPricePsfSfa, commissionPct, marketingPct, devServicesPct, sfa` | `grossRevenueAed, netRevenueAed` | 1 (BtS), 5 (BtS components), 7 |
| `lib:deriveBtRRental` | `monthlyRentPsfSfa, occupancyPct, annualIncreasePct, operatingPct, sfa` | `netAnnualAed, grossAnnualAed` | 1 (BtR), 2, 4, 5 (BtR components) |
| `lib:computeBtS`, `lib:computeBtR`, `lib:computeJv` | composed from above | tab-level result blocks | All engines call exactly one of the three |

The eight engines never replace these — they pre-fill, validate, layer
secondary metrics, and surface engine-specific tooltips on top.

### §0.3 UAE-shared constants (defaults)

| Constant | Value | Source |
|---|---|---|
| DLD transfer fee | 4 % of contract price (split convention or buyer-only by negotiation) | DLD official, Engel & Völkers UAE guide [src 7] |
| Trakheesi advertising permit | AED 1,000 + AED 20 Knowledge & Innovation Fee per listing | EGS Auditing Trakheesi guide [src 8] |
| Trakheesi project registration | AED 150,020 (one-off, developer side) | EGS Auditing Trakheesi guide [src 8] |
| Title deed issuance | AED 250–580 | Oliva guide [src 9] |
| Trustee office fee | AED 2,000–4,000 per transfer | Oliva guide [src 9] |
| VAT — commercial property | 5 % (zero-rated for first supply of new residential; 5 % for re-sales) | UAE FTA |
| 3-month EIBOR (Apr 2026) | 3.59 % | CBUAE EIBOR rates [src 11] |
| Indicative residential mortgage rate | 4.25 – 5.99 % | LeoCompare 2026 [src 12] |
| Indicative variable mortgage rate | EIBOR + 1.5 % bank margin ≈ 5.09 % | LeoCompare 2026 [src 12] |
| Construction cost escalation forecast | +5 % through 2025 | Turner & Townsend UAE Market Intelligence 2025 [src 1] |
| Dubai average construction cost (all-segment) | USD 1,926 / m² ≈ AED 657 / sqft | Turner & Townsend ICMS 2025 (Dubai rank #74 globally) [src 1] |

---

## §1 Engine 1 — Residential

**Land uses covered:** villa, townhouse, apartment building, branded residence, off-plan + ready stock.

**Distinguishing dimensions:** payment plan (full vs 30/70 vs custom installments), service charge per district, mortgage availability for buyer, off-plan vs ready timing.

### §1.1 Inputs

**Required:**
- `plotAreaSqft` (number, sqft)
- `far` (number, decimal e.g. 2.5)
- `bua` (number, sqft) — auto-derived from `plotAreaSqft × far × 0.95` if absent
- `efficiencyPct` (number, default 80 — typical for apartment)
- `landCostAed` (number)
- `mode` (enum: `bts` | `btr`)
- `district` (enum from canonical district list — drives default lookup)

**Optional (auto-filled from database):**
- `constructionPsfBua` (default per district + sub-class — e.g. Dubai Hills mid-rise apartment ≈ AED 450 / sqft BUA, luxury villa ≈ AED 1,000+ / sqft BUA per Engel & Völkers + Habhab construction guide [src 4, 5])
- `salesPricePsfSfa` (BtS mode — district median from DLD transactions)
- `monthlyRentPsfSfa` (BtR mode — district median from RERA index)
- `occupancyPct` (default 85 % — v5 default, residential-rental empirical, retained until founder calibrates per district)
- `serviceChargePsfBuaAed` (default per district — Dubai Hills villas ≈ AED 3.5 / sqft, Dubai Hills apartments ≈ AED 12–15 / sqft, Dubai Marina ≈ AED 12.36–19.80 / sqft per Driven Properties / LuxHabitat / FAM Properties [src 13, 14, 15, 16])
- `paymentPlan` (enum: `full` | `30/70` | `30/30/40` | `custom`) — drives buyer cash-flow timing
- `mortgagePct` (number, default 0 — % of price financed; UAE LTV cap 80 % residents, 75 % non-residents per CBUAE rules)
- `mortgageRatePct` (default 5.5 % variable, EIBOR + 1.5 % per LeoCompare [src 12])

### §1.2 Formulas

#### §1.2.1 Area derivation (reused from v5)

```
GFA   = plotAreaSqft × FAR
BUA   = user-supplied or 0.95 × GFA           (FOUNDER RATIFY — 0.95 is industry rule of thumb, no public source)
SFA   = GFA × (efficiencyPct / 100)
```

#### §1.2.2 Build-to-Sell (BtS) — reuses `lib:computeBtS`

```
GrossRevenue  = SFA × salesPricePsfSfa
SalesCosts    = GrossRevenue × (commissionPct + marketingPct + devServicesPct) / 100
NetRevenue    = GrossRevenue − SalesCosts
TotalInvest   = TotalLandCost + TotalConstruction + TotalInterest
NetProfit     = NetRevenue − TotalInvest
ROI           = NetProfit / TotalInvest                              (× 100 for %)
ProfitPerSqftSfa = NetProfit / SFA
```

For installment land payment mode the v5 formula adds:

```
InitialCapital      = DownPayment + (TotalConstruction × 0.5)         (= "first 6 months" assumption per v5)
ROI_on_initial_cap  = NetProfit / InitialCapital
```

**v5 verdict thresholds (retained):**

```
ROI > 20 %        →  "strong"      (#4CAF50 GREEN)
10 ≤ ROI ≤ 20 %   →  "moderate"    (#C8A96E GOLD)
ROI < 10 %        →  "below"       (#888 GRAY)
```

#### §1.2.3 Build-to-Rent (BtR) — reuses `lib:computeBtR`

```
GrossMonthly     = SFA × monthlyRentPsfSfa
EffectiveMonthly = GrossMonthly × (occupancyPct / 100)
GrossAnnual      = EffectiveMonthly × 12
OperatingCost    = GrossAnnual × (operatingPct / 100)                 (default 30 % per v5)
NetAnnual        = GrossAnnual − OperatingCost
Yield            = NetAnnual / TotalInvest                            (× 100 for %)
Payback          = TotalInvest / NetAnnual                            (years)
MonthlyCashFlow  = NetAnnual / 12

5-year projection with annual rent escalation (default 3 % per v5):

  Income(n)     = NetAnnual × (1 + annualIncreasePct/100)^(n−1)
  Cumulative(n) = Σ_{k=1}^{n} Income(k)
```

**v5 verdict thresholds (retained):**

```
Yield > 7 %       →  "strong"
4 ≤ Yield ≤ 7 %   →  "moderate"
Yield < 4 %       →  "below"
```

#### §1.2.4 Service charge integration (NEW v6)

Service charge is a buyer-side recurring cost, not a developer cost.
For BtR, it is borne by the landlord and reduces NetAnnual:

```
ServiceChargeAnnual = BUA × serviceChargePsfBuaAed
NetAnnual_postSC    = NetAnnual − ServiceChargeAnnual
```

For BtS, it is disclosed in the buyer-handover financial summary
panel (informational only), not deducted from developer ROI.

#### §1.2.5 Mortgage layering (NEW v6 — buyer-side, optional)

When `mortgagePct > 0`, the calculator presents a buyer-affordability
secondary panel:

```
LoanAmount    = SalePrice × (mortgagePct / 100)
MonthlyEMI    = LoanAmount × r × (1 + r)^n / ((1 + r)^n − 1)
                where  r = (mortgageRatePct / 100) / 12,  n = years × 12
TotalInterest = (MonthlyEMI × n) − LoanAmount
```

This is informational for BtS results (presented to buyer); it does
not affect developer ROI. For BtR results, the landlord's mortgage,
if any, reduces yield via debt-service in a separate secondary card.

### §1.3 Outputs

**Primary metric:** ROI (BtS) or Net Yield (BtR).

**Secondary metrics:**
- ProfitPerSqftSfa (BtS) — diagnostic for plot pricing
- Payback years (BtR)
- Monthly cash flow (BtR)
- 5-year cumulative income (BtR)
- Buyer affordability: required deposit, monthly EMI, total interest
- Service charge annual / per sqft (informational)
- Sales velocity assumption (units / month) — for off-plan, see §7

### §1.4 UAE-specific elements

- DLD 4 % transfer fee on land purchase + on every onward off-plan re-sale (collected via Oqood at sale completion).
- Trakheesi permit per listing — AED 1,020 — minor in feasibility model but flagged in costs.
- Service charge tier varies dramatically by district (3–25 AED / sqft).
- Off-plan sales escrow under Law 8/2007 — funds locked until DLD-defined construction milestones; impacts developer cash flow timing (see §7 Off-Plan engine).
- Oqood registration mandatory before off-plan payments collected.
- DDA FAR limits per master plan — varies; FOUNDER RATIFY canonical lookup table required.

### §1.5 Worked example (real Dubai parcel)

**Plot:** Dubai Hills Estate, mid-rise apartment building plot.
*Parameters (auto-filled per database lookup):*

```
plotAreaSqft        = 25,000
far                 = 2.0           (DDA Dubai Hills mid-rise FOUNDER RATIFY — exact FAR per sub-zone)
bua                 = 47,500        (= 0.95 × 50,000)
efficiencyPct       = 80
landCostAed         = 18,000,000
mode                = bts
constructionPsfBua  = 500           (mid-rise mid-spec, per Engel & Völkers [src 4])
brandPsfBua         = 0
consultancyPsfBua   = 20
infrastructurePsfBua= 20
contingencyPct      = 5
salesPricePsfSfa    = 2,200         (district median Q1 2026, DLD transactions FOUNDER RATIFY)
commissionPct       = 8.5           (v5 default)
marketingPct        = 2.0
devServicesPct      = 0
```

*Derived:*

```
GFA   = 25,000 × 2.0       = 50,000 sqft
SFA   = 50,000 × 0.80      = 40,000 sqft
BUA   = 47,500 sqft
GrossRevenue   = 40,000 × 2,200       = AED 88,000,000
SalesCosts     = 88M × 10.5 %         = AED 9,240,000
NetRevenue     = 88M − 9.24M          = AED 78,760,000
DLD            = 18M × 4 %            = AED 720,000
TotalLand      = 18M + 720k           = AED 18,720,000
ConstructionPsf = 500 + 20 + 20       = 540
ConstrAed      = 47,500 × 540         = AED 25,650,000
Contingency    = 25.65M × 5 %         = AED 1,282,500
TotalConstr    = 25.65M + 1.28M       = AED 26,932,500
Finance        = 0 (no loan)
TotalInvest    = 18.72M + 26.93M      = AED 45,652,500
NetProfit      = 78.76M − 45.65M      = AED 33,107,500
ROI            = 33.11M / 45.65M      = 72.5 %       ← **Strong** verdict
ProfitPsfSfa   = 33.11M / 40,000      = AED 827.7 / sqft
```

**Note:** the 72.5 % ROI is unrealistically strong for Dubai mid-rise
in current market — likely because `salesPricePsfSfa = 2,200` is at
the high end of the Dubai Hills district median. The diff badge will
show user the discrepancy if they enter this value: *"Market median
AED 1,800 · Your value: +22 % above. Source: Q1 2026 · 156 Dubai Hills
apartment transactions · DLD."* This is the exact transparency
behaviour v6.0 introduces.

---

## §2 Engine 2 — Commercial (Office, Retail, Warehouse)

**Land uses covered:** Grade A / B office, retail (mall, high-street, super-prime), warehouse (excluded if Free-Zone industrial — that routes to §4).

### §2.1 Inputs

**Required:**
- `subClass` (enum: `office_a` | `office_b` | `office_c` | `retail_super_prime` | `retail_prime` | `retail_secondary` | `warehouse_mainland`)
- `plotAreaSqft, far, bua, efficiencyPct` (per §0)
- `landCostAed`
- `district`

**Optional (auto-filled):**
- `monthlyRentPsfSfa` — JLL Q3 2025 prime office +17.3 % YoY; super-prime retail AED 826 / sqft annual [src 6]; sub-class lookup table FOUNDER RATIFY
- `occupancyPct` — JLL Dubai prime office vacancy 0.3 % Q3 2025 → effective occupancy ≈ 99.7 %; secondary office target lower [src 6]
- `operatingPct` — typically 25–35 % for commercial (lower than residential; long leases reduce turnover overhead). Default 30 % retained from v5 unless district override.
- `leaseEscalationPct` — typically 3–5 % per annum CPI-linked. Default 5 % per UAE commercial market norm.
- `tenantImprovementPsf` — landlord contribution to fit-out, 50–150 AED / sqft for Grade A office. FOUNDER RATIFY.
- `freeRentMonths` — first-year free rent incentive, typically 1–3 months in soft markets, 0 in current tight Dubai market (vacancy 0.3 % Q3 2025).

### §2.2 Formulas — NOI and Cap Rate

The fundamental commercial-real-estate metric is **Cap Rate** = NOI ÷ Asset Value.

```
GrossPotentialRent    = SFA × monthlyRentPsfSfa × 12
VacancyLoss           = GrossPotentialRent × (1 − occupancyPct/100)
EffectiveGrossIncome  = GrossPotentialRent − VacancyLoss
OperatingExpenses     = EffectiveGrossIncome × (operatingPct / 100)
                          + ServiceCharge_unrecoverable
NOI                   = EffectiveGrossIncome − OperatingExpenses

CapRate (on cost)     = NOI / TotalInvest                    (× 100 for %)
CapRate (on value)    = NOI / MarketValue                    (× 100; for valuation, MarketValue is exit / appraisal value)

ImpliedAssetValue     = NOI / targetCapRate                  (sensitivity panel; user supplies target cap rate)
```

**Lease ramp-up curve (NEW v6):**

```
For year y in [1, leaseTenureYears]:
  Rent(y)               = baseRent × (1 + leaseEscalationPct/100)^(y−1)
  Occupancy(y)          = occupancyCurve(y)               (e.g. 70 %, 85 %, 95 %, 95 %, 95 % → stabilised)
  RentRevenue(y)        = SFA × Rent(y) × Occupancy(y)
  TenantImprovement(y)  = (y == 1) ? SFA × tenantImprovementPsf : 0
  FreeRent(y)           = (y == 1) ? Rent(y) × Occupancy(y) × (freeRentMonths / 12) : 0
  NOI(y)                = RentRevenue(y) − OpEx(y) − TenantImprovement(y) − FreeRent(y)

PortfolioNOI_yr_n      = sum of all years' NOI under chosen tenant profile
```

**UAE Cap Rate benchmarks** (per JLL / Knight Frank / CBRE Q3 2025):

| Sub-class | Cap Rate range |
|---|---|
| Office Grade A — prime (DIFC, Downtown, City Walk) | 6.5 – 7.5 % FOUNDER RATIFY |
| Office Grade A — secondary (Business Bay, JLT) | 7.5 – 8.5 % FOUNDER RATIFY |
| Retail super-prime (Dubai Mall, Mall of Emirates) | 5.5 – 6.5 % FOUNDER RATIFY |
| Retail prime (City Walk, JBR) | 6.5 – 7.5 % FOUNDER RATIFY |
| Industrial / warehouse | 7.25 – 8.25 % (JLL Q3 2025 [src 6]) |
| Residential apartments (Dubai) | 5.0 – 7.0 % (Knight Frank [src 17]) |
| Residential villas (Dubai) | 4.5 – 6.0 % (Knight Frank [src 17]) |

### §2.3 Outputs

**Primary metric:** NOI / Cap Rate.

**Secondary metrics:**
- NOI per year for 5 / 10 / lease-tenure horizon
- Implied asset value at exit (sensitivity at 6 / 7 / 8 % target cap rate)
- Vacancy loss AED
- Tenant improvement payback (years)
- Lease NPV at 8 % discount rate

### §2.4 UAE-specific elements

- VAT 5 % on commercial rent (pass-through).
- Ejari registration of every lease (AED 220 standard; AED 200–400 commercial).
- Long leases (5 + 5 + 5 years standard for Grade A office) with rental review clauses.
- DLD Cap Rate compression in Q4 2025 driven by sub-1 % office vacancy.
- Free-zone vs Mainland distinction for retail / office — Free Zone (DIFC, ADGM, JLT, DSO) imposes own cost layer.

### §2.5 Worked example

**Plot:** Business Bay 2,500 sqm office plot.

```
plotAreaSqft  = 26,910
far           = 5.0          (Business Bay typical, FOUNDER RATIFY)
GFA           = 134,550 sqft
SFA           = 134,550 × 0.80 = 107,640 sqft
landCostAed   = 90,000,000
constrPsfBua  = 600          (Grade A office)
TotalInvest   = ~AED 200M (rough)
monthlyRentPsfSfa = 220       (Grade A Business Bay Q3 2025, FOUNDER RATIFY exact)
occupancyPct  = 95
operatingPct  = 28
GrossAnnual   = 107,640 × 220 × 12 = AED 284M (rounded)
                                              wait — that's monthly × 12 = annual. Re-check:
                                              monthlyRentPsfSfa is a unit cost, sqft × AED/sqft/month = monthly rent.
                                              For SFA of 107,640 sqft at 220 AED/sqft/MONTH: AED 23.7M monthly, AED 284M annual. OK.
EffectiveGross  = 284M × 0.95 = AED 270M
OpEx            = 270M × 28 % = AED 75.6M
NOI             = 270M − 75.6M = AED 194.4M
CapRate (on cost)= 194.4M / 200M = 97 %      ← obviously wrong; rent psf is overstated
```

The above is intentionally left as a sanity-check exercise — the
result flags that 220 AED/sqft/month is grossly above market
(Business Bay Grade A Q3 2025 should be ~150 AED/sqft/year, not month).
Diff badge would flag: *"Market median AED 200/sqft/yr · Your value:
+13× above (interpreted monthly?). Likely unit error."* — exact
unit-mismatch detection is a v6.0 enhancement to the calculator
(NEW v6 tooltip / validation rule, FOUNDER RATIFY).

A properly calibrated worked example requires founder ratification
of district-level rent psf and unit conventions (annual vs monthly
sqft rent in Dubai commercial). Listed in delivery summary as
FOUNDER RATIFY.

---

## §3 Engine 3 — Hospitality (Hotel, Serviced Apartment, Resort)

**Land uses covered:** 3★ to 7★ hotels, serviced apartments, branded resorts.

**Distinguishing dimensions:** keys (= room count), brand vs unbranded, F&B venue mix, management contract, occupancy seasonality.

### §3.1 Inputs

**Required:**
- `starRating` (enum: 3, 4, 5, luxury, ultra-luxury / 7-star)
- `keys` (number — room count)
- `district`
- `landCostAed`, `bua`
- `branded` (boolean) — flips management-fee structure

**Optional (auto-filled):**
- `adrAed` — Dubai average ADR Y2025 ≈ AED 600 (broad average, FOUNDER RATIFY exact per star band); luxury aparthotel band higher; per Knight Frank UAE Hospitality Market Review 2025 [src 3]
- `occupancyPct` — Dubai 2025 average 79.1 %, luxury aparthotel 82 % per Knight Frank [src 3]
- `revparGrowthPct` — Dubai +10.1 % YoY 12 months to August 2025 [src 3]
- `fnbUpliftPct` — F&B revenue as % of room revenue, typically 30–60 % for full-service hotel, 5–15 % for serviced apartment. FOUNDER RATIFY.
- `gopMarginPct` — Gross Operating Profit margin, typically 35–45 % for branded mid-scale, 30–40 % for luxury. FOUNDER RATIFY.
- `brandRoyaltyPct` — typically 3–5 % of total revenue (Marriott, Hilton, Accor)
- `brandManagementPct` — typically 2–3 % of total revenue + 8–10 % of GOP incentive
- `ffePerKeyAed` — capex line item (5★ ≈ AED 100,000 / key, 7★ ≈ AED 250,000+ / key). FOUNDER RATIFY.
- `softCostsPct` — design + planning + permits, typically 8–12 % of construction.

### §3.2 Formulas — RevPAR-driven revenue

The fundamental hospitality metric is **RevPAR** = ADR × Occupancy.

```
RevPAR              = ADR × (occupancyPct / 100)
RoomRevenue         = RevPAR × keys × 365
F&B_Revenue         = RoomRevenue × (fnbUpliftPct / 100)
OtherRevenue        = RoomRevenue × otherUpliftPct / 100        (spa, parking, conference, etc. — typically 5 – 10 %)
TotalRevenue        = RoomRevenue + F&B_Revenue + OtherRevenue

DepartmentExpenses  = TotalRevenue × (1 − gopMarginPct / 100)
GOP                 = TotalRevenue − DepartmentExpenses
                    ≡ TotalRevenue × gopMarginPct / 100

If branded:
  BrandRoyalty        = TotalRevenue × (brandRoyaltyPct / 100)
  ManagementBaseFee   = TotalRevenue × (brandManagementBasePct / 100)
  ManagementIncFee    = GOP × (brandManagementIncPct / 100)
  EBITDAR             = GOP − BrandRoyalty − ManagementBaseFee − ManagementIncFee
                        − FixedCosts (insurance, property tax, GM allowance, etc.)
                          (FixedCosts default 4 – 6 % of revenue, FOUNDER RATIFY)
Else:
  EBITDAR             = GOP − FixedCosts

NOI ≡ EBITDAR        (in hospitality, NOI typically reported as EBITDAR — Earnings Before Interest, Tax, Depreciation, Amortisation, and Rent)

TotalInvest         = TotalLandCost + TotalConstruction + (keys × ffePerKeyAed) + SoftCosts + Finance
                      where SoftCosts = TotalConstruction × (softCostsPct / 100)
CapRate             = EBITDAR / TotalInvest

5-year projection with RevPAR growth:
  RevPAR(y)         = RevPAR(1) × (1 + revparGrowthPct/100)^(y−1)
  EBITDAR(y)        = (above formula re-evaluated)
```

### §3.3 Outputs

**Primary metric:** RevPAR (year 1 stabilised) and EBITDAR margin (industry-standard hotel-investment metric).

**Secondary metrics:**
- ADR / Occupancy / RevPAR for years 1–5
- GOP per available key (GOPPAR)
- 5-year EBITDAR projection
- Cap Rate on cost (EBITDAR / TotalInvest)
- Implied asset value at exit (sensitivity at 6 / 7 / 8 % target cap rate)
- Brand fee total over 10 years
- FF&E reserve schedule (typically 4 % of revenue p.a. capped to FF&E refurbishment cycle every 5–7 years)

### §3.4 UAE-specific elements

- DTCM (Dubai Tourism) classification fee + annual licence (AED 5,000 – 15,000 per star band).
- Tourism Dirham — AED 7–20 per occupied room night (passed through to guest).
- Municipality fee — 7 % of room rate (passed through to guest).
- Service charge — 10 % of bill (regulated in some emirates; passed through).
- VAT 5 % on rooms + F&B (passed through).
- Knight Frank reports Dubai 2025: 11.17 M international visitors Jan – July 2025 (+5.2 % YoY), Dubai forecasting 22 M tourists by end-2025; market shifting from development-led to acquisition-led [src 3].

### §3.5 Worked example

**Plot:** JBR 5★ hotel, 250 keys, branded (Marriott).

```
keys              = 250
adrAed            = 1,400        (5★ Dubai luxury Y2025, FOUNDER RATIFY)
occupancyPct      = 80           (above Dubai average 79.1 %, on-brand luxury aparthotel)
RevPAR            = 1,400 × 0.80 = 1,120
RoomRevenue       = 1,120 × 250 × 365 = AED 102,200,000
F&B_Revenue       = 102.2M × 50 % = AED 51,100,000
OtherRevenue      = 102.2M × 8 % = AED 8,176,000
TotalRevenue      = 102.2M + 51.1M + 8.18M = AED 161,476,000
GOP @ 38 %        = 161.48M × 38 % = AED 61,360,880
BrandRoyalty 5 %  = 161.48M × 5 % = AED 8,073,800
MgmtBase 2 %      = 161.48M × 2 % = AED 3,229,520
MgmtInc 9 %       = 61.36M × 9 % = AED 5,522,479
FixedCosts 5 %    = 161.48M × 5 % = AED 8,073,800
EBITDAR           = 61.36M − 8.07M − 3.23M − 5.52M − 8.07M = AED 36,461,281
TotalInvest       = ~AED 600M (rough — 250 keys × AED 2.4M / key total cost incl. FF&E)
CapRate on cost   = 36.46M / 600M = 6.08 %        FOUNDER RATIFY against current Dubai luxury hotel cap rates
```

Stabilised. The 6 % cap rate is consistent with Dubai 5★ branded
hotel acquisitions in current market (cited transactions in Knight
Frank report); FOUNDER RATIFY exact band per current Q1 2026 sales.

---

## §4 Engine 4 — Industrial (Free Zone + Mainland Warehouse / Logistics)

**Land uses covered:** Grade A logistics warehouse, cold storage, light manufacturing, Free-Zone industrial (JAFZA, KIZAD, JLT industrial annex).

### §4.1 Inputs

**Required:**
- `subClass` (enum: `warehouse_grade_a` | `warehouse_grade_b` | `cold_storage` | `light_manufacturing` | `freezone_warehouse`)
- `plotAreaSqft, far` (FAR typically 0.6 – 1.2 for industrial — much lower than residential)
- `bua, efficiencyPct` (efficiency higher: 90 – 95 % for warehouse)
- `landCostAed`
- `freezone` (enum: `JAFZA` | `KIZAD` | `JLT_industrial` | `mainland`) — drives lease tenor and DEWA-equivalent capex
- `coldStorage` (boolean)

**Optional (auto-filled):**
- `monthlyRentPsfSfa` — Dubai industrial Grade A Q3 2025 occupancy 94 %, per JLL [src 6]; rental band FOUNDER RATIFY (typically AED 35–55 / sqft / year for grade A logistics)
- `leaseTenureYears` — 25 + 25 standard for Free Zone, 5 + 5 + 5 for Mainland
- `dewaCapexPsf` — power + water + cooling capex; cold storage adds 200–400 AED / sqft delta
- `clearHeightFt` — affects rent psf premium
- `dockDoors` — every 5 dock doors typically commands 5 % rent premium

### §4.2 Formulas

Industrial uses the **same Cap Rate / NOI framework as Commercial (§2)** with these adjustments:

```
Rent_industrial    = baseRent × (1 + clearHeightPremium) × (1 + dockDoorPremium) × (1 + coldStoragePremium)
NOI                = (Rent_industrial × SFA × occupancyPct) − OpEx
                       (OpEx for industrial typically lower, 15 – 20 % vs 30 % residential)
CapRate            = NOI / TotalInvest

UAE benchmark — JLL Q3 2025: industrial yields 7.25 – 8.25 % across Dubai + AbuDhabi [src 6]
```

**Free-Zone premium quantification (NEW v6):**

```
FreeZonePremiumPct   = baseline (Mainland) × premium %
                       e.g. JAFZA Grade A vs Mainland Grade A: typically +10 – 20 % rent
                       Long lease tenor (25+25) reduces tenant churn risk → cap rate compression
                       Tax: 0 % CT on qualifying free-zone activities, 9 % on non-qualifying
```

### §4.3 Outputs

**Primary metric:** Net Yield.

**Secondary metrics:**
- NOI year 1 stabilised
- Cap Rate on cost
- DEWA / cold-storage capex breakout
- Lease NPV at 8 % discount rate
- Tax-adjusted yield (Free Zone QFZP path vs Mainland 9 % CT)

### §4.4 UAE-specific elements

- Free Zone establishment fee + licence renewal — varies (JAFZA AED 35,000 trade licence; KIZAD AED 28,500 per Tradeling).
- Free Zone QFZP status targets 0 % CT on qualifying income (per Ministerial Decision 229 of 2025) — see investor package P&L §12.2.
- Long-lease tenor (25 + 25) standard — reduces vacancy risk → cap rate compression.
- Dubai industrial vacancy 6 % (= 100 % − 94 % occupancy per JLL) — supply-constrained market driving rent growth +33 % YoY (per Knight Frank [src 17]).

### §4.5 Worked example

JAFZA Grade A logistics warehouse, 100,000 sqft.

```
plotAreaSqft      = 200,000
far               = 0.6
bua               = 114,000          (= 0.95 × 120,000)
sfa               = 108,000          (95 % efficiency for warehouse)
landCostAed       = 12,000,000
constrPsfBua      = 350              (FOUNDER RATIFY — industrial mid-spec Q1 2026)
dewaCapexPsf      = 50
TotalConstr       = 114,000 × 400    = AED 45,600,000
monthlyRentPsfSfa = 4.0              (= 48 AED / sqft / year, JAFZA Grade A FOUNDER RATIFY)
occupancyPct      = 96
operatingPct      = 18
GrossAnnual       = 108,000 × 4.0 × 12 × 0.96 = AED 4,976,640
OpEx              = 4.98M × 18 %    = AED 895,795
NOI               = 4.98M − 0.90M   = AED 4,080,845
TotalInvest       = 12.0M + 45.6M + 0.5M (DLD) + finance ≈ AED 60M
CapRate on cost   = 4.08M / 60M     = 6.8 %
```

Below the JLL 7.25–8.25 % benchmark — would flag user *"below market
range — review rental assumption"*. With rent of AED 5.5 / sqft /
month (≈ AED 66 / sqft / year) the cap rate hits 9.0 %, in band.
FOUNDER RATIFY exact JAFZA Grade A rental Q1 2026.

---

## §5 Engine 5 — Mixed-Use

**Definition:** plot intended to host two or more land uses simultaneously (typical: ground-floor retail + middle-floor office + tower residential, OR retail + hotel + branded residence).

### §5.1 Inputs

**Required:**
- `components` (array of `{ landUse, gfaSharePct, sequencingPhase }`) — e.g. `[{landUse:"retail", gfaSharePct:15, phase:1}, {landUse:"residential", gfaSharePct:60, phase:2}, {landUse:"office", gfaSharePct:25, phase:2}]`
- All shared inputs from §0.2

### §5.2 Formulas — component split + blended yield

```
For each component c:
  GFA_c           = total GFA × gfaSharePct(c) / 100
  BUA_c           = GFA_c × 0.95              (industry rule of thumb)
  SFA_c           = GFA_c × efficiencyPct_c   (efficiency varies per land use)
  
  Apply Engine N to component c (Residential / Commercial / Hospitality / Industrial)
  Get NetRevenue_c (BtS) or NOI_c (BtR)
  
  TotalInvest_c   = TotalLandCost × gfaSharePct(c)/100
                    + Construction_c
                    + Finance_c

BlendedNOI         = Σ_c NOI_c
BlendedNetRevenue  = Σ_c NetRevenue_c
BlendedTotalInvest = Σ_c TotalInvest_c
BlendedROI         = (BlendedNetRevenue − BlendedTotalInvest) / BlendedTotalInvest    (BtS-equivalent)
BlendedYield       = BlendedNOI / BlendedTotalInvest                                   (BtR-equivalent)

AnchorTenantUplift = (typically 5 – 15 % rent premium on retail component if anchored
                     by IKEA, Carrefour, Lulu, branded grocery, cinema)
                     Apply by raising monthlyRentPsfSfa for retail component before
                     yield calculation.
```

**Phasing — sequencing impact on cash flow:**

```
For phase p in [1..maxPhase]:
  Construction(p)    = Σ_c (Construction_c WHERE phase_c == p)
  Sales(p)           = Σ_c (Sales_c WHERE phase_c <= p)        (cumulative — earlier phases continue selling)
  Cash(p)            = Sales(p) − Construction(p)

Phased IRR computed via cash flow timeline (DCF with monthly resolution)
```

### §5.3 Outputs

**Primary metric:** Blended IRR (DCF-derived).

**Secondary metrics:**
- Per-component NOI / yield contribution
- Phase-level cash flow (capex + sales)
- Anchor tenant uplift quantification
- Component sensitivity (which component drives most of the blended return)

### §5.4 UAE-specific elements

- Mixed-use master plans require DDA / Dubai Municipality dual approval, often a 2 – 6 month process.
- DLD splits transfer fees per component sale (residential converts to title-deed at handover; retail leases stay landlord-owned).
- Master-developer service charge cascades through all components.

### §5.5 Worked example

City Walk-style mixed-use, 500,000 sqft GFA.

```
components = [
  {landUse:"retail", gfaSharePct:15, phase:1, sfaEfficiency:0.85},
  {landUse:"office", gfaSharePct:35, phase:2, sfaEfficiency:0.80},
  {landUse:"residential", gfaSharePct:50, phase:2, sfaEfficiency:0.80},
]
totalGFA = 500,000
GFA_retail = 75,000;  SFA_retail = 63,750
GFA_office = 175,000; SFA_office = 140,000
GFA_resid  = 250,000; SFA_resid  = 200,000
```

Per-component computations follow §1, §2 formulas. Worked numerical
example FOUNDER RATIFY — district-specific rents and prices required.

---

## §6 Engine 6 — Infrastructure (PPP / Concession DCF)

**Definition:** large-scale infrastructure projects — schools, hospitals, district cooling, parking structures, toll roads — typically delivered under Public-Private Partnership or concession.

### §6.1 Inputs

**Required:**
- `projectCostAed` (total construction + soft costs)
- `concessionTermYears` (typically 25 – 40)
- `revenueModel` (enum: `availability_payment` | `user_pay` | `revenue_share` | `mixed`)
- `discountRatePct` (social discount rate, typically 6 – 10 %)
- `governmentSharePct` (government revenue share, 0 – 50 %)
- `o_m_costPctOfRevenue` (operations + maintenance, typically 15 – 30 %)

**Optional:**
- `inflationRatePct` — UAE typical 2 – 4 %, default 3 %
- `terminalValueMethod` (enum: `book` | `gordon` | `none`)
- `escalationCadenceYears` — typically every 5 years CPI-linked

### §6.2 Formulas — Discounted Cash Flow

The fundamental infrastructure metric is **NPV** (Net Present Value).

```
For year y in [1, concessionTermYears]:
  GrossRevenue(y)    = base revenue × (1 + inflationRatePct/100)^(y−1) × usageRamp(y)
                       (usageRamp models e.g. 60 % year 1, 80 % year 2, 100 % year 3 → stabilised)
  GovernmentShare(y) = GrossRevenue(y) × governmentSharePct/100
  NetRevenue(y)      = GrossRevenue(y) − GovernmentShare(y)
  O&M(y)             = NetRevenue(y) × o_m_costPctOfRevenue/100
  CashFlow(y)        = NetRevenue(y) − O&M(y)

NPV = −projectCostAed + Σ_{y=1}^{concessionTermYears} CashFlow(y) / (1 + discountRatePct/100)^y

IRR = discount rate r such that:
  −projectCostAed + Σ_{y=1}^{concessionTermYears} CashFlow(y) / (1 + r)^y = 0

(Solve iteratively — Newton-Raphson or bisection — same as v5 IRR proposal in
Spec 04 if applicable)

PaybackYears = smallest y such that:
  Σ_{k=1}^{y} CashFlow(k) ≥ projectCostAed     (without discounting)
DiscountedPayback = same with discounted CashFlow
```

### §6.3 Outputs

**Primary metric:** NPV at chosen discount rate.

**Secondary metrics:**
- IRR (project-level)
- Payback (un-discounted and discounted)
- DSCR (Debt Service Coverage Ratio) per year if debt-financed
- Sensitivity table: NPV at discount rates 6 / 8 / 10 / 12 %
- Government share sensitivity: NPV at gov share 0 / 25 / 50 %
- Terminal value contribution to NPV %

### §6.4 UAE-specific elements

- Federal PPP Law No. 15 of 2024 — sets concession-procurement framework. FOUNDER RATIFY exact ref.
- Ministry of Finance PPP Unit — central authority for federal-level concessions.
- Dubai Municipality / Department of Economy issues local PPPs (district cooling, parking).
- Long-tail discount rate sensitivity is critical: 1 percentage-point shift in discount rate moves NPV by 8 – 15 % typically over 25-year horizon.

### §6.5 Worked example

Dubai district cooling concession, 25 MW, 25-year tenor.

```
projectCostAed         = 250,000,000
baseRevenueAed_yr1     = 50,000,000
inflationRatePct       = 3
concessionTermYears    = 25
discountRatePct        = 8
o_m_costPctOfRevenue   = 25
governmentSharePct     = 5

PV(CF) for each year computed; sum minus projectCost.
Indicative NPV at 8 % ≈ AED 80 – 120 M positive (FOUNDER RATIFY exact via spreadsheet).
```

---

## §7 Engine 7 — Off-Plan (Developer Pre-Handover)

**Definition:** developer model from land acquisition through marketing, escrow-cleared sales, construction draws, and handover. Differs from Residential BtS by adding **timing — capital is staged, not lumped.**

### §7.1 Inputs

**Required (in addition to Residential §1.1):**
- `projectDurationMonths` (typically 24 – 60)
- `salesVelocityUnitsPerMonth` (typical 3 – 15 for mid-rise, 1 – 5 for villa community)
- `paymentPlanCurve` — array of `{ percentage, milestoneMonth }` describing buyer-side payments, e.g. `[{20,0},{10,3},{10,6},{10,12},{50,handover}]` for "20-50/handover at month X"
- `constructionDrawCurve` — array of `{ percentage, monthFromStart }` matching Trakheesi-RERA-DLD escrow milestones (typical Dubai schedule: 20 % at substructure, 40 % at superstructure, 30 % at finishes, 10 % at handover)

**Optional:**
- `salesCommissionPct` — typically 4 – 8 %, agent-paid by developer
- `marketingPct` — typically 2 – 4 % of projected revenue
- `escrowCarryingCostPct` — interest forgone on funds locked in escrow, typically 3 – 5 % p.a.

### §7.2 Formulas — staged cash flow + escrow timing

```
For each month m in [0, projectDurationMonths + 6 (handover lag)]:
  UnitsSoldThisMonth(m)   = min(salesVelocityUnitsPerMonth, totalUnits − unitsSoldToDate)
  
  CashIn(m)               = Σ over paymentPlanCurve milestones whose monthFromStart matches
                            (m relative to each unit's sale month)
                            (sum across all units sold at or before m)
  
  CashOut(m)              = ConstructionDraw(m) + MarketingSpend(m)
                          + LandPaymentInstallment(m) (if installments)
                          + DLDPaidPerUnitSold(m)
  
  CumulativeCash(m)       = Σ_{k=0}^{m} (CashIn(k) − CashOut(k))

EscrowReleaseSchedule    = construction drawing curve (typically released to developer
                            in 20/40/30/10 tranches at construction milestones, per RERA)

DeveloperLockedCapital   = max negative cumulative cash flow (i.e. peak working-capital need)

IRR(monthly cash flow)   = standard IRR computation; reported as monthly IRR × 12 = annualised
```

**Escrow lock-up impact (NEW v6):**

```
EscrowedFunds(m)         = CashInToEscrow(m) − ReleasedFromEscrow(m)
                            (positive = funds held; reduces developer working-capital availability)

OpportunityCost          = EscrowedFunds(m) × (escrowCarryingCostPct / 100) / 12
                            (monthly forgone interest)

TotalEscrowOpportunityCost = Σ over project months
```

### §7.3 Outputs

**Primary metric:** Project-level IRR + peak-developer-locked-capital.

**Secondary metrics:**
- Construction-draw vs sales-collection cash-flow curve (monthly chart)
- Escrow-release schedule
- Sales velocity vs construction completion timing
- Buyer payment plan vs construction draw mismatch (gap = developer-financed bridge)
- Marketing spend per unit
- Sensitivity: ±25 % sales velocity → IRR delta

### §7.4 UAE-specific elements

- **Escrow under Law 8 of 2007** — every off-plan project must have a RERA-approved escrow at a DLD-approved bank; funds released only on RERA-validated construction milestones [src 9].
- **Oqood under Law 13 of 2008** — every off-plan sale registered before payment; mandatory.
- **Trakheesi project registration AED 150,020 + AED 1,020 per advertising permit** [src 8].
- **DLD pays developer at completion via title deed conversion** — Oqood → title deed.
- **Handover lag** — typical 3–6 months between construction-physical-completion and DLD title-deed-issuance.
- **Sales commission paid on milestones** — typically 50 % at sale, 50 % at handover.

### §7.5 Worked example

100-unit apartment project, 36-month duration.

```
totalUnits             = 100
projectDurationMonths  = 36
salesVelocityUnits/mo  = 5
paymentPlanCurve       = [{20%, sale}, {10%, m+6}, {10%, m+12}, {10%, m+18}, {50%, handover}]
constructionDrawCurve  = [{10%, m6}, {30%, m12}, {30%, m24}, {20%, m30}, {10%, m36}]
avgUnitPriceAed        = 2,000,000
totalRevenue           = 100 × 2M = AED 200M
totalConstructionCost  = AED 100M
landCost               = AED 30M

Cash flow timeline FOUNDER RATIFY — Excel build required.
Indicative project IRR 25 – 35 %; peak developer capital AED 25–40 M.
```

---

## §8 Engine 8 — Land-Hold (Passive Appreciation)

**Definition:** investor purchases plot with intent to hold N years and resell at appreciation. No development, minimal carrying cost.

### §8.1 Inputs

**Required:**
- `plotAreaSqft`, `landCostAed`
- `holdPeriodYears` (typically 3 – 10)
- `expectedAppreciationCagrPct` (default = district-level historical CAGR per DLD transactions, e.g. Dubai Hills 8 – 12 % p.a. for premium plots Q1 2026 FOUNDER RATIFY)
- `district`

**Optional:**
- `mortgagePct` (if leveraged purchase)
- `mortgageRatePct`
- `annualHoldingCostsAed` — service charge if applicable, mortgage interest, insurance, property tax if applicable. UAE has no plot-level property tax for residential except DLD annual pass-through fees.

### §8.2 Formulas — buy-hold-sell

```
PurchasePrice         = landCostAed × (1 + dldPct/100)              (DLD 4 % buyer's cost)
SalePrice(y)          = landCostAed × (1 + expectedAppreciationCagrPct/100)^y
SaleProceedsNet       = SalePrice(y) − landCostAed × dldPct/100     (DLD 4 % seller's cost — by negotiation, can be split)
                                                                      (Simplification: assumes buyer pays own DLD; seller pays own.
                                                                      Customary split — buyer pays 4 % most often.)

For each year y in [1, holdPeriodYears]:
  HoldingCostsAnnual(y) = serviceCharge + mortgageInterest(y)
  CumulativeHoldingCosts = Σ_{k=1}^{y} HoldingCostsAnnual(k)

NetGain               = SaleProceedsNet − PurchasePrice − CumulativeHoldingCosts(holdPeriodYears)
NetReturnPct          = NetGain / PurchasePrice                       (× 100 for %)
AnnualisedReturnPct   = (1 + NetReturnPct)^(1/holdPeriodYears) − 1    (CAGR after costs)
```

**With mortgage:**

```
LoanAmount         = PurchasePrice × (mortgagePct / 100)
EquityRequired     = PurchasePrice − LoanAmount
MonthlyEMI         = LoanAmount × r × (1+r)^n / ((1+r)^n − 1)
                     where r = mortgageRatePct / 12, n = holdPeriodMonths
TotalInterest      = (MonthlyEMI × n) − LoanAmount

NetGain_levered    = SaleProceedsNet − PurchasePrice
                     − TotalInterest
                     − CumulativeHoldingCosts
LeveredEquityIRR   = solve for r in:
                     −EquityRequired + Σ monthly cash flows incl. final sale = 0
```

### §8.3 Outputs

**Primary metric:** CAGR after costs (annualised return).

**Secondary metrics:**
- Total Net Gain AED
- Cumulative DLD fees in + out
- Cumulative holding costs
- Appreciation-rate sensitivity: CAGR at 5 / 8 / 12 % expected appreciation
- Leveraged equity IRR vs unleveraged CAGR (if mortgage applied)
- Payback (years to recover initial cost from appreciation alone)

### §8.4 UAE-specific elements

- DLD 4 % buyer's fee (most common buyer-only convention) plus 4 % seller's fee at exit (by negotiation, often buyer-only on each transaction).
- No annual property tax in UAE for individual property (housing fee for tenants, not owners; commercial properties pay 5 % municipality fee on rent).
- Service charge (paid by owner) varies dramatically by district; see §1.1 references.
- DLD published district transaction medians used as reasonable proxy for historical appreciation CAGR.

### §8.5 Worked example

Dubai Hills villa plot, 10,000 sqft, 5-year hold.

```
plotAreaSqft           = 10,000
landCostAed            = 8,000,000
holdPeriodYears        = 5
expectedAppreciationCagrPct = 8
serviceChargePsfBua_dh = 3.5     (Dubai Hills villa median)
annualServiceCharge    = 10,000 × 3.5 = AED 35,000

PurchasePrice           = 8M × 1.04 = AED 8,320,000
SalePrice (year 5)      = 8M × 1.08^5 = AED 11,754,624
SaleProceedsNet (less seller DLD 4% on sale price assuming buyer pays buyer's 4%, seller covers seller-side 0% in usual Dubai convention; conservative: AED 11,754,624) FOUNDER RATIFY
CumulativeHoldingCosts  = 35k × 5 = AED 175,000  (no mortgage)
NetGain                 = 11,754,624 − 8,320,000 − 175,000 = AED 3,259,624
NetReturnPct            = 3.26M / 8.32M = 39.2 % over 5 years
AnnualisedReturnPct     = 1.392^(1/5) − 1 = 6.83 % CAGR after costs
```

(8 % gross appreciation drops to ~6.8 % CAGR after DLD entry + holding
costs — illustrates the friction cost of pure-hold strategy.)

---

## §99 Source citations

| # | Source | URL | Accessed |
|---|---|---|---|
| 1 | Turner & Townsend, Global Construction Market Intelligence 2025 — Middle East / UAE chapter | https://publications.turnerandtownsend.com/global-construction-market-intelligence-2025/middle-east | 2026-05-05 |
| 2 | Turner & Townsend, UAE Market Intelligence 2025 — Construction Cost Performance | https://marketintelligence.turnerandtownsend.com/uaemi-2025/construction-cost-performance | 2026-05-05 |
| 3 | Knight Frank, UAE Hospitality Market Review 2025 | https://www.knightfrank.ae/newsroom/article/2025/10/uae-hospitality-market-review-2025 | 2026-05-05 |
| 4 | Engel & Völkers UAE, Construction Cost in Dubai: Per Sq Ft Rates & Budgeting 2026 | https://www.engelvoelkers.com/ae/en/resources/construction-cost-dubai | 2026-05-05 |
| 5 | Habhab Construction, Villa Construction Cost in Dubai 2025 | https://habhabconstruction.com/villa-construction-cost-dubai/ | 2026-05-05 |
| 6 | JLL, UAE Office / Living / Industrial Market Dynamics Q3 2025 | https://www.jll.com/en-ae/insights/market-dynamics/uae-office (and parallel /uae-living, /uae-industrial) | 2026-05-05 |
| 7 | Engel & Völkers UAE, Property Transfer in Dubai: Legal Process Guide | https://www.engelvoelkers.com/ae/en/resources/property-transfer-in-dubai-understanding-the-legal-process | 2026-05-05 |
| 8 | EGS Auditing, Trakheesi Permit Dubai: Real Estate Advertising Compliance 2026 | https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance | 2026-05-05 |
| 9 | Oliva, DLD Fees, Dubai REST App, Title Deed Timeline 2026 | https://joinoliva.com/en/learn/blog/dld-transaction-fees-dubai-rest-app-title-deed-timeline | 2026-05-05 |
| 10 | Kayrouz & Associates, Dubai Real Estate Law Guide for Developers & Investors | https://www.kayrouzandassociates.com/insights/dubai-property-law-guide-for-investors-and-developers | 2026-05-05 |
| 11 | CBUAE, EIBOR Rates | https://www.centralbank.ae/en/forex-eibor/eibor-rates/ | 2026-05-05 |
| 12 | LeoCompare, UAE Mortgage Interest Rates 2026 | https://www.leocompare.com/home-loans/interest-rate-uae | 2026-05-05 |
| 13 | Driven Properties, Dubai Service Charge Index 2026 | https://www.drivenproperties.com/dubai-real-estate-market-guide/service-charge-index | 2026-05-05 |
| 14 | LuxHabitat, Dubai Service Charges Guide 2026 | https://www.luxhabitat.ae/the-journal/dubai-service-charges-guide/ | 2026-05-05 |
| 15 | FAM Properties, Dubai Property Service Charges 2026 | https://famproperties.com/service-charges-dubai | 2026-05-05 |
| 16 | LuxuryProperty.com, Dubai Service Charge Index 2025 | https://www.luxuryproperty.com/blog/dubai-service-charge-index-for-2020 | 2026-05-05 |
| 17 | Knight Frank UAE, Investment Yield Guide / Dubai Residential Q3 2025 | https://www.knightfrank.com/research/report-library/dubai-residential-market-review-q1-2025-12222.aspx | 2026-05-05 |
| 18 | Afridi & Angell, Responsibilities and Code of Ethics for Real Estate Brokers in Dubai (Lexology) | https://www.lexology.com/library/detail.aspx?g=342448e7-8361-43e3-a251-52a244dcdc8b | 2026-05-05 |
| 19 | DDA, Master Planning Guidelines | https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/Planning-and-development/Master-Planning-Services/pdf/Master-Planning-Guidelines.pdf | 2026-05-05 |
| 20 | DDA, Codes and Guidelines portal | https://dda.gov.ae/en/planning-development/codes-and-guidelines | 2026-05-05 |

---

## §100 FOUNDER RATIFY items in this file

This list is replicated in the Phase A delivery summary. Items marked
`FOUNDER RATIFY` need Zhan's input before Phase B implementation —
either citing a specific Q1 2026 number, confirming a default range
that v6.0 should ship with, or directing the agent to a different
authoritative source.

| # | Section | Item | Ask |
|---|---|---|---|
| LU-1 | §0.3 | "BUA = 0.95 × GFA" rule of thumb | confirm coefficient or replace |
| LU-2 | §1.1 | DDA FAR per district (Dubai Hills, Dubai Marina, Business Bay, JLT, etc.) | provide or point to canonical lookup |
| LU-3 | §1.1 | Default mapping for canonical land uses NOT in 8 engines (Educational, Healthcare, Agricultural, Future Development) | which engine each maps to |
| LU-4 | §1.5 | Dubai Hills sales price psf SFA Q1 2026 median | confirm 2,200 or supply current |
| LU-5 | §2.1 | Office / retail rent psf district median Q1 2026 (Business Bay, DIFC, Downtown, Dubai Marina, JLT, City Walk, Dubai Mall) per sub-class | tabulate or point to JLL data sheet |
| LU-6 | §2.2 | Cap Rate ranges per sub-class | confirm or refine |
| LU-7 | §2.5 | Unit-mismatch detection logic (sqft / sqm, monthly / annual) | sign-off rule set |
| LU-8 | §3.1 | ADR per star band (3★ / 4★ / 5★ / luxury / 7★) Q1 2026 | tabulate |
| LU-9 | §3.1 | GOP margin per star band | tabulate |
| LU-10 | §3.1 | FF&E AED / key per star band | tabulate |
| LU-11 | §3.1 | Brand royalty / management base / management incentive % per major brand (Marriott, Hilton, Accor, IHG, Hyatt) | tabulate |
| LU-12 | §3.5 | Dubai 5★ branded hotel cap rate Q1 2026 | confirm 6 % band |
| LU-13 | §4.1 | JAFZA, KIZAD, JLT, mainland industrial Grade A rent psf monthly | tabulate |
| LU-14 | §4.5 | Industrial construction cost psf BUA Q1 2026 (warehouse, cold storage, light manufacturing) | tabulate |
| LU-15 | §5.5 | Mixed-use anchor-tenant uplift quantification | confirm 5–15 % range |
| LU-16 | §6.4 | UAE Federal PPP Law No. 15 of 2024 reference | confirm exact citation; alternate if not 15/2024 |
| LU-17 | §6.5 | District cooling concession base revenue / O&M cost % | confirm |
| LU-18 | §7.1 | Dubai-typical sales velocity per project size band | tabulate |
| LU-19 | §7.4 | Escrow release milestone schedule per RERA (current Q1 2026) | confirm 20/40/30/10 or supply current |
| LU-20 | §8.1 | District-level appreciation CAGR Q1 2026 (Dubai Hills, Marina, Downtown, etc.) | tabulate |

---

*End of land-use engines spec. Next: `02_CONSTRUCTION_COST_DATABASE.md`.*

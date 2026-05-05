# Feasibility v6.0 — Land Use Engines (rev-2)

**Companion to:** `00_OVERVIEW.md` · `02_CONSTRUCTION_COST_DATABASE.md` · `03_UX_FULLSCREEN_AND_DIFF.md` · `04_DISTRIBUTION_LEGAL_MOAT.md` · `06_MASTER_TREE_ALIGNMENT.md` · `07_METHODOLOGY.md`
**Source authority:** v5.0 `src/lib/feasibility.ts` (READ-ONLY) for primitives; this spec adds the 13-engine layer.
**As of:** 5 May 2026

This file documents each of the **13 specialised engines + 2 modifiers** (Off-Plan timing wrapper, Fractional / VARA tokenisation flag) per Zhan ratification 5 May 2026:

inputs (required, optional, auto-filled), formulas in math notation, outputs (primary metric + secondary), UAE-specific elements, and a worked example with verified math.

A horizontal rule separates each engine. Cross-references to v5 primitives use `lib:functionName` notation.

---

## §0 Conventions

### §0.1 Notation

- All formulas use math notation, not pseudocode.
- Subscripts: `R_y` = revenue at year y. `C_t` = cost at time t.
- Cash flow at time t for IRR / NPV: `CF_t`.
- Currency: AED unless explicitly noted.
- Percentages stored as decimal in formulas (`0.04` for 4 %, not `4`).
- Worked-example AED rounded to nearest unit; calculator stores 2-decimal precision internally.

### §0.2 Shared primitives (reused from v5 lib)

| v5 helper | Inputs | Output | Used by |
|---|---|---|---|
| `lib:deriveArea` | `plotAreaSqft, far, bua, efficiencyPct` | `gfa, sfa, buaGfaRatio` | All 13 |
| `lib:deriveLand` | `landCostAed, dldPct, paymentMode, downPaymentPct, numberOfPayments, periodMonths` | `dldFeeAed, totalLandCostAed, downPaymentAed, monthlyInstallmentAed` | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13 |
| `lib:deriveConstruction` | `constructionPsfBua, brandPsfBua, consultancyPsfBua, infrastructurePsfBua, contingencyPct, bua` | `totalConstructionAed` | 1–10, 12 |
| `lib:deriveFinance` | `enabled, loanAed, ratePct, periodMonths` | `totalInterestAed` | All 13 |
| `lib:deriveBtSRevenue` | `salesPricePsfSfa, commissionPct, marketingPct, devServicesPct, sfa` | `grossRevenueAed, netRevenueAed` | 1 (BtS), 10 (BtS components), 12 |
| `lib:deriveBtRRental` | `monthlyRentPsfSfa, occupancyPct, annualIncreasePct, operatingPct, sfa` | `netAnnualAed, grossAnnualAed` | 1 (BtR), 2, 3, 5, 10 (BtR components) |
| `lib:computeBtS, lib:computeBtR, lib:computeJv` | composed | tab-level result blocks | All engines call exactly one of the three |

The eight engines never replace these — they pre-fill, validate, layer secondary metrics, and surface engine-specific tooltips on top.

### §0.3 BUA convention — v5 canonical

> **CRITICAL — rev-2 fix to audit finding 01-1.** BUA in this spec set follows v5 production code (`FeasibilityCalculator.tsx` line 238–239: `buaRatio = 1.85`). All worked examples and database lookups use:
>
> ```
> BUA = GFA × 1.85   (default; user-override allowed)
> ```
>
> Per Zhan ratification 5 May 2026 (Q1). The 1.85× multiplier reflects Dubai mid-rise typology where:
>
> - Parking podium adds approximately 50 % to GFA (UAE residential parking ratio 1.0 – 1.5 spaces / unit; podium parking is the dominant pattern in Dubai mid-rise).
> - Services / circulation / plant rooms add another 20 – 35 %.
> - The aggregate is ~1.85× of GFA in steady-state Dubai practice.
>
> RICS NRM 1 §1.5 distinguishes Gross Internal Area (≈ GFA) from Construction Floor Area (CFA, the broader UAE-practice "BUA"). UAE practice aligns with CFA convention. International benchmark: IPMS Office (International Property Measurement Standards Coalition) defines IPMS 1 (Office Gross) which is broader than IPMS 2 (Office Net Internal); UAE BUA correlates with IPMS 1 + parking + services overlay.

### §0.4 Engine-aware `commissionPct` dispatch (rev-2 fix to MT-5 audit finding)

Per Zhan ratification 5 May 2026 (Q3):

| Context | `commissionPct` default | Source |
|---|---|---|
| Engine 1 Residential — Off-Plan modifier active OR mode = `bts` | **8.5 %** | Developer-paid agency commission on off-plan unit sales (UAE market typical 4 – 8.5 % blended with marketing premium); v5 default retained |
| Engine 1 Residential — mode = `btr` | 2 % | Single-leg leasing brokerage commission per RERA standard / Master Tree §17 |
| Engine 2 Office | 2 % | Single-leg commercial leasing per RERA standard |
| Engine 3 Retail | 2 % | Single-leg commercial leasing |
| Engine 4 Hospitality (operating) | 2 % | Single-leg lease (atypical — usually direct operator deal) |
| Engine 5 Industrial / Logistics | 2 % | Single-leg leasing |
| Engine 6 Healthcare (operating tenant) | 2 % | Single-leg leasing |
| Engine 7 Educational (operating tenant) | 2 % | Single-leg leasing |
| Engine 8 Senior Living (operating) | 2 % | Single-leg |
| Engine 9 Data Center (operating colocation) | 2 % | Single-leg |
| Engine 12 Off-Plan modifier — wraps any 1–9 | inherits base engine; if base = Residential BtS → 8.5 % |  |
| Engine 13 Land-Hold purchase | 2 % | Buyer-side single-leg per DLD market practice |

All values overridable by user. Commission line is one of the most sensitive inputs to Year-1 ROI; the 4-tone diff badge will flag deviations.

### §0.5 UAE-shared constants (defaults)

| Constant | Value | Source / methodology |
|---|---|---|
| DLD transfer fee | 4 % of contract price | DLD official scale; Engel & Völkers 2026 [src 7]; Property Finder 2026 DLD Fees guide. **Legal default 50 / 50 split buyer / seller; market practice 2026 buyer-only is dominant convention.** (rev-2 fix per audit finding 01-10.) |
| Trakheesi advertising permit (standard) | AED 1,000 + AED 20 KIF = **AED 1,020 per listing** | EGS Auditing Trakheesi guide [src 8] (verified by WebFetch 5 May 2026 audit) |
| Trakheesi project-launch event permit | AED 5,000 + AED 20 KIF = AED 5,020 | EGS Auditing Trakheesi guide [src 8] (rev-2 added per audit finding RE-2) |
| Trakheesi project registration | AED 150,020 (one-off, developer side) | EGS Auditing Trakheesi guide [src 8] |
| Title deed issuance | AED 250 – 580 | Oliva guide [src 9] |
| Trustee office fee | AED 2,000 – 4,000 per transfer | Oliva guide [src 9] |
| Ejari registration | AED 220 standard residential; AED 200 – 400 commercial | Dubai Land Department official scale |
| VAT — commercial property | 5 % (zero-rated for first supply of new residential; 5 % for re-sales / commercial / serviced) | UAE FTA |
| 3-month EIBOR (Apr 2026) | 3.59 % | CBUAE EIBOR rates [src 11] |
| Indicative residential mortgage rate | 4.25 – 5.99 % | LeoCompare 2026 [src 12] |
| Indicative variable mortgage rate | EIBOR + 1.5 % bank margin ≈ 5.09 % | LeoCompare 2026 [src 12] |
| Construction cost escalation forecast 2026 | +5 % YoY through 2025; Q1–Q2 2026 trajectory tracking +5 % per Turner & Townsend updates pending | Turner & Townsend UAE Market Intelligence 2025 [src 1, 2] (rev-2 update per audit finding 01-9) |
| Dubai mid-segment construction cost (indicative) | AED 350 – 700 / sqft BUA depending on sub-class | Engel & Völkers UAE Construction Cost Dubai 2026 [src 4]; Habhab villa cost guide [src 5] |
| LTV cap residential (CBUAE) | 80 % UAE residents / 75 % non-residents / 75 % off-plan | CBUAE Mortgage Regulations |

---

## §1 Engine 1 — Residential

**Land uses covered:** villa, townhouse, apartment building, branded residence, off-plan + ready stock.

**Distinguishing dimensions:** payment plan (full vs 30/70 vs custom installments), service charge per district, mortgage availability for buyer, off-plan vs ready timing.

**Methodology:** Brueggeman & Fisher *Real Estate Finance and Investments* 17th Edition Ch. 11–14 (residential investment analysis); IVS 105 §50 (Income Approach for Investment Property); RICS NRM 1 §1–§3 (cost classification).

### §1.1 Inputs

**Required:**
- `plotAreaSqft` (number, sqft)
- `far` (number, decimal e.g. 2.5)
- `bua` (number, sqft) — auto-derived from `plotAreaSqft × far × 1.85` if absent
- `efficiencyPct` (number, default 80 — typical for apartment per RICS NRM 1 saleable / gross factor)
- `landCostAed` (number)
- `mode` (enum: `bts` | `btr`) — Engine-1-specific
- `district` (enum from canonical district list — drives default lookup)

**Optional (auto-filled from database):**
- `constructionPsfBua` — Dubai Hills mid-rise apartment ≈ AED 450 / sqft BUA, luxury villa ≈ AED 1,000 / sqft BUA per Engel & Völkers + Habhab construction guide [src 4, 5]; sub-class lookup table ratified per `02_CONSTRUCTION_COST_DATABASE.md` §2.3
- `salesPricePsfSfa` (BtS mode — district median from DLD transactions)
- `monthlyRentPsfSfa` (BtR mode — district median from RERA index)
- `occupancyPct` (default 85 % residential rental empirical, per v5 retained)
- `serviceChargePsfBuaAed` (Dubai Hills villas ≈ AED 3.5 / sqft, Dubai Hills apartments ≈ AED 12 – 15 / sqft, Dubai Marina ≈ AED 12.36 – 19.80 / sqft per [src 13, 14, 15, 16])
- `paymentPlan` (enum: `full` | `30/70` | `30/30/40` | `custom`)
- `mortgagePct` (default 0; UAE LTV cap 80 % residents, 75 % non-residents per CBUAE)
- `mortgageRatePct` (default 5.5 % variable, EIBOR + 1.5 % per [src 12])
- `commissionPct` — engine-aware default per §0.4 above (8.5 % BtS, 2 % BtR)

### §1.2 Formulas

#### §1.2.1 Area derivation (rev-2 — BUA convention fixed)

```
GFA   = plotAreaSqft × FAR
BUA   = user-supplied or 1.85 × GFA       (v5 canonical — Zhan ratified 5 May 2026)
SFA   = GFA × (efficiencyPct / 100)
```

Per Brueggeman & Fisher Ch. 11 Table 11-1, Saleable Floor Area for residential apartments typically falls 75–85 % of GFA; villas trend higher (88–92 %) due to circulation efficiency.

#### §1.2.2 Build-to-Sell (BtS) — `lib:computeBtS`

```
GrossRevenue       = SFA × salesPricePsfSfa
SalesCosts         = GrossRevenue × (commissionPct + marketingPct + devServicesPct) / 100
NetRevenue         = GrossRevenue − SalesCosts
TotalInvest        = TotalLandCost + TotalConstruction + TotalInterest
NetProfit          = NetRevenue − TotalInvest
ROI                = NetProfit / TotalInvest                        (× 100 for %)
ProfitPerSqftSfa   = NetProfit / SFA
```

Installment-mode add-on (per v5 spec):

```
InitialCapital     = DownPayment + (TotalConstruction × 0.5)        ("first 6 months" assumption)
ROI_on_initial_cap = NetProfit / InitialCapital
```

**Verdict thresholds (retained from v5 `btsVerdict`):**

```
ROI > 20 %      → "strong"   (#4CAF50 GREEN)
10 ≤ ROI ≤ 20 % → "moderate" (#C8A96E GOLD)
ROI < 10 %      → "below"    (#888 GRAY)
```

#### §1.2.3 Build-to-Rent (BtR) — `lib:computeBtR`

```
GrossMonthly       = SFA × monthlyRentPsfSfa
EffectiveMonthly   = GrossMonthly × (occupancyPct / 100)
GrossAnnual        = EffectiveMonthly × 12
OperatingCost      = GrossAnnual × (operatingPct / 100)              (default 30 % per v5)
NetAnnual          = GrossAnnual − OperatingCost
Yield              = NetAnnual / TotalInvest                          (× 100 for %)
Payback            = TotalInvest / NetAnnual                          (years)
MonthlyCashFlow    = NetAnnual / 12

5-year projection with annual rent escalation (default 3 %):
   Income(n)       = NetAnnual × (1 + annualIncreasePct/100)^(n−1)
   Cumulative(n)   = Σ_{k=1}^{n} Income(k)
```

Verdict (retained from v5 `btrVerdict`): `> 7 %` strong; `4 – 7 %` moderate; `< 4 %` below.

#### §1.2.4 Service charge integration (NEW v6)

For BtR (landlord-borne):

```
ServiceChargeAnnual = BUA × serviceChargePsfBuaAed
NetAnnual_postSC    = NetAnnual − ServiceChargeAnnual
```

For BtS (informational; not in developer ROI).

#### §1.2.5 Mortgage layering (NEW v6 — buyer-side, optional)

```
LoanAmount    = SalePrice × (mortgagePct / 100)
MonthlyEMI    = LoanAmount × r × (1 + r)^n / ((1 + r)^n − 1)
                where r = (mortgageRatePct / 100) / 12, n = years × 12
TotalInterest = (MonthlyEMI × n) − LoanAmount
```

Standard mortgage amortisation per Brueggeman & Fisher Ch. 4 §4.3. Informational only — does not affect developer ROI.

### §1.3 Outputs

**Primary:** ROI (BtS) or Net Yield (BtR).

**Secondary:** ProfitPerSqftSfa (BtS); Payback years (BtR); Monthly cash flow (BtR); 5-year cumulative income (BtR); buyer affordability (deposit / EMI / total interest); service charge annual / per sqft; sales velocity assumption (units / month) — for off-plan see §12.

### §1.4 UAE-specific elements

- DLD 4 % buyer-side most-common convention; legal default 50 / 50 split.
- Trakheesi permit per listing AED 1,020.
- Service charge tier varies dramatically by district (3 – 25 AED / sqft).
- Off-plan sales escrow under Law 8/2007.
- Oqood registration mandatory before off-plan payments collected.
- DDA FAR limits per master plan (FOUNDER RATIFY LU-2 — district-level lookup table).

### §1.5 Worked example (verified math — rev-2 — BUA fixed to v5 1.85×)

**Plot:** Dubai Hills Estate mid-rise apartment building.

```
plotAreaSqft         = 25,000
far                  = 2.0          (DDA Dubai Hills mid-rise FOUNDER RATIFY LU-2)
GFA                  = 50,000
BUA                  = 50,000 × 1.85 = 92,500       (rev-2 fix — was 47,500 in rev-1)
efficiencyPct        = 80
SFA                  = 40,000
landCostAed          = 18,000,000
mode                 = bts
constructionPsfBua   = 500          (Dubai Hills mid-rise mid-spec [src 4])
brandPsfBua          = 0
consultancyPsfBua    = 20
infrastructurePsfBua = 20
contingencyPct       = 5
salesPricePsfSfa     = 2,200        (Dubai Hills district median Q1 2026 FOUNDER RATIFY LU-4)
commissionPct        = 8.5          (BtS dev-paid agency)
marketingPct         = 2.0
devServicesPct       = 0
```

**Derived (recomputed by hand — match spec):**

```
GrossRevenue   = 40,000 × 2,200    = AED 88,000,000
SalesCosts     = 88M × 10.5 %      = AED  9,240,000
NetRevenue     = 88M − 9.24M       = AED 78,760,000

DLD            = 18M × 4 %         = AED    720,000
TotalLand      = 18M + 0.72M       = AED 18,720,000

ConstructionPsfTotal  = 500 + 0 + 20 + 20 = 540
ConstrAed             = 92,500 × 540       = AED 49,950,000  (rev-2 — was 25,650,000 with old BUA)
Contingency           = 49.95M × 5 %       = AED  2,497,500
TotalConstr           = 49.95M + 2.50M     = AED 52,447,500

Finance        = 0 (no loan)
TotalInvest    = 18.72M + 52.45M           = AED 71,167,500
NetProfit      = 78.76M − 71.17M           = AED  7,592,500
ROI            = 7.59M / 71.17M            = 10.67 %        ← **Moderate** verdict
ProfitPsfSfa   = 7.59M / 40,000            = AED 189.8 / sqft
```

**Note (rev-2):** with the corrected BUA = 92,500 sqft (1.85× GFA), construction cost is ~AED 50 M (vs ~AED 26 M in rev-1's faulty 0.95× math), and Y1 ROI compresses from the previously-reported 72.5 % "Strong" verdict to 10.67 % "Moderate". This is the realistic Dubai Hills mid-rise economics — confirms why the BUA inversion mattered (audit CRIT-1).

If the user had entered `salesPricePsfSfa = 2,200` against district median AED 1,800 [src DLD transactions], the diff badge flags `+22 %` above market — within the amber 15–30 % band.

---

## §2 Engine 2 — Office (Grade A / B / C)

**Land uses covered:** Grade A office (DIFC, Downtown, City Walk, Business Bay prime), Grade B (JLT, Tecom, Internet City), Grade C (older mainland blocks); free zone variants (DIFC, ADGM, JLT, DSO).

**Methodology:** IVS 105 §50 (Income Approach for Investment Property); Cushman & Wakefield UAE Office Market Reports; CBRE UAE Real Estate Market Review Q1 2026; Brueggeman & Fisher Ch. 12 (income-property analysis).

### §2.1 Inputs

**Required:**
- `subClass` (enum: `office_a_prime` | `office_a_secondary` | `office_b` | `office_c` | `office_freezone`)
- `plotAreaSqft, far, bua, efficiencyPct` (per §0)
- `landCostAed`, `district`
- `freezone` (boolean) — drives ground-lease vs freehold conventions

**Optional (auto-filled):**
- `monthlyRentPsfSfa` — JLL Q3 2025: prime rents +17.3 % YoY, vacancy 0.3 %; Q1 2026: prime +16 %, occupancy 95 %; super-prime retail AED 826 / sqft annual (for retail comparator) — sub-class table FOUNDER RATIFY LU-5
- `occupancyPct` — JLL Dubai prime office vacancy 0.3 % Q3 2025 → effective occupancy ≈ 99.7 %; secondary lower
- `operatingPct` — typically 25 – 35 % for commercial; default 30 %
- `leaseEscalationPct` — 3 – 5 % p.a. CPI-linked; default 5 % per UAE commercial market norm
- `tenantImprovementPsf` — landlord contribution to fit-out, 50 – 150 AED / sqft for Grade A (RATIFY)
- `freeRentMonths` — 1 – 3 months in soft markets; 0 in current tight Dubai market (rev-2 retains)
- `commissionPct` — single-leg leasing default 2 % per §0.4

### §2.2 Formulas — NOI and Cap Rate (rev-2 — bugs fixed)

#### §2.2.1 Steady-state NOI (Year 1 stabilised)

```
GrossPotentialRent   = SFA × monthlyRentPsfSfa × 12     (annual; monthly × 12)
VacancyLoss          = GrossPotentialRent × (1 − occupancyPct/100)
EffectiveGrossIncome = GrossPotentialRent − VacancyLoss
OperatingExpenses    = EffectiveGrossIncome × (operatingPct / 100)
                          + ServiceCharge_unrecoverable
NOI                  = EffectiveGrossIncome − OperatingExpenses

CapRate (on cost)    = NOI / TotalInvest                (× 100 for %)
CapRate (on value)   = NOI / MarketValue                (per IVS 105 §50.6)

ImpliedAssetValue    = NOI / targetCapRate              (sensitivity panel)
```

#### §2.2.2 Lease ramp-up (multi-year DCF) — rev-2 — `baseRent` clarified

```
Let baseRent_annual = monthlyRentPsfSfa × 12             (clarification per audit finding 01-3)

For year y in [1, leaseTenureYears]:
  Rent_annual(y)     = baseRent_annual × (1 + leaseEscalationPct/100)^(y−1)
  Occupancy(y)       = occupancyCurve(y)                (e.g. 70 / 85 / 95 / 95 / 95 → stabilised)
  RentRevenue(y)     = SFA × Rent_annual(y) × Occupancy(y)
  OpEx(y)            = RentRevenue(y) × (operatingPct / 100)
  NOI(y)             = RentRevenue(y) − OpEx(y)

Capex (separate from NOI per Brueggeman & Fisher §12.4):
  TenantImprovement_y1 = SFA × tenantImprovementPsf      (year-1 capex outflow)
  FreeRent_y1          = baseRent_annual × Occupancy(1) × (freeRentMonths / 12)
                                                         (year-1 revenue concession)

Year-1 NetCashFlow   = NOI(1) − TenantImprovement_y1 − FreeRent_y1
Years 2-N CashFlow   = NOI(y)                            (no further capex unless re-fit)

DCF NPV at discount rate r:
  NPV = −TotalInvest + Σ_{y=1}^{N} NetCashFlow(y) / (1 + r)^y + TerminalValue / (1 + r)^N
```

Per Brueggeman & Fisher Ch. 12 §12.4 — Tenant Improvements are capex amortised over lease term, NOT a recurring NOI subtraction (rev-2 fix to audit finding 01-4). Year-1 NetCashFlow shows the TI hit; year 2+ NOI is clean.

### §2.3 UAE Cap Rate benchmarks (rev-2 — citation tightened)

| Sub-class | Cap Rate range | Source |
|---|---|---|
| Office Grade A — prime (DIFC, Downtown, City Walk, Business Bay prime) | 6.5 – 7.5 % | RATIFY LU-6; consistent with JLL Q3 2025 + CBRE Q4 2025 commentary |
| Office Grade A — secondary (Business Bay non-prime, JLT, Tecom) | 7.5 – 8.5 % | RATIFY LU-6 |
| Office Grade B (older mainland) | 8.5 – 10.0 % | RATIFY LU-6 |
| Office free zone (DIFC, ADGM premium) | 5.5 – 6.5 % | RATIFY LU-6 |
| Retail super-prime (Dubai Mall, Mall of Emirates) | 5.5 – 6.5 % | RATIFY LU-6 — per Engine 3 §3.2 |
| Retail prime (City Walk, JBR) | 6.5 – 7.5 % | RATIFY LU-6 |
| Industrial / warehouse | 7.25 – 8.25 % | JLL Q3 2025 [src 6] — verified |
| Residential apartments (Dubai) | 5.0 – 7.0 % | Knight Frank Q3 2025 [src 17] — verified |
| Residential villas (Dubai) | 4.5 – 6.0 % | Knight Frank Q3 2025 [src 17] — verified |

### §2.4 Outputs

**Primary:** NOI / Cap Rate.

**Secondary:** NOI per year for 5 / 10 / lease-tenure horizon; Implied asset value at exit (sensitivity at 6 / 7 / 8 % target cap rate); Vacancy loss AED; Tenant improvement payback (years); Lease NPV at 8 % discount rate (per IVS 105 conventional UAE practice).

### §2.5 UAE-specific elements

- VAT 5 % on commercial rent (pass-through).
- Ejari registration of every lease (AED 220 standard; AED 200 – 400 commercial).
- Long leases (5 + 5 + 5 standard for Grade A) with rental review clauses.
- Free zone establishment fees vary (DIFC AED 8,000 – 50,000 / yr; ADGM AED 7,000 – 30,000).

### §2.6 Worked example (verified — rev-2 fixes audit finding 01-2)

**Plot:** Business Bay 2,500 sqm Grade A office plot.

```
plotAreaSqft       = 26,910
far                = 5.0           (Business Bay typical FOUNDER RATIFY LU-2)
GFA                = 134,550
BUA                = 134,550 × 1.85 = 248,918
efficiencyPct      = 80
SFA                = 107,640
landCostAed        = 90,000,000
constrPsfBua       = 600           (Grade A office mid-spec)
TotalInvest        ≈ AED 244 M     (computed below)

monthlyRentPsfSfa  = 16.67         (Business Bay Grade A Q3 2025 ≈ AED 200 / sqft / YEAR;
                                     monthly = 200 / 12 = 16.67 [rev-2 unit fix])
occupancyPct       = 95
operatingPct       = 28
leaseEscalationPct = 5
freeRentMonths     = 0             (current tight market)
tenantImprovementPsf = 100
```

**Computed:**

```
DLD              = 90M × 4 %                 = AED   3,600,000
TotalLand        = 90M + 3.6M                = AED  93,600,000
ConstructionPsfTotal = 600 + 0 + 20 + 20    = 640
ConstrAed        = 248,918 × 640             = AED 159,307,520
Contingency 5 %  = 159.31M × 5 %             = AED   7,965,376
TotalConstr      = 159.31M + 7.97M           = AED 167,272,896
Finance          = 0
TotalInvest      = 93.60M + 167.27M          = AED 260,872,896  (≈ AED 261 M; spec-claim AED 244M
                                                                rough, recomputed accurate here)

GrossPotentialRent = 107,640 × 16.67 × 12   = AED  21,531,802  (annual)
                                              [check: monthly = 107,640 × 16.67 = AED 1,794,318;
                                                       × 12 = AED 21,531,816 — within rounding]
VacancyLoss        = 21.53M × 5 %            = AED   1,076,590
EffectiveGross     = 21.53M − 1.08M          = AED  20,455,212
OpEx               = 20.46M × 28 %           = AED   5,727,460
NOI (Y1 stabilised) = 20.46M − 5.73M         = AED  14,727,752

CapRate (on cost)  = 14.73M / 260.87M        = 5.65 %        ← below 6.5 % prime band; flags as "below verdict"

(Year-1 capex check: TI = 107,640 × 100 = AED 10,764,000.
 Year-1 NetCashFlow = NOI − TI = 14.73M − 10.76M = AED 3.96M;
 implies year-1 cash-yield-on-cost ≈ 1.5 %. Year 2+ NOI escalates 5 % p.a.)
```

**Note (rev-2):** the cap rate 5.65 % on cost falls below the 6.5–7.5 % prime band, flagging as "below verdict" — likely because (a) construction cost AED 640 / sqft BUA × 1.85 multiplier produces high TotalInvest, or (b) rent assumption AED 200 / sqft / yr is at low end of Business Bay Grade A range. Sensitivity at AED 220 / sqft / yr lifts cap rate to ~6.2 % (closer to band). The diff badge would flag rent value if user enters a number below the median.

This worked example **replaces** the rev-1 broken example which deliberately demonstrated unit-error recovery. rev-2 worked example is a calibrated baseline.

---

## §3 Engine 3 — Retail (Mall, High-Street, F&B)

**Land uses covered:** super-prime retail (Dubai Mall anchor / mall stores), prime (City Walk, JBR, BoxPark), neighbourhood mall, high-street, F&B standalone.

**Methodology:** Cushman & Wakefield UAE Retail Reports; Knight Frank UAE Retail Review; IVS 105 §50; Brueggeman & Fisher Ch. 12 (income property — retail-specific).

### §3.1 Inputs

**Required:**
- `subClass` (enum: `retail_super_prime` | `retail_prime` | `retail_neighbourhood` | `retail_high_street` | `retail_fnb_standalone`)
- Standard area + land + finance inputs

**Optional (auto-filled):**
- `monthlyRentPsfSfa` — JLL Q2 2025: super-prime AED 826 / sqft / yr [src 6]; sub-class table RATIFY
- `turnoverRentPct` — variable rent component as % of tenant revenue, typical 8 – 15 % retail; mall standard ≈ 12 % per Cushman conventions
- `anchorTenantPct` — % of GLA leased to anchor (IKEA, Carrefour, Lulu); anchors typically pay 50 – 70 % of base rent in exchange for footfall guarantee
- `commissionPct` — 2 % single-leg leasing default

### §3.2 Formulas — base rent + turnover rent

Retail rent typically combines a **base rent** (psf SFA) plus a **turnover rent** (% of tenant gross sales above a breakpoint). Per Brueggeman & Fisher Ch. 12 §12.6:

```
BaseRent_annual       = SFA × baseRentPsfSfa
TurnoverRent_annual   = max(0, tenantGrossSales − breakpoint) × turnoverRentPct/100

For mall-mode (anchor + line shops):
  AnchorRent_annual   = AnchorGLA × anchorRentPsfSfa × anchorRentDiscount  (discount typ. 30-50%)
  LineShopRent_annual = (SFA − AnchorGLA) × lineShopRentPsfSfa
  TotalBaseRent       = AnchorRent_annual + LineShopRent_annual
  + Σ TurnoverRent per tenant

Anchor uplift (NEW v6):
  AnchorUpliftPct     = 5 – 15 %  (rent premium on line shops if anchor is grade-A, e.g. IKEA/Carrefour)
  FOUNDER RATIFY LU-15
```

NOI / Cap Rate computation thereafter identical to Engine 2.

### §3.3 UAE-specific elements

- Mall management fees typically 5 – 10 % of base rent (passed to tenant).
- Common Area Maintenance (CAM) charges separate.
- Anchor leases 10 – 25 years; line shops 3 – 5 years.
- E-commerce CAGR pressure — Cushman 2026 commentary: Dubai retail prime rents +15.1 % YoY Q2 2025 driven by tourism + experiential retail (mall food halls, entertainment).

### §3.4 Worked example placeholder

Mall sub-mode + anchor uplift requires founder-ratified UAE retail benchmark. RATIFY LU-15 — proposed worked example: City Walk 50,000 sqft GLA mixed retail; computed in Phase B implementation phase against current Q1/Q2 2026 Cushman + Knight Frank data.

---

## §4 Engine 4 — Hospitality (3★–7★, Serviced Apartment, Resort)

**Land uses covered:** 3★ to 7★ hotels, serviced apartments, branded resorts.

**Distinguishing dimensions:** keys, brand vs unbranded, F&B venue mix, management contract, occupancy seasonality.

**Methodology — institutional grade:** **USALI 12th Revised Edition (July 2024, HFTP & AHLA)** — definitive hospitality P&L hierarchy. Rushmore *Hotels and Motels — A Guide to Market Analysis, Investment Analysis, Valuations* 7th Edition. HVS UAE / Middle East hotel investment reports. Knight Frank UAE Hospitality Market Review 2025 (verified — Dubai RevPAR +10.1 % YoY, occupancy 79.1 % Y2025).

### §4.1 Inputs

**Required:**
- `starRating` (enum: 3, 4, 5, luxury, ultra_luxury_7star)
- `keys` (number — room count)
- `district`, `landCostAed`, `bua`
- `branded` (boolean) — flips management-fee structure

**Optional (auto-filled):**
- `adrAed` — RATIFY LU-8 — sub-class table per star band (Dubai 5★ Y2025 ≈ AED 1,200 – 1,500; 7★ ultra-luxury AED 3,000+)
- `occupancyPct` — Dubai Y2025 average 79.1 %; luxury aparthotel 82 % per Knight Frank [src 3]
- `revparGrowthCurve` — rev-2 fix: not constant — decaying schedule per audit finding 01-6 — proposed default {Y1 +10 %, Y2 +7 %, Y3 +5 %, Y4 +4 %, Y5+ +3 %} terminal; FOUNDER RATIFY exact curve
- `fnbUpliftPct` — F&B revenue as % of room revenue, typical 30 – 60 % full-service; 5 – 15 % serviced apartment per USALI 12th §1
- `gopMarginPct` — Gross Operating Profit margin, typical 35 – 45 % branded mid-scale, 30 – 40 % luxury per USALI 12th §2
- `brandRoyaltyPct` — typical 3 – 5 % of total revenue (Marriott, Hilton, Accor)
- `brandManagementBasePct` — typical 2 – 3 % of total revenue
- `brandManagementIncPct` — typical 8 – 10 % of GOP (incentive)
- `ffePerKeyAed` — RATIFY LU-10 — 5★ ≈ AED 100,000 – 180,000 / key; 7★ ≈ AED 250,000 – 500,000+
- `softCostsPct` — design + planning + permits, typical 8 – 12 % of construction

### §4.2 USALI-compliant P&L hierarchy (rev-2 — institutional rigor per audit finding 01-5)

Per USALI 12th Edition §1–§3, hospitality NOI is built through a 4-tier hierarchy, not a single GOP-margin shortcut:

```
TIER 1 — TOTAL REVENUE
  RevPAR              = ADR × (occupancyPct / 100)
  RoomRevenue         = RevPAR × keys × 365
  F&B Revenue         = RoomRevenue × (fnbUpliftPct / 100)
  Other Revenue       = RoomRevenue × otherUpliftPct          (spa, parking, conference;
                                                                typical 5 – 10 %)
  TotalRevenue        = RoomRevenue + F&B + Other

TIER 2 — DEPARTMENTAL PROFIT (after departmental opex)
  RoomDeptExpense     = RoomRevenue × roomDeptExpensePct      (typical 28 – 35 %)
  F&BDeptExpense      = F&BRevenue × fbDeptExpensePct          (typical 70 – 80 %)
  OtherDeptExpense    = OtherRevenue × otherDeptExpensePct    (typical 50 – 70 %)
  TotalDeptExpense    = sum
  DepartmentalProfit  = TotalRevenue − TotalDeptExpense

TIER 3 — GROSS OPERATING PROFIT (after undistributed opex)
  Undistributed OpEx (USALI 12th categories):
    Administration & General  ≈ 6 – 10 % of TotalRevenue
    Sales & Marketing         ≈ 5 – 8 %
    Repair & Maintenance      ≈ 4 – 6 %
    Utilities                 ≈ 3 – 6 %
  TotalUndistributed         = sum
  GOP                         = DepartmentalProfit − TotalUndistributed
                                ≡ TotalRevenue × (gopMarginPct / 100)        (sanity check)
  GOPPAR                      = GOP / (keys × 365)            (USALI standard metric)

TIER 4 — EBITDAR (after fixed charges and brand fees)
  If branded:
    BrandRoyalty              = TotalRevenue × (brandRoyaltyPct / 100)
    ManagementBase            = TotalRevenue × (brandManagementBasePct / 100)
    ManagementIncentive       = GOP × (brandManagementIncPct / 100)
  FixedCharges (USALI 12th §3):
    Property Tax / Municipality Fee  ≈ 0 – 2 % of revenue (UAE typically pass-through)
    Insurance                        ≈ 0.5 – 1.5 %
    Other Fixed                      ≈ 1 – 2 %
  EBITDAR                     = GOP − BrandRoyalty − ManagementBase − ManagementIncentive
                                − FixedCharges
                                  (rev-2 from rev-1 single-step "GOP − fees − fixed")

NOI for hotel ≡ EBITDAR (per IVS 105 §50.5 — operating asset definition)

CapRate (on cost)             = EBITDAR / TotalInvest
TotalInvest                   = TotalLandCost + TotalConstruction
                                + (keys × ffePerKeyAed)         (FF&E capex)
                                + SoftCosts                     (construction × softCostsPct)
                                + Finance
```

**5-year projection (rev-2 — RevPAR decay schedule per audit finding 01-6):**

```
For year y in [1..5]:
  RevPAR(y)    = RevPAR(1) × (1 + revparGrowthCurve[y]/100)    (decaying not constant)
  EBITDAR(y)   = re-evaluate full hierarchy per Y revenue
```

### §4.3 Verdict thresholds (engine-specific per §0.5 of overview)

| Metric | Strong | Moderate | Below |
|---|---|---|---|
| EBITDAR margin (Y1 stabilised) | > 35 % | 25 – 35 % | < 25 % |
| Cap rate on cost (5★ branded) | > 7 % | 5 – 7 % | < 5 % |
| GOPPAR Y1 | > AED 1,000 | AED 500 – 1,000 | < AED 500 |

### §4.4 Outputs

**Primary:** RevPAR (Y1 stabilised), EBITDAR margin.

**Secondary:** ADR / Occupancy / RevPAR Y1–Y5; GOPPAR; 5-year EBITDAR projection; Cap Rate on cost; Implied asset value at exit (6 / 7 / 8 % target cap rate); Brand fee total over 10 years; FF&E reserve schedule (typical 4 % of revenue p.a. capped to refurbishment cycle every 5–7 years).

### §4.5 UAE-specific elements

- DTCM (Dubai Tourism) classification fee + annual licence (AED 5,000 – 15,000 per star band).
- Tourism Dirham — AED 7 – 20 per occupied room night (passed through to guest).
- Municipality fee — 7 % of room rate (passed through).
- Service charge — 10 % of bill (regulated; passed through).
- VAT 5 % on rooms + F&B (passed through).
- Knight Frank Y2025: 11.17 M international visitors Jan – July 2025 (+5.2 % YoY); Dubai forecast 22 M tourists by end-2025; market shifting from development-led to acquisition-led.

### §4.6 Worked example (verified — rev-2 — RevPAR decay applied)

JBR 5★ branded (Marriott), 250 keys.

```
keys                = 250
adrAed              = 1,400        (5★ Dubai luxury Y2025 RATIFY LU-8)
occupancyPct        = 80           (above Dubai Y2025 average 79.1 %)
RevPAR_Y1           = 1,400 × 0.80 = 1,120
RoomRevenue         = 1,120 × 250 × 365 = 102,200,000
F&B (50 % uplift)   = 51,100,000
Other (8 % uplift)  =  8,176,000
TotalRevenue        = 161,476,000

Dept expenses (Room 30 %, F&B 75 %, Other 60 %):
  Room              = 102.2M × 30 %     = 30,660,000
  F&B               = 51.1M × 75 %      = 38,325,000
  Other             = 8.18M × 60 %      =  4,905,600
  Total Dept Exp                          = 73,890,600
Departmental Profit = 161.48M − 73.89M  = 87,585,400

Undistributed (A&G 8 %, S&M 6 %, R&M 5 %, Utilities 4 % = 23 % of TotalRevenue):
  Total Undistributed = 161.48M × 23 % = 37,139,480
GOP                 = 87.59M − 37.14M  = 50,445,920
GOPPAR              = 50.45M / (250 × 365) = AED 553 / available room night
                                              ← MODERATE verdict (band AED 500 – 1,000)

GOP-margin sanity:  50.45M / 161.48M    = 31.2 %   (within 30 – 40 % luxury band ✓)

Brand fees (5 % royalty + 2 % mgmt base + 9 % mgmt inc on GOP):
  Royalty           = 161.48M × 5 %     =  8,073,800
  MgmtBase          = 161.48M × 2 %     =  3,229,520
  MgmtInc           = 50.45M × 9 %      =  4,540,133
  Total brand                            = 15,843,453

FixedCharges (insurance 1 % + property tax 1 % + other 1.5 % = 3.5 % of revenue):
  Total fixed       = 161.48M × 3.5 %   =  5,651,660

EBITDAR             = 50.45M − 15.84M − 5.65M = 28,950,807
EBITDAR margin      = 28.95M / 161.48M = 17.93 %      ← BELOW 25 % threshold; "below" verdict

TotalInvest:
  Land              = AED 200,000,000   (assume premium beachfront JBR)
  DLD 4 %           = 8,000,000
  Construction (BUA = 200,000 sqft × 1,200 AED / sqft 5★) = 240,000,000
  Contingency 5 %   = 12,000,000
  FF&E (250 × 150,000 / key)             = 37,500,000
  SoftCosts 10 %                          = 24,000,000
  Total ≈                                 = AED 521,500,000

CapRate on cost     = 28.95M / 521.5M  = 5.55 %       ← BELOW 7 % strong; "below" verdict
                                                       Cap rate 5.55 % aligns with current
                                                       Dubai 5★ branded acquisition cap rate
                                                       per Knight Frank Y2025; deal returns
                                                       depend on RevPAR growth + future
                                                       Sale-and-leaseback exit multiples.
```

**Interpretation:** EBITDAR margin 17.93 % is below the 25 % "moderate" threshold for hospitality, which implies a **value-add opportunity** rather than a stabilised core asset. Real Dubai 5★ branded hotels currently transact at ~6 % cap rate per Knight Frank — owners look to push EBITDAR through (a) RevPAR growth (Knight Frank +10 % Y2025 YoY), (b) F&B optimisation, (c) re-branding. The diff badge would flag user `gopMarginPct < 35 %` as a target zone.

### §4.7 Hospitality verdict thresholds

```
EBITDAR margin > 35 % → strong
EBITDAR margin 25 – 35 % → moderate (typical Dubai 5★ stabilised — what user should target)
EBITDAR margin < 25 % → below (value-add opportunity; flag for narrative)
```

---

## §5 Engine 5 — Industrial / Logistics

**Land uses covered:** Grade A logistics warehouse, Grade B mainland warehouse, cold storage, light manufacturing, free-zone warehouse (JAFZA, KIZAD, JLT industrial annex, DSO).

**Methodology:** JLL UAE Industrial Q3 2025 (verified — yields 7.25 – 8.25 %); Cushman UAE Logistics; IVS 105 §50.

### §5.1 Inputs

**Required:**
- `subClass` (enum: `warehouse_grade_a` | `warehouse_grade_b` | `cold_storage` | `light_manufacturing` | `freezone_warehouse_jafza` | `freezone_warehouse_kizad` | `freezone_warehouse_dso`)
- Standard area + land inputs (FAR for industrial typically 0.6 – 1.2)
- `bua, efficiencyPct` (efficiency higher: 90 – 95 % for warehouse)
- `freezone` (boolean)
- `coldStorage` (boolean)

**Optional (auto-filled):**
- `monthlyRentPsfSfa` — JLL Q3 2025 industrial yields 7.25 – 8.25 %; Dubai industrial occupancy 94 % Q3 2025 [src 6]; rental band RATIFY LU-13 (typically AED 35 – 55 / sqft / yr Grade A logistics)
- `leaseTenureYears` — 25 + 25 standard for free zone; 5 + 5 + 5 for mainland
- `dewaCapexPsf` — power + water + cooling capex; cold storage adds AED 200 – 400 / sqft delta
- `clearHeightFt` — affects rent psf (higher clear height = higher rent psf for racking efficiency)
- `dockDoors` — every 5 dock doors typically commands 5 % rent premium
- `commissionPct` — 2 % single-leg leasing default

### §5.2 Formulas — same Cap Rate / NOI framework as Office (§2.2) with adjustments

```
Rent_industrial    = baseRent × (1 + clearHeightPremium) × (1 + dockDoorPremium) × (1 + coldStoragePremium)
NOI                = (Rent_industrial × SFA × occupancyPct) − OpEx
                       (OpEx for industrial typically lower, 15 – 20 % vs 30 % residential)
CapRate            = NOI / TotalInvest

UAE benchmark — JLL Q3 2025: industrial yields 7.25 – 8.25 %.
```

**Free-Zone premium (NEW v6):**

```
FreeZonePremiumPct   = baseline (Mainland) × premium %
                       JAFZA Grade A vs Mainland Grade A: +10 – 20 % rent typical
                       Long lease tenor (25+25) reduces tenant churn → cap rate compression
                       Tax: 0 % CT on qualifying free-zone activities, 9 % on non-qualifying
                            (per Ministerial Decision 229 of 2025)
```

### §5.3 UAE-specific elements

- Free-zone establishment fees (JAFZA AED 35,000 trade licence; KIZAD AED 28,500 per Tradeling).
- Free-zone QFZP status targets 0 % CT on qualifying income.
- Long-lease tenor (25+25) — reduces vacancy risk → cap rate compression.
- Dubai industrial occupancy 94 % Q3 2025; supply-constrained → rent growth +33 % YoY per Knight Frank.

### §5.4 Worked example (verified — rev-2 — BUA fixed)

JAFZA Grade A logistics warehouse, 100,000 sqft footprint plot.

```
plotAreaSqft     = 200,000
far              = 0.6
GFA              = 120,000
BUA              = 120,000 × 1.85 = 222,000   (rev-2 fix)
sfa              = 108,000                     (90 % efficiency for warehouse)
landCostAed      = 12,000,000
constrPsfBua     = 350                         (industrial mid-spec RATIFY LU-14)
dewaCapexPsf     = 50
TotalConstr      = (350 + 0 + 20 + 20 + 50) × 222,000 + 5% contingency
                 = 440 × 222,000 × 1.05
                 = 102,556,800
LandCost         = 12M + 4 % DLD = 12,480,000
TotalInvest      = 12.48M + 102.56M           = AED 115,036,800

monthlyRentPsfSfa = 4.0                        (= AED 48 / sqft / year, JAFZA Grade A RATIFY LU-13)
occupancyPct      = 96
operatingPct      = 18
GrossAnnual       = 108,000 × 4.0 × 12 × 0.96  = AED 4,976,640
OpEx              = 4.98M × 18 %               = AED   895,795
NOI               = 4.98M − 0.90M              = AED 4,080,845

CapRate on cost   = 4.08M / 115.04M            = 3.55 %   ← well below 7.25 – 8.25 % benchmark
                                                  At AED 5.5 / sqft / month (≈ 66 / sqft / yr):
                                                    GrossAnnual = 108,000 × 5.5 × 12 × 0.96 = 6,842,880
                                                    NOI         = 6.84M × 0.82 = 5,611,162
                                                    CapRate     = 5.61M / 115.04M = 4.88 % — closer
                                                  At AED 7.0 / sqft / month (≈ 84 / sqft / yr):
                                                    GrossAnnual = 108,000 × 7.0 × 12 × 0.96 = 8,709,120
                                                    NOI         = 8.71M × 0.82 = 7,141,478
                                                    CapRate     = 7.14M / 115.04M = 6.21 %
                                                  RATIFY LU-13 — exact JAFZA Q1 2026 rate
```

The corrected math shows that for a JAFZA Grade A asset to hit the 7.25 – 8.25 % benchmark, monthly rent psf SFA needs to be ~AED 8 – 9 (= AED 96 – 108 / sqft / yr). The diff badge on `monthlyRentPsfSfa` would flag user values outside this implied band.

---

## §6 Engine 6 — Healthcare (Hospital, Clinic, Specialty Centre, Diagnostic) — NEW v6

**Land uses covered:** general hospital, specialty hospital (oncology, cardiology), clinic (general / specialty), diagnostic centre, dental / aesthetic medicine clinic.

**Methodology:** Dubai Health Authority (DHA) facility licensing framework; Dubai Healthcare City (DHCC) regulations; AED 1.3 B Phase 1 expansion plan announced 2026 ([DHCC News](https://www.dhcc.ae/media/news/dubai-healthcare-city-authority-unveils-aed13-billion-development-plan)); Saudi benchmark SAR 2 – 3 M / bed (Argaam Sept 2024 — proxy for Middle East). UAE-specific per-bed cost RATIFY (no public source found in research wave).

### §6.1 Inputs

**Required:**
- `subClass` (enum: `hospital_general` | `hospital_specialty` | `clinic_general` | `clinic_specialty` | `diagnostic_centre` | `dental_aesthetic`)
- `bedsOrTreatmentRooms` (number — primary capacity metric)
- `landCostAed`, `bua`, `district`
- `freezone` (boolean — DHCC, Dubai Industrial City Med, etc.)

**Optional (auto-filled):**
- `costPerBedAed` — Saudi benchmark SAR 2 – 3 M ≈ AED 1.95 – 2.93 M / bed; UAE 5★ luxury hospital 4 – 6 M / bed estimate; RATIFY LU-21 (NEW)
- `monthlyRentPsfSfa` (if leased to operator) — typical 70 – 110 AED / sqft / yr for hospital tenant
- `mePerSqftBuaPremium` — healthcare MEP is 2 – 3× generic commercial (medical gas, isolation rooms, BMS); RATIFY
- `regulatoryComplianceCostAed` — DHA / DHCC fit-out + commissioning + accreditation; typically 5 – 15 % of construction; RATIFY
- `commissionPct` — 2 % single-leg leasing default (operating tenant)

### §6.2 Formulas — capex per bed + operating yield

```
TotalCapex          = (bedsOrTreatmentRooms × costPerBedAed)
                      + LandCost
                      + RegulatoryComplianceCostAed

If owner-developer-operator model (single entity):
  RevenuePerBedYear = avgBedDayRevenue × occupiedDaysPerYear
                      (Dubai 5★ private hospital ≈ AED 2,500 – 5,000 / bed-day RATIFY)
  GrossAnnual       = bedsOrTreatmentRooms × RevenuePerBedYear × occupancyPct
  OpEx              = GrossAnnual × operatingPct (typical 65 – 75 % for hospital)
  NOI               = GrossAnnual − OpEx
  CapRate           = NOI / TotalCapex

If leased to operator model (typical UAE structure):
  rent calculation per Engine 2 §2.2 with:
    operatingPct    = 30 – 40 % (landlord-side; tenant operator bears 65 – 75 % at OpCo)
```

### §6.3 Verdict thresholds

| Metric | Strong | Moderate | Below |
|---|---|---|---|
| Cost / bed (general hospital, mainland) | < AED 2.5 M | 2.5 – 4 M | > 4 M |
| Cost / bed (specialty / 5★) | < AED 5 M | 5 – 8 M | > 8 M |
| Cap rate (leased to operator, on cost) | > 7 % | 5 – 7 % | < 5 % |

### §6.4 UAE-specific elements

- DHA facility licence (clinic AED 5,000 – 25,000 / yr; hospital AED 25,000 – 100,000+).
- DHCC free-zone framework — 0 % CT on qualifying income, foreign ownership 100 %.
- Mandatory MEP redundancy (UPS, generator, dual-feed power, isolation rooms, medical gas distribution per DHA spec).
- Insurance reimbursement framework — DHA Pulse / DRG codes — affects per-bed-day revenue cap.

### §6.5 Worked example (placeholder — RATIFY LU-21 for UAE per-bed)

100-bed general hospital DHCC Phase 1 (per published DHCC narrative).

```
beds                = 100
costPerBedAed       = 3,000,000      (Saudi benchmark midpoint — UAE RATIFY)
TotalCapex          ≈ AED 300 M for medical fit-out + structure
plus land           = AED  50 M
plus regulatory     = AED  30 M (10 % of construction)
TOTAL              ≈ AED 380 M

If owner-operator:
  AvgBedDayRevenue  = AED 3,500 (Dubai 5★ private RATIFY LU-22)
  Occupied days/yr  = 0.75 × 365 = 274 (75 % occupancy)
  RevPerBedYear     = 3,500 × 274 = AED 959,000
  GrossAnnual       = 100 × 959,000 = AED 95,900,000
  OpEx 70 %         = AED 67,130,000
  NOI               = AED 28,770,000
  CapRate           = 28.77M / 380M = 7.57 %      ← STRONG verdict
```

UAE-specific RATIFY needed for: per-bed-day revenue (LU-22), per-bed capex (LU-21), occupancy-by-sub-class lookup. Initial estimates produce believable cap rates; precise calibration awaits founder data + counsel review.

---

## §7 Engine 7 — Educational (K-12 + Nursery + University + Training) — NEW v6

**Land uses covered:** nursery (early years), K-12 school (curriculum-specific: UK / US / IB / Indian / French / Russian / others), university campus, vocational training centre.

**Methodology:** Knowledge and Human Development Authority (KHDA) framework — Education Cost Index 2025-26 = 2.35 % per [KHDA News 2025](https://web.khda.gov.ae/en/About-Us/News/2025/Education-Cost-Index); ADEK (Abu Dhabi Department of Education and Knowledge) framework; international benchmark for per-student capex. UAE-specific per-student capex RATIFY (no public source surfaced in research wave).

### §7.1 Inputs

**Required:**
- `subClass` (enum: `nursery` | `school_uk` | `school_us` | `school_ib` | `school_indian` | `school_french` | `school_russian` | `university` | `training_centre`)
- `studentCapacity` (number — total enrolled students at full capacity)
- `landCostAed`, `bua`, `district`

**Optional (auto-filled):**
- `costPerStudentAed` — international benchmark USD 60,000 – 200,000 ≈ AED 220,000 – 735,000 / student capacity (varies dramatically — basic facility vs full campus) — RATIFY LU-23 (NEW)
- `tuitionAedPerStudentYear` — Dubai school fees 9,000 – 110,000+ per [Dubai Schools 2026 Guide]; KHDA Education Cost Index +2.35 % p.a.
- `enrolmentRampCurve` — typical UAE: Y1 30 %, Y2 50 %, Y3 70 %, Y4 85 %, Y5+ 95 % stabilised
- `operatorMarginPct` — typical 12 – 25 % for established UAE operator (Bridge Cluster, Taaleem, GEMS, Aldar Education)
- `commissionPct` — 2 % default

### §7.2 Formulas — enrolment-driven NOI

```
TotalCapex          = (studentCapacity × costPerStudentAed)
                      + LandCost
                      + KHDA/ADEK regulatory fit-out (~5 – 8 % of construction)

For year y, enrolment Y(y) = studentCapacity × enrolmentRampCurve[y]:
  Tuition_y         = Y(y) × tuitionAedPerStudentYear
  TuitionEscalation = tuitionAedPerStudentYear × (1 + KHDA_ECI/100)^(y−1)
                       (KHDA caps tuition increases at the Education Cost Index)
  GrossRevenue(y)   = Y(y) × TuitionEscalation × ancillaryUpliftPct
                       (ancillary: transport / canteen / uniform / activity fees,
                        typically +15 – 25 % of tuition)
  OpEx(y)           = GrossRevenue(y) × (1 − operatorMarginPct/100)
  NOI(y)            = GrossRevenue(y) × operatorMarginPct/100

If operator-as-tenant (landlord-side):
  Rent_landlord     = Tuition × landlordRevenueShare    (typical 8 – 15 %)
  CapRate           = Rent_landlord / TotalCapex
```

### §7.3 Verdict thresholds

| Metric | Strong | Moderate | Below |
|---|---|---|---|
| Cost / student-capacity (mid-range UK / IB) | < AED 350 k | 350 – 550 k | > 550 k |
| Stabilised cap rate (landlord-side) | > 8 % | 6 – 8 % | < 6 % |
| Operator EBITDA margin | > 22 % | 15 – 22 % | < 15 % |

### §7.4 UAE-specific elements

- KHDA / ADEK approval mandatory — adds 12 – 18 months to project timeline.
- Education Cost Index 2.35 % p.a. caps tuition fee increases (2025-26 academic year); same calculation framework annual.
- KHDA rating affects fee-increase eligibility (Outstanding / Very Good / Good / Acceptable / Weak).
- 100 % foreign ownership in education free-zones; mainland subject to local-partner rules.
- Curriculum-specific fixed costs (IB authorisation USD 50k+; Cambridge fees variable).

### §7.5 Worked example (placeholder — RATIFY LU-23, LU-24 for UAE per-student)

500-pupil British curriculum primary school in Dubai Hills.

```
studentCapacity     = 500
costPerStudentAed   = 400,000      (mid-range estimate RATIFY LU-23)
TotalConstrCapex    = 200,000,000
LandCost            =  40,000,000
KHDA fit-out        =  15,000,000
TotalCapex         ≈ AED 255 M

tuitionAedPerStudentYear = 65,000  (Dubai outstanding-rated UK Y3 fee — RATIFY LU-24)
enrolmentRampCurve  = {Y1 30%, Y2 50%, Y3 70%, Y4 85%, Y5+ 95%}

Year 5 stabilised:
  Y(5)              = 475
  TuitionEscalation = 65,000 × (1.0235)^4 = AED 71,370
  AncillaryUplift 20 %                   = AED 14,274 / pupil
  GrossRevenue      = 475 × (71,370 + 14,274) = 475 × 85,644 = AED 40,680,900
  Operator margin 18 %                    = AED  7,322,562
  NOI               = AED 7,322,562 (operator)

If landlord-tenant rent share 12 % of tuition:
  Rent              = 475 × 71,370 × 12 % = AED 4,068,090
  CapRate           = 4.07M / 255M = 1.60 % → BELOW 6 % threshold

If owner-operator:
  CapRate (NOI / cost) = 7.32M / 255M = 2.87 %
```

**Interpretation:** education in UAE is **not a cap-rate-driven asset class** — it is operator-margin-driven over a 15–20 year hold. Cap rates are typically below 5 % on cost; institutional investors target IRR via tuition escalation + operator EBITDA growth + exit to a strategic acquirer (Aldar Education, Taaleem). The diff badge logic for Educational engine flags `costPerStudent` outliers more than cap rate.

---

## §8 Engine 8 — Senior Living (Independent + Assisted + Memory Care) — NEW v6

**Land uses covered:** independent living villas / apartments, assisted living facility, memory care unit, continuum-of-care community.

**Methodology:** Knight Frank UK Seniors Housing Trading Performance Review 2025/26 (UK methodology proxy); NIC Map Senior Housing data (US benchmark); UAE-specific RATIFY (emerging market — Saadiyat Oasis, Khalifa City senior housing pilots).

### §8.1 Inputs

**Required:**
- `subClass` (enum: `independent_living` | `assisted_living` | `memory_care` | `continuum_care`)
- `keys` or `units` (number — capacity metric)
- `landCostAed`, `bua`, `district`

**Optional (auto-filled):**
- `costPerKeyAed` — UK Knight Frank Y2025 average GBP 200,000 / key ≈ AED 920,000 / key for assisted living; UAE premium +20 – 40 % (climate / regulatory premium); RATIFY LU-25 (NEW)
- `monthlyFeePerKeyAed` — UK Y2025 average GBP 5,500 / key / month ≈ AED 25,250; UAE positioning RATIFY
- `occupancyPct` — UK 2025 stabilised 87 – 92 %; UAE emerging market (RATIFY)
- `gopMarginPct` — operator EBITDA typical 25 – 35 % for branded operator (Sunrise, Avante)
- `commissionPct` — 2 %

### §8.2 Formulas — fee × keys + EBITDAR (similar to hospitality)

```
TotalCapex          = keys × costPerKeyAed + LandCost + Soft + Reg + Construction
RevenuePerKeyYear   = monthlyFeePerKeyAed × 12
GrossAnnual         = keys × RevenuePerKeyYear × (occupancyPct / 100)

Operating cost cascade (similar to hospitality but no F&B uplift):
  Care staff cost           = GrossAnnual × careCostPct      (typical 35 – 50 %)
  Catering                  = GrossAnnual × cateringCostPct  (typical 8 – 12 %)
  Property OpEx (utilities, R&M, services) = 8 – 12 %
  Mgmt fee (if branded)     = 4 – 8 %
  Total OpEx                ≈ 60 – 75 %

EBITDAR              = GrossAnnual × (gopMarginPct / 100)    (residual after op cost cascade)
CapRate              = EBITDAR / TotalCapex
```

### §8.3 Verdict thresholds

| Metric | Strong | Moderate | Below |
|---|---|---|---|
| Cost / key (assisted living) | < AED 800 k | 800 k – 1.2 M | > 1.2 M |
| Cap rate stabilised | > 8 % | 6 – 8 % | < 6 % |
| EBITDAR margin | > 30 % | 20 – 30 % | < 20 % |

### §8.4 UAE-specific elements

- Emerging segment — first dedicated senior-living developments 2024–2025 (Saadiyat Oasis ~140 keys; Khalifa City pilot).
- Regulatory framework still developing — DHA / DOH-AD oversight on assisted-care facilities; care-staff licensing per DHA Healthcare Professional Licensing.
- Foreign-buyer pull factor (Western / Russian retiree relocation) — supports premium pricing.
- Insurance / payment integration with DHA Pulse for resident healthcare.

### §8.5 Worked example placeholder

RATIFY LU-25 for UAE-specific cost / key + monthly fee benchmark. Initial calibration uses Knight Frank UK 2025/26 methodology; UAE specific values pending founder data.

---

## §9 Engine 9 — Data Center (Hyperscale + Edge + Colocation) — NEW v6

**Land uses covered:** hyperscale (>100 MW), enterprise (10–100 MW), edge (<10 MW), colocation operator.

**Methodology:** JLL Global Data Center Outlook 2025 — global average construction cost USD 10.7 M / MW (2025), 2026 forecast USD 11.3 M / MW. UAE: Abu Dhabi + Dubai = 602 MW total capacity; Middle East 2.2 GW under construction across 9 metros. Cushman Data Center reports. Uptime Institute conventions for Tier I-IV classification + PUE benchmarks.

### §9.1 Inputs

**Required:**
- `subClass` (enum: `hyperscale` | `enterprise` | `edge` | `colocation`)
- `mwCapacity` (number — total IT load capacity in MW)
- `landCostAed`, `district`
- `tier` (enum: 1 | 2 | 3 | 4 — Uptime Institute classification)
- `puetarget` (number — Power Usage Effectiveness target)

**Optional (auto-filled):**
- `capexPerMwAed` — JLL Y2025 global avg USD 10.7 M / MW ≈ AED 39.3 M / MW; Y2026 forecast USD 11.3 M / MW ≈ AED 41.5 M / MW; UAE typically +10 – 15 % premium for climate (cooling) and regulatory; UAE benchmark ≈ AED 43 – 48 M / MW; RATIFY LU-26 (NEW)
- `rentPerKwMonthAed` — UAE colocation typical AED 1,200 – 2,000 / kW / month
- `powerCostAedPerKwh` — DEWA commercial rate AED 0.40 – 0.45 / kWh blended
- `coolingFractionOfPower` — Tier 3 typical 35 – 45 %; Tier 4 with hot-aisle containment 25 – 35 %
- `commissionPct` — 2 %

### §9.2 Formulas — $/MW capex + rent/kW

```
TotalCapex (per MW)  = capexPerMwAed
TotalProjectCapex    = mwCapacity × capexPerMwAed + LandCost + SoftCosts

For colocation operator model:
  GrossRentAnnual    = mwCapacity × 1000 (kW per MW) × rentPerKwMonthAed × 12 × utilisationPct
                       (utilisationPct = sold / contracted MW; typical 65 – 85 % stabilised)
  
  PowerPassthrough   = totalKwhConsumed × powerCostAedPerKwh
                        (typically 100 % passed to tenant — separately metered;
                         operator may margin 10 – 20 % on power)
  
  OpEx (network, security, ops staff, R&M):
                     = GrossRentAnnual × 25 – 35 %
  NOI                = GrossRentAnnual − OpEx
  CapRate            = NOI / TotalProjectCapex

Stabilised metric:
  RevenuePerKwMonth  = NOI × 12 / (mwCapacity × 1000)         (operator KPI)
```

### §9.3 Verdict thresholds

| Metric | Strong | Moderate | Below |
|---|---|---|---|
| CapEx / MW (Tier 3, UAE) | < AED 40 M | 40 – 48 M | > 48 M |
| Cap rate stabilised | > 9 % | 7 – 9 % | < 7 % |
| Stabilised PUE | < 1.4 | 1.4 – 1.6 | > 1.6 |

### §9.4 UAE-specific elements

- DEWA / ADWEA capacity charge per kW installed (substantial — RATIFY LU-27).
- Foreign tenant pull (AWS, Azure, Google Cloud regional zones — UAE GCC Tier 3+).
- VARA + CBUAE data residency — financial-services tenants increasingly require local-zone DCs.
- Dubai 5G + AI-zone designations driving hyperscale investment.

### §9.5 Worked example placeholder

20-MW Tier 3 colocation facility in Dubai Silicon Oasis or Dubai South. RATIFY LU-26 / LU-27 for UAE-specific capex per MW + DEWA capacity charge.

---

## §10 Engine 10 — Mixed-Use

**Definition:** plot intended to host two or more land uses simultaneously (typical: ground-floor retail + middle-floor office + tower residential, OR retail + hotel + branded residence).

### §10.1 Inputs

**Required:**
- `components` (array of `{ engineId (1-9), landUseSubClass, gfaSharePct, sequencingPhase, efficiencyPct }`)
- All shared inputs from §0.2

### §10.2 Formulas — component blend + phasing

```
For each component c:
  GFA_c              = totalGFA × gfaSharePct(c) / 100
  BUA_c              = GFA_c × 1.85               (rev-2 fix)
  SFA_c              = GFA_c × efficiencyPct_c
  
  Apply Engine N(c) with c's sub-class and inputs
  Get NetRevenue_c (BtS) or NOI_c (BtR/operating) as per engine
  TotalInvest_c      = sum land/construction/finance allocated by gfaSharePct(c)

BlendedNOI            = Σ_c NOI_c
BlendedNetRevenue     = Σ_c NetRevenue_c
BlendedTotalInvest    = Σ_c TotalInvest_c
BlendedROI            = (BlendedNetRevenue − BlendedTotalInvest) / BlendedTotalInvest
BlendedYield          = BlendedNOI / BlendedTotalInvest

Anchor uplift (NEW v6):
  AnchorUpliftPct     = 5 – 15 % (RATIFY LU-15) on retail component if grade-A anchor

Phasing — sequencing impact on cash flow (per Brueggeman & Fisher Ch. 21):
  For phase p in [1..maxPhase]:
    Construction(p)   = Σ_c (Construction_c WHERE phase_c == p)
    Sales(p)          = Σ_c (Sales_c WHERE phase_c <= p)   (cumulative)
    Cash(p)           = Sales(p) − Construction(p)
  Phased IRR computed via cash flow timeline (DCF, monthly resolution)
```

### §10.3 Outputs

**Primary:** Blended IRR (DCF-derived).

**Secondary:** per-component NOI / yield contribution; phase-level cash flow; anchor-tenant uplift; component sensitivity (which component drives blended return).

### §10.4 UAE-specific elements

- Mixed-use master plans require DDA / Dubai Municipality dual approval (typical 2–6 months).
- DLD splits transfer fees per component sale.
- Master-developer service charge cascades through all components.

### §10.5 Worked example placeholder — RATIFY LU-15 (anchor uplift)

City Walk-style mixed-use 500,000 sqft GFA — full numerical example RATIFY pending Cushman / Knight Frank UAE retail Q1 2026 anchor data.

---

## §11 Engine 11 — Infrastructure (PPP / Concession)

**Definition:** large-scale infrastructure projects under Public-Private Partnership or concession (district cooling, parking, schools (PPP variant), hospitals (PPP variant), toll, water).

**Methodology:** UAE Federal PPP framework — **rev-2 citation correction:** UAE Cabinet Resolution No. 1 of 2017 (federal PPP framework) + Dubai Decree No. 22 of 2015 (Dubai-level PPPs) + sector-specific regulations. Replaces rev-1's incorrect "Federal PPP Law No. 15 of 2024" citation per audit finding 01-12. Brueggeman & Fisher Ch. 19 (income property valuation — long-tenor); IVS 200 §40 (Business Interests valuation — DCF).

### §11.1 Inputs

**Required:**
- `projectCostAed` (total construction + soft costs)
- `concessionTermYears` (typical 25 – 40)
- `revenueModel` (enum: `availability_payment` | `user_pay` | `revenue_share` | `mixed`)
- `discountRatePct` (social discount rate, typical 6 – 10 %)
- `governmentSharePct` (0 – 50 %)
- `o_m_costPctOfRevenue` (typical 15 – 30 %)

**Optional:**
- `inflationRatePct` — UAE 2 – 4 % typical, default 3 %
- `terminalValueMethod` (enum: `book` | `gordon` | `none`)
- `escalationCadenceYears` — typically every 5 years CPI-linked
- `commissionPct` — 0 (PPP doesn't have brokerage)

### §11.2 Formulas — DCF NPV / IRR

```
For year y in [1, concessionTermYears]:
  GrossRevenue(y)    = baseRevenue × (1 + inflationRatePct/100)^(y−1) × usageRamp(y)
  GovernmentShare(y) = GrossRevenue(y) × governmentSharePct/100
  NetRevenue(y)      = GrossRevenue(y) − GovernmentShare(y)
  O&M(y)             = NetRevenue(y) × o_m_costPctOfRevenue/100
  CashFlow(y)        = NetRevenue(y) − O&M(y)

NPV = −projectCostAed + Σ_{y=1}^{concessionTermYears} CashFlow(y) / (1 + discountRatePct/100)^y

IRR = discount rate r such that:
  −projectCostAed + Σ_{y=1}^{concessionTermYears} CashFlow(y) / (1 + r)^y = 0
  (Solve via Newton-Raphson per Brueggeman & Fisher Appendix A)

PaybackYears = smallest y such that Σ_{k=1}^{y} CashFlow(k) ≥ projectCostAed
DiscountedPayback = same with discounted CashFlow
```

### §11.3 Outputs

Primary: NPV at chosen discount rate.

Secondary: IRR; payback (un-discounted and discounted); DSCR per year (if debt-financed); sensitivity table (NPV at discount rates 6/8/10/12 %); government-share sensitivity (NPV at 0/25/50 %); terminal value contribution.

### §11.4 UAE-specific elements

- UAE Cabinet Resolution No. 1 of 2017 — federal PPP procurement framework.
- Dubai Decree No. 22 of 2015 — Dubai-level PPPs.
- Ministry of Finance PPP Unit — central authority for federal-level concessions.
- Dubai Municipality / Department of Economy issues local PPPs (district cooling, parking).

### §11.5 Worked example

Dubai district cooling concession, 25 MW, 25-year tenor — narrative result indicative AED 80–120 M positive NPV at 8 % discount rate. RATIFY LU-17 — Excel build deferred to Phase B.

---

## §12 Engine 12 — Off-Plan (Cross-Cutting Wrapper)

**Definition:** Off-Plan is a **modifier** that wraps any of engines 1–9, applying timing-aware variants. Per Zhan ratification 5 May 2026 (Q4) — Off-Plan is a cross-cutting concept, not a standalone asset class.

When user picks `Off-Plan` mode, the calculator additionally surfaces:
- Construction draw curve (escrow-aligned)
- Sales velocity (units / month)
- Payment plan curve (buyer-side milestones)
- Handover lag (3-6 months)
- Escrow opportunity cost

### §12.1 Inputs (in addition to base engine inputs)

**Required:**
- `projectDurationMonths` (typical 24 – 60)
- `salesVelocityUnitsPerMonth` (typical 3 – 15 mid-rise; 1 – 5 villa community)
- `paymentPlanCurve` — array of `{ percentage, milestoneMonth }`
  - Default 30/70 plan: `[{30, 0}, {70, handover}]`
  - Default 30/30/40: `[{30, 0}, {30, midconstruction}, {40, handover}]`
  - Custom user input
- `constructionDrawCurve` — array matching RERA escrow milestones (Dubai default `[{20, m6}, {30, m12}, {30, m24}, {20, m_handover}]`)

**Optional:**
- `escrowCarryingCostPct` — interest forgone on escrow funds, typical 3 – 5 % p.a.
- `handoverLagMonths` — DLD title-deed issuance after physical completion, typical 3 – 6 months
- `salesCommissionPaymentSchedule` — typically 50 % at sale, 50 % at handover

### §12.2 Formulas — staged cash flow + escrow timing

```
For each month m in [0, projectDurationMonths + handoverLagMonths]:
  UnitsSoldThisMonth(m) = min(salesVelocityUnitsPerMonth, totalUnits − unitsSoldToDate)
  
  CashIn(m)             = Σ over paymentPlanCurve milestones whose monthFromStart matches
                          (m relative to each unit's sale month, summed across all units sold ≤ m)
  
  CashOut(m)            = ConstructionDraw(m) + MarketingSpend(m)
                        + LandPaymentInstallment(m) (if installments)
                        + DLDPaidPerUnitSold(m)
  
  CumulativeCash(m)     = Σ_{k=0}^{m} (CashIn(k) − CashOut(k))

EscrowReleaseSchedule  = construction drawing curve (released to developer per RERA milestone)

DeveloperLockedCapital = max negative cumulative cash flow (peak working-capital need)

IRR(monthly cash flow) = solve for r in monthly compounding;
                          annualised = (1 + r_monthly)^12 − 1

EscrowedFunds(m)       = CashInToEscrow(m) − ReleasedFromEscrow(m)
OpportunityCost        = EscrowedFunds(m) × (escrowCarryingCostPct / 100) / 12   (monthly)
TotalEscrowOpportunityCost = Σ over project months
```

### §12.3 Outputs

Primary: Project-level annualised IRR + peak-developer-locked-capital.

Secondary: Construction-draw vs sales-collection cash-flow curve; escrow-release schedule; sales velocity vs construction completion timing; buyer payment plan vs construction draw mismatch (gap = developer-financed bridge); marketing spend per unit; sensitivity ±25 % sales velocity → IRR delta.

### §12.4 UAE-specific elements

- **Escrow under Law 8 of 2007** — every off-plan project must have a RERA-approved escrow at a DLD-approved bank; funds released only on RERA-validated construction milestones.
- **Oqood under Law 13 of 2008** — every off-plan sale registered before payment; mandatory.
- **Trakheesi project registration AED 150,020 + AED 1,020 per advertising permit** (or AED 5,020 launch event).
- **DLD pays developer at completion via title deed conversion** — Oqood → title deed.
- **Handover lag** — typical 3-6 months between physical completion and DLD title-deed issuance.

### §12.5 Worked example

Per Phase B Excel build — same 100-unit residential apartment project framework as rev-1 §7.5; RATIFY LU-19 (escrow milestone schedule current Q1 2026) before formal worked example.

---

## §13 Engine 13 — Land-Hold (Passive Appreciation; Rezoning Upside Sub-Mode)

**Definition:** investor purchases plot with intent to hold N years and resell at appreciation. Two sub-modes:
- **Standard** — no development, minimal carrying cost.
- **Rezoning Upside** — held for FAR / land-use upgrade; replaces rev-1 separate "Future Development" engine per Zhan ratification 5 May 2026 (Q4).

### §13.1 Inputs

**Required:**
- `plotAreaSqft`, `landCostAed`
- `holdPeriodYears` (typical 3 – 10)
- `expectedAppreciationCagrPct` — district-level historical CAGR per DLD transactions; Dubai Hills 8 – 12 % p.a. for premium plots Q1 2026 RATIFY LU-20
- `district`
- `subMode` (enum: `standard` | `rezoning_upside`)

**Optional:**
- `mortgagePct` (if leveraged purchase)
- `mortgageRatePct`
- `annualHoldingCostsAed` — service charge + mortgage interest + insurance
- `rezoningProbabilityPct` — for `rezoning_upside` sub-mode, typical 30 – 60 % (RATIFY LU-28)
- `rezoningFarUpgrade` — proposed FAR delta (e.g. 1.5 → 2.5)

### §13.2 Formulas — buy-hold-sell (rev-2 — DLD formula bug fixed per audit finding 01-7)

```
PurchasePrice         = landCostAed × (1 + dldPct/100)              (DLD 4 % buyer's cost)

Standard sub-mode:
  SalePrice(y)        = landCostAed × (1 + expectedAppreciationCagrPct/100)^y
  SaleProceedsNet     = SalePrice(y) × (1 − sellerDldPct/100)        (rev-2 fix:
                                                                       seller DLD scales
                                                                       with sale price,
                                                                       not landCostAed)
                        sellerDldPct default 0 (buyer-only convention dominant)

Rezoning Upside sub-mode (replaces Future Development engine):
  baseSalePrice(y)    = landCostAed × (1 + expectedAppreciationCagrPct/100)^y
  upgradedSalePrice(y) = baseSalePrice(y) × farUpgradeMultiplier
                          (farUpgradeMultiplier ≈ post-rezoning land value / pre-rezoning;
                           typical 1.5 – 2.5× for a 1.5 → 2.5 FAR upgrade)
  ExpectedSalePrice(y) = (rezoningProbabilityPct/100) × upgradedSalePrice(y) +
                         (1 − rezoningProbabilityPct/100) × baseSalePrice(y)

For each year y in [1, holdPeriodYears]:
  HoldingCostsAnnual(y) = serviceCharge + mortgageInterest(y) + insurance
  CumulativeHoldingCosts = Σ_{k=1}^{y} HoldingCostsAnnual(k)

NetGain               = SaleProceedsNet − PurchasePrice − CumulativeHoldingCosts
NetReturnPct          = NetGain / PurchasePrice
AnnualisedReturnPct   = (1 + NetReturnPct)^(1/holdPeriodYears) − 1
```

**With mortgage:**

```
LoanAmount         = PurchasePrice × (mortgagePct / 100)
EquityRequired     = PurchasePrice − LoanAmount
MonthlyEMI         = LoanAmount × r × (1+r)^n / ((1+r)^n − 1)  where r = mortgageRatePct/12, n = months
TotalInterest      = (MonthlyEMI × n) − LoanAmount
NetGain_levered    = SaleProceedsNet − PurchasePrice − TotalInterest − CumulativeHoldingCosts
LeveredEquityIRR   = solve for monthly cash flows incl. final sale
```

### §13.3 Outputs

Primary: CAGR after costs (annualised return).

Secondary: Total Net Gain AED; Cumulative DLD fees in + out; Cumulative holding costs; appreciation-rate sensitivity (CAGR at 5/8/12 %); leveraged equity IRR vs unleveraged CAGR; payback (years to recover initial cost from appreciation alone); rezoning upside sensitivity (CAGR at 0/30/60/100 % rezoning probability).

### §13.4 UAE-specific elements

- DLD 4 % buyer's fee (most common buyer-only convention) plus 4 % at sale (by negotiation).
- No annual property tax in UAE for individual property.
- Service charge varies dramatically by district.
- Mortgage rates EIBOR + 1.5 % typical → ~5 % variable.

### §13.5 Worked example (verified — rev-2 fix)

Dubai Hills villa plot, 10,000 sqft, 5-year hold, standard sub-mode.

```
plotAreaSqft           = 10,000
landCostAed            = 8,000,000
holdPeriodYears        = 5
expectedAppreciationCagrPct = 8
serviceChargePsfBua    = 3.5         (Dubai Hills villa median)
annualServiceCharge    = 10,000 × 3.5 = AED 35,000
sellerDldPct           = 0           (buyer-only convention)

PurchasePrice           = 8M × 1.04                  = AED  8,320,000
SalePrice (year 5)      = 8M × 1.08^5
                        = 8M × 1.469328              = AED 11,754,624
SaleProceedsNet (sellerDld = 0) =                     AED 11,754,624
CumulativeHoldingCosts  = 35,000 × 5                  = AED    175,000
NetGain                 = 11.75M − 8.32M − 0.175M    = AED  3,259,624
NetReturnPct            = 3.26M / 8.32M               = 39.18 %
AnnualisedReturnPct     = (1.3918)^(1/5) − 1
                        = 1.0683 − 1                  = 6.83 % CAGR after costs
```

This 8 % gross appreciation drops to ~6.83 % CAGR after DLD entry + holding costs — illustrates the friction cost of pure-hold strategy.

**Rezoning Upside example placeholder:** RATIFY LU-28 (rezoning probability % per district / process) before formal calibration. The math is straightforward — substitute `ExpectedSalePrice` per §13.2 — but probability values and FAR-upgrade multipliers are district-specific and require founder + regulatory input.

---

## §14 Modifiers — Fractional / VARA Tokenisation

**Definition:** When the `Fractional` modifier flag is enabled on any engine 1–13, the calculator surfaces additional VARA-compliance fields and computes per-token unit economics.

**Methodology:** VARA Virtual Asset Issuance Rulebook 2025 (latest update 19 June 2025); Asset-Referenced Virtual Asset (ARVA) framework; PRYPCO Mint pilot precedent (May 2025 — DLD launched MENA's first tokenised real-estate project, AED-denominated, no crypto-token currency).

### §14.1 Additional inputs

- `varaCategory1Issuer` (boolean — confirms issuer holds VARA Category 1 Virtual Asset Licence)
- `tokenSupplyTotal` (number — total tokens in the issuance)
- `pricePerTokenAed` (= `propertyValue / tokenSupplyTotal`)
- `whitepaperStatus` (enum: `draft` | `submitted` | `approved`)
- `auditConfirmation` (boolean — audited asset backing per VARA requirement)
- `secondaryMarketEnabled` (boolean — VARA approval for secondary trading)

### §14.2 Modifier output

- Per-token income calculator (e.g. apartment yields → fractional dividend per token)
- VARA-compliance checklist (Category 1 licence, whitepaper, audit, secondary-market approval)
- Indicative liquidity-discount on token vs full ownership (typical 10 – 25 % per global tokenised RE precedents)

### §14.3 UAE-specific elements

- VARA Category 1 Virtual Asset Licence required for any issuer (mandatory per Rulebook 2025).
- Whitepaper publication and audit requirements per VARA compliance framework.
- DLD coordination — PRYPCO Mint pilot dealt only in dirhams (no crypto-token currency); regulatory approval framework still evolving.
- AML/KYC integration with token holders.

### §14.4 Compliance pathway (for Phase B implementation)

1. Issuer holds VARA Category 1 Virtual Asset Licence (or partners with licensed issuer like PRYPCO).
2. Submit compliant whitepaper to VARA (audit-of-asset-backing required).
3. Conduct issuance through approved platform (PRYPCO Mint as Phase 1 model).
4. Secondary-market enablement (separate approval).

Detail in `04_DISTRIBUTION_LEGAL_MOAT.md` §6 and `07_METHODOLOGY.md` §5.

---

## §99 Source citations (rev-2 — additions in italics)

| # | Source | URL | Accessed |
|---|---|---|---|
| 1 | Turner & Townsend, GCMI 2025 — Middle East | https://publications.turnerandtownsend.com/global-construction-market-intelligence-2025/middle-east | 2026-05-05 |
| 2 | Turner & Townsend, UAE Market Intelligence 2025 | https://marketintelligence.turnerandtownsend.com/uaemi-2025/construction-cost-performance | 2026-05-05 |
| 3 | Knight Frank, UAE Hospitality Market Review 2025 | https://www.knightfrank.ae/newsroom/article/2025/10/uae-hospitality-market-review-2025 | 2026-05-05 |
| 4 | Engel & Völkers, Construction Cost in Dubai 2026 | https://www.engelvoelkers.com/ae/en/resources/construction-cost-dubai | 2026-05-05 |
| 5 | Habhab Construction, Villa Cost Dubai 2025 | https://habhabconstruction.com/villa-construction-cost-dubai/ | 2026-05-05 |
| 6 | JLL, UAE Office / Living / Industrial Market Dynamics Q3 2025 | https://www.jll.com/en-ae/insights/market-dynamics/uae-office | 2026-05-05 |
| 7 | Engel & Völkers, Property Transfer in Dubai | https://www.engelvoelkers.com/ae/en/resources/property-transfer-in-dubai-understanding-the-legal-process | 2026-05-05 |
| 8 | EGS Auditing, Trakheesi Permit Compliance 2026 | https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance | 2026-05-05 |
| 9 | Oliva, DLD Fees Title Deed Timeline 2026 | https://joinoliva.com/en/learn/blog/dld-transaction-fees-dubai-rest-app-title-deed-timeline | 2026-05-05 |
| 10 | Kayrouz & Associates, Dubai RE Law Guide | https://www.kayrouzandassociates.com/insights/dubai-property-law-guide-for-investors-and-developers | 2026-05-05 |
| 11 | CBUAE, EIBOR Rates | https://www.centralbank.ae/en/forex-eibor/eibor-rates/ | 2026-05-05 |
| 12 | LeoCompare, UAE Mortgage Rates 2026 | https://www.leocompare.com/home-loans/interest-rate-uae | 2026-05-05 |
| 13 | Driven Properties, Dubai Service Charge Index 2026 | https://www.drivenproperties.com/dubai-real-estate-market-guide/service-charge-index | 2026-05-05 |
| 14 | LuxHabitat, Dubai Service Charges 2026 | https://www.luxhabitat.ae/the-journal/dubai-service-charges-guide/ | 2026-05-05 |
| 15 | FAM Properties, Dubai Service Charges 2026 | https://famproperties.com/service-charges-dubai | 2026-05-05 |
| 16 | LuxuryProperty, Service Charge Index 2025 | https://www.luxuryproperty.com/blog/dubai-service-charge-index-for-2020 | 2026-05-05 |
| 17 | Knight Frank UAE, Dubai Residential Q3 2025 | https://www.knightfrank.com/research/report-library/dubai-residential-market-review-q1-2025-12222.aspx | 2026-05-05 |
| 18 | Afridi & Angell, RERA Code of Ethics (Lexology) | https://www.lexology.com/library/detail.aspx?g=342448e7-8361-43e3-a251-52a244dcdc8b | 2026-05-05 |
| 19 | DDA, Master Planning Guidelines | https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/Planning-and-development/Master-Planning-Services/pdf/Master-Planning-Guidelines.pdf | 2026-05-05 |
| 20 | DDA, Codes & Guidelines portal | https://dda.gov.ae/en/planning-development/codes-and-guidelines | 2026-05-05 |
| 21 | Capital Zone, UAE Mortgage 2026 | https://www.capitalzone.ae/the-2026-uae-mortgage-blueprint-navigating-interest-rates-rental-shifts-and-market-maturity/ | 2026-05-05 |
| 22 | Arnifi, Construction Cost Dubai 2026 | https://arnifi.com/blog/construction-cost-in-dubai-2026/ | 2026-05-05 |
| *23* | *RICS NRM 1, 3rd Edition (Oct 2022 reissue) — Order of Cost Estimating and Cost Planning* | *https://www.rics.org/content/dam/ricsglobal/documents/standards/october_2021_nrm_1.pdf* | *2026-05-05* |
| *24* | *USALI 12th Revised Edition (July 2024) — HFTP & AHLA* | *https://usali.hftp.org/* | *2026-05-05* |
| *25* | *IVS 2025 — International Valuation Standards effective 31 January 2025* | *https://saicawebprstorage.blob.core.windows.net/uploads/resources/IVS-effective-31-January-2025.pdf* | *2026-05-05* |
| *26* | *ICMS 3rd Edition (2021) — International Cost Management Standards* | *https://icms-coalition.org/the-standard/* | *2026-05-05* |
| *27* | *JLL Global Data Center Outlook 2025* | *https://www.jll.com/content/dam/legacy/jll-com/documents/pdf/research/global/jll-data-center-outlook-2025.pdf* | *2026-05-05* |
| *28* | *VARA Rulebook 2025 (Virtual Asset Issuance, Real Estate Tokenisation) — 19 June 2025 update* | *https://rulebooks.vara.ae/* | *2026-05-05* |
| *29* | *KHDA Education Cost Index 2025-26* | *https://web.khda.gov.ae/en/About-Us/News/2025/Education-Cost-Index* | *2026-05-05* |
| *30* | *DHCC AED 1.3 B Phase 1 expansion announcement (2026)* | *https://www.dhcc.ae/media/news/dubai-healthcare-city-authority-unveils-aed13-billion-development-plan* | *2026-05-05* |
| *31* | *Knight Frank UK Seniors Housing Trading Performance Review 2025/26* | *https://www.knightfrank.co.uk/site-assets/research/report-pdfs/senior-housing-trading-performance-review/seniorhousing-2025_final2_single.pdf* | *2026-05-05* |
| *32* | *Saudi healthcare construction cost benchmark (Argaam, Sept 2024) — SAR 2-3 M / bed* | *https://argaamplus.s3.amazonaws.com/64fe4807-4e9f-413c-a813-ebb2d4606430.pdf* | *2026-05-05* |
| *33* | *CBRE UAE Q1 2026 Real Estate Market Review (Dubai office +14 % YoY)* | *https://economymiddleeast.com/news/uae-office-market-maintains-growth-in-q1-2026-as-rents-surge-14-percent-in-dubai-12-percent-in-abu-dhabi/* | *2026-05-05* |

Plus key textbook references (no URLs — cite by edition + section per `07_METHODOLOGY.md`):

- Brueggeman, William B. and Fisher, Jeffrey D. *Real Estate Finance and Investments*, 17th Edition (McGraw-Hill, 2024). Used: Ch. 4 (mortgage math), Ch. 5 (DCF / IRR / NPV), Ch. 11–14 (income property), Ch. 18–19 (commercial real estate, infrastructure), Ch. 21 (development financing).
- Rushmore, Stephen and Baum, Erich. *Hotels and Motels — A Guide to Market Analysis, Investment Analysis, Valuations*, 7th Edition (HVS Press, 2023). Used: hospitality EBITDAR projection, RevPAR-driven valuation.
- Wyatt, Peter. *Property Valuation*, 3rd Edition (Wiley-Blackwell, 2023). Used: cap rate methodology, DCF for commercial real estate.

---

## §100 FOUNDER RATIFY items (rev-2 — original 64 + 8 NEW from audit + 4 NEW from rev-2 expansion)

The original §100 list from rev-1 (LU-1 through LU-20) is RETAINED unchanged on this branch. rev-2 adds the items below.

**rev-2 NEW items from audit (AUD-1 through AUD-8 — see `05_AUDIT_REPORT.md` §5).** Of those, AUD-1 (BUA), AUD-2 (PDF toolchain), AUD-3 (model name unification), AUD-4 (fallback mechanism), AUD-5 (Master Tree mapping), AUD-6 (RLS), AUD-7 (language scope) are RESOLVED via Zhan ratification 5 May 2026 + this rev-2.

**rev-2 NEW items from engine expansion:**

| # | Section | Item | Ask |
|---|---|---|---|
| LU-21 | §6.1 | Healthcare cost / bed UAE benchmark Q1 2026 | RATIFY — Saudi proxy SAR 2-3 M; UAE-specific value pending |
| LU-22 | §6.5 | Avg bed-day revenue Dubai 5★ private hospital | RATIFY — initial estimate AED 3,500 |
| LU-23 | §7.1 | Educational cost / student-capacity UAE | RATIFY — international USD 60-200k benchmark; UAE specific pending |
| LU-24 | §7.5 | Outstanding-rated UK Y3 fee Q1 2026 | RATIFY — sample AED 65k assumed |
| LU-25 | §8.1 | Senior Living cost / key UAE | RATIFY — UK benchmark AED 920k; UAE premium 20-40 % proposed |
| LU-26 | §9.1 | Data Center capex / MW UAE | RATIFY — global avg AED 39.3M; UAE +10-15 % proposed |
| LU-27 | §9.4 | DEWA / ADWEA capacity charge per kW | RATIFY |
| LU-28 | §13.1 | Rezoning probability per district + FAR-upgrade multiplier | RATIFY — Dubai Hills 30-60 % proposed |

These 8 NEW items add to the 64 original + 8 audit-surfaced for total 80 RATIFY items as of rev-2. Of the original 64, ~18 are now closed via deep research per `00_OVERVIEW.md` rev-2 disclosure. 54 + 8 + 8 = ~70 remain open for founder validation in Phase B sequencing.

---

*End of land-use engines spec rev-2. Next: `02_CONSTRUCTION_COST_DATABASE.md`.*

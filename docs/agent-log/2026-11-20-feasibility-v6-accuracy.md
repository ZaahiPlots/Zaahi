# 2026-11-20 — Feasibility v6 accuracy, saved studies, compare

Branch `feat/feasibility-v6-accuracy` (off `main` @ `71824f1`). Not pushed, not merged, not deployed.
Evidence base: `docs/audits/FEASIBILITY_AUDIT_2026-11-20.md` (B1–B10, M1–M11, PDF review, studies/compare proposal).
Task brief: `~/Downloads/PROMPT_feasibility_v6_fix_and_studies.md`.

## FOUNDER DECISIONS

Nothing below was decided silently. Each item is live in the code as a default the user can edit, marked with its status in the field tooltip and in the PDF "Basis of assumptions". **assumed** = my judgment, no published source; **pending** = needs your call before it can be called right; **placeholder** = no market data exists, verdict is withheld while it is untouched.

### A. Decisions that change what the product says

| # | Decision | What I did | Status |
|---|---|---|---|
| A1 | **BUA ÷ GFA = 1.85** for residential, off-plan, office, retail, mixed-use. The v5 citation ("DM Circular 168/2018") could not be found anywhere. It implies ~0.85 sqft of parking and non-GFA area per sqft of GFA — roughly three parking bays per apartment. This one number moves the audit plot's residential BtS from **−50.5M at 1.85 to +2.8M at 1.45**; office from −13.1M to +40.4M. | Kept 1.85 (it was founder-ratified in v5), labelled "carried, not re-verified". | **pending — highest impact** |
| A2 | **Operating assets (hotel, hospital, school, data centre) in Build to Sell** = build → ramp up → sell the stabilised asset at a cap rate, with a 2% asset-sale fee instead of 10.5% unit commission. Also enabled Build to Rent for them. | Built. | assumed |
| A3 | **Income to the property owner** for hospital and school = 50% of operator EBITDA (the rest stays with the operator). 100% for hotels and data centres. Without this a hospital reads like the operator's P&L. | Built, editable. | assumed |
| A4 | **Verdict guards.** (i) "Indicative only" — no band when a revenue-critical input is still a placeholder. (ii) "Outside plausible range — check inputs" above BtS IRR 60% or ROI 100%; BtR IRR 40% or yield 15%. Bands themselves (BtS/JV 20/12/0, BtR 15/9/0) are unchanged from your 2026-06-06 ratification. | Built. Ceilings are mine. | assumed |
| A5 | **Change of use.** A non-developable land use (open space, utility, government, transport, recreation, public facility, water body, religious) shows "Not a development plot". The user can press "Model a change-of-use scenario"; every verdict is then prefixed "Hypothetical" and a caveat is printed. | Built. | assumed |
| A6 | **JV structures**: profit share (land value back, then % of profit — default 30%), revenue share (% of gross revenue — default 20%), equity (pro rata to capital). Developer = project − landowner, so the three IRRs always bracket. | Built. Default shares are mine. | assumed |
| A7 | **JV fee on land.** Audit M8 says the 4% DLD fee should disappear in a JV. DLD charges 4% of land value to register a development agreement, so I kept a fee line, named it "DLD development-agreement fee", default 4%, editable to 0. **This contradicts the audit's expectation.** | Built. | pending |
| A8 | **Land-Hold and Infrastructure engines** stay "not modelled" in every mode including JV (no more −100% IRR). A land-banking model (hold N years, exit at CAGR) is not built: it needs a land-price growth assumption, which is one step from estimating a land price. | Not built. | pending |
| A9 | **Residual land value** ("land cost at which this deal reaches a 20% IRR", and the break-even land cost) is shown as an output of the model, with the words "not a valuation of the plot". It is never written anywhere and never used as an input. Confirm this does not cross the "never compute a land price" line. | Built, output only. | pending |
| A10 | **Location (M3).** The repo holds 6,886 DLD *land* transactions and no unit sales or rents, so real per-area medians cannot be wired yet. Interim: a 16-area table of published asking prices/rents (`areaBenchmarks.ts`) seeds the price when the district matches; otherwise the city-wide default is used and the result carries "City-wide price, not this location". | Interim built. Wiring DLD unit-sale medians is **not done**. | pending |
| A11 | **Who can see a shared study.** See section F below. | | pending |
| A12 | **Senior Living**: every default is a placeholder (no UAE operating data). BtR only; verdict is always "Indicative" until the user enters figures. | Built. | placeholder |
| A13 | **Data centre**: MW must be typed (it depends on the power allocation, not the plot). Revenue AED 8.6M/MW/yr is a placeholder → verdict "Indicative". | Built. | placeholder |
| A14 | **Sale price for retail (2,400) and industrial (500)** per sqft: no published strata-sale evidence → placeholder → BtS verdict "Indicative". | Built. | placeholder |
| A15 | **Removed** the v6.0 "Optimisation recommendations" side calculation; replaced with "Where this study departs from the defaults" in the PDF, which re-runs the model with each off-default input put back and reports the change in profit. | Built. | for information |
| A16 | **"COMMERCIAL" routes to the Office engine** (40,289 DDA plots carry that label and nothing finer). Many of those plots permit retail or hotel. The user can switch engine; the default is my call. | Built. | assumed |

### B. Programme, finance and soft-cost defaults I had to assume

Design + permits 9–12 months by engine · hotel build 36 months · authority & utility fees 1% of construction · developer overhead 3% · land holding cost 0% · sell-out 12 months after handover · off-plan 15% sold at launch / 80% by handover / 60% of price paid before handover · asset-sale and exit selling costs 2% · construction loan 7% · term loan 6.5% · rent growth 3% · hold 5 years · discount rate 10% · all ramp-up curves (hotel 40/70/90, hospital 0/20/40/60/75, school 0/30/55/75/90, data centre 30/60/85, office 60/90, residential 80).

### C. Costs deliberately left out (printed in the PDF under "What is not included")

9% corporate tax · buyer-side 4% DLD/Oqood on unit sales · the RERA pre-sales guarantee and its cost (sources conflict: 20% vs 30% of construction) · construction-price escalation · tenant incentives and leasing commissions · loan arrangement fees and reserves · master-developer NOC and community charges · VAT timing · site-specific risk. Irrecoverable VAT defaults to 0% (FTA guide VATGRE1 s.7.2: developers recover input VAT on residential first supply and on commercial) with an editable line.

### D. Every default that is not sourced

196 defaults in total: 60 sourced, 23 derived from published figures, 48 carried from v5 unverified, 46 assumed, 19 placeholder. The 113 that are not sourced or derived:

| Engine | Input | Default | Status | Basis |
|---|---|---|---|---|
| Residential | buaGfaRatio | 1.85 | carried | v5 default. The "Dubai Municipality Circular 168/2018" citation could not be found; no published source gives a parking-inclusive BUA/GFA ratio. Pending founder decision. |
| Residential | infrastructurePsfGfa | 37 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Residential | consultancyPct | 4 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Residential | contingencyPct | 5 | carried | v5 default. Trade sources cite 7–15%. |
| Residential | occupancyPct | 95 | assumed | Dubai Residential REIT reports 98.4–98.6% (2026); 95% allows for voids on one new block. |
| Residential | exitCapRatePct | 7 | assumed | No published build-to-rent cap rate. Private BtR trades at 7–8% GROSS (Cushman & Wakefield, 2025). Pending. |
| Residential | rampPct | 80 | assumed | Lease-up: year 1 at 80% of stabilised income. |
| Residential | preConstructionMonths | 9 | assumed | Design + authority approvals. One data point: Mediclinic Parkview, 10 months from announcement to groundbreaking. Editable. |
| Residential | marketingPct | 2 | carried | v5 default 2%. RERA caps marketing paid from escrow at 5% of sales (DLD FAQ). |
| Residential — off-plan | buaGfaRatio | 1.85 | carried | v5 default. The "Dubai Municipality Circular 168/2018" citation could not be found; no published source gives a parking-inclusive BUA/GFA ratio. Pending founder decision. |
| Residential — off-plan | infrastructurePsfGfa | 37 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Residential — off-plan | consultancyPct | 4 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Residential — off-plan | contingencyPct | 5 | carried | v5 default. Trade sources cite 7–15%. |
| Residential — off-plan | occupancyPct | 95 | assumed | Dubai Residential REIT reports 98.4–98.6% (2026); 95% allows for voids on one new block. |
| Residential — off-plan | exitCapRatePct | 7 | assumed | No published build-to-rent cap rate. Private BtR trades at 7–8% GROSS (Cushman & Wakefield, 2025). Pending. |
| Residential — off-plan | rampPct | 80 | assumed | Lease-up: year 1 at 80% of stabilised income. |
| Residential — off-plan | preConstructionMonths | 9 | assumed | Design + authority approvals. One data point: Mediclinic Parkview, 10 months from announcement to groundbreaking. Editable. |
| Residential — off-plan | marketingPct | 2 | carried | v5 default 2%. RERA caps marketing paid from escrow at 5% of sales (DLD FAQ). |
| Office | buaGfaRatio | 1.85 | carried | v5 default. The "Dubai Municipality Circular 168/2018" citation could not be found; no published source gives a parking-inclusive BUA/GFA ratio. Pending founder decision. |
| Office | infrastructurePsfGfa | 46 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Office | consultancyPct | 4.5 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Office | contingencyPct | 5 | carried | v5 default. Trade sources cite 7–15%. |
| Office | operatingPct | 32 | carried | v5 default. No published office opex ratio found. |
| Office | rampPct | 60/90 | assumed | Lease-up: 60% of stabilised income in year 1, 90% in year 2. |
| Office | preConstructionMonths | 9 | assumed | Design + authority approvals. One data point: Mediclinic Parkview, 10 months from announcement to groundbreaking. Editable. |
| Office | marketingPct | 2 | carried | v5 default 2%. RERA caps marketing paid from escrow at 5% of sales (DLD FAQ). |
| Office | serviceChargePsfYear | 20 | placeholder | No official office service-charge average found. |
| Retail | buaGfaRatio | 1.85 | carried | v5 default. The "Dubai Municipality Circular 168/2018" citation could not be found; no published source gives a parking-inclusive BUA/GFA ratio. Pending founder decision. |
| Retail | efficiencyPct | 80 | carried | v5 default. No published retail efficiency found. |
| Retail | infrastructurePsfGfa | 55 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Retail | consultancyPct | 4 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Retail | contingencyPct | 6 | carried | v5 default. Trade sources cite 7–15%. |
| Retail | salesPsfSfa | 2,400 | placeholder | v5 figure. No verified retail sale price per sqft was found — enter your own. |
| Retail | operatingPct | 28 | carried | v5 default. No published retail opex ratio found. |
| Retail | exitCapRatePct | 8 | assumed | No published retail yield found; set equal to the office range midpoint. |
| Retail | rampPct | 70/90 | assumed | Lease-up: 70% in year 1, 90% in year 2. |
| Retail | preConstructionMonths | 9 | assumed | Design + authority approvals. One data point: Mediclinic Parkview, 10 months from announcement to groundbreaking. Editable. |
| Retail | marketingPct | 2 | carried | v5 default 2%. RERA caps marketing paid from escrow at 5% of sales (DLD FAQ). |
| Retail | serviceChargePsfYear | 20 | placeholder | No official retail service-charge average found. |
| Hospitality | infrastructurePsfGfa | 65 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Hospitality | consultancyPct | 3.5 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Hospitality | contingencyPct | 7 | carried | v5 default. Trade sources cite 7–15%. |
| Hospitality | propertyIncomeSharePct | 100 | assumed | Owner keeps the hotel EBITDA; management fees are inside operating costs. |
| Hospitality | exitCapRatePct | 7 | carried | v5 default. Hotel cap rates are "not formally tracked" in the UAE; transactions imply 4–6% (MMCG). Pending. |
| Hospitality | rampPct | 40/70/90 | assumed | Hotels take 36–48 months to mature; year-1 occupancy 50–60% against 68–78% stabilised (RLA Global, not GCC-specific). NOI at 40 / 70 / 90% of stabilised in years 1–3. |
| Hospitality | preConstructionMonths | 12 | assumed | Design + authority approvals. One data point: Mediclinic Parkview, 10 months from announcement to groundbreaking. Editable. |
| Hospitality | constructionMonths | 36 | assumed | No dated example of a typical Dubai 5-star was found (Atlantis The Royal, 79 months, is an outlier). |
| Industrial / Logistics | buaGfaRatio | 1.05 | assumed | Sheds have surface parking and almost no excluded area — audit M2 range 1.0–1.1. |
| Industrial / Logistics | efficiencyPct | 95 | assumed | Audit M2: ~95% for warehouses. No published figure. |
| Industrial / Logistics | infrastructurePsfGfa | 26 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Industrial / Logistics | consultancyPct | 5 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Industrial / Logistics | contingencyPct | 5 | carried | v5 default. Trade sources cite 7–15%. |
| Industrial / Logistics | salesPsfSfa | 500 | placeholder | Only asking prices of AED 335–670/sqft were found (listings). Enter your own. |
| Industrial / Logistics | operatingPct | 18 | carried | v5 default. No published industrial opex ratio found. |
| Industrial / Logistics | rampPct | 85 | assumed | Lease-up: 85% of stabilised income in year 1. |
| Industrial / Logistics | preConstructionMonths | 6 | assumed | Design + authority approvals. One data point: Mediclinic Parkview, 10 months from announcement to groundbreaking. Editable. |
| Industrial / Logistics | commissionPct | 2 | assumed | Whole-building or unit sale to occupiers — agent fee around 2%. |
| Industrial / Logistics | marketingPct | 1 | assumed | Minimal marketing for industrial stock. |
| Industrial / Logistics | serviceChargePsfYear | 5 | placeholder | No published industrial service-charge figure. |
| Healthcare | buaGfaRatio | 1.3 | assumed | Hospitals carry structured parking; no published ratio. |
| Healthcare | infrastructurePsfGfa | 90 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Healthcare | consultancyPct | 7 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Healthcare | contingencyPct | 8 | carried | v5 default. Trade sources cite 7–15%. |
| Healthcare | propertyIncomeSharePct | 50 | assumed | A hospital building is valued on the rent an operator can pay, not on the operator’s EBITDA. Rent at half of EBITDA (2.0× cover). Pending founder decision. |
| Healthcare | preOpeningPerUnitAed | 0 | placeholder | No published hospital pre-opening budget. Enter licensing, recruitment and working-capital costs. |
| Healthcare | exitCapRatePct | 9 | assumed | No published UAE healthcare yield. Set by analogy with long-lease school assets (9–10% initial yields, ENBD REIT / Emirates REIT). |
| Educational | buaGfaRatio | 1.1 | assumed | Schools use surface parking; no published ratio. |
| Educational | infrastructurePsfGfa | 46 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Educational | consultancyPct | 8 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Educational | contingencyPct | 6 | carried | v5 default. Trade sources cite 7–15%. |
| Educational | propertyIncomeSharePct | 50 | assumed | A school building is valued on the rent an operator can pay. Rent at half of EBITDA (2.0× cover). Pending founder decision. |
| Educational | equipmentPerUnitAed | 0 | placeholder | No published FF&E per student place. |
| Educational | preOpeningPerUnitAed | 0 | placeholder | No published school pre-opening budget. |
| Educational | preConstructionMonths | 9 | assumed | Design + authority approvals. One data point: Mediclinic Parkview, 10 months from announcement to groundbreaking. Editable. |
| Senior Living | buaGfaRatio | 1.5 | placeholder | No data. |
| Senior Living | efficiencyPct | 75 | placeholder | No data. |
| Senior Living | constructionPsfGfa | 720 | placeholder | v5 figure. No published senior-living build cost for the UAE. |
| Senior Living | infrastructurePsfGfa | 55 | carried | v5 psf-BUA figure re-based to GFA. Not re-verified. |
| Senior Living | consultancyPct | 5.5 | carried | v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%. |
| Senior Living | contingencyPct | 7 | carried | v5 default. Trade sources cite 7–15%. |
| Senior Living | rentPsfSfaYear | 216 | placeholder | v5 figure (AED 18/sqft/month). No UAE senior-living fee data exists — enter your own. |
| Senior Living | occupancyPct | 82 | placeholder | v5 figure. |
| Senior Living | operatingPct | 58 | placeholder | v5 figure. |
| Senior Living | exitCapRatePct | 8 | placeholder | No data. |
| Senior Living | rampPct | 50/80 | assumed | Slow fill: 50 / 80% in years 1–2. |
| Senior Living | preConstructionMonths | 9 | assumed | No published duration table for Dubai. Editable; listed under FOUNDER DECISIONS. |
| Senior Living | constructionMonths | 30 | assumed | No published duration table for Dubai. Editable; listed under FOUNDER DECISIONS. |
| Data Center | consultancyPct | 5 | assumed | Fees are excluded from the cost index. |
| Data Center | revenuePerUnit | 8,600,000 | placeholder | No UAE or Gulf colocation price is published. AED 8.6m per MW per year is the North America wholesale average, USD 196/kW/month (CBRE, 2026); global range USD 160–403. Enter your contracted or target pricing. |
| Data Center | occupancyPct | 85 | carried | v5 default utilisation. |
| Data Center | rampPct | 30/60/85 | assumed | Fill-up over three years: 30 / 60 / 85%. |
| Data Center | preConstructionMonths | 9 | assumed | No published duration table for Dubai. Editable; listed under FOUNDER DECISIONS. |
| Data Center | constructionMonths | 21 | assumed | 18–24 months reported for one UAE project (press). |
| Mixed-Use (blended) | buaGfaRatio | 1.85 | carried | v5 default. The "Dubai Municipality Circular 168/2018" citation could not be found; no published source gives a parking-inclusive BUA/GFA ratio. Pending founder decision. |
| Mixed-Use (blended) | salesPsfSfa | 1,900 | placeholder | A blended sale price is not a market figure. Supply the use mix, or enter a price. |
| Mixed-Use (blended) | rentPsfSfaYear | 150 | placeholder | A blended rent is not a market figure. Supply the use mix, or enter a rent. |
| Mixed-Use (blended) | exitCapRatePct | 7.5 | assumed | Blend. |
| Mixed-Use (blended) | preConstructionMonths | 12 | assumed | No published duration table for Dubai. Editable; listed under FOUNDER DECISIONS. |
| Mixed-Use (blended) | constructionMonths | 36 | assumed | No published duration table for Dubai. Editable; listed under FOUNDER DECISIONS. |
| Mixed-Use (blended) | marketingPct | 2 | carried | v5 default 2%. RERA caps marketing paid from escrow at 5% of sales (DLD FAQ). |
| (project) | authorityFeesPct | 1 | assumed | No published rule of thumb. The Dubai Municipality permit fee is tiny (AED 0.30/sqft, Property Finder Nov 2026; DDA design approval AED 0.10/sqft of BUA, capped at AED 50,000). The DEWA connection charge is per kW of connected load and its rates could not be retrieved — 1% is an allowance for it. |
| (project) | developerOverheadPct | 3 | assumed | Project-management fees of 2–4% are quoted in trade sources; no published developer-overhead benchmark. |
| (project) | landHoldingPctPa | 0 | placeholder | No published holding-cost figure. The time cost of holding land through design is already in the IRR; enter any cash cost (community fees, security). |
| (project) | soldAtLaunchPct | 15 | carried | Founder default (Sprint 9, N6). No published figure. |
| (project) | soldByHandoverPct | 80 | carried | Founder default. Fitch (Mar 2026) cites a 60–65% presale threshold for a viable start. |
| (project) | selloutMonthsAfterHandover | 12 | assumed | Time to sell completed, unsold stock. No published figure. |
| (project) | assetSaleFeePct | 2 | assumed | Agent 2% + VAT is the residential convention; institutional fees are not published. Buyer pays the 4% DLD. |
| (project) | exitSaleCostPct | 2 | assumed | As above. |
| (project) | rentGrowthPct | 3 | carried | v5 default. 2026 actuals: residential +5.5% overall but apartments −10 to −13% in some areas; office +12%; industrial +5.9%. |
| (project) | holdYears | 5 | carried | v5 default. |
| (project) | loanRatePct | 7 | assumed | 3M EIBOR ~4.2% (CBUAE, Sep 2026) plus a development margin. Margins and loan-to-cost are not published. |
| (project) | termRatePct | 6.5 | assumed | Investment loan on a completed, let asset. Not published. |
| (project) | discountRatePct | 10 | carried | v5 default: 10% for NPV. |


## What changed, by finding

**Design.** The calculator used to derive its numbers in a dozen places and render them in two hand-copied layouts and a third time in the PDF. It now has one pure function, `computeFeasibility(inputs)` in `src/lib/feasibility-v6/model.ts`: a month-by-month cash model in which a project is a list of components (one for single use, several for mixed use) and BtS, BtR, JV, escrow and debt are readings of the same schedule. Every displayed cost or revenue row is an element of `costLines` / `revenueLines`, and each total is the sum of those rows, so the screen and the PDF cannot disagree. Unknown inputs produce a **blocker** (no result object at all), never a default. `src/lib/feasibility.ts` (v5) was not edited and is no longer used for any arithmetic — only its number formatters.

| Finding | Fix | Where |
|---|---|---|
| **B1** unpriced-land guard missing in the side panel | `LAND_PRICE_UNKNOWN` is a model blocker; both layouts render the same hero / inputs / results blocks, so a guard cannot exist in one and not the other. PDF export is disabled while blocked. | `model.ts findBlockers`, `FeasibilityV6Calculator.tsx` |
| **B2** residential rent 12× too high | Rent is one field, AED/sqft/**year**, everywhere. Residential default 125/yr (was an annual figure in a monthly field). | `engines.ts` |
| **B3** data centre construction = 0 | Capex per MW is a cost line; MW must be entered (`UNITS_REQUIRED` blocker until it is). | `engines.ts`, `model.ts` |
| **B4** mixed-use hotel / healthcare / education slices earn 0 | Each slice runs its real engine, including the operating-asset path. | `model.ts` components |
| **B5** land use falls back to Residential | `routing.ts`: engine / not developable / not modelled / unknown. Nothing falls through; empty land use = "choose an engine". Table below. | `routing.ts`, `parcelInput.ts` |
| **B6** FAR silently 2.5 | FAR is `null` when the plan has neither FAR nor Max GFA → `FAR_UNKNOWN` blocker and an input; nothing is assumed. | `parcelInput.ts resolvePlanArea`, `model.ts resolveArea` |
| **B7** per-unit engines optimistic | Units from **GFA** ÷ sourced GFA-per-unit (hotel 100 sqm/key, hospital 200 sqm/bed, school 12 sqm/student), FF&E / medical equipment and pre-opening per unit, ramp-up curves, owner's share of income, asset-sale fee 2% instead of 10.5%. | `engines.ts`, `model.ts` |
| **B8** PDF does not reconcile on mixed use | PDF is rendered from the model's line arrays; a per-use table (share, GFA, units, build cost, value, contribution) is included. | `pdf.ts` |
| **B9** JV ignores the typed land cost | JV land value follows Land cost unless explicitly overridden. | `model.ts` jv |
| **B10** JV runs for engines with no sale model | JV base mode = BtS if every component supports it, else BtR, else `MODE_UNSUPPORTED`. No −100% IRR. | `model.ts jvBaseMode` |
| **M1** 18-month build everywhere | Per-engine design and build months (e.g. residential 9+36, hotel 12+36, hospital 10+31, warehouse 6+14), always-visible Programme panel. | `engines.ts` |
| **M2** 1.85 / 80% everywhere | Per-engine ratio and efficiency (hotel 1.2, warehouse 1.05, hospital 1.3, school 1.1). Residential / office / retail still 1.85 — see A1. | `engines.ts` |
| **M3** location-blind prices | Interim area-benchmark table + "city-wide price" caveat — see A10. | `areaBenchmarks.ts` |
| **M4** commission 8.5% | 5% + 2% marketing, sourced. | `engines.ts` |
| **M5** BtR financing useless | Construction loan drawn pro rata, interest rolled up, then refinance into an interest-only term loan (default) or repay at handover. | `model.ts` |
| **M6** no BtR exit costs, one cap rate | Exit selling costs 2%; cap rate per engine. | `engines.ts`, `model.ts` |
| **M7** escrow drops loan and instalments; JV ignores escrow | Escrow (Law 8/2007 milestone caps, 5% retention released 12 months after completion), loan and land instalments run in the same monthly schedule, in every mode. | `model.ts` |
| **M8** JV economics inconsistent | One project cashflow split between partners; see A6, A7. | `model.ts` |
| **M9** missing cost lines | Authority & utility fees, developer overhead, RERA/escrow fees, land holding, irrecoverable VAT, service charge on unsold stock, parking as its own line. | `model.ts` |
| **M10** ignores plan Max GFA | Max GFA wins over plot × FAR; the source is printed next to the figure. | `parcelInput.ts`, `model.ts` |
| **M11** "initial capital" mislabel | Replaced by Peak equity, computed from the cashflow. | `model.ts` |
| **PDF review** | Cover: date, prepared-for, "Land cost (user input / price on record)", wrapped model stamp, research-defaults warning, verdict with the real bands. Then assumptions vs defaults, use-mix table, reconciling investment and revenue tables with the basis of each line, cashflow chart + annual table, 3×3 sensitivity (IRR and profit), break-even revenue and land cost, JV partner table, "what is not included", basis of every default, glossary generated from `verdict.ts`. Shared primitives in `pdfKit.ts`. | `pdf.ts`, `pdfKit.ts` |

Removed as superseded (all were only reachable from the old calculator or from scripts that tested it): `src/lib/feasibility-v6/{results,mixedUse,perUnitRevenue,escrowDrawdown,recommendations}.ts`; `scripts/{engines-audit,engines-audit-after,feasibility-smoke,mixuse-check}.ts`; `scripts/{jv-irr,mixeduse-model,mixeduse-headline,feasibility-land-guard}.test.ts`; `tests/e2e/{engine-mode-gate,mixeduse-headline}.spec.ts`. Their coverage moved to `scripts/feasibility-model.test.ts` (979 checks) and `tests/e2e/feasibility-gates.spec.ts`.

## Audit test plot 3720111 — before and after

144,250 sqft, FAR 2.5, land AED 150M (test figure typed by the user; the plot has no price on record). "Before" is the audit's table from production. "After" is `npx tsx scripts/feasibility-audit-plot.ts` on this branch, at defaults, data centre at 20 MW.

### Before (production, from the audit)

| Engine | Construction | BtS profit | ROI | IRR | BtR yield | BtR IRR | Verdict on screen |
|---|---|---|---|---|---|---|---|
| Residential | 378.3M | 29.4M | 5.5% | 5.8% | 39.9% | 50.8% | BtR "Strong" |
| Off-Plan | 378.3M | 99.6M | 18.6% | 33.8% (escrow) | n/a | n/a | "Strong" |
| Office | 441.3M | −29.3M | −4.9% | −5.4% | 4.7% | −0.5% | Loss |
| Retail | 477.4M | −13.7M | −2.2% | −2.4% | 7.8% | 9.4% | BtR moderate |
| Hospitality | 981.6M | 680.1M | 59.8% | 70.5% | n/a | n/a | "Strong" |
| Industrial | 138.7M | −178.5M | −60.6% | −60.6% | 4.1% | −2.9% | Loss |
| Healthcare | 691.7M | 2,687.0M | 317% | 309% | 34.9% | 47.7% | "Strong" |
| Educational | 328.8M | 1,345.7M | 278% | 234% | 33.7% | 45.3% | "Strong" |
| Senior Living | 606.8M | n/a | n/a | n/a | 2.8% | −9.4% | Loss; JV −100% |
| Data Center | 0 | n/a | n/a | n/a | 658.8% | 173% | "Strong" |
| Mixed-Use | 470.3M | −135.7M | −21.7% | −24.5% | 3.7% | −4.7% | Loss |
| Infrastructure | 0 | n/a | n/a | n/a | n/a | n/a | not modelled; JV −100% |
| Land-Hold | 0 | n/a | n/a | n/a | n/a | n/a | not modelled; JV −100% |

### After (this branch) — every engine × mode

"jv→bts" means the JV tab runs on sale economics; the row is the project, which both partners share.

| Engine | Mode | Total cost | Net revenue | Profit | ROI | IRR | Yield on cost | Peak equity | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Residential | bts | 533.4M | 482.9M | -50.5M | -9.5% | -3.7% | 4.8% | 531.4M | Below — loss |
| Residential | btr | 531.1M | 548.3M | 17.2M | 3.2% | 0.5% | 4.8% | 531.1M | Weak — positive but below hurdle |
| Residential | jv→bts | 533.4M | 482.9M | -50.5M | -9.5% | -3.7% | 4.8% | 531.4M | Below — loss |
| Residential — off-plan | bts | 531.7M | 544.7M | 13.0M | 2.4% | 1.2% | 4.8% | 350.2M | Weak — positive but below hurdle |
| Residential — off-plan | btr | — | — | — | — | — | — | — | Build to Rent — not modelled |
| Residential — off-plan | jv→bts | 531.7M | 544.7M | 13.0M | 2.4% | 1.2% | 4.8% | 350.2M | Weak — positive but below hurdle |
| Office | bts | 539.4M | 526.3M | -13.1M | -2.4% | -0.8% | 6.4% | 536.8M | Below — loss |
| Office | btr | 536.4M | 652.8M | 116.4M | 21.7% | 2.9% | 6.4% | 536.4M | Weak — positive but below hurdle |
| Office | jv→bts | 539.4M | 526.3M | -13.1M | -2.4% | -0.8% | 6.4% | 536.8M | Below — loss |
| Retail | bts | 514.3M | 643.9M | 129.6M | 25.2% | 10.4% | 9.7% | 511.7M | Indicative only — placeholder inputs |
| Retail | btr | 511.2M | 950.2M | 439.0M | 85.9% | 10.7% | 9.7% | 511.2M | Moderate — above equity hurdle |
| Retail | jv→bts | 514.3M | 643.9M | 129.6M | 25.2% | 10.4% | 9.7% | 511.7M | Indicative only — placeholder inputs |
| Hospitality | bts | 801.5M | 904.4M | 103.0M | 12.8% | 2.6% | 6.5% | 801.5M | Weak — positive but below hurdle |
| Hospitality | btr | 801.5M | 1068.4M | 266.9M | 33.3% | 4.5% | 6.5% | 801.5M | Weak — positive but below hurdle |
| Hospitality | jv→bts | 801.5M | 904.4M | 103.0M | 12.8% | 2.6% | 6.5% | 801.5M | Weak — positive but below hurdle |
| Industrial / Logistics | bts | 326.8M | 166.2M | -160.6M | -49.1% | -35.0% | 4.0% | 326.0M | Indicative only — placeholder inputs |
| Industrial / Logistics | btr | 325.8M | 268.1M | -57.7M | -17.7% | -3.5% | 4.1% | 325.8M | Below — loss |
| Industrial / Logistics | jv→bts | 326.8M | 166.2M | -160.6M | -49.1% | -35.0% | 4.0% | 326.0M | Indicative only — placeholder inputs |
| Healthcare | bts | 773.4M | 696.2M | -77.2M | -10.0% | -1.6% | 6.1% | 773.4M | Below — loss |
| Healthcare | btr | 773.4M | 696.2M | -77.2M | -10.0% | -1.6% | 6.1% | 773.4M | Below — loss |
| Healthcare | jv→bts | 773.4M | 696.2M | -77.2M | -10.0% | -1.6% | 6.1% | 773.4M | Below — loss |
| Educational | bts | 505.3M | 260.0M | -245.3M | -48.6% | -10.6% | 3.4% | 505.3M | Below — loss |
| Educational | btr | 505.3M | 260.0M | -245.3M | -48.6% | -10.6% | 3.4% | 505.3M | Below — loss |
| Educational | jv→bts | 505.3M | 260.0M | -245.3M | -48.6% | -10.6% | 3.4% | 505.3M | Below — loss |
| Senior Living | bts | — | — | — | — | — | — | — | Build to Sell — not modelled |
| Senior Living | btr | 551.7M | 378.3M | -173.4M | -31.4% | -5.8% | 3.6% | 551.7M | Indicative only — placeholder inputs |
| Senior Living | jv→btr | 551.7M | 378.3M | -173.4M | -31.4% | -5.8% | 3.6% | 551.7M | Indicative only — placeholder inputs |
| Data Center | bts | 957.5M | 1330.1M | 372.6M | 38.9% | 8.4% | 7.3% | 957.5M | Indicative only — placeholder inputs |
| Data Center | btr | 957.5M | 1559.0M | 601.5M | 62.8% | 8.8% | 7.3% | 957.5M | Indicative only — placeholder inputs |
| Data Center | jv→bts | 957.5M | 1330.1M | 372.6M | 38.9% | 8.4% | 7.3% | 957.5M | Indicative only — placeholder inputs |
| Mixed-Use (blended) | bts | 566.9M | 509.8M | -57.1M | -10.1% | -3.8% | 4.9% | 564.9M | Indicative only — placeholder inputs |
| Mixed-Use (blended) | btr | 564.5M | 558.9M | -5.6M | -1.0% | -0.2% | 4.9% | 564.5M | Indicative only — placeholder inputs |
| Mixed-Use (blended) | jv→bts | 566.9M | 509.8M | -57.1M | -10.1% | -3.8% | 4.9% | 564.9M | Indicative only — placeholder inputs |
| Infrastructure | bts | — | — | — | — | — | — | — | Infrastructure — not modelled |
| Infrastructure | btr | — | — | — | — | — | — | — | Infrastructure — not modelled |
| Infrastructure | jv | — | — | — | — | — | — | — | Infrastructure — not modelled |
| Land-Hold | bts | — | — | — | — | — | — | — | Land-Hold — not modelled |
| Land-Hold | btr | — | — | — | — | — | — | — | Land-Hold — not modelled |
| Land-Hold | jv | — | — | — | — | — | — | — | Land-Hold — not modelled |

Reading the after table: no engine prints "Strong" on this plot. The four results that used to be absurd (hotel 70% IRR, hospital 309%, school 234%, data centre 659% yield) are now 2.6%, −1.6%, −10.6% and "Indicative". Retail BtR "Moderate" at a 9.7% yield on cost is the only band above "Weak"; it rests on a sourced rent (AED 252/sqft/yr) applied to a whole 2.5-FAR plot, which a real retail scheme would not fill — treat it as the row most likely to still be too kind.

The residential and office losses are driven by A1 (BUA ÷ GFA 1.85).

## Land-use routing table

First match wins, case-insensitive substring on the plot's land use. `src/lib/feasibility-v6/routing.ts`.

| Land use contains | Result |
|---|---|
| MIXED | engine: mixeduse |
| HOTEL · HOSPITALITY · RESORT | engine: hospitality |
| EDUCATION · SCHOOL · NURSERY · KINDERGARTEN · UNIVERSITY · ACADEMY | engine: educational |
| HEALTH · HOSPITAL · CLINIC · MEDICAL | engine: healthcare |
| DATA CENT | engine: datacenter |
| OPEN SPACE · PARK | NOT A DEVELOPMENT PLOT — open space — it is not zoned for building |
| UTILITY · UTILITIES | NOT A DEVELOPMENT PLOT — a utility plot (substation, pumping station, district cooling) — not land for sale or rent |
| TRANSPORT · TRANSPORTATION · ROAD | NOT A DEVELOPMENT PLOT — transport land — not zoned for building |
| GOVERNMENT | NOT A DEVELOPMENT PLOT — reserved for a government authority |
| RECREATION | NOT A DEVELOPMENT PLOT — recreational land — it has no sale or rental development model |
| WATER BODY | NOT A DEVELOPMENT PLOT — a water body |
| MOSQUE · RELIGIOUS · CEMETERY | NOT A DEVELOPMENT PLOT — a religious or civic plot |
| PUBLIC FACILIT · COMMUNITY FACILIT | NOT A DEVELOPMENT PLOT — a public-facility plot — it is reserved for community use |
| OFFICE | engine: office |
| RETAIL · MALL · SHOWROOM | engine: retail |
| INDUSTRIAL · WAREHOUSE · LOGISTIC · FACTORY | engine: industrial |
| RESIDENTIAL · VILLA · APARTMENT · TOWNHOUSE | engine: residential |
| COMMERCIAL | engine: office |
| AGRICULTUR · FARM | not modelled (landhold) |
| FUTURE DEVELOPMENT | not modelled (landhold) |
| INVESTMENT | not modelled (landhold) |
| FACILIT (no school / clinic keyword) | NOT A DEVELOPMENT PLOT — a facilities plot with no stated use — it is reserved for community use |
| (empty) / anything else | UNKNOWN — the user must choose an engine; nothing is assumed |
residential 1.85 bts 533.4 -50.5 -3.7 Below — loss

Mixed-use slices use the same rules per slice; a slice that is not a development use (e.g. "PUBLIC FACILITIES" inside a mixed plot) blocks the result with "not modelled" rather than being priced as apartments.

DDA index vocabulary this was checked against (99,126 plots): empty 46,914 · COMMERCIAL 40,289 · RESIDENTIAL 7,055 · INDUSTRIAL 2,142 · OPEN SPACE 1,226 · PUBLIC FACILITIES 555 · UTILITY 555 · GOVERNMENT AUTHORITIES 210 · RECREATIONAL 45 · PUBLIC FACILITY 42 · TRANSPORT 42 · FACILITIES 30 · TRANSPORTATION 8 · EDUCATIONAL 4 · AGRICULTURAL 3 · FUTURE DEVELOPMENT 3 · HEALTHCARE 2 · WATER BODY 1. The 46,914 plots with no land use now ask the user to choose an engine instead of being modelled as Residential.

## Saved studies and compare

Full description: `docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md`. Built by a sub-agent against the `study.ts` contract; reviewed, corrected and browser-tested by me.

- **Data.** Two new tables, `FeasibilityStudy` (owner, optional parcel and vault entry, plot identity, name, one autosaved draft, version counter, archive flag) and `FeasibilityStudyVersion` (immutable: inputs, server-recomputed outputs, the defaults and plot facts it was saved against, model version). Migration `prisma/migrations/20261120120000_feasibility_studies/migration.sql` — additive, hand-written to match `prisma migrate diff`, **not applied**. `prisma db push` / `migrate dev` / `migrate deploy` were never run.
- **Never lose a calculation.** Opening the calculator creates nothing. The first edit creates a study and autosaves the draft about 1.5 s after each change; a failed save keeps a copy in the browser and offers Restore. "Save version" stores an immutable version — no route updates or deletes one (a test scans the source for that).
- **Reopen as saved.** A version reloads its exact inputs. A banner lists what changed since: engine defaults, the plot's price, its affection-plan area / FAR / land use, or the model version, with "Recompute on today's defaults", which moves only the fields the user had left at the old default.
- **Vault.** A study started from a vault entry attaches to it; the vault row shows a study count and the side panel lists the studies.
- **Sharing (A11 — your call).** Reuses `VaultShare`. A share with permission **FEASIBILITY** (or OFFER) lets the recipient read the entry's saved versions, read-only, never drafts; **VIEW does not**. The share dialog's previously disabled "View + Feasibility (soon)" option now works. Revoked or expired shares stop access.
- **Compare.** `/feasibility/compare?v=…` puts 2–5 saved versions side by side: results with the better value per row marked (no mark on a tie), then the assumptions with differing rows flagged and a "show only differences" toggle, per-column stale flags, and one landscape PDF export. `/feasibility/studies` lists the user's studies with rename / archive and version selection.
- **API.** `/api/me/feasibility-studies` (list, create), `/[id]` (read, patch), `/[id]/versions` (create), `/compare`. All gated by `getApprovedUserId`; outputs are always recomputed on the server from validated inputs; 404 rather than 403 on no access; `503 studies_unavailable` while the tables do not exist, which the UI shows as a quiet notice while the calculator keeps working.
- **Row-level security.** The migration enables RLS on both tables with no policies (CLAUDE.md: "RLS is active for all Supabase tables"). Prisma connects as the table owner and bypasses it; the Supabase anon / authenticated roles get nothing. Not verified against the database — see below.
- **Two behaviours to confirm:** each editing session that changes inputs without first opening a study starts a new study (safe, but they accumulate); a study has one draft, so editing after opening an old version overwrites the previous draft (versions are untouched).

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint src` | 0 errors, 11 warnings (none in new files) |
| `pnpm build` | exit 0 |
| `npx tsx scripts/feasibility-model.test.ts` | 979 checks, 0 failures — every engine × mode × variant reconciles line by line; gates B1 / B5 / B6 / B10; defaults; escrow, debt, JV IRR bracket |
| `npx tsx scripts/feasibility-studies.test.ts` | 227 / 227 |
| `npx playwright test tests/e2e/feasibility-gates.spec.ts` | 12 / 12 — each gate in both the side panel and the fullscreen layout |
| Full Playwright suite | 73 passed, 2 failed: `admin-pause.spec.ts:96` and `sun-slider-removed.spec.ts:14`. Both are the failures already recorded in the 2026-11-18 logs with the same symptoms; neither touches feasibility. |
| PDF | Generated in Node for residential BtS, off-plan with escrow + loan + land instalments, hotel BtR, residential JV and a three-use mixed plot; pages rendered and read. |
| Studies UI | Chromium against the production build with an in-memory API mock: autosave → two versions → compare page. |

**Not verified — needs the migration applied (founder action: `npx prisma migrate deploy`):** every Prisma query in the studies routes; the version-number transaction under concurrency; that a missing table surfaces as the error the "not switched on yet" notice expects; RLS with no policies against the real roles; the vault count / list additions on real data; sharing end to end. Also not opened in a browser: `/feasibility/studies`, the vault share dialog, the comparison PDF download, and anything at 320 px.

**Not done:** real DLD unit-sale medians per area (A10); a land-banking model (A8); the manual smoke-test checklist for the map and sign-in (nothing is being pushed; the automated suite covers the map, vault and auth specs).

**Side effect to clean up:** the full Playwright run rewrote eight tracked screenshots under `docs/research/dda-height-tiles/` and `docs/research/map-ux-batch-1/`. They are not part of this work and are not committed; my attempt to restore them with `git checkout` was blocked by the permission system, so they are left modified in the working tree.

## Ad-hoc instructions during the session

None. The only messages after the task were automated progress nudges.

## Commits

- `1c551b3` docs: add feasibility v6 audit of 2026-11-20 (evidence base for the accuracy branch)
- `6102a73` feat: add FeasibilityStudy / FeasibilityStudyVersion schema and migration (NOT applied)
- `94eb52b` feat: rebuild feasibility v6 on one cash model with sourced defaults and result gates
- `b5e9890` feat: saved feasibility studies, vault attach and sharing, 2-5 way compare
- (this commit) docs: log, saved-studies spec, DECISIONS entry, log index row

The model/calculator commit does not build on its own (the calculator mounts `StudiesBar`, added in the commit after it); the branch tip is what was built and tested.

## The three numbers I am least sure of

1. **BUA ÷ GFA = 1.85** (residential, off-plan, office, retail, mixed-use). Carried from v5; its cited source could not be found. At 1.45 the audit plot's residential BtS moves from −50.5M to +2.8M and office from −13.1M to +40.4M. It decides whether ordinary Dubai plots read as losses.
2. **Income to the property owner = 50% of operator EBITDA** for hospitals and schools. My assumption. At 100% the same hospital would look several times more valuable; it decides whether healthcare and education read "Below" or not.
3. **Residential rent = AED 125 / sqft / year.** Derived from a 6.96% gross apartment yield on AED 1,800/sqft; Cavendish Maxwell's all-residential average is AED 77.3 (it includes villas and older stock). It drives every residential Build-to-Rent yield.

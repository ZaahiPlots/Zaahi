# ZAAHI Feasibility Calculator v6 — Audit, 20 Nov 2026

Tested live on www.zaahi.io (main @ 71824f1) from Dymo's account. Every engine × mode was run on plot 3720111 (Jumeirah Central, 144,250 sqft, FAR 2.5) with a test land cost of AED 150M, plus real mixed-use plot 3261250 (Sama Al Jadaf) and utility plot 9229078 (Town Square). Each number was recomputed independently in Python.

## Headline

**The arithmetic is right. The model is not.** Every live figure matched my independent recompute to the dirham. What is wrong is the defaults, the routing of land types to engines, missing cost lines, and three places where two different models print on one screen or one PDF. As it stands, the calculator tells a user that a utility plot, a hospital, a school and a data centre are "Strong — institutional-grade" deals, and that a residential rental block yields 40% a year.

## Engine results on the test plot (AED 150M land)

| Engine | Construction | BtS profit | ROI | IRR | BtR yield | BtR IRR | Verdict on screen | Reality check |
|---|---|---|---|---|---|---|---|---|
| Residential | 378.3M | 29.4M | 5.5% | 5.8% | **39.9%** | **50.8%** | BtR "Strong" | Rent default is ~12× too high (see B2) |
| Office | 441.3M | −29.3M | −4.9% | −5.4% | 4.7% | −0.5% | Loss | Plausible given inputs |
| Retail | 477.4M | −13.7M | −2.2% | −2.4% | 7.8% | 9.4% | BtR moderate | Plausible |
| Hospitality | 981.6M | 680.1M | 59.8% | 70.5% | n/a | n/a | "Strong" | 1,127 keys from BUA incl. parking, no FF&E, no ramp-up, 10.5% sales fees on a hotel sale |
| Industrial | 138.7M | −178.5M | −60.6% | −60.6% | 4.1% | −2.9% | Loss | BUA ×1.85 and FAR 2.5 make warehouses unmodellable |
| Healthcare | 691.7M | **2,687.0M** | **317%** | 309% | 34.9% | 47.7% | "Strong" | No medical equipment, no ramp-up |
| Educational | 328.8M | **1,345.7M** | **278%** | 234% | 33.7% | 45.3% | "Strong" | 5,165 students on one plot, 45% margin, day-one full |
| Senior Living | 606.8M | n/a | n/a | n/a | 2.8% | −9.4% | Loss | Plausible but JV shows −100% |
| Data Center | **0** | n/a | n/a | n/a | **658.8%** | 173% | "Strong" | Capex per MW never applied |
| Mixed-Use | 470.3M | −135.7M | −21.7% | −24.5% | 3.7% | −4.7% | Loss | Hotel slice earns 0 (see B4) |
| Off-Plan | 378.3M | 99.6M | 18.6% | 33.8% (escrow) | n/a | n/a | "Strong" | JV tab shows 19.4% for the same project |
| Infrastructure | 0 | n/a | n/a | n/a | n/a | n/a | not modelled | JV shows −100% |
| Land-Hold | 0 | n/a | n/a | n/a | n/a | n/a | not modelled | CAGR exit never built; JV shows −100% |

## Bugs — critical (wrong answers a buyer could act on)

**B1. Unpriced-land guard missing in the side panel.** The guard exists (`landPriceMissing`) but only gates the fullscreen layout. In the side panel, plot 3720111 with no price showed "Net Profit AED 126.7M, IRR 40.6%, Strong — institutional-grade". Utility plot 9229078 showed "AED 171.9M, Strong". Only the PDF button is disabled.

**B2. Residential BtR rent is ~12× too high.** `monthlyRentPsfSfa: 100` for residential. That is AED 1,200/sqft a year. Dubai averages about AED 77/sqft a year (Cavendish Maxwell, Sep 2026). Office is entered correctly as monthly (14/mo = 168/yr), so residential looks like an annual figure typed into a monthly field. Result: 39.9% yield, 50.8% IRR, "Strong".

**B3. Data Center has zero construction cost.** `constructionPsfBua: 0` with comment "capex per MW, not psf", but no per-MW capex is ever applied. Revenue per MW is applied, cost is not. Yield 659%. UAE build cost is about USD 11M per MW (S&P, 2026), roughly AED 40M, matching the engine's own cited range AED 33–41M/MW.

**B4. Mixed-use: hotel / healthcare / education slices earn nothing.** `computeMixedUseBtSV6` takes `engine.salesPsfSfa` per slice, which is 0 for the per-unit engines, while charging their full build cost. Live on 3261250: hotel slice "Net rev AED 0", whole plot −23.4M even before land. 24 plots in the vault are COMMERCIAL-HOSPITALITY-RESIDENTIAL.

**B5. Land-use routing falls back to Residential.** `defaultEngineFor` has no branch for UTILITY, TRANSPORT, OPEN SPACE, GOVERNMENT, PUBLIC FACILITIES, RECREATIONAL, WATER BODY, AGRICULTURAL (index), FACILITIES without a school keyword. All become Residential and get a full residential profit. In the DDA index this is ~2,700 plots (1,226 open space, 555 utility, 597 public facilities, 210 government, 50 transport/recreational...). Non-developable uses should show "not a development plot" instead of a number.

**B6. FAR silently defaults to 2.5.** When the affection plan has no FAR (9229078), the calculator invents 2.5 and prints it as fact. Must show "FAR unknown — enter it" and gate results like land price.

**B7. Per-unit engines (hotel, hospital, school, DC) are far too optimistic.**
- Unit count derived from **BUA** (which is 1.85× GFA and includes parking). Should be from GFA or a user input.
- No FF&E / medical equipment / pre-opening cost line. Hotel FF&E is about AED 80–150k per key for luxury, plus AED 25–50k pre-opening.
- Value is capitalised at stabilised NOI on day one. Hotels and schools take years to ramp up.
- 8.5% commission + 2% marketing is charged on the sale of a whole operating asset. Institutional sale fees are far lower; and the Revenue panel (where commission can be edited) is hidden for these engines, so the user cannot even change it.

**B8. PDF does not reconcile on mixed-use plots.** On 3261250: "Land 40.0M + DLD 1.6M + Construction 83.4M = Total 142.6M" (should read 125.0M; 142.6M uses the composite construction 101.0M). "Gross 97.2M − 8.3M − 1.9M = Net 77.7M" (should be 87.0M). Line items come from the single-engine model, totals from the mixed-use model. Same split in the side panel: Construction panel says 83.4M, headline uses 101.0M.

**B9. JV ignores the land cost the user types.** Landowner land contribution is seeded from `parcel.plotPriceAed`, not from the Land Cost input. With a typed land cost the JV shows "Landowner IRR —", "Breakeven 0.0%" and a "committed capital AED 150M below" warning on every engine.

**B10. JV runs for engines that have no sale model.** Senior, Infrastructure, Land-Hold JV show "Project ROI −100%". Data Center JV shows "Project ROI 7,270%".

## Bugs — model design (numbers are defensible only with a caveat)

**M1. Build time is 18 months for everything** and only editable inside the Escrow panel when escrow is on. A 360k sqft office tower or a hospital is 30–48 months plus 6–12 months design/permits. IRR is badly overstated. Needs per-engine default + always-visible input + pre-construction phase.

**M2. BUA/GFA 1.85 and efficiency 80% for every engine.** Warehouses run near 1.0–1.1 and ~95%; villas differ again. Industrial results are meaningless at 1.85. The PDF cites "Dubai Municipality Circular 168/2018" for 1.85 — I could not verify that source; treat as unverified.

**M3. Sales prices are location-blind.** Residential 2,183 psf (Dubai Hills) everywhere. JVC trades around 1,448 psf, Dubai Hills 2,442 (Engel & Völkers 2026). ZAAHI already holds 1.7M DLD transactions; defaults should come from the plot's own area.

**M4. BtS commission 8.5% default.** Off-plan developer commissions are typically 2–8%; 8.5% is above the usual range. Make it 5% default with the range shown.

**M5. BtR financing is useless.** The construction loan is repaid in full from equity at handover (no refinance, no rent to cover it), so leverage only adds cost. Need a refinance-at-handover or term-loan option.

**M6. BtR exit has no selling costs** and one terminal cap rate (7.5%) for all engines (industrial typically higher).

**M7. Escrow mode drops the loan and land instalments** from the cashflow (only land, equity injections and revenue are booked), puts revenue at month N+1, and books post-handover sales at handover. Off-plan BtS shows IRR 33.8% while the JV tab for the same project shows 19.4% (JV ignores escrow).

**M8. JV economics are inconsistent.** Partner cashflows return the landowner's land value plus profit share, but the "Sell vs JV" table compares profit share alone with the land value (treats returned land as lost). DLD 4% is charged on in-kind land that never transfers. No "share of revenue/units" JV type, which is how most Dubai land JVs are actually struck.

**M9. Missing cost lines.** No authority/permit fees (DM, DEWA connection, Civil Defence), no developer overhead/project management, no RERA project registration/escrow account fees, no service charges on unsold stock, no VAT treatment (commercial sales are standard-rated), no land holding cost during design. Add them as visible lines with editable defaults, not hidden in contingency.

**M10. GFA ignores the affection plan's Max GFA.** It always uses plot × FAR (3261250: 63,972 vs plan 64,003.61 sqft).

**M11. `initialCapital` = down payment + 50% of construction** labelled "first 6 months" (6 of 18 months is 33%).

## UI / PDF style review

What works: clean branded cover, gold header band, inputs-vs-baseline table with diff %, formulas written next to results, glossary, disclaimer. The structure is right for a buyer.

What to fix:
1. Totals must reconcile line by line (B8). A reviewer stops trusting the report at the first sum that doesn't add.
2. Cover says "Listed AED 0" when the user typed AED 40M. Show "Land cost (user input) AED 40,000,000".
3. Model line runs off the page edge on mixed-use ("...RESIDENTIA"). Wrap it.
4. No mix table in the PDF for mixed-use plots; inputs page shows a blended 1,900 psf the headline does not use.
5. Glossary verdict bands (ROI 25% / yield 8%) do not match the code (ROI >20 / IRR ≥20 / yield >7).
6. "Optimisation recommendations" heading collides with "Disclaimer" (no gap). Page 4 half empty; header comment promises 6 pages, PDF has 4.
7. Missing for a professional feasibility: date and "prepared for", assumptions list (build months, cap rate, BUA ratio, FAR source), cashflow chart by month, sensitivity grid (sale price ±10% × build cost ±10%), break-even land price, and a "what is NOT included" list.
8. Research-default engines need the "research default, not validated" caption on the PDF cover, not just in the app.

## Vault coverage

Vault had 231 plots: Residential 83, Commercial 60, Commercial-Hospitality-Residential 24, Commercial-Residential 16, Mixed 15, Hospitality/Hotel 11, Facilities 7, Future Development 3, Industrial 1, Healthcare 1, Water Body 1, others 9.

Added today (source "feasibility-audit", no price, stage Lead):
- 6489178 Dubai Land Residence Complex — Facilities: children nursery / kindergarten (educational engine)
- 2814488 Al Khawaneej District — live DDA says Commercial: Retail Facilities (pure retail; ZAAHI's index still says Agricultural, so the index is stale)
- 9229078 Town Square — Utility (exposed B1, B5, B6)
- 5138288 Jabel Ali Hills — Transport

Note: the broker note on 2814488 says "Land-Hold (Agricultural)" and on 5138288 says "Recreational/Sport"; the live DDA land use differs from the index. Edit the notes if you keep them. A 6th plot (6489201) failed to add.

Still not in vault: a true Agricultural plot, Senior Living (no Dubai zoning class), Data Center, Abu Dhabi plots.

## Feature proposal — saved studies and plot comparison

**Save (must-have).** A `FeasibilityStudy` record per user: plot reference, engine, mode, every input, the engine-default snapshot and model version at save time, and the computed outputs. Immutable versions (v1, v2...), a name ("Base case", "Bank case"), notes. Auto-save a draft on every change so nothing is lost; explicit "Save version" for named scenarios. Reopen exactly as saved even after engine defaults change, with a banner "defaults have changed since this was saved — recompute?". Attach to the vault entry so it shows in the vault row and side panel. Private by default, shareable through existing VaultShare.

**Compare (must-have).** Pick 2–5 saved studies (same or different plots). Side-by-side table: land cost, land psf GFA, GFA/SFA, total investment, net revenue, profit, ROI, IRR, peak equity, NPV, break-even sale price, build months, verdict. Highlight best per row. Differences in assumptions shown explicitly (so a 30% IRR from a 2,455 psf assumption is not compared blind against 1,900 psf). Export compare as one PDF.

**Should-have.** Scenario set per plot (base / downside / upside) with one-click sensitivity; break-even land price ("max you can pay for 20% IRR"); portfolio total across selected plots; a "stale" flag when the plot's price or affection plan changes after the study was saved.

Sources: Cavendish Maxwell via Khaleej Times (Dubai rents AED 77.3/sqft/yr, Sep 2026); Property Finder and Bayut (off-plan commission 2–8%); S&P via Khaleej Times (UAE data centre USD 11M/MW); UAE Free Zone Finder 2026 (luxury FF&E AED 80–150k/key, pre-opening AED 25–50k/key); Engel & Völkers (JVC AED 1,448/sqft, Dubai Hills AED 2,442/sqft).

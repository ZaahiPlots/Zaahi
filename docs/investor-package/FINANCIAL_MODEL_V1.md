# Z A A H I

*Real Estate OS*

---

**Document:** Financial Model V1 — Excel / Google Sheets Template Structure
**Prepared for:** Rodolphe Belin ("Rudi") — Principal Investor
**Prepared by:** Zharkyn Ryspayev ("Zhan") — Founder, CEO/CTO · Dmytro Tsvyk ("Dymo") — Co-founder, Operations Principal
**Date:** 2026-04-18
**Meeting:** Sunday 2026-04-19, Al Jurf
**Form:** Markdown specification of tab structure, formulas, and assumptions — to be rendered into Excel / Google Sheets before the Sunday meeting (or Week 1 post-MOU)
**Audience:** Rudi; UAE legal and tax counsel; future Series A investors
**Status:** Template structure — assumptions calibrated by Zhan + Dymo; all computed outputs are formula-driven (no hardcoded result cells)

---

## All projections are CONSERVATIVE baseline. Ambitious-case scenarios (+100 %) are available upon request.

The model is built so that every output cell references the Assumptions tab. The scenario toggle in Tab 6 selects Conservative (−50 %), Base, or Aggressive (+100 %) without rewriting formulas. The Distribution Waterfall in Tab 5 models four Sunset scenarios (Fast Y2–3, Base Y4–5, Slow Y5 stress, Hypothetical without Time Trigger) plus Platform IPO exit scenarios. Tab 8 models the three-layer tax efficiency (SBR Y1 + QFZP Platform + 0 % personal).

---

## Tab map

The workbook consists of 9 tabs, structured so that changing any input in Tab 1 flows through to outputs in Tabs 3–9.

| # | Tab | Purpose | Input vs Output |
|---|---|---|---|
| 1 | Assumptions | All model inputs | Input only |
| 2 | Revenue Projections | Monthly Year 1 + Quarterly Years 2–5 | Output |
| 3 | OpEx | Headcount, office, marketing, legal, tech, insurance | Mixed |
| 4 | Cashflow | Monthly Year 1 + Quarterly Years 2–5 | Output |
| 5 | **Distribution Waterfall** | 4 Sunset scenarios + Platform IPO exit scenarios | Output |
| 6 | Scenarios | Conservative / Base / Aggressive toggle | Output |
| 6a | Sensitivity Analysis | Stress tests (deal volume, deal size, combined) | Output |
| 7 | Breakeven Analysis | Operating / capital / profit breakeven per scenario | Output |
| 8 | KPIs + Tax Efficiency Analysis | CAC, LTV, deal velocity, SBR/QFZP/shareholder tax impact | Output |

---

## Tab 1 — Assumptions

### 1.1 Deal economics (Agency)

| Parameter | Base case | Source |
|---|---|---|
| Land plot average deal size | AED 20,000,000 | Midpoint of 10–30 M range |
| Land plot commission rate | 2.0 % | Task brief |
| Land plot commission per deal | AED 400,000 | Formula |
| Off-plan average deal size | AED 5,000,000 | Midpoint of 1.5–20 M range (entry-weighted) |
| Off-plan commission rate | 4.0 % | Midpoint of 3–5 % range |
| Off-plan commission per deal | AED 200,000 | Formula |
| **Blended commission per deal (60/40 mix)** | **AED 320,000** | **Formula** |

### 1.2 Deal velocity (Base case)

| Year | Deals | Cumulative |
|---|---|---|
| Y1 | 8 | 8 |
| Y2 | 24 | 32 |
| Y3 | 60 | 92 |
| Y4 | 120 | 212 |
| Y5 | 200 | 412 |

### 1.3 Platform revenue (Year 1)

| Stream | AED | Rationale |
|---|---|---|
| Ambassador tier fees | 250,000 | Existing production code |
| ZAAHI service fee on platform-routed deals | 150,000 | Routing of agency deals |
| Archibald AI premium access | 50,000 | Early adopter base |
| **Total platform revenue Year 1** | **450,000** | |

### 1.4 Cost structure (Year 1 monthly OpEx ≈ AED 145,000; annual ~AED 1,735,000)

See Tab 3 for breakdown.

### 1.5 Capital structure

- Rudi investment: **AED 1,000,000** at Closing.
- Working capital reserve target: AED 200,000 minimum.
- 3-month operating reserve: AED 435,000 minimum.

### 1.6 Equity structure and Sunset parameters

| Parameter | Value |
|---|---|
| Agency cap pre-Sunset | Rudi 80 % · Dymo 10 % · Zhan 10 % |
| Agency cap post-Sunset | Rudi 33.34 % · Dymo 33.33 % · Zhan 33.33 % |
| Platform cap (perpetual) | Zhan 80 % · Dymo 10 % · Rudi 10 % |
| Profit distribution (fixed pre- and post-Sunset) | 70 % Platform / 10 % Rudi / 10 % Dymo / 10 % Zhan |
| Agency post-money implied | AED 1,250,000 |
| Sunset Financial Trigger | Rudi cumulative distributions AED 2,000,000 (across both entities) |
| Sunset Time Trigger | 5th anniversary of SAFE Closing Date |
| Sunset is earlier of (a) or (b) | automatic |

---

## Tab 2 — Revenue Projections

### Year 1 monthly schedule (base case)

| Month | Deals closed | Gross commission | Platform rev | Total revenue |
|---|---|---|---|---|
| M1 | 0 | 0 | 15,000 | 15,000 |
| M2 | 0 | 0 | 25,000 | 25,000 |
| M3 | 0 | 0 | 35,000 | 35,000 |
| M4 | 1 | 320,000 | 40,000 | 360,000 |
| M5 | 1 | 320,000 | 40,000 | 360,000 |
| M6 | 1 | 320,000 | 40,000 | 360,000 |
| M7 | 1 | 320,000 | 40,000 | 360,000 |
| M8 | 1 | 320,000 | 40,000 | 360,000 |
| M9 | 1 | 320,000 | 40,000 | 360,000 |
| M10 | 1 | 320,000 | 40,000 | 360,000 |
| M11 | 1 | 320,000 | 40,000 | 360,000 |
| M12 | 1 | 320,000 | 55,000 | 375,000 |
| **Y1 total** | **8** | **2,560,000** | **450,000** | **3,010,000** |

### Years 2–5 (base case)

| Year | Deals | Agency rev | Platform rev | Total rev |
|---|---|---|---|---|
| Y2 | 24 | 7,680,000 | 1,500,000 | 9,180,000 |
| Y3 | 60 | 19,200,000 | 5,000,000 | 24,200,000 |
| Y4 | 120 | 38,400,000 | 12,000,000 | 50,400,000 |
| Y5 | 200 | 64,000,000 | 25,000,000 | 89,000,000 |

---

## Tab 3 — OpEx (summary)

| Line | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|---|
| Zhan compensation (Platform) | 480,000 | 540,000 | 600,000 | 660,000 | 720,000 |
| Dymo compensation (Agency) | 360,000 | 420,000 | 480,000 | 540,000 | 600,000 |
| Agents (1 → 5 over 5 years) | 300,000 | 840,000 | 1,260,000 | 1,680,000 | 2,100,000 |
| Office + tech + marketing | 280,000 | 450,000 | 700,000 | 1,000,000 | 1,400,000 |
| Legal + accounting + audit + insurance | 315,000 | 500,000 | 800,000 | 1,200,000 | 1,800,000 |
| Contingency | 100,000 | 150,000 | 200,000 | 300,000 | 400,000 |
| **Total Y1-Y5 OpEx** | **1,835,000** | **2,900,000** | **4,040,000** | **5,380,000** | **7,020,000** |

Agency OpEx allocation ≈ 40 % · Platform OpEx allocation ≈ 60 % (subject to cost-centre split at SHA).

---

## Tab 4 — Cashflow (Year 1 monthly, base case)

Starting cash: AED 1,000,000 (Rudi Investment).

| Month | Revenue | OpEx | Net | Cumulative |
|---|---|---|---|---|
| M1 | 15,000 | 110,000 | –95,000 | 905,000 |
| M2 | 25,000 | 110,000 | –85,000 | 820,000 |
| M3 | 35,000 | 140,000 | –105,000 | 715,000 |
| M4 | 360,000 | 210,000 | 150,000 | 865,000 |
| M5 | 360,000 | 140,000 | 220,000 | 1,085,000 |
| M6 | 360,000 | 140,000 | 220,000 | 1,305,000 |
| M7 | 360,000 | 140,000 | 220,000 | 1,525,000 |
| M8 | 360,000 | 140,000 | 220,000 | 1,745,000 |
| M9 | 360,000 | 170,000 | 190,000 | 1,935,000 |
| M10 | 360,000 | 140,000 | 220,000 | 2,155,000 |
| M11 | 360,000 | 140,000 | 220,000 | 2,375,000 |
| M12 | 375,000 | 155,000 | 220,000 | 2,595,000 |

Operating breakeven: **Month 4** (first deal). Capital breakeven: **Month 11**.

---

## Tab 5 — Distribution Waterfall (4 Sunset Scenarios + Platform IPO)

This is the **key tab for Rudi**. Each scenario tracks Rudi's cumulative cash distributions across both entities and the Sunset trigger timing. Then Platform IPO exit scenarios are modelled separately.

**Profit split reminder:** 70 % Platform, 10 % Rudi, 10 % Dymo, 10 % Zhan (fixed pre- and post-Sunset). Sunset changes Agency equity cap only (80/10/10 → 33.34/33.33/33.33).

### Scenario 1 — Fast Sunset (Financial Trigger Years 2–3)

Ambitious case: agency grows +100 % vs base. Early Platform dividends contribute toward the AED 2 M Financial Trigger.

| Year | Agency Net Profit (AED) | Rudi Agency (10 %) | Platform dividend to Rudi | Cumulative Rudi | Trigger |
|---|---|---|---|---|---|
| Y1 | 2,550,000 | 255,000 | 0 | 255,000 | No |
| Y2 | 5,100,000 | 510,000 | 50,000 | 815,000 | No |
| Y3 | 12,750,000 | 1,275,000 | 100,000 | **2,190,000** | **✓ Financial Trigger fires mid-Y3** |
| Y4+ post-Sunset | scaling | 10 % continuing | continuing | continuing | — |
| **Lifetime Rudi (Y1–Y15 est.)** | | | | **AED 25–35 M** | |

**Outcome:** Rudi receives 2× back mid-Y3; Sunset fires; Agency rebalances to 33.34/33.33/33.33. Rudi continues receiving 10 % of Agency profits and 10 % of Platform distributions for life.

### Scenario 2 — Base Case Sunset (Time Trigger Year 5)

Base case: 8 deals Y1 → 200 deals Y5. Agency distributions moderate; Platform early-stage, no dividends yet.

| Year | Agency Net Profit (AED) | Rudi Agency (10 %) | Cumulative Rudi | Trigger |
|---|---|---|---|---|
| Y1 | 1,275,000 | 127,500 | 127,500 | No |
| Y2 | 2,550,000 | 255,000 | 382,500 | No |
| Y3 | 6,400,000 | 640,000 | 1,022,500 | No |
| Y4 | 12,800,000 | 1,280,000 | 2,302,500 | **✓ Financial Trigger fires mid-Y4** |
| Y5 | 21,250,000 | 2,125,000 | 4,427,500 | (Sunset fired; Rudi continues 10 %) |
| Y6–15 post-Sunset | scaling | continuing | continuing | — |
| **Lifetime Rudi (Y1–Y15 est.)** | | | **AED 15–25 M** | |

**Outcome:** Financial Trigger fires mid-Y4 in base case (before Time Trigger Y5). Agency rebalances. Rudi continues at 10 % profit share.

### Scenario 3 — Slow Sunset (Stress — Time Trigger Year 5)

Stress C: deal volume –50 %, deal size –30 %. Agency slow. No Platform dividends in first 5 years.

| Year | Agency Net Profit (AED) | Rudi Agency (10 %) | Cumulative Rudi | Trigger |
|---|---|---|---|---|
| Y1 | –154,000 | 0 | 0 | No |
| Y2 | 300,000 | 30,000 | 30,000 | No |
| Y3 | 900,000 | 90,000 | 120,000 | No |
| Y4 | 1,800,000 | 180,000 | 300,000 | No |
| Y5 | 3,200,000 | 320,000 | **620,000** | **✓ Time Trigger fires Y5** (Financial not met) |
| Y6–15 post-Sunset | scaling | continuing 10 % | continuing | — |

**Outcome:** Financial Trigger not reached by Y5 (only AED 620 k cumulative). Time Trigger fires automatically at Y5. Agency rebalances to 33.34/33.33/33.33. Rudi's 1× liquidation preference (AED 1 M) remains as floor on any future sale.

**This scenario explains why the Time Trigger exists — it guarantees conversion regardless of financial velocity.**

### Scenario 4 — Hypothetical (no Time Trigger — for comparison)

What if only the Financial Trigger existed? Using Scenario 3 cash flows:

| Year | Cumulative Rudi | Trigger |
|---|---|---|
| Y5 | 620,000 | No |
| Y6 | 1,120,000 | No |
| Y7 | 1,870,000 | No |
| Y8 | **2,870,000** | **✓ would fire Y8** |

**Outcome:** Without the Time Trigger, Rudi stays 80 % Agency owner until Year 8. Too long. The 5-year Time Trigger (in the actual deal) prevents this — conversion guaranteed at Y5 regardless.

### Waterfall summary

| Scenario | Trigger fires | Time | Rudi cumulative at Sunset |
|---|---|---|---|
| 1 — Fast | Financial | Mid-Y3 | AED 2.2 M |
| 2 — Base | Financial | Mid-Y4 | AED 2.3 M |
| 3 — Slow | Time | Y5 | AED 620 k |
| 4 — Never (hypothetical) | N/A | — | Rudi would stay 80 % indefinitely |

### Platform IPO exit scenarios

**Platform IPO is the primary exit path.** Agency is operational cash engine — not publicly traded. The Platform (ADGM HoldCo) raises Series A / B / C and targets IPO Years 5–10. Rudi's 10 % Platform stake is weighted-average-protected until Series A first closing; pro-rata rights after.

Assumed dilution ladder (typical institutional rounds):

| Round | Dilution from round | Rudi's % post-round (with weighted-avg before Series A, pro-rata after) |
|---|---|---|
| Pre-Series A (Platform formation) | — | 10.0 % |
| Series A (20 % new investor) | –20 % cap-table | 8.0 % (pro-rata participation optional, at Rudi's cost) |
| Series B (15 % new investor) | –15 % | 6.8 % |
| Series C (15 % new investor) | –15 % | 5.8 % |
| Pre-IPO | — | 5.8 % |
| IPO (25 % new float) | –25 % | 4.4 % floating stake |

Rudi's IPO proceeds at various Platform valuations (assuming 4.4 % effective Platform stake at IPO, post-Series-C dilution):

| Platform IPO valuation | Rudi's 4.4 % stake value |
|---|---|
| USD 100 M | ~USD 4.4 M |
| USD 500 M | ~USD 22 M |
| USD 1 B | ~USD 44 M |

If Rudi fully participates pro-rata in each Series round (at his own cost), he preserves his 10 % through Series B and dilutes only at Series C:

| Platform IPO valuation | Rudi's ~7 % stake (full pro-rata) |
|---|---|
| USD 100 M | ~USD 7 M |
| USD 500 M | ~USD 35 M |
| USD 1 B | ~USD 70 M |

**Agency exit (separate from Platform):** at any Liquidity Event of the Agency, Rudi's share is 80 % pre-Sunset or 33.34 % post-Sunset of the Agency sale proceeds (less 1× liquidation preference election if lower).

Rudi's lifetime economic outcome = Agency quarterly distributions (Y1 through sale/dissolution) + Platform distributions and IPO proceeds.

---

## Tab 6 — Scenarios (toggle)

Conservative / Base / Aggressive side-by-side:

| Metric | Conservative | Base | Aggressive |
|---|---|---|---|
| Year 1 deals | 4 | 8 | 16 |
| Year 1 commission | 1,280,000 | 2,560,000 | 5,120,000 |
| Year 1 total revenue | 1,505,000 | 3,010,000 | 5,820,000 |
| Year 1 net profit | –95,000 | 1,275,000 | 3,620,000 |
| Rudi Year 1 distribution | 0 | 127,500 | 362,000 |

---

## Tab 6a — Sensitivity Analysis (stress tests)

| Parameter | Base | A: Deal volume −50 % | B: Deal size −30 % | C: Both (Stress) |
|---|---|---|---|---|
| Year 1 deals | 8 | 4 | 8 | 4 |
| Avg deal commission | 320,000 | 320,000 | 224,000 | 224,000 |
| Year 1 agency revenue | 2,560,000 | 1,280,000 | 1,792,000 | 896,000 |
| Year 1 total revenue | 3,010,000 | 1,730,000 | 2,242,000 | 1,346,000 |
| Year 1 OpEx | 1,735,000 | 1,600,000 | 1,735,000 | 1,500,000 |
| Year 1 net profit | 1,275,000 | 130,000 | 507,000 | –154,000 |
| Runway end of Y1 | Healthy | AED 1.1 M | AED 1.5 M | AED 900 k |

**Runway calculation.** Months until Agency is self-sustaining = (Starting cash − cumulative net outflow) / monthly burn. Base case: Agency self-sustaining from Month 4 onward. Stress C: bridge of AED 300–500 k or cost cuts by Month 10 to extend past Year 1.

---

## Tab 7 — Breakeven Analysis

| Metric | Conservative | Base | Aggressive |
|---|---|---|---|
| Operating breakeven | Month 7–8 | Month 4 | Month 3 |
| Capital breakeven (AED 1 M restored) | Month 18 | Month 11–12 | Month 8 |
| Profit breakeven (cumulative > 0) | Month 14 | Month 7 | Month 5 |

---

## Tab 8 — KPIs + Sunset Ledger + Tax Efficiency Analysis

### Agency KPIs

- Deal velocity: 8 Y1 → 200 Y5 (base).
- Avg commission per deal: AED 320,000.
- Gross margin per deal: 60–65 %.
- Cost per acquired deal: target < AED 25,000 by Y2.

### Sunset Ledger (tracked monthly, shared with Rudi per `TERM_SHEET.md` §12(e))

- **Cumulative cash distributions to Rudi (across both entities)** — running total toward the AED 2,000,000 Financial Trigger.
- **Months elapsed since SAFE execution** — running counter toward the 60-month (5-year) Time Trigger.
- **Projected trigger date** — extrapolated from current distribution velocity; which trigger will fire first (financial or time).
- **Current scenario mapping** — current trajectory mapped to Scenario 1 / 2 / 3.

### Tax Efficiency Analysis (three-layer)

Tracks the effective tax burden under the three-layer design (see `PROFIT_DISTRIBUTION_MECHANICS.md` §8).

| Layer | Year 1 (SBR expected) | Year 2+ (post-SBR) |
|---|---|---|
| **Agency CT** — 9 % above AED 375 K, with SBR | **0 %** (SBR Y1 if revenue ≤ AED 3 M) | ~2.7 % effective on gross Agency profit (9 % × retained 30 %) |
| **Platform CT** — if QFZP qualifying | **0 %** on Service Fee income | **0 %** on qualifying income; 9 % on non-qualifying |
| **Shareholder** — UAE personal | **0 %** | **0 %** |
| **Combined effective tax on Rudi's AED 100 K distribution** | **0 %** | **~0–3 %** |

Dashboard row: "Year [N] effective tax burden on Rudi distribution: X %. Platform Service Fee deducted at Agency level: AED Y. Platform QFZP status confirmed: Yes/No."

### Platform KPIs

- Ambassador tier distribution (SILVER/GOLD/PLATINUM mix).
- Monthly active platform users (MAU): 500 end Y1 → 50,000 end Y3.
- Platform revenue per MAU: AED 500 by Y2.

### Team KPIs

- Headcount: 3 → 6 → 12 by Y3.
- Revenue per FTE: AED 600 k+ end Y1 → AED 1.2 M+ end Y3.

### Financial KPIs

- Gross margin: Y1 ~58 % → Y3 target 70 %.
- EBITDA margin: Y1 ~42 % → Y3 target 55 %.
- Runway: 12+ months at all times; 18+ months pre-Series A.
- Cash on balance sheet: AED 2 M+ from end Y1.

---

## Notes for model build

1. **Formulas, not hardcodes.** Every output references Tab 1 Assumptions.
2. **Named ranges:** `AvgDealSize`, `CommissionRate`, `ZhanSalary`, `RudiCumulativeDistributions`, `SunsetFinTrigger` (2M), `SunsetTimeTrigger` (60 months), `AgencyNetProfit`, `PlatformServiceFee`, `EffectiveTaxRate`.
3. **Scenario switch:** single dropdown cell (Conservative / Base / Aggressive) toggles assumption set.
4. **Sunset tracker:** dedicated row on Dashboard showing "AED X of AED 2,000,000 toward Financial Trigger · Y months of 60 months toward Time Trigger · projected Sunset: [date]."
5. **Tax tracker:** dedicated row on Dashboard showing "Year [N] effective tax burden on Rudi distribution: X %. Platform QFZP status: [confirmed / pending]. Agency SBR eligible: [yes / graduated]."
6. **Output sheet (Dashboard):** headline metrics only (Y1 revenue, Y1 net profit, breakeven month, cash end of year, Rudi cumulative distribution, projected Sunset trigger, effective tax burden).
6. **Version control:** each iteration saved with date suffix.

---

*End of Financial Model specification. To be converted to Excel / Google Sheets by Zhan + Dymo before the Sunday 2026-04-19 Al Jurf meeting (or Week 1 post-MOU).*

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

The model is built so that every output cell references the Assumptions tab. The scenario toggle in Tab 6 selects Conservative (−50 %), Base, or Aggressive (+100 %) without rewriting formulas. The Distribution Waterfall in Tab 5 models four distinct **Sunset scenarios** — Fast (Y2–3), Base (Y5 Time Trigger), Slow (Y5 Time Trigger, stress), and Never (hypothetical, time trigger removed).

---

## Tab map

The workbook consists of 9 tabs, structured so that changing any input in Tab 1 flows through to outputs in Tabs 3–9.

| # | Tab | Purpose | Input vs Output |
|---|---|---|---|
| 1 | Assumptions | All model inputs | Input only |
| 2 | Revenue Projections | Monthly Year 1 + Quarterly Years 2–5 | Output |
| 3 | OpEx | Headcount, office, marketing, legal, tech, insurance | Mixed |
| 4 | Cashflow | Monthly Year 1 + Quarterly Years 2–5 | Output |
| 5 | **Distribution Waterfall (4 Sunset scenarios)** | Rudi's cumulative returns; Sunset trigger timing; post-sunset mechanics | Output |
| 6 | Scenarios | Conservative / Base / Aggressive toggle | Output |
| 6a | Sensitivity Analysis | Stress tests (deal volume, deal size, combined) | Output |
| 7 | Breakeven Analysis | Operating / capital / profit breakeven per scenario | Output |
| 8 | KPIs (incl. Sunset tracking) | CAC, LTV, deal velocity, Sunset ledger | Output |

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

### 1.6 Sunset Clause parameters (NEW)

| Parameter | Value |
|---|---|
| Financial trigger (AED cumulative to Rudi) | 2,000,000 |
| Time trigger (years since SAFE) | 5 |
| Sunset is earlier of (a) or (b) | always |
| Post-sunset Agency cap | Rudi 10 % · Dymo 45 % · Zhan 45 % |
| Post-sunset Platform cap | Unchanged (Zhan 80 % · Dymo 10 % · Rudi 10 %) |
| Post-sunset profit split | Unchanged (70 / 10 / 10 / 10) |

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

## Tab 5 — Distribution Waterfall (4 Sunset Scenarios)

This is the **key tab for Rudi**. Each row calculates Rudi's cumulative cash distributions across both entities and tracks the Sunset trigger timing.

**Profit split reminder:** 70 % Platform, 10 % Rudi, 10 % Dymo, 10 % Zhan (fixed pre- and post-Sunset).

### Scenario 1 — Fast Sunset (Financial Trigger Y2–Y3)

Ambitious case: agency grows +100 % vs base (16 deals Year 1, 48 Year 2, etc.).

| Year | Agency Net Profit (AED) | Rudi distribution (10 %) | Cumulative Rudi | Trigger? |
|---|---|---|---|---|
| Y1 | 2,550,000 | 255,000 | 255,000 | No |
| Y2 | 5,100,000 | 510,000 | 765,000 | No |
| Y3 | 12,750,000 | 1,275,000 | **2,040,000** | **✓ Financial Trigger fires mid-Y3** |
| Y4 post-sunset | 25,500,000 | 2,550,000 | 4,590,000 | — (Rudi continues at 10 %) |
| Y5 post-sunset | 42,500,000 | 4,250,000 | 8,840,000 | — |
| Y6-15 post-sunset | — | ongoing 10 % / year | continuing | — |
| **Lifetime Rudi (Y1-Y15 incl. post-sunset)** | | | **~AED 30M+** | |

**Outcome:** Rudi receives 2× back mid-Y3; sunset fires; Rudi continues receiving 10 % of Agency profits for the Agency's lifetime plus 10 % of Platform distributions.

### Scenario 2 — Base Case Sunset (Time Trigger Y5)

Base case: 8 deals Y1 → 200 deals Y5, Agency Net Profit growth as in Tab 2.

| Year | Agency Net Profit (AED) | Rudi distribution (10 %) | Cumulative Rudi | Trigger? |
|---|---|---|---|---|
| Y1 | 1,275,000 | 127,500 | 127,500 | No |
| Y2 | 2,550,000 | 255,000 | 382,500 | No |
| Y3 | 6,400,000 | 640,000 | 1,022,500 | No |
| Y4 | 12,800,000 | 1,280,000 | 2,302,500 | **✓ Financial Trigger fires mid-Y4** |
| Y5 | 21,250,000 | 2,125,000 | 4,427,500 | (sunset has fired; Rudi continues 10 %) |
| Y6-15 post-sunset | — | ongoing | continuing | — |

**Outcome:** Financial Trigger fires mid-Y4 (before Time Trigger Y5). Rudi receives 2× within ~4 years in base case. Lifetime Rudi including post-sunset Agency 10 % and Platform 10 %: **~AED 15–25M**.

### Scenario 3 — Slow Sunset (Stress case — Time Trigger Y5)

Stress C: deal volume –50 %, deal size –30 % (combined shock). Agency Net Profit grows slowly.

| Year | Agency Net Profit (AED) | Rudi distribution (10 %) | Cumulative Rudi | Trigger? |
|---|---|---|---|---|
| Y1 | –154,000 | 0 (loss year) | 0 | No |
| Y2 | 300,000 | 30,000 | 30,000 | No |
| Y3 | 900,000 | 90,000 | 120,000 | No |
| Y4 | 1,800,000 | 180,000 | 300,000 | No |
| Y5 | 3,200,000 | 320,000 | **620,000** | **✓ Time Trigger fires Y5** (Financial Trigger not met) |
| Y6-15 post-sunset | — | ongoing 10 % | continuing | — |

**Outcome:** Financial Trigger (AED 2 M cumulative) not reached by Year 5 — only AED 620 k cumulative. Time Trigger fires automatically at Y5. Rudi converts to 10 % Agency minority. Liquidation preference (1× = AED 1 M) remains as floor on any sale. Rudi continues to receive 10 % of Agency profits post-sunset plus 10 % Platform for life.

**This scenario explains why the time-based trigger was added — it guarantees the control return happens regardless of financial velocity.**

### Scenario 4 — Never Sunset (hypothetical — time trigger removed for comparison)

What if only the Financial Trigger existed (no 5-year cap)? Using Scenario 3 cash flows (slow):

| Year | Agency Net Profit | Rudi distribution | Cumulative Rudi | Trigger? |
|---|---|---|---|---|
| Y5 | 3,200,000 | 320,000 | 620,000 | No |
| Y6 | 5,000,000 | 500,000 | 1,120,000 | No |
| Y7 | 7,500,000 | 750,000 | 1,870,000 | No |
| Y8 | 10,000,000 | 1,000,000 | **2,870,000** | **✓ Financial Trigger would fire Y8** |

**Outcome:** In the stress case without a time cap, Rudi stays 80 % owner until Year 8 — too long. The 5-year time cap prevents this: Rudi converts to 10 % at Year 5 regardless, and continues receiving 10 % of Agency profits.

**This scenario is for illustration only — the actual deal includes the time cap.**

### Waterfall summary (Rudi's outcome across scenarios)

| Scenario | Sunset trigger | Time of sunset | Rudi cumulative at sunset | Post-sunset lifetime Rudi (est.) |
|---|---|---|---|---|
| 1 — Fast | Financial | Mid-Y3 | AED 2 M | AED 30 M+ |
| 2 — Base | Financial | Mid-Y4 | AED 2 M | AED 15–25 M |
| 3 — Slow | Time | Y5 | AED 620 k | AED 5–10 M (plus liq pref AED 1 M floor) |
| 4 — Never (hypothetical) | N/A | — | — | would stay 80 % indefinitely — avoided by time cap |

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
| Expected Sunset scenario | 3 (Slow, Time trigger Y5) | 2 (Base, Financial Y4) | 1 (Fast, Financial Y2–3) |

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
| Sunset scenario | 2 (Base) | 3 (Slow, Time Y5) | 2 (Base, Financial Y4) | 3 (Slow, Time Y5) |

**Runway calculation.** Months until Agency is self-sustaining = (Starting cash − cumulative net outflow) / monthly burn. Base case: Agency self-sustaining from Month 4 onward. Stress C: bridge of AED 300–500 k or cost cuts by Month 10 to extend past Year 1.

---

## Tab 7 — Breakeven Analysis

| Metric | Conservative | Base | Aggressive |
|---|---|---|---|
| Operating breakeven | Month 7–8 | Month 4 | Month 3 |
| Capital breakeven (AED 1 M restored) | Month 18 | Month 11–12 | Month 8 |
| Profit breakeven (cumulative > 0) | Month 14 | Month 7 | Month 5 |

---

## Tab 8 — KPIs (incl. Sunset ledger)

### Agency KPIs

- Deal velocity: 8 Y1 → 200 Y5 (base).
- Avg commission per deal: AED 320,000.
- Gross margin per deal: 60–65 %.
- Cost per acquired deal: target < AED 25,000 by Y2.

### Sunset KPIs (NEW — tracked monthly)

- **Cumulative cash distributions to Rudi (across both entities)** — running total toward the AED 2 M Financial Trigger.
- **Time elapsed since SAFE execution** — running counter toward the 5-year Time Trigger.
- **Projected Sunset trigger date** — model extrapolation based on current cash-distribution velocity.
- **Sunset-scenario mapping** — current business trajectory mapped to Scenario 1 / 2 / 3.

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
2. **Named ranges:** `AvgDealSize`, `CommissionRate`, `ZhanSalary`, `RudiSunsetCumulative`, `SunsetFinTrigger`, `SunsetTimeTrigger`.
3. **Scenario switch:** single dropdown cell (Conservative / Base / Aggressive) toggles assumption set.
4. **Sunset tracker:** dedicated row on Dashboard showing "AED X of AED 2,000,000 toward Financial Trigger · Y months of 60 months toward Time Trigger · projected sunset: [date]."
5. **Output sheet (Dashboard):** headline metrics only (Y1 revenue, Y1 net profit, breakeven month, cash end of year, Rudi cumulative, projected sunset trigger, sunset scenario).
6. **Version control:** each iteration saved with date suffix.

---

*End of Financial Model specification. To be converted to Excel / Google Sheets by Zhan + Dymo before the Sunday 2026-04-19 Al Jurf meeting (or Week 1 post-MOU).*

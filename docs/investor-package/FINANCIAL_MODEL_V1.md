# Z A A H I

*Real Estate OS*

---

**Document:** Financial Model V1 (v5 realistic) — Excel / Google Sheets Template Structure
**Prepared for:** Rodolphe Belin ("Rudi") — Principal Investor
**Prepared by:** Zharkyn Ryspayev ("Zhan") — Founder, CEO/CTO · Dmytro Tsvyk ("Dymo") — Co-founder, Operations Principal
**Date:** 2026-04-18
**Meeting:** Sunday 2026-04-19, Al Jurf
**Version:** v5 realistic — recalibrated to founder-confirmed deal pipeline (12 premium land plots + 2 off-plan floors Year 1)
**Form:** Markdown specification of tab structure, formulas, and assumptions — to be rendered into Excel / Google Sheets before the Sunday meeting (or Week 1 post-MOU)
**Audience:** Rudi; UAE legal and tax counsel; future Series A investors
**Status:** Template structure — assumptions calibrated by Zhan + Dymo; all computed outputs are formula-driven (no hardcoded result cells)

---

## All projections are v5 BASE CASE. Conservative (−50 %) and Aggressive (+50 %+) scenarios in Tab 6.

The model is built so that every output cell references the Assumptions tab. The scenario toggle in Tab 6 selects Conservative (−50 %), Base, or Aggressive (+50 %+) without rewriting formulas. The Distribution Waterfall in Tab 5 models four Sunset scenarios (Fast Y2, Base mid-Y3, Slow Y4, Time-cap Y5) plus Platform IPO exit scenarios. Tab 8 models the three-layer tax efficiency (Agency 9% CT post-SBR + QFZP Platform + 0 % personal).

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
| 8 | KPIs + Tax Efficiency Analysis | CAC, LTV, deal velocity, Agency CT / QFZP / shareholder tax impact | Output |

---

## Tab 1 — Assumptions (v5)

### 1.1 Deal economics (Agency)

| Parameter | Base case | Source |
|---|---|---|
| Premium land plot average deal size | AED 22,500,000 | Midpoint of premium-plot range (500 M – 2 B range targeted; most Y1 deals in 5–40 M range as mid-premium) |
| Premium land plot commission rate | 2.0 % | RERA custom; Property Finder guide |
| Premium land plot commission per deal | AED 450,000 | Formula |
| Off-plan floor average deal size | AED 30,000,000 | 10–20 units × AED 1.5–2 M each per floor |
| Off-plan floor commission rate | 4.0 % | Developer floor-block agreements |
| Off-plan floor commission per deal | AED 1,200,000 | Formula |
| Large premium plots (Y3+) average deal size | AED 1,400,000,000 (1.4 B midpoint) | 500 M – 2 B range |
| Large premium plots commission rate | 1.0 % (negotiated down for scale) | Industry precedent for AED 1 B+ deals |
| Large premium plots commission per deal | AED 14,000,000 | Formula |

### 1.2 Deal velocity (Base case)

| Year | Plot deals | Floor deals | Large plot deals | Cumulative plot | Cumulative floor | Cumulative large |
|---|---|---|---|---|---|---|
| Y1 | 12 | 2 | 0 | 12 | 2 | 0 |
| Y2 | 24 | 4 | 0 | 36 | 6 | 0 |
| Y3 | 45 | 8 | 1 | 81 | 14 | 1 |
| Y4 | 65 | 15 | 3 | 146 | 29 | 4 |
| Y5 | 80 | 30 | 3 | 226 | 59 | 7 |

### 1.3 Platform revenue (Year 1 base)

| Stream | AED | Rationale |
|---|---|---|
| Developer subscriptions (2 × 50k) | 100,000 | Founder-network seed users |
| Broker subscriptions (8 × 20k) | 160,000 | Founder-network seed users |
| Architect subscriptions (10 × 10k) | 100,000 | Architect community outreach |
| Investor/Buyer subscriptions (20 × 5k) | 100,000 | Waitlist conversion |
| Land Owner subscriptions (Y2+) | 0 | Launches Y2 |
| 2 % ZAAHI Service Fee on platform-routed deals | 50,000 | Minimal Y1 (platform just launched) |
| Archibald AI premium access (Y2+) | 0 | Launches Y2 |
| **Total platform revenue Year 1** | **510,000** | |

### 1.4 Cost structure (Year 1 monthly OpEx + CoR ≈ AED 285,000; annual ~AED 3,410,000)

See Tab 3 for breakdown.

### 1.5 Capital structure

- Rudi investment: **AED 1,000,000** at Closing.
- Working capital reserve target: AED 300,000 minimum.
- 3-month operating reserve: AED 700,000 minimum (scales with OpEx).

### 1.6 Equity structure and Sunset parameters

| Parameter | Value |
|---|---|
| Agency cap pre-Sunset | Rudi 80 % · Dymo 10 % · Zhan 10 % |
| Agency cap post-Sunset | Rudi 33.34 % · Dymo 33.33 % · Zhan 33.33 % |
| Platform cap (perpetual) | Zhan 80 % · Dymo 10 % · Rudi 10 % |
| Profit distribution (fixed pre- and post-Sunset) | 70 % Platform / 10 % Rudi / 10 % Dymo / 10 % Zhan |
| Agency post-money implied | AED 1,250,000 (pre-operational) |
| Post-revenue Y2 valuation expected | AED 25–40 M (3–5× revenue multiple) |
| Sunset Financial Trigger | Rudi cumulative distributions AED 2,000,000 (across both entities) |
| Sunset Time Trigger | 5th anniversary of SAFE Closing Date |
| Sunset is earlier of (a) or (b) | automatic |

---

## Tab 2 — Revenue Projections

### Year 1 monthly schedule (v5 base case)

| Month | Plot deals | Floor deals | Agency commission | Platform rev | Total revenue |
|---|---|---|---|---|---|
| M1 | 0 | 0 | 0 | 20,000 | 20,000 |
| M2 | 0 | 0 | 0 | 25,000 | 25,000 |
| M3 | 1 | 0 | 450,000 | 30,000 | 480,000 |
| M4 | 1 | 0 | 450,000 | 35,000 | 485,000 |
| M5 | 1 | 0 | 450,000 | 40,000 | 490,000 |
| M6 | 1 | 0 | 450,000 | 40,000 | 490,000 |
| M7 | 1 | 0 | 450,000 | 45,000 | 495,000 |
| M8 | 1 | 0 | 450,000 | 45,000 | 495,000 |
| M9 | 1 | 1 | 1,650,000 | 50,000 | 1,700,000 |
| M10 | 1 | 0 | 450,000 | 55,000 | 505,000 |
| M11 | 2 | 0 | 900,000 | 60,000 | 960,000 |
| M12 | 2 | 1 | 2,100,000 | 65,000 | 2,165,000 |
| **Y1 total** | **12** | **2** | **7,800,000** | **510,000** | **8,310,000** |

### Years 2–5 (base case)

| Year | Plot deals | Floor deals | Large plots | Agency rev | Platform rev | Total rev |
|---|---|---|---|---|---|---|
| Y2 | 24 | 4 | 0 | 15,500,000 | 3,500,000 | 19,000,000 |
| Y3 | 45 | 8 | 1 | 33,500,000 | 8,500,000 | 42,000,000 |
| Y4 | 65 | 15 | 3 | 65,000,000 | 25,000,000 | 90,000,000 |
| Y5 | 80 | 30 | 3 | 130,000,000 | 60,000,000 | 190,000,000 |

---

## Tab 3 — OpEx + CoR (summary)

| Line | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|---|
| **Cost of Revenue** | 1,800,000 | 4,300,000 | 9,400,000 | 20,300,000 | 44,500,000 |
| &nbsp;&nbsp;Agent commissions (15% of Agency) | 1,170,000 | 2,325,000 | 5,025,000 | 9,750,000 | 19,500,000 |
| &nbsp;&nbsp;Direct deal costs + infra + payments + data + support + other | 630,000 | 1,975,000 | 4,375,000 | 10,550,000 | 25,000,000 |
| **Operating Expenses** | 1,610,000 | 4,450,000 | 10,100,000 | 24,880,000 | 53,400,000 |
| &nbsp;&nbsp;S&M | 350,000 | 1,250,000 | 3,500,000 | 10,500,000 | 25,000,000 |
| &nbsp;&nbsp;R&D | 300,000 | 1,100,000 | 2,900,000 | 7,800,000 | 17,000,000 |
| &nbsp;&nbsp;G&A (founder comp, office, legal, insurance, other) | 960,000 | 2,100,000 | 3,700,000 | 6,580,000 | 11,400,000 |
| **Total Costs (CoR + OpEx)** | **3,410,000** | **8,750,000** | **19,500,000** | **45,180,000** | **97,900,000** |

Agency OpEx allocation ≈ 55 % · Platform OpEx allocation ≈ 45 % (subject to cost-centre split at SHA).

---

## Tab 4 — Cashflow (Year 1 monthly, base case)

Starting cash: AED 1,000,000 (Rudi Investment).

| Month | Revenue | OpEx+CoR | Net | Cumulative |
|---|---|---|---|---|
| M1 | 20,000 | 215,000 | –195,000 | 805,000 |
| M2 | 25,000 | 220,000 | –195,000 | 610,000 |
| M3 | 480,000 | 335,000 | 145,000 | 755,000 |
| M4 | 485,000 | 260,000 | 225,000 | 980,000 |
| M5 | 490,000 | 260,000 | 230,000 | 1,210,000 |
| M6 | 490,000 | 265,000 | 225,000 | 1,435,000 |
| M7 | 495,000 | 270,000 | 225,000 | 1,660,000 |
| M8 | 495,000 | 280,000 | 215,000 | 1,875,000 |
| M9 | 1,700,000 | 400,000 | 1,300,000 | 3,175,000 |
| M10 | 505,000 | 295,000 | 210,000 | 3,385,000 |
| M11 | 960,000 | 340,000 | 620,000 | 4,005,000 |
| M12 | 2,165,000 | 470,000 | 1,695,000 | 5,700,000 |

Operating breakeven: **Month 2** (first deal closes Month 3, cash-positive from M3). Capital breakeven: **Month 4**.

---

## Tab 5 — Distribution Waterfall (4 Sunset Scenarios + Platform IPO) — v5

This is the **key tab for Rudi**. Each scenario tracks Rudi's cumulative cash distributions across both entities and the Sunset trigger timing. Then Platform IPO exit scenarios are modelled separately.

**Profit split reminder:** 70 % Platform, 10 % Rudi, 10 % Dymo, 10 % Zhan (fixed pre- and post-Sunset). Sunset changes Agency equity cap only (80/10/10 → 33.34/33.33/33.33).

### Scenario 1 — Fast Sunset (Financial Trigger late Year 1 / early Year 2)

Aggressive case: 20 deals + 5 floors + 1 large plot Y1 (AED 22 M Agency Y1 + AED 800 K Platform Y1).

| Year | Distributable Net Profit (AED) | Rudi (10 %) | Cumulative Rudi | Trigger |
|---|---|---|---|---|
| Y1 | 12,500,000 | 1,250,000 | 1,250,000 | No |
| Y2 | 20,000,000 | 2,000,000 | **3,250,000** | **✓ Financial Trigger fires early-Y2** |
| Y3+ post-Sunset | scaling | 10 % continuing | continuing | — |
| **Lifetime Rudi (Y1–Y10 est.)** | | | **AED 700 M+** | Base-style Platform IPO Y10 AED 8.4 B |

**Outcome:** Rudi receives 2× back mid-Y2; Sunset fires early; Agency rebalances to 33.34/33.33/33.33. Rudi continues receiving 10 % of Agency profits and 10 % of Platform distributions for life.

### Scenario 2 — Base Case Sunset (Financial Trigger mid-Year 3)

Base case: 12 plots + 2 floors Y1 = AED 7.8 M Agency + AED 510 K Platform.

| Year | Distributable Net Profit (AED) | Rudi (10 %) | Cumulative Rudi | Trigger |
|---|---|---|---|---|
| Y1 | 4,068,000 | 407,000 | 407,000 | No |
| Y2 | 8,100,000 | 810,000 | 1,217,000 | No |
| Y3 | 17,500,000 | 1,750,000 | **2,967,000** | **✓ Financial Trigger fires mid-Y3** |
| Y4 | 37,000,000 | 3,700,000 | 6,667,000 | (Sunset fired; Rudi continues 10 %) |
| Y5 | 76,000,000 | 7,600,000 | 14,267,000 | — |
| Y6–10 post-Sunset | scaling | continuing | continuing | — |
| **Lifetime Rudi (Y1–Y10 est.)** | | | **AED 437 M** | Platform IPO Y10 AED 5.6 B |

**Outcome:** Financial Trigger fires mid-Y3 (base case). Agency rebalances. Rudi continues at 10 % profit share. **Rudi Y1 cash AED 407 K; cumulative to Y5 AED 14.27 M; 10-year total return AED 437 M (437×).**

### Scenario 3 — Slow Sunset (Stress — Financial Trigger mid-Year 4)

Stress: 8 deals + 1 floor Y1 (Conservative scenario).

| Year | Distributable Net Profit (AED) | Rudi (10 %) | Cumulative Rudi | Trigger |
|---|---|---|---|---|
| Y1 | 2,100,000 | 210,000 | 210,000 | No |
| Y2 | 4,600,000 | 460,000 | 670,000 | No |
| Y3 | 9,800,000 | 980,000 | 1,650,000 | No |
| Y4 | 20,000,000 | 2,000,000 | **3,650,000** | **✓ Financial Trigger fires mid-Y4** |
| Y5 | 42,000,000 | 4,200,000 | 7,850,000 | — |
| Y6–10 post-Sunset | scaling | continuing 10 % | continuing | — |
| **Lifetime Rudi (Y1–Y10 est.)** | | | **AED 220 M** | Conservative Platform IPO Y10 AED 2.4 B |

**Outcome:** Financial Trigger fires mid-Y4 (Conservative). Agency rebalances. Rudi's 1× liquidation preference (AED 1 M) remains as floor on any future sale.

### Scenario 4 — Time Trigger (backstop, no Financial Trigger by Y5)

Hypothetical extreme Conservative: deal volume compresses further.

| Year | Cumulative Rudi | Trigger |
|---|---|---|
| Y1 | 100,000 | No |
| Y2 | 300,000 | No |
| Y3 | 700,000 | No |
| Y4 | 1,300,000 | No |
| Y5 | 1,900,000 | **✓ Time Trigger fires Y5** (Financial not met) |

**Outcome:** Without the Time Trigger, Rudi stays 80 % Agency owner past Y5. The 5-year Time Trigger (in the actual deal) prevents this — conversion guaranteed at Y5 regardless of velocity.

### Waterfall summary (v5)

| Scenario | Trigger fires | Time | Rudi cumulative at Sunset | 10-year total return |
|---|---|---|---|---|
| 1 — Aggressive | Financial | Early-Y2 | AED 3.25 M | AED 700 M+ |
| 2 — **Base** | **Financial** | **Mid-Y3** | **AED 2.97 M** | **AED 437 M (437×)** |
| 3 — Conservative | Financial | Mid-Y4 | AED 3.65 M | AED 220 M |
| 4 — Time-cap extreme | Time | Y5 | AED 1.9 M | Stress-floor ~AED 80 M |

### Platform IPO exit scenarios (v5)

**Platform IPO is the primary exit path.** Platform Y5 revenue AED 60 M; Y10 target AED 800 M. At Y10 IPO with typical PropTech 6–9× revenue multiple → AED 4.8–7.2 B valuation.

Assumed dilution ladder (typical institutional rounds):

| Round | Dilution from round | Rudi's % post-round (with weighted-avg before Series A, pro-rata after) |
|---|---|---|
| Pre-Series A (Platform formation) | — | 10.0 % |
| Series A (20 % new investor) | –20 % cap-table | 8.0 % (pro-rata participation optional, at Rudi's cost) |
| Series B (15 % new investor) | –15 % | 6.8 % |
| Series C (15 % new investor) | –15 % | 5.8 % |
| Pre-IPO | — | 5.8 % |
| IPO (25 % new float) | –25 % | 4.4 % floating stake (if no participation at A–C) |

Rudi's IPO proceeds at various Platform Y10 valuations (assuming 5.8 % effective Platform stake pre-IPO, post-Series-C dilution):

| Platform IPO valuation (AED) | Rudi's 5.8 % stake value |
|---|---|
| 2.4 B (Conservative) | ~AED 140 M |
| **5.6 B (Base)** | **~AED 322 M** |
| 8.4 B (Aggressive) | ~AED 490 M |

**Agency exit (separate from Platform):** at any Liquidity Event of the Agency, Rudi's share is 80 % pre-Sunset or 33.34 % post-Sunset of the Agency sale proceeds (less 1× liquidation preference election if lower).

Rudi's lifetime economic outcome = Agency quarterly distributions (Y1 through sale/dissolution) + Platform distributions and IPO proceeds. **Base case 10-year total: AED 437 M on AED 1 M Investment (437× MOIC, ~80 % IRR).**

---

## Tab 6 — Scenarios (toggle)

Conservative / Base / Aggressive side-by-side:

| Metric | Conservative | Base | Aggressive |
|---|---|---|---|
| Year 1 plot deals | 8 | 12 | 20 |
| Year 1 floor deals | 1 | 2 | 5 |
| Year 1 large plot | 0 | 0 | 1 (AED 200 M × 1 %) |
| Year 1 Agency revenue | 4,800,000 | 7,800,000 | 20,000,000 |
| Year 1 Platform revenue | 400,000 | 510,000 | 2,000,000 |
| Year 1 Total revenue | 5,200,000 | 8,310,000 | 22,000,000 |
| Year 1 Distributable Net Profit | 2,100,000 | 4,068,000 | 12,500,000 |
| Rudi Year 1 distribution | 210,000 | 407,000 | 1,250,000 |
| 10-year total return to Rudi | AED 220 M | **AED 437 M** | AED 700 M+ |

---

## Tab 6a — Sensitivity Analysis (stress tests)

| Parameter | Base Y1 | A: Deal volume −50 % | B: Commission rate −20 % | C: Both (Stress) |
|---|---|---|---|---|
| Year 1 plot deals | 12 | 6 | 12 | 6 |
| Avg plot commission | 450,000 | 450,000 | 360,000 | 360,000 |
| Floor deals | 2 | 1 | 2 | 1 |
| Year 1 Agency revenue | 7,800,000 | 3,900,000 | 6,240,000 | 3,120,000 |
| Year 1 total revenue | 8,310,000 | 4,310,000 | 6,750,000 | 3,630,000 |
| Year 1 OpEx + CoR | 3,410,000 | 2,500,000 | 3,400,000 | 2,300,000 |
| Year 1 Distributable Net Profit | 4,068,000 | 1,500,000 | 3,000,000 | 1,100,000 |
| Runway end of Y1 | Healthy | AED 2.0 M | AED 3.4 M | AED 1.5 M |

**Runway calculation.** Months until Agency is self-sustaining = (Starting cash − cumulative net outflow) / monthly burn. Base case: Agency self-sustaining from Month 3 onward. Stress C: AED 1 M investment plus Y1 net AED 1.1 M = healthy AED 2.1 M ending cash despite stress.

---

## Tab 7 — Breakeven Analysis (v5)

| Metric | Conservative | Base | Aggressive |
|---|---|---|---|
| Operating breakeven | Month 4 | Month 2 | Month 1 |
| Capital breakeven (AED 1 M restored) | Month 9 | Month 4 | Month 2 |
| Profit breakeven (cumulative > 0) | Month 7 | Month 3 | Month 2 |

---

## Tab 8 — KPIs + Sunset Ledger + Tax Efficiency Analysis

### Agency KPIs

- Deal velocity: 14 (12 plots + 2 floors) Y1 → 113 (80 plots + 30 floors + 3 large) Y5 base.
- Avg commission per plot deal: AED 450,000.
- Avg commission per floor deal: AED 1,200,000.
- Avg commission per large plot: AED 14,000,000.
- Gross margin per deal: 78 % (Y1 base).
- Cost per acquired deal: target < AED 20,000 by Y2 (Y1 founder-led zero-CAC).

### Sunset Ledger (tracked monthly, shared with Rudi per `TERM_SHEET.md` §12(e))

- **Cumulative cash distributions to Rudi (across both entities)** — running total toward the AED 2,000,000 Financial Trigger.
- **Months elapsed since SAFE execution** — running counter toward the 60-month (5-year) Time Trigger.
- **Projected trigger date** — extrapolated from current distribution velocity; which trigger will fire first (financial or time).
- **Current scenario mapping** — current trajectory mapped to Scenario 1 (Aggressive) / 2 (Base) / 3 (Conservative) / 4 (Time-cap).

### Tax Efficiency Analysis (three-layer, v5)

Tracks the effective tax burden under the three-layer design (see `PROFIT_DISTRIBUTION_MECHANICS.md` §8).

| Layer | Year 1 (v5 — SBR not applicable) | Year 2+ |
|---|---|---|
| **Agency CT** — 9 % above AED 375 K. SBR NOT available (Y1 Agency revenue AED 7.8 M > AED 3 M threshold) | ~2.1 % effective on gross Agency profit (9 % × retained 23 % after Service Fee deduction) | ~2.5–4 % effective |
| **Platform CT** — if QFZP qualifying | **0 %** on Service Fee income | **0 %** on qualifying income; 9 % on non-qualifying |
| **Shareholder** — UAE personal | **0 %** | **0 %** |
| **Combined effective tax on Rudi's distribution** | **~2 %** | **~2–3 %** |
| **Transfer Pricing** | Local file required from Year 1 (related-party > AED 3.75 M) | Continuing annual updates |

Dashboard row: "Year [N] effective tax burden on Rudi distribution: X %. Platform Service Fee deducted at Agency level: AED Y. Platform QFZP status confirmed: Yes/No. TP Local File status: current / pending."

### Platform KPIs

- Tier subscription distribution (Developer / Broker / Architect / Investor / Owner mix).
- Monthly active platform users (MAU): 500 end Y1 → 50,000 end Y3.
- Platform revenue per active subscriber: AED 11,500 Y1 → AED 21,100 Y3 → AED 16,100 Y5 (tier mix shift).

### Team KPIs

- Headcount: 5 → 13.5 → 26 → 45 → 72 across Y1–Y5.
- Revenue per FTE: AED 1.66 M+ Y1 → AED 2.64 M+ Y5.

### Financial KPIs

- Gross margin: Y1 ~78 % → Y3 ~78 % → Y5 ~77 %.
- EBITDA margin: Y1 ~60 % → Y3 ~54 % → Y5 ~49 %.
- Rule of 40: Y2 183 → Y5 160 (consistently >> SaaS Series A benchmark of 30–40).
- Runway: 12+ months at all times; 18+ months pre-Series A.
- Cash on balance sheet: AED 5.7 M+ from end Y1.

---

## Notes for model build

1. **Formulas, not hardcodes.** Every output references Tab 1 Assumptions.
2. **Named ranges:** `PremiumPlotAvgSize`, `PlotCommissionRate`, `FloorAvgSize`, `FloorCommissionRate`, `LargePlotAvgSize`, `LargePlotCommissionRate`, `ZhanSalary`, `RudiCumulativeDistributions`, `SunsetFinTrigger` (2M), `SunsetTimeTrigger` (60 months), `AgencyNetProfit`, `PlatformServiceFee`, `EffectiveTaxRate`.
3. **Scenario switch:** single dropdown cell (Conservative / Base / Aggressive) toggles assumption set.
4. **Sunset tracker:** dedicated row on Dashboard showing "AED X of AED 2,000,000 toward Financial Trigger · Y months of 60 months toward Time Trigger · projected Sunset: [date]."
5. **Tax tracker:** dedicated row on Dashboard showing "Year [N] effective tax burden on Rudi distribution: X %. Platform QFZP status: [confirmed / pending]. TP Local File status: [current / pending]."
6. **Output sheet (Dashboard):** headline metrics only (Y1 revenue 8,310 k, Y1 net profit 4,068 k, breakeven month 2, cash end Y1 AED 5,700 k, Rudi cumulative distribution, projected Sunset trigger mid-Y3, effective tax burden ~2 %).
7. **Version control:** each iteration saved with date suffix. This is v5 realistic, dated 2026-04-18.

---

*End of v5 Financial Model specification. To be converted to Excel / Google Sheets by Zhan + Dymo before the Sunday 2026-04-19 Al Jurf meeting (or Week 1 post-MOU).*

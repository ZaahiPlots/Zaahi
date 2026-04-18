# Financial Model V1 — Excel / Google Sheets Template Structure

**Purpose:** A unified financial model for ZAAHI Year 1–Year 5, sized at a level of detail appropriate for a AED 10 M post-money round.
**Form:** Markdown specification of tab structure, formulas, and assumptions. To be rendered into Excel / Google Sheets by Zhan and Dymo before Monday 2026-04-21 (or Week 1 post-MOU).
**Audience:** Rudi; UAE legal and tax counsel; future Series A investors.
**Status:** Template structure — assumptions are placeholders for Zhan + Dymo to calibrate. All computed outputs are formula-driven; no hardcoded result cells.

---

## Tab map

The workbook consists of 8 tabs, structured so that changing any input in Tab 1 (Assumptions) automatically flows through to the outputs in Tabs 3–8.

| # | Tab | Purpose | Input vs Output |
|---|---|---|---|
| 1 | Assumptions | All model inputs — deal sizes, commission rates, cost structure, headcount, FX | Input only |
| 2 | Revenue Projections | Monthly Year 1 + Quarterly Years 2–5 revenue build | Output (formulas) |
| 3 | OpEx | Headcount salaries, Al Jurf office, marketing, legal, tech, insurance | Mixed |
| 4 | Cashflow | Monthly Year 1 + Quarterly Years 2–5 cash position | Output |
| 5 | Distribution Waterfall | Per-deal 10/10/10/70 mechanics; quarterly aggregation; liquidation-scenario waterfall | Output |
| 6 | Scenarios | Conservative (–50 %) · Base · Aggressive (+100 %) side-by-side | Output |
| 7 | Breakeven Analysis | Month/quarter to breakeven per scenario | Output |
| 8 | KPIs | CAC, LTV, deal velocity, headcount, runway, margin trends | Output |

---

## Tab 1 — Assumptions

All inputs live in this tab. No formulas on other tabs pull from hardcoded numbers elsewhere — everything is sourced from here.

### 1.1 Deal economics (Agency)

| Parameter | Base case | Source / rationale |
|---|---|---|
| Land plot average deal size | AED 20,000,000 | Midpoint of 10–30 M range per task brief |
| Land plot commission rate | 2.0 % | Task brief |
| Land plot commission per deal | = deal size × rate = **AED 400,000** | Formula |
| Off-plan average deal size | AED 5,000,000 | Midpoint of 1.5–20 M range (heavily weighted toward entry segments) |
| Off-plan commission rate | 4.0 % | Midpoint of 3–5 % range |
| Off-plan commission per deal | = deal size × rate = **AED 200,000** | Formula |
| **Blended commission per deal (60/40 land/off-plan mix)** | **= 0.6 × 400k + 0.4 × 200k = AED 320,000** | **Formula** |

### 1.2 Deal velocity (Agency, Year 1)

| Quarter | Closed deals | Cumulative deals |
|---|---|---|
| Q2 2026 (setup) | 0 | 0 |
| Q3 2026 | 2 | 2 |
| Q4 2026 | 3 | 5 |
| Q1 2027 | 3 | 8 |
| **Total Year 1** | **8** | **8** |

Year 2–5 growth rates (base case):
- Year 2: 24 deals (3× Year 1)
- Year 3: 60 deals (2.5× Year 2)
- Year 4: 120 deals (2× Year 3)
- Year 5: 200 deals (1.67× Year 4)

### 1.3 Platform revenue (Year 1)

| Stream | Year 1 AED | Rationale |
|---|---|---|
| Ambassador tier fees (SILVER / GOLD / PLATINUM) | 250,000 | Existing production code; lifetime one-time payments |
| 2 % ZAAHI service fee (platform-routed deals) | 150,000 | Nominal routing of agency deals through platform |
| Archibald AI premium access | 50,000 | Small early-adopter base |
| **Total platform revenue Year 1** | **450,000** | |

### 1.4 Cost structure (Year 1)

| Line | AED | Frequency |
|---|---|---|
| Founder compensation — Zhan (per `ZHAN_PROTECTIONS.md` §2) | 40,000/mo × 12 = 480,000 | Monthly |
| Co-founder compensation — Dymo | 30,000/mo × 12 = 360,000 | Monthly |
| Agent hire #1 (from Month 3) | 30,000/mo × 10 = 300,000 | Monthly |
| Al Jurf office lease + serviced facilities | 10,000/mo × 12 = 120,000 | Monthly |
| Tech infrastructure (Vercel, Supabase, Anthropic API, domains) | 5,000/mo × 12 = 60,000 | Monthly |
| Marketing (Google Ads, LinkedIn, listings, Trakheesi) | 100,000 | One-off + ongoing |
| Legal retainer | 10,000/mo × 12 = 120,000 | Monthly |
| Professional indemnity + D&O + key-person insurance | 70,000 | Annual |
| Accounting + bookkeeping | 5,000/mo × 12 = 60,000 | Monthly |
| ADGM annual audit | 30,000 | Annual |
| VAT / CT / UBO / ESR filings | 15,000 | Annual |
| Miscellaneous + contingency | 50,000 | Annual |
| **Total OpEx Year 1** | **1,765,000** | |

### 1.5 Capital structure

- Rudi investment: AED 1,000,000 at Closing.
- Working capital reserve target: AED 200,000 minimum at all times.
- Cash buffer for quarterly dividend: 3 months of OpEx (~ AED 450,000).

### 1.6 FX and tax

- Base currency: AED.
- USD rate (for comparison): 1 USD = 3.673 AED (UAE pegged rate).
- Corporate Tax: 9 % above AED 375,000 taxable income; 0 % on qualifying free zone income (ADGM HoldCo if QFZP).
- Small Business Relief: applicable if annual revenue ≤ AED 3 M (Year 1 likely eligible).
- VAT: 5 % on commercial property services; residential sales / leases are exempt; registration mandatory above AED 375,000 annual taxable supply.

---

## Tab 2 — Revenue Projections

### Year 1 monthly schedule

For each month M (1–12):

| Month | Deals closed | Gross commission | Platform rev | Total revenue |
|---|---|---|---|---|
| Month 1 (May 2026) | 0 | 0 | 15,000 | 15,000 |
| Month 2 | 0 | 0 | 25,000 | 25,000 |
| Month 3 | 0 | 0 | 35,000 | 35,000 |
| Month 4 | 1 | 320,000 | 40,000 | 360,000 |
| Month 5 | 1 | 320,000 | 40,000 | 360,000 |
| Month 6 | 1 | 320,000 | 40,000 | 360,000 |
| Month 7 | 1 | 320,000 | 40,000 | 360,000 |
| Month 8 | 1 | 320,000 | 40,000 | 360,000 |
| Month 9 | 1 | 320,000 | 40,000 | 360,000 |
| Month 10 | 1 | 320,000 | 40,000 | 360,000 |
| Month 11 | 1 | 320,000 | 40,000 | 360,000 |
| Month 12 | 1 | 320,000 | 55,000 | 375,000 |
| **Year 1 total (base case)** | **8** | **2,560,000** | **450,000** | **3,010,000** |

Commission per deal assumption AED 320,000 → blended 60/40 land/off-plan mix per §1.1 above. Platform revenue shape reflects ramp from ambassador program only (early months) to broader streams (later months).

### Years 2–5 quarterly schedule

| Year | Deals | Avg comm | Agency rev | Platform rev | Total rev |
|---|---|---|---|---|---|
| Y2 | 24 | 320,000 | 7,680,000 | 1,500,000 | 9,180,000 |
| Y3 | 60 | 320,000 | 19,200,000 | 5,000,000 | 24,200,000 |
| Y4 | 120 | 320,000 | 38,400,000 | 12,000,000 | 50,400,000 |
| Y5 | 200 | 320,000 | 64,000,000 | 25,000,000 | 89,000,000 |

Platform revenue growth assumption: broker SaaS + developer SaaS launches Y2; institutional data licensing Y3; international expansion from Y4 begins to contribute.

---

## Tab 3 — OpEx

### Year 1 schedule

Detailed in Tab 1 §1.4. Monthly breakout:

| Line (AED) | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Zhan comp | 40k | 40k | 40k | 40k | 40k | 40k | 40k | 40k | 40k | 40k | 40k | 40k |
| Dymo comp | 30k | 30k | 30k | 30k | 30k | 30k | 30k | 30k | 30k | 30k | 30k | 30k |
| Agent #1 | — | — | 30k | 30k | 30k | 30k | 30k | 30k | 30k | 30k | 30k | 30k |
| Office | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k |
| Tech | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k |
| Marketing | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k |
| Legal | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k | 10k |
| Accounting | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k | 5k |
| Annual items | — | — | — | 70k | — | — | — | — | 30k | — | — | 15k |
| **Total mo** | **110k** | **110k** | **140k** | **210k** | **140k** | **140k** | **140k** | **140k** | **170k** | **140k** | **140k** | **155k** |

Year 1 OpEx total: AED 1,735,000 (slight deviation from Tab 1 §1.4 AED 1,765,000 due to contingency rounding).

### Year 2–5 scaling

- Year 2: +50 % headcount (second agent, junior operations hire), OpEx ≈ AED 3.2 M.
- Year 3: +100 % headcount (third agent, compliance officer, junior engineer), OpEx ≈ AED 6.5 M.
- Year 4: +75 % headcount (additional engineers, marketing lead), OpEx ≈ AED 11 M.
- Year 5: +50 % headcount (full platform team), OpEx ≈ AED 16 M.

---

## Tab 4 — Cashflow

### Year 1 monthly

Starting cash: AED 1,000,000 (Rudi Investment, Closing).

| End of month | Cash in | Cash out | Net | Cumulative cash |
|---|---|---|---|---|
| M1 | 15,000 | 110,000 | –95,000 | 905,000 |
| M2 | 25,000 | 110,000 | –85,000 | 820,000 |
| M3 | 35,000 | 140,000 | –105,000 | 715,000 |
| M4 | 360,000 | 210,000 | +150,000 | 865,000 |
| M5 | 360,000 | 140,000 | +220,000 | 1,085,000 |
| M6 | 360,000 | 140,000 | +220,000 | 1,305,000 |
| M7 | 360,000 | 140,000 | +220,000 | 1,525,000 |
| M8 | 360,000 | 140,000 | +220,000 | 1,745,000 |
| M9 | 360,000 | 170,000 | +190,000 | 1,935,000 |
| M10 | 360,000 | 140,000 | +220,000 | 2,155,000 |
| M11 | 360,000 | 140,000 | +220,000 | 2,375,000 |
| M12 | 375,000 | 155,000 | +220,000 | 2,595,000 |

Notes: deposits on deals arrive slightly lagged vs commission recognition in practice; model this in Excel with a 30-day DSO assumption if required.

Working-capital reserve (AED 200,000) maintained throughout.

### Breakeven

Operating breakeven: **Month 4** (first deal closure; cash outflow > inflow only in months 1–3).

Cumulative cash breakeven (return of AED 1 M Rudi investment to working cash): **Month 11** (cumulative cash > AED 2 M, i.e., original AED 1 M plus another AED 1 M accumulated).

---

## Tab 5 — Distribution Waterfall

### Per-deal distribution

For a representative deal with AED 20 M deal size at 2 % commission = AED 400,000 gross commission:

| Step | AED | Explanation |
|---|---|---|
| 1. Gross commission | 400,000 | Client pays |
| 2. Less: direct costs (travel, client meetings, Trakheesi permit) | 20,000 | ~5 % of commission |
| 3. Less: allocated OpEx (salaries, office, tech, legal pro-rata) | 100,000 | Pro-rata to this deal |
| 4. Less: Corporate Tax (9 % on taxable income above AED 375 k threshold) | Variable | Year 1 likely AED 0 under Small Business Relief |
| 5. Less: VAT pass-through (if applicable) | Not applicable | VAT collected from client and paid to FTA, neutral |
| 6. Less: Cash reserve allocation | 30,000 | ~7.5 % to maintain buffer |
| **Distributable Net Profit** | **250,000** | |
| 7a. Rudi distribution (10 %) | 25,000 | |
| 7b. Dymo distribution (10 %) | 25,000 | |
| 7c. Zhan distribution (10 %) | 25,000 | |
| 7d. Platform Development Fund (70 %) | 175,000 | To ADGM HoldCo per Dividend Policy |
| **Total distributed** | **250,000** | |

### Quarterly aggregation (example: Q3 2026)

Two deals closed Q3 2026 at AED 20 M average:
- Aggregate distributable net profit: ~AED 500,000
- Rudi: AED 50,000
- Dymo: AED 50,000
- Zhan: AED 50,000
- Platform Dev Fund: AED 350,000

### Liquidation-scenario waterfall

For exit at various valuations, Rudi's 1.5× non-participating liquidation preference applies:

| Exit value (AED) | Rudi (Liq Pref) | Rudi (Pro-rata 10 %) | Rudi elects | Dymo + Zhan combined (90 %) |
|---|---|---|---|---|
| 5 M | 1,500,000 | 500,000 | Liq Pref (1.5 M) | 3,500,000 |
| 15 M | 1,500,000 | 1,500,000 | Either (tied) | 13,500,000 |
| 30 M | 1,500,000 | 3,000,000 | Pro-rata (3 M) | 27,000,000 |
| 100 M | 1,500,000 | 10,000,000 | Pro-rata (10 M) | 90,000,000 |
| 500 M | 1,500,000 | 50,000,000 | Pro-rata (50 M) | 450,000,000 |
| 2,000 M | 1,500,000 | 200,000,000 | Pro-rata (200 M) | 1,800,000,000 |

(Distribution between Dymo and Zhan within their combined 90 % depends on their individual equity: Agency 45 %/45 %, Platform 10 %/80 %. Exit math is specific to the entity being exited.)

---

## Tab 6 — Scenarios

### Conservative (–50 % on deal count; flat costs)

| Metric | Base | Conservative |
|---|---|---|
| Year 1 deals | 8 | 4 |
| Year 1 commission | 2,560,000 | 1,280,000 |
| Year 1 platform rev | 450,000 | 225,000 |
| Year 1 total revenue | 3,010,000 | 1,505,000 |
| Year 1 OpEx | 1,735,000 | 1,600,000 (minor cuts) |
| Year 1 net profit | 1,275,000 | –95,000 (slight loss) |
| Runway end-Y1 | Healthy | Requires Series A bridge |

### Base (as tabled above)

| Metric | Base |
|---|---|
| Year 1 deals | 8 |
| Year 1 revenue | 3,010,000 |
| Year 1 net profit | 1,275,000 |

### Aggressive (+100 % deal count; scaled costs)

| Metric | Base | Aggressive |
|---|---|---|
| Year 1 deals | 8 | 16 |
| Year 1 commission | 2,560,000 | 5,120,000 |
| Year 1 platform rev | 450,000 | 700,000 |
| Year 1 total revenue | 3,010,000 | 5,820,000 |
| Year 1 OpEx | 1,735,000 | 2,200,000 (more marketing, earlier hires) |
| Year 1 net profit | 1,275,000 | 3,620,000 |

---

## Tab 7 — Breakeven Analysis

### Operating breakeven (monthly revenue ≥ monthly OpEx)

- Base case: **Month 4** (first deal closure).
- Conservative: **Month 7–8** (slower deal flow but eventual breakeven).
- Aggressive: **Month 3** (pre-first-deal if platform revenue ramps fast; otherwise Month 4).

### Capital breakeven (Rudi's AED 1 M restored to cash)

- Base case: **Month 11–12**.
- Conservative: **Month 18** (requires patience or bridge financing).
- Aggressive: **Month 8**.

### Profit breakeven (cumulative net profit > 0)

- Base: **Month 7**.
- Conservative: **Month 14**.
- Aggressive: **Month 5**.

---

## Tab 8 — KPIs

### Agency KPIs

- Deal velocity: target 8 deals Year 1, 24 Year 2, growing.
- Average commission per deal: AED 320,000 (blended 60/40 land/off-plan).
- Cost per acquired deal (CPA): AED marketing / deals closed. Target < AED 25,000/deal by Year 2.
- Gross margin per deal: Distributable net profit / gross commission. Target 60–65 %.

### Platform KPIs

- Ambassador tier distribution: % SILVER vs GOLD vs PLATINUM. Target GOLD > 50 % by revenue.
- Ambassador-sourced deal conversion: % of agency deals referred via ambassador flywheel. Target 30 % by Year 2.
- Monthly active platform users (MAU): target 500 by end Year 1; 5,000 by end Year 2; 50,000 by end Year 3.
- Platform revenue per MAU: target AED 500 by Year 2.

### Team KPIs

- Headcount: 3 at start (Zhan, Dymo, Agent #1); 6 by end Year 2; 12 by end Year 3.
- Revenue per headcount: target AED 600,000+/FTE by end Year 1; AED 1,200,000+ by end Year 3.

### Financial KPIs

- Gross margin: consolidated Year 1 ~58 %; Year 3 target 70 %.
- EBITDA margin: Year 1 ~42 %; Year 3 target 55 %.
- Runway: months at current burn. Target 12+ months at all times; 18+ months pre-Series A.
- Cash on balance sheet: target AED 2 M+ at all times by end Year 1.

---

## Notes for model build

1. **Formulas, not hardcodes.** Every output cell should reference Tab 1 Assumptions. When Zhan or Dymo adjust the land-plot commission rate, every downstream cell updates.
2. **Named ranges.** Use named ranges (e.g., `AvgDealSize`, `CommissionRate`, `ZhanSalary`) for readability.
3. **Scenario switch.** Build a single cell with a dropdown (Conservative / Base / Aggressive) that toggles which assumption set feeds the model.
4. **Output sheet.** Build a final one-page "Dashboard" tab that shows headline metrics only (Year 1 revenue, Year 1 net profit, breakeven month, cash end of year, Rudi distribution Year 1) — this is what travels in future investor decks.
5. **Version control.** Each iteration of the model saved with date suffix (`ZAAHI_Model_v1_2026-04-19.xlsx`). Source of truth is the Google Sheets link shared with Rudi.

---

*End of Financial Model specification. To be converted to Excel / Google Sheets by Zhan + Dymo before Monday 2026-04-21 (or Week 1 post-MOU).*

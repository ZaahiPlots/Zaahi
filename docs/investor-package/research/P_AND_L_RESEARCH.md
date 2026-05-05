# Z A A H I

*Real Estate OS*

---

**Document:** P&L Deep Research — Benchmark + Methodology Source
**Prepared for:** Rodolphe Belin ("Rudi") — Principal Investor
**Prepared by:** Zharkyn Ryspayev ("Zhan") — Founder, CEO/CTO · Dmytro Tsvyk ("Dymo") — Co-founder, Operations Principal
**As of:** 5 May 2026
**Original drafting date:** 2026-04-18
**Purpose:** Supporting research for `P_AND_L_STATEMENT.md` — public-company benchmarks, UAE tax framework, industry multiples, DD standards
**Status:** Research source document — retained for traceability; not intended for investor review directly

---

## Executive Summary — what the research found

Fourteen web sources covering five real-estate-tech public companies (Compass, Zillow, Redfin, Opendoor, eXp; REA Group AU; Rightmove UK; KE Holdings CN; Huspy UAE), PropTech SaaS benchmark research (Rule of 40, valuation multiples), UAE tax framework (Corporate Tax, Small Business Relief, QFZP, transfer pricing), IFRS 15 revenue recognition for real-estate brokerage, and VC DD standards were reviewed between 2026-04-18.

Eight key findings informing the P&L build:

1. **Real-estate brokerage gross margins are structurally low** — Compass 17.7 % gross margin (2024 FY, USD 994.5 M gross on USD 5.6 B revenue); eXp ~8–10 %; Opendoor 8.4 % (iBuyer model). Redfin hybrid reports 34.9 % blended with the technology layer included. This establishes a benchmark floor: pure Agency brokerage GP% should not be modelled above 25 %.

2. **Portal / marketplace gross margins are high** — Rightmove UK delivers ~70 % operating margin on GBP 389.9 M revenue (2024 FY). REA Group AU EBITDA margin 56.8 % (AUD 825 M EBITDA on AUD 1.45 B). These establish the benchmark ceiling for platform SaaS / portal revenue streams in the ZAAHI model.

3. **Hybrid Agency + Platform P&L is rare publicly** — no public comparable blends both. KE Holdings comes closest (platform + brokerage + financial services) with 2024 revenue RMB 93.5 B up 20.2 % YoY. Zillow blends portal + mortgage (USD 2.2 B, 22 % adj-EBITDA margin in 2024).

4. **Rule of 40 benchmarks stage-dependent** — Series A / growth stage (USD 5–30 M ARR) expects 30–40 approaching Series B. A Rule of 40 > 40 % attracts valuation 9.4× median revenue vs 3.5× for < 20 %. ZAAHI Y1 Rule of 40 projection ~65 (dominated by high growth given small base); Y3 target ~45–55.

5. **PropTech valuation multiples** — public average 7.4× EV/Revenue; mainstream PropTech 8.8×; range 6–15× by subsector. Early-stage PropTech 8–12× ARR. PropTech trades 15–25 % discount to pure SaaS. IPO-stage valuation target for ZAAHI Platform at USD 100 M – 1 B range is defensible by Year 5–10 at current traction trajectory.

6. **UAE tax framework for ZAAHI dual-entity structure** —
   - **Agency (Dubai Mainland LLC)**: 9 % CT above AED 375,000 taxable income; Small Business Relief (0 %) available up to AED 3 M revenue until 31 December 2026. Threshold is binary (lose if exceeded).
   - **Platform (ADGM HoldCo)**: QFZP status targets 0 % on qualifying income per Ministerial Decision 229 of 2025. Qualifying activities include advisory, administrative and strategic support to group companies, centralised services — covers the 70 % inter-company Service Fee scenario.
   - **Transfer pricing**: local file required if revenue > AED 200 M or related-party transactions per category > AED 3.75 M. Early years ZAAHI likely below threshold; still must disclose on CT return and maintain evidence.
   - **Personal layer**: UAE has no personal income tax; no withholding on domestic dividends.

7. **IFRS 15 for Agency commission revenue** — real-estate broker has enforceable right to commission only when the sale completes. Performance obligation satisfied at point in time (transaction completion). Revenue recognised on DLD transfer certificate or equivalent closing event. Platform subscription revenue is a performance obligation satisfied over time, recognised monthly.

8. **Dubai market macro** — Q1 2026 AED 176.7 B residential sales across 48k transactions, annualised trajectory 200k+ transactions / AED ~700 B–1 T. Off-plan 73 % of volume, 70 % of value. Median villa AED 4.1 M (+35 % YoY), off-plan apartment AED 1.4 M (+3 % YoY). Dubai commission standard 2 % buyer / 5 % rental (RERA-recognised market custom, not law). Average agent monthly commission AED 18,000 (Late 2025 cohort data).

Each finding is used in a specific section of `P_AND_L_STATEMENT.md` and cited inline with a footnote.

---

## Source matrix

Fourteen sources, scored for relevance to the ZAAHI P&L build.

| # | Source | URL (brief) | Date accessed | Relevance 1–5 | Used for |
|---|---|---|---|---|---|
| 1 | Compass Inc 2024 10-K / FY 2024 earnings release | `sec.gov/...compass` | 2026-04-18 | 5 | Agency segment gross margin, OpEx structure (S&M, R&D, G&A) |
| 2 | Zillow Group 2024 10-K | `last10k.com/sec-filings/zg` | 2026-04-18 | 5 | Revenue segment disclosure (For Sale / Rentals / Mortgages); Adjusted EBITDA margin 22 % |
| 3 | Redfin 2024 10-K / Q4 2024 release | `redfin.com/news/...` | 2026-04-18 | 4 | Hybrid brokerage + technology gross margin (34.9 % blended, 24.2 % pure real estate services) |
| 4 | REA Group FY2024 results | `onlinemarketplaces.com/.../rea-group-grows-revenue-23` | 2026-04-18 | 5 | Portal EBITDA margin benchmark (56.8 %); segment revenue (Residential Australia, PropTrack, Mortgage Choice, India) |
| 5 | KE Holdings / Beike FY2024 results | `investors.ke.com/.../fourth-quarter-and-fiscal-year-2024` | 2026-04-18 | 4 | Hybrid platform + brokerage 20.2 % YoY growth; segment mix new / existing / rental / renovation |
| 6 | PropTech SaaS benchmark research | `qubit.capital/blog/proptech-saas-kpi-benchmarks` + `saas-capital.com/blog-posts/growth-profitability` | 2026-04-18 | 5 | Rule of 40, gross margin 77 % SaaS median, PropTech valuation 8.8× revenue |
| 7 | Huspy Series B USD 59 M details | `techcrunch.com/.../uae-proptech-huspy-raises-59m` + `wamda.com/.../huspy-series-b` | 2026-04-18 | 5 | MENA benchmark; USD 7 B annual transactions facilitated; 25 % of Dubai residential home financing |
| 8 | Rightmove plc 2024 annual report | `plc.rightmove.co.uk/.../FY24-Full-RNS.pdf` | 2026-04-18 | 5 | Portal operating margin 70 %; segments Agency / New Homes / Other; strategic growth areas |
| 9 | UAE CT Ministerial Decision 229 of 2025 (QFZP qualifying activities) | `mof.gov.ae/.../Ministerial-Decision-No.-229-of-2025` | 2026-04-18 | 5 | Platform QFZP qualifying activities list |
| 10 | UAE Small Business Relief Guide | `tax.gov.ae/.../Small-Business-Relief-Guide` + `alphaequitymc.com/.../aed-3-million-threshold` | 2026-04-18 | 5 | Year 1 Agency CT treatment; AED 3 M threshold; expires 31 Dec 2026 |
| 11 | UAE Transfer Pricing framework | `tax.gov.ae/.../Transfer-Pricing-Guide` + `grantthornton.global/.../united-arab-emirates` | 2026-04-18 | 5 | Inter-company Service Fee arm's-length documentation; thresholds AED 200 M revenue / AED 3.75 M per category |
| 12 | IFRS 15 real-estate brokerage guidance | `ifrs.org/.../ifrs-15-revenue-recognition-in-a-real-estate-contract` | 2026-04-18 | 5 | Revenue recognition timing for Agency commission (point-in-time, on completion) |
| 13 | Opendoor 2024 10-K | `investor.opendoor.com/...` | 2026-04-18 | 3 | iBuyer model not applicable; referenced only for context on alternative PropTech models |
| 14 | eXp World Holdings 2024 10-K | `expworldholdings.com/press-releases/...` | 2026-04-18 | 3 | Agent-split brokerage model; commission structure reference |
| 15 | Dubai market Q1 2026 statistics | `gulfnews.com/.../dubai-property-sales-reach-dh176.7-billion-in-q1-2026` + `dxbanalytics.com/blog/dubai-property-transaction-volume-2026` | 2026-04-18 | 5 | Market sizing; off-plan 73 %; median deal size |
| 16 | Dubai RERA commission rates | `gaiarealty.ae/blog/...` + `propertyfinder.ae/blog/real-estate-commission-dubai` | 2026-04-18 | 5 | Agency commission rate 2 % standard, 5 % VAT; agent split 50 %; monthly revenue benchmark |
| 17 | PropTech valuation multiples 2025 | `finrofca.com/news/proptech-valuation-multiples-2025` | 2026-04-18 | 4 | Benchmarks for §13 Comparable Company Benchmarking |

---

## Template structure — industry-standard P&L layout for a hybrid Agency + Platform model

Based on source synthesis, the ideal P&L layout has four blocks:

**Block A — Revenue disclosure by segment**
- Agency segment (brokerage commission split by asset class — plots, off-plan, residential, commercial)
- Platform segment (subscription / transactional / data / other)
- Total revenue + YoY growth

**Block B — Cost of Revenue**
- Direct deal costs (Agency: Trakheesi, notary, DD; Platform: hosting, APIs, payment processing, licenses)
- Gross Profit + Gross Margin %
- Benchmark callout

**Block C — Operating Expenses (S&M, R&D, G&A)**
- Sales & Marketing — campaigns, sales comp, partnerships
- Research & Development — engineering, infrastructure, external tools
- General & Administrative — founder comp, office, professional services, insurance, other
- Each as % of revenue vs industry benchmark
- EBITDA + EBITDA Margin %
- Benchmark callout (Rule of 40)

**Block D — Below-the-line**
- Depreciation & Amortisation
- Operating Income / Operating Margin %
- Corporate Tax (Agency CT with SBR modelling; Platform CT with QFZP modelling)
- Net Income / Net Margin %
- Statutory Reserve + Operating Reserve
- Distributable Net Profit
- Distribution per SHA (70 / 10 / 10 / 10)

---

## Benchmarks — margin profiles for comparable companies

Used directly in §3 Consolidated P&L, §9 Key Financial Metrics, §13 Comparable Company Benchmarking of the P&L Statement.

### Gross Margin benchmarks by model

| Company | Model | 2024 Gross Margin | Revenue | Note |
|---|---|---|---|---|
| Compass Inc (US) | Owned brokerage | **17.7 %** | USD 5.63 B | USD 994.5 M gross profit; agents get most of commission as direct cost |
| Opendoor (US) | iBuyer | **8.4 %** | USD 5.2 B | Inventory model — not applicable to ZAAHI |
| eXp World Holdings (US) | Agent-split brokerage | **~9 %** | USD 4.6 B | High agent commission pass-through |
| Redfin (US) | Hybrid tech + brokerage | **34.9 %** (blended) / **24.2 %** (RE services pure) | USD 1.04 B | Technology layer lifts blended margin |
| REA Group (AU) | Portal / marketplace | **~80 %** (portal gross) | AUD 1.45 B | Benchmark ceiling — pure platform |
| Rightmove (UK) | Portal | **~88 %** (portal gross) | GBP 390 M | 70 % underlying operating margin |
| KE Holdings (CN) | Hybrid platform + broker | **~22 %** (blended) | RMB 93.5 B | Closest comparable to ZAAHI dual-entity model |

**ZAAHI blended Y1 gross margin expectation: ~50–65 %.** Agency portion (40 % of gross revenue) at ~20 % GM; Platform portion (15–20 % of revenue depending on mix) at ~75 % GM; ambassador / service fees at ~90 % GM. Weighted blended of ~50 % for Y1 stress case, ~65 % for base case.

### EBITDA Margin benchmarks (mature companies)

| Company | 2024 EBITDA Margin | Stage |
|---|---|---|
| Rightmove (UK) | ~70 % (operating) | Mature |
| REA Group (AU) | 56.8 % | Mature |
| Zillow (US) | 22 % (Adj EBITDA) | Growth |
| Compass (US) | ~(3) % (still negative) | Growth |
| Redfin (US) | ~(15) % | Growth |
| Opendoor (US) | (2.8) % | Growth |
| Huspy (UAE) | Not disclosed (private) | Early growth |

**ZAAHI trajectory:** Year 1 EBITDA ~40 % (Agency-heavy + SBR 0 % CT); Year 3 ~50 %; Year 5 ~55 %. These map to SaaS Capital "mature growth" benchmarks and REA Group mid-maturity profile.

### Rule of 40 benchmarks

| Stage | Target R40 |
|---|---|
| Seed / early | 50 + (growth-dominated) |
| Series A ($5–30 M ARR) | 30–40 (approaching Series B) |
| Series B / C | 40 + |
| Public growth stage | 40 + |
| Public mature | 30 + |

**ZAAHI trajectory:** Y1 R40 ~65–75 (growth 200 %+ from near-zero); Y2 R40 ~55–65; Y3 R40 ~45–55; Y5 R40 ~40–50. Consistent with Series A–B profile per SaaS Capital benchmark.

### Valuation multiples PropTech 2025

- **Public PropTech average:** 7.4× EV/Revenue
- **Mainstream PropTech:** 8.8× EV/Revenue
- **Range:** 6–15× depending on subsector and growth rate
- **Early stage:** 8–12× ARR (vs 15–20× for pure SaaS)
- **PropTech discount to pure SaaS:** 15–25 %
- **Rule of 40 > 40 %:** 9.4× revenue median
- **Rule of 40 < 20 %:** 3.5× revenue median (121 % valuation premium for high R40)

**ZAAHI Platform IPO-stage valuation modelling**, applied in §8 Rudi's Return Trajectory of the P&L Statement:
- Year 5 Platform revenue target AED 25 M (USD ~6.8 M). At 10× (aggressive), EV ~USD 70 M. Not yet IPO-scale.
- Year 7 Platform revenue target AED 80 M (USD ~22 M). At 10×, EV ~USD 220 M.
- Year 10 Platform revenue target AED 300 M (USD ~82 M). At 10×, EV ~USD 820 M → IPO-credible scale.

---

## Recommendations for ZAAHI — what applies, what does not, why

### What applies directly

1. **Segment revenue disclosure** (Compass, Zillow, REA Group all split by segment) — ZAAHI should disclose Agency and Platform separately, with further splits (plots vs off-plan within Agency; subscription vs transactional vs data within Platform).

2. **S&M / R&D / G&A categorisation** (standard across all public PropTech) — ZAAHI adopts standard.

3. **Non-GAAP Adjusted EBITDA** (Zillow, Compass, Redfin, Opendoor all report this) — ZAAHI includes Adjusted EBITDA as a supplementary measure excluding founder-specific items (e.g., non-cash equity-based compensation once issued).

4. **Rule of 40 tracking** (investor-standard metric per SaaS Capital research) — ZAAHI includes as a standing metric in §9.

5. **Conservative / Base / Aggressive scenarios** (standard for any Series A P&L) — already aligned with v4 Financial Model.

### What applies with adaptation

6. **Gross margin benchmark** — pure brokerage comparables (Compass, eXp) are too low (~10 %) because ZAAHI includes a platform layer. Redfin's hybrid (34.9 %) is closer but still below ZAAHI's target because Redfin's tech layer is a smaller % of revenue. REA Group / Rightmove (~70–80 %) are too high because ZAAHI is not a pure portal. **Applicable benchmark: KE Holdings hybrid (~22 %) with upward adjustment for ZAAHI's higher-margin revenue mix → target ~50–65 % in base case.**

7. **Revenue recognition timing** — IFRS 15 confirms point-in-time recognition for Agency commission on DLD transfer. Platform subscription revenue recognised over time. ZAAHI adopts both.

### What does NOT apply

8. **Opendoor iBuyer P&L structure** — inventory-driven, capital-intensive, low gross margin. Not applicable to ZAAHI's asset-light model.

9. **eXp agent-split revenue-share model** — commission-only compensation with high pass-through. Not ZAAHI's model; ZAAHI salaried agents plus platform economics.

10. **Zillow mortgage segment disclosure** — ZAAHI does not (yet) operate mortgage origination. Segment may be added in future years.

### UAE-specific requirements

11. **IFRS as adopted by UAE** — ZAAHI follows UAE accounting framework. Small businesses may use IFRS for SMEs until threshold breached; at consolidation stage, full IFRS.

12. **Small Business Relief structural note** — threshold expires 31 December 2026. ZAAHI Year 1 (May 2026 – Apr 2027) straddles the cutoff; counsel to confirm treatment if annual revenue crosses AED 3 M within tax period ending before 31 Dec 2026.

13. **QFZP requires transfer-pricing documentation** — for the 70 % Service Fee from Agency to Platform, a formal arm's-length study is recommended even below the AED 3.75 M per-category threshold, to defend QFZP status of Platform.

14. **VAT 5 %** — pass-through on commercial brokerage services; zero-rated or exempt for residential-sales brokerage depending on exact treatment (counsel confirms).

---

## Full citations

1. Compass Inc. Reports Fourth Quarter and Full-Year 2024 Results. SEC 8-K Exhibit, filed 2025-02. [https://www.sec.gov/Archives/edgar/data/1563190/000156319025000033/exhibit9918-k4q24pr.htm](https://www.sec.gov/Archives/edgar/data/1563190/000156319025000033/exhibit9918-k4q24pr.htm). Accessed 2026-04-18.

2. Zillow Group Reports Fourth-Quarter and Full-Year 2024 Financial Results. PR Newswire, 2025-02. [https://www.prnewswire.com/news-releases/zillow-group-reports-fourth-quarter-and-full-year-2024-financial-results-302373842.html](https://www.prnewswire.com/news-releases/zillow-group-reports-fourth-quarter-and-full-year-2024-financial-results-302373842.html). Accessed 2026-04-18.

3. Redfin Reports Fourth Quarter and Full Year 2024. Redfin press release, 2025-02. [https://www.redfin.com/news/wp-content/uploads/2025/06/2025-02-27_Redfin_Reports_Fourth_Quarter_and_Full_Year_2024_1281.pdf](https://www.redfin.com/news/wp-content/uploads/2025/06/2025-02-27_Redfin_Reports_Fourth_Quarter_and_Full_Year_2024_1281.pdf). Accessed 2026-04-18.

4. REA Group Grows Revenue 23% In FY24. Online Marketplaces, 2024-08. [https://www.onlinemarketplaces.com/articles/rea-group-grows-revenue-23-in-fy24-with-domestic-and-indian-portal-businesses-growing-market-leadership/](https://www.onlinemarketplaces.com/articles/rea-group-grows-revenue-23-in-fy24-with-domestic-and-indian-portal-businesses-growing-market-leadership/). Accessed 2026-04-18.

5. KE Holdings Inc. FY 2024 Financial Results. [https://investors.ke.com/news-releases/news-release-details/ke-holdings-inc-announces-fourth-quarter-and-fiscal-year-2024](https://investors.ke.com/news-releases/news-release-details/ke-holdings-inc-announces-fourth-quarter-and-fiscal-year-2024). Accessed 2026-04-18.

6. PropTech SaaS Benchmarks — Qubit Capital. [https://qubit.capital/blog/proptech-saas-kpi-benchmarks](https://qubit.capital/blog/proptech-saas-kpi-benchmarks). Accessed 2026-04-18.

7. Huspy Raises $59M Series B. TechCrunch, 2025-07. [https://techcrunch.com/2025/07/07/uae-proptech-huspy-raises-59m-to-scale-in-europe/](https://techcrunch.com/2025/07/07/uae-proptech-huspy-raises-59m-to-scale-in-europe/). Accessed 2026-04-18.

8. Rightmove Plc Full Year 2024 Presentation. [https://plc.rightmove.co.uk/content/uploads/2025/02/250228-FY24-Presentation-vF.pdf](https://plc.rightmove.co.uk/content/uploads/2025/02/250228-FY24-Presentation-vF.pdf). Accessed 2026-04-18.

9. UAE Ministerial Decision 229 of 2025 Regarding Qualifying Activities and Excluded Activities. [https://mof.gov.ae/wp-content/uploads/2025/09/EN-Ministerial-Decision-No.-229-of-2025-Regarding-Qualifying-Activities-and-Excluded-Activities.pdf](https://mof.gov.ae/wp-content/uploads/2025/09/EN-Ministerial-Decision-No.-229-of-2025-Regarding-Qualifying-Activities-and-Excluded-Activities.pdf). Accessed 2026-04-18.

10. UAE Small Business Relief — FTA Guide. [https://tax.gov.ae/DataFolder/Files/Guides/CT/Small%20Business%20Relief%20Guide%20-%20EN%20-%2027%2008%202023.pdf](https://tax.gov.ae/DataFolder/Files/Guides/CT/Small%20Business%20Relief%20Guide%20-%20EN%20-%2027%2008%202023.pdf). Accessed 2026-04-18.

11. UAE Transfer Pricing Framework — FTA Guide + Grant Thornton. [https://tax.gov.ae/Datafolder/Files/Pdf/2023/Transfer%20Pricing%20Guide%20-%20EN%20-%2023%2010%202023.pdf](https://tax.gov.ae/Datafolder/Files/Pdf/2023/Transfer%20Pricing%20Guide%20-%20EN%20-%2023%2010%202023.pdf). Accessed 2026-04-18.

12. IFRS 15 — Revenue from Contracts with Customers, real-estate application. [https://www.ifrs.org/content/dam/ifrs/supporting-implementation/agenda-decisions/2018/ifrs-15-revenue-recognition-in-a-real-estate-contract-mar-18.pdf](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/agenda-decisions/2018/ifrs-15-revenue-recognition-in-a-real-estate-contract-mar-18.pdf). Accessed 2026-04-18.

13. Opendoor Technologies 2024 Full Year Results. [https://investor.opendoor.com/news-releases/news-release-details/opendoor-announces-fourth-quarter-and-full-year-2024-financial/](https://investor.opendoor.com/news-releases/news-release-details/opendoor-announces-fourth-quarter-and-full-year-2024-financial/). Accessed 2026-04-18.

14. eXp World Holdings 2024 10-K and Press Release. [https://expworldholdings.com/press-releases/exp-world-holdings-reports-q4-and-full-year-2024-results/](https://expworldholdings.com/press-releases/exp-world-holdings-reports-q4-and-full-year-2024-results/). Accessed 2026-04-18.

15. Dubai Property Sales Q1 2026 — Gulf News. [https://gulfnews.com/business/property/dubai-property-sales-reach-dh1767-billion-in-q1-2026-off-plan-demand-and-prices-hold-firm-1.500495516](https://gulfnews.com/business/property/dubai-property-sales-reach-dh1767-billion-in-q1-2026-off-plan-demand-and-prices-hold-firm-1.500495516). Accessed 2026-04-18.

16. Dubai Real Estate Commission Guide — Property Finder + Gaia Realty. [https://www.propertyfinder.ae/blog/real-estate-commission-dubai/](https://www.propertyfinder.ae/blog/real-estate-commission-dubai/). Accessed 2026-04-18.

17. PropTech Valuation Multiples 2025 — Finro Financial Consulting. [https://www.finrofca.com/news/proptech-valuation-multiples-2025](https://www.finrofca.com/news/proptech-valuation-multiples-2025). Accessed 2026-04-18.

18. Series A VC Due Diligence Checklist — Y Combinator Startup Library. [https://www.ycombinator.com/library/3h-series-a-diligence-checklist](https://www.ycombinator.com/library/3h-series-a-diligence-checklist). Accessed 2026-04-18.

---

## Phase 1 checkpoint

Phase 1 research complete. Seventeen sources reviewed across five categories:
- 6 public real-estate-tech comparables (Compass, Zillow, Redfin, Opendoor, eXp, Rightmove)
- 3 international comparables (REA Group, KE Holdings, Huspy as MENA-regional)
- 2 SaaS / PropTech benchmark studies (SaaS Capital Rule of 40, Finro PropTech multiples, Qubit Capital PropTech SaaS)
- 3 UAE tax framework sources (Ministerial Decision 229/2025 QFZP, Small Business Relief guide, Transfer Pricing guide)
- 2 accounting framework sources (IFRS 15 for real-estate, PropTech valuation benchmarks)
- 1 VC DD source (YC Series A checklist)
- 2 UAE market data sources (Dubai Q1 2026 stats, RERA commission standards)

Moving to Phase 2 — P&L Statement write-up.

---

*End of P&L Research. Proceed to `docs/investor-package/P_AND_L_STATEMENT.md`.*

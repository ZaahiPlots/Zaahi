# Feasibility Calculator v6.0 — Overview

**Status:** SPEC · Phase A (research-only, no production code)
**Branch:** `research/feasibility-v6-spec` (forked from `main` @ `165b8ca`)
**As of:** 5 May 2026
**Predecessor:** v5.0 production at `src/app/parcels/map/FeasibilityCalculator.tsx` (1001 lines) + `src/lib/feasibility.ts` (500 lines)
**Visual contract:** `docs/specs/phase-1/FEASIBILITY_STYLE_GUIDE.md` (569 lines, ratified 2026-04-22)
**Founder ratifier:** Zhan (17 years RE) — solo Phase A; CBRE/JLL/Knight Frank consultants NOT engaged
**Classification:** CONFIDENTIAL — internal

> **Note to Phase B:** every formula, every default value, every cost line in this spec set is **provisional** until Zhan signs off. Items that lack a public source citation are explicitly tagged `FOUNDER RATIFY` and listed in the §99 delivery summary of each file. Do not implement against this spec until the founder ratification pass.

---

## §1 Vision

**v6.0 is the calculator that lets every UAE real-estate participant — owner, investor, broker, architect, developer — model any plot-level scheme to material-line resolution, in less time than it takes to read a brochure, with every default value sourced and every override visible in real-time against market base.** It absorbs v5.0's three-mode (Build-to-Sell · Build-to-Rent · Joint Venture) production code and extends it into eight specialised land-use engines, a quarterly-refreshed construction-cost database, and a fullscreen single-mode UX where transparency replaces wizardry. Public surface at `zaahi.io/feasibility` is the viral channel; Cloudflare anti-bot + 90-day data lag + Archibald AI personalised advice form a three-tier moat against scraping.

---

## §2 v5.0 → v6.0 delta

| Layer | v5.0 (production today) | v6.0 (this spec) | Status |
|---|---|---|---|
| Modes | 3 tabs (BtS · BtR · JV) | **Same 3 modes** + 8 land-use engines (Residential, Commercial, Hospitality, Industrial, Mixed-Use, Infrastructure, Off-Plan, Land-Hold) → engine selects pre-fill set + secondary metrics | EXTEND |
| UX surface | SidePanel-embedded only | SidePanel **+** fullscreen overlay (toggle-able, all sections expanded simultaneously, state preserved) | EXTEND |
| Default values | Hardcoded per land use (`mapCategoryToDefaults`, lib lines 208-223) | Database-driven, pulled from `currentQuarter` or `laggedPublic` table by district + land use + project size | EXTEND |
| Cost granularity | 4 lines (construction · brand · consultancy · infrastructure psf BUA) + contingency | **Material level** — concrete (M-grade), rebar (Ø spec), aggregates, masonry, roofing, façade, glazing, MEP, finishing, FF&E, soft costs, regulatory fees | NEW |
| Transparency | Hardcoded defaults; user-editable; no source attribution | Every field auto-filled from market median; every field tooltip shows source + logic; live diff badge shows delta vs market base on user override | NEW |
| Distribution | Auth-gated SidePanel inside app | Public `zaahi.io/feasibility` (no auth, no email gate) **+** SidePanel mode preserved for authenticated users | NEW |
| Data freshness | Static defaults | Quarterly cron-driven refresh from DLD / RERA / supplier feeds; admin UI for Zhan/Dymo manual overrides; 90-day public lag | NEW |
| Anti-scrape | None | Cloudflare anti-bot + rate limit + honeypots; data-tier gating; AI-bound advice | NEW |
| Verdict thresholds | BtS ROI > 20% strong; BtR yield > 7% strong (`btsVerdict`, `btrVerdict` in lib) | **Stays** — v6.0 reuses thresholds; per-engine secondary verdicts add nuance | EXTEND |
| Math primitives | `deriveArea`, `deriveLand`, `deriveConstruction`, `deriveFinance`, `deriveBtSRevenue`, `deriveBtRRental`, `computeBtS`, `computeBtR`, `computeJv` (all in `src/lib/feasibility.ts`) | **Stays** — v6.0 wraps these as the foundation; engine-specific helpers added | EXTEND |
| Currency / formatting | `fmtAed`, `fmtAedExact`, `fmtPct`, `fmtInt`, `fmtInputNumber`, `parseNumberInput` (lib lines 442-485) | **Stays** | EXTEND |
| Verdict UI | Inline badge in results panel (3 tones) | Adds: live diff badge per input (green if ±15%, amber if ±30%, red if ±50%+) | EXTEND |
| Save / load | Client-side per session only | Save to Supabase if authenticated; shareable read-only slug `/feasibility/r/{slug}` | NEW |
| Tooltips | None | Every label has hover tooltip: plain-language definition + formula context + UAE-specific note | NEW |
| Accessibility | WCAG ≈ 3.8:1 contrast on small labels (per Style Guide §7.1 — fails AA) | **WCAG AA 4.5:1 mandated** (use `DIM` `rgba(245, 241, 232, 0.70)` not `SUBTLE 0.55` for 11 px labels) | EXTEND (fix) |
| Mobile / iPad | SidePanel breaks below 768 px | iPad-first; <768 px forces fullscreen; tooltips trigger on tap | EXTEND |
| RTL / Arabic | Not supported | Full RTL flip, Arabic numerals option, mirrored diff badges | NEW |

---

## §3 Eight specialised land-use engines

Each engine is a **calibration layer over the existing v5.0 primitives**, not a replacement. Engine choice drives: (a) which secondary metrics surface in the results panel, (b) which default values pre-fill from the database, (c) which UAE-specific notes appear in tooltips. Detail in `01_LAND_USE_ENGINES.md`.

| # | Engine | Primary metric | Distinguishing dimension | Maps to v5 mode |
|---|---|---|---|---|
| 1 | **Residential** (off-plan + ready) | ROI (BtS) **or** Net Yield (BtR) | Payment plan: 30/70 default + custom; service charge tier | BtS / BtR |
| 2 | **Commercial** (Grade A/B office, retail, warehouse) | NOI / Cap Rate | Lease ramp curve, occupancy build-up | BtR |
| 3 | **Hospitality** (3★–7★) | RevPAR × keys × 365 ADR · GOP margin | F&B uplift, brand / management fee, occupancy seasonality | BtR (operating-asset variant) |
| 4 | **Industrial** (Free Zone + Mainland warehouse / cold storage) | Net Yield | Free Zone premium, long lease tenor, DEWA capex, cold-storage delta | BtR |
| 5 | **Mixed-Use** | Blended IRR | Component split per land use, phase sequencing, anchor-tenant uplift | BtS / BtR / Mixed |
| 6 | **Infrastructure** (PPP / concession) | DCF NPV | Government revenue share, 25–40-yr tail, social-discount rate | DCF custom |
| 7 | **Off-Plan** (developer pre-handover) | IRR + escrow-cleared NPV | Construction-draw curve, sales velocity, escrow release schedule, handover lag | BtS (timing-aware variant) |
| 8 | **Land-Hold** (passive appreciation play) | CAGR after costs | Hold period, DLD 4% in/out, annual holding cost (service charge, mortgage if any) | Buy-and-hold |

The four canonical land uses present in v5.0 but **not** in this 8-engine list (Educational, Healthcare, Agricultural, Future Development) route to a generic engine using v5 BtS/BtR primitives — engine selection in those cases falls through to Residential or Commercial defaults per founder mapping table (FOUNDER RATIFY — exact mapping deferred to Phase B).

---

## §4 Transparency-first philosophy

The single most important behavioural change v6.0 introduces is **defaults are not hidden, defaults are sourced.** Every numeric field on the form has four states the user can perceive in under one second:

1. **AI-filled value** — populated by the database lookup on (district, land use, project size). Rendered with subtle gold underline to indicate "auto-populated, not user-supplied".
2. **Source attribution** — hover tooltip on the field label shows: median source + sample size + quarter + provider. Example: *"Median from 23 Dubai Hills mid-rise projects, Q1 2026, Faithful+Gould BCIS UAE index."*
3. **Plain-language definition** — same tooltip explains the term. Example: *"FAR = Floor Area Ratio. Maximum total built area divided by plot area, set by DDA per district. Used in: GFA = Plot Area × FAR."*
4. **Live diff badge** — when the user overrides any value, a small badge appears immediately to the right showing delta vs the market median. Colour: green if within ±15 %, amber if within ±30 %, red if ±50 %+. Hover discloses the source and threshold logic.

The reason this matters is also single-sentence-able: **the calculator is no longer a black box that brokers can dismiss with "that's not what we see in the market"; every number is checkable in two clicks, and every variance from the market base is visually flagged.** This is the v6.0 product moat against incumbent calculators (Bayut, Property Finder, Allsopp, in-house developer Excel sheets) that ship hardcoded defaults with no provenance.

---

## §5 Distribution model — public, viral, no gate

| Layer | Decision |
|---|---|
| URL | `zaahi.io/feasibility` — no subdirectory, no namespace |
| Authentication | **None required** for the calculation itself |
| Email capture | **None on the calc surface.** Optional "Save calculation" button surfaces a soft prompt for free-account creation; clicking "skip" preserves the calculation in `localStorage` and produces a shareable read-only slug |
| Sharing | Every calculation gets a unique slug at `/feasibility/r/{slug}`, read-only, no PII leaked. Slug = `crypto.randomUUID()` truncated to 8 chars |
| PDF export | Available without auth; PDF carries the public-tier disclaimer |
| Telemetry | Anonymous only — engine used, district selected, IRR/NPV bin, PDF export count, share count. **No PII**, no IP fingerprinting beyond Cloudflare anti-bot. |
| Goal | **Viral max** — every UAE participant should be one search away from the calculator. Brokers will use it in client meetings; investors will check developer brochures against it; architects will prototype massing scenarios on it. The viral surface seeds platform subscription conversion downstream. |

Detail in `04_DISTRIBUTION_LEGAL_MOAT.md` §1.

---

## §6 Legal liability mitigation

The single largest legal risk a public feasibility tool faces is **reliance damages** — an investor commits AED 50 M to a project on the basis of the calculator's output, the project underperforms, the investor sues for the delta. The mitigation stack:

1. **Contractual disclaimer.** Comprehensive Terms of Use accepted on first calculation: estimates · industry benchmarks · ZAAHI not liable for investment decisions · consult licensed quantity surveyor and feasibility consultant before commitment. Acceptance is single-click "I understand", stored in `localStorage` + Supabase if account exists, not blocking subsequent calcs. Footer disclaimer on every PDF export. Detail in `04_DISTRIBUTION_LEGAL_MOAT.md` §4.
2. **No PII attestation.** Calculator does not represent licensed feasibility-consultant output. Output panel and PDF cover-page state explicitly: *"This is an indicative model. It does not constitute a feasibility study under UAE law and must not be relied upon for investment commitments without professional consultant sign-off."*
3. **Source transparency.** Every default value carries source attribution; the user can see exactly which benchmark was used and override it. This shifts the locus of decision from ZAAHI to the user — the user has knowingly accepted or modified each input.
4. **Public vs paid data tiers.** Public surface uses 90-day-lagged data; paid subscribers see current-quarter data. The lag is itself a legal-defensibility layer: nobody can credibly sue for relying on the calculator's "real-time accuracy" when the calculator's footer reads "Q4 2025 data, lagged 90 days, current as of 5 February 2026."
5. **RERA approval pathway research.** Whether a public methodology requires RERA pre-approval is **OPEN — FOUNDER RATIFY** (see `04_DISTRIBUTION_LEGAL_MOAT.md` §5). Initial web research did not surface a RERA pre-approval requirement specifically for non-broker public feasibility tools, but RERA's broker code of ethics demands no misleading claims and source-backed methodology — both of which v6.0 satisfies. Confirmation pending direct counsel consultation in Phase B legal budget.

Arabic translation of the disclaimer is flagged as `PENDING UAE COUNSEL REVIEW` and is not in scope for Phase A.

---

## §7 Three-tier competitive moat

A public viral calculator is by definition a public methodology. Competitors will scrape and clone it; the moat strategy assumes this and degrades it. Detail in `04_DISTRIBUTION_LEGAL_MOAT.md` §3.

| Tier | Mechanism | What it costs the scraper |
|---|---|---|
| **Tier 1 — Technical anti-bot** | Cloudflare Bot Fight Mode + rate limit (30 calcs / IP / hour) + honeypot fields + zero raw-API endpoint exposure (all calcs server-rendered HTML) | Browser-automation cost + IP rotation cost + JS-rendering compute cost — turns scraping into a real ops bill, not a `curl` job |
| **Tier 2 — Data freshness gating** | Database-tier split: `currentQuarter` (paid) vs `laggedPublic` (current quarter minus 90 days). Public tool reads `laggedPublic`. Authenticated subscribers (Developer AED 50 k / Broker AED 20 k / Architect AED 10 k tiers per existing pricing) read `currentQuarter`. | Scraper gets stale data and ages further every day — the further from quarter-end, the more outdated the scrape. Decisions made on it under-perform decisions made on `currentQuarter` data. Subscription becomes the only path to live data. |
| **Tier 3 — AI-bound personalised advice** | Calculator + Archibald AI = contextual guidance ("this plot has DDA affection plan capping height at 14 m, your model assumes 28 m — please adjust"). Not formula-extractable; requires AI integration cost and continuous training. | Scraper can mirror the formulas but cannot mirror the AI commentary; the AI commentary is what brokers actually use to close meetings. The formulas are the floor, not the ceiling. |

---

## §8 Glossary

| Term | Definition (used in v6.0 spec set) |
|---|---|
| **BUA** | Built-Up Area — total enclosed area including walls, columns, balconies (sqft) |
| **GFA** | Gross Floor Area — total floor area within the building envelope; Plot Area × FAR |
| **SFA** | Saleable / Sellable Floor Area — net area available for sale or lease; GFA × efficiency % (typically 75–85 %) |
| **FAR** | Floor Area Ratio — maximum GFA permitted divided by plot area; set by DDA / Dubai Municipality / master developer |
| **IRR** | Internal Rate of Return — discount rate that makes cash-flow NPV equal zero |
| **NPV** | Net Present Value — sum of discounted future cash flows minus initial investment |
| **DCF** | Discounted Cash Flow — valuation method summing time-weighted discounted cash flows |
| **RevPAR** | Revenue Per Available Room — Hotel total room revenue ÷ available room nights ≡ ADR × Occupancy |
| **ADR** | Average Daily Rate — hotel rooms revenue ÷ rooms sold |
| **NOI** | Net Operating Income — gross rental revenue − operating expenses (excl. debt service, CapEx, tax) |
| **Cap Rate** | Capitalisation Rate — NOI ÷ Property Value (or NOI ÷ Asset Cost). UAE office prime ≈ 7–8 %; industrial ≈ 7.25–8.25 % per JLL Q3 2025 |
| **ROI** | Return on Investment — Net Profit ÷ Total Investment |
| **Payback** | Years until cumulative net cash flow recovers initial capital |
| **Contingency** | Reserve for cost overruns; 5 % low / 7.5 % medium / 10 % high-risk per v5 |
| **Soft costs** | Design fees, supervision, permits, legal, marketing — non-physical construction spend |
| **FF&E** | Furniture, Fittings & Equipment — moveable contents, especially for hospitality |
| **MEP** | Mechanical, Electrical, Plumbing — building services |
| **BBS** | Bar Bending Schedule — rebar quantity table per element / drawing |
| **CPI** | Construction Price Index — inflation index for construction inputs |
| **DLD** | Dubai Land Department — registers all property transactions; charges 4 % transfer fee |
| **RERA** | Real Estate Regulatory Agency — Dubai broker-licensing and code-of-ethics regulator under DLD |
| **DDA** | Dubai Development Authority — master-plan / FAR / height authority for free-zone districts (TECOM, DIFC, DSC, etc.) |
| **VARA** | Virtual Assets Regulatory Authority — Dubai virtual-asset and tokenisation regulator |
| **Trakheesi** | DLD digital permit system for advertising property; AED 1,000 + AED 20 KIF per permit |
| **Oqood** | DLD interim register for off-plan sales (Law 13/2008); precondition for developer collecting payments |
| **Escrow** | RERA-approved bank account for off-plan project funds (Law 8/2007 mandatory) |
| **EIBOR** | Emirates Interbank Offered Rate — UAE benchmark interest rate; 3-month ≈ 3.59 % April 2026 |
| **QFZP** | Qualifying Free Zone Person — ADGM / DIFC tax status, 0 % CT on qualifying income |

---

## §99 Cross-spec wayfinding

| File | Subject |
|---|---|
| `00_OVERVIEW.md` | This file |
| `01_LAND_USE_ENGINES.md` | 8 engines × inputs, formulas, outputs, UAE notes, worked examples |
| `02_CONSTRUCTION_COST_DATABASE.md` | Database schema, material breakdown, auto-fill, quarterly refresh |
| `03_UX_FULLSCREEN_AND_DIFF.md` | Single-mode UX, fullscreen toggle, diff badges, tooltips, a11y, RTL, mobile |
| `04_DISTRIBUTION_LEGAL_MOAT.md` | Public URL, telemetry, 3-tier moat, legal disclaimer, RERA pathway |

Sources cited per-file at end of each spec; consolidated source matrix in `04_DISTRIBUTION_LEGAL_MOAT.md` §99.

---

*End of overview. Read `01_LAND_USE_ENGINES.md` next.*

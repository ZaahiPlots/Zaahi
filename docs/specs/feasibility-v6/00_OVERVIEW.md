# Feasibility Calculator v6.0 — Overview (rev-2)

**Status:** SPEC · Phase A rev-2 (research-only, no production code)
**Branch:** `research/feasibility-v6-spec` (forked from `main` @ `165b8ca`; on top of audit commit `e6df5ed`)
**As of:** 5 May 2026
**Predecessor:** v5.0 production at `src/app/parcels/map/FeasibilityCalculator.tsx` (1001 lines) + `src/lib/feasibility.ts` (500 lines)
**Visual contract:** `docs/specs/phase-1/FEASIBILITY_STYLE_GUIDE.md` (569 lines, ratified 2026-04-22)
**Founder ratifier:** Zhan (17 years RE)
**Classification:** CONFIDENTIAL — internal

> **rev-2 changes vs `32fa932`** — see `05_AUDIT_REPORT.md` for the 32 audit findings this revision resolves. Major shifts:
> - Engines expanded **8 → 13 base + 2 modifiers** (Off-Plan, Fractional/VARA) per Zhan ratification 5 May 2026.
> - **BUA convention reversed** to v5 canonical: `BUA = GFA × 1.85` (was 0.95×; CRITICAL fix).
> - **PDF toolchain hybrid ratified:** jsPDF for SidePanel embedded mode, weasyprint for `/feasibility` public route + admin reports + investor exports.
> - **Master Tree alignment** authored as new file `06_MASTER_TREE_ALIGNMENT.md` per Zhan ratification (canonical `MASTER_TREE_final.md` not modified).
> - **Institutional methodology** authored as new file `07_METHODOLOGY.md` — RICS NRM 1, USALI 12th Edition, IVS 2025, ICMS 3, Brueggeman/Fisher, Rushmore.
> - **Language scope at v6 launch:** EN + AR only. RU queued v6.1 (1–2 weeks post-launch). UK/SQ/FR deferred to v7 per Master Tree §77 mandate.
> - **64 original RATIFY items + 8 new from audit:** 18 closed via deep research in this rev (sourced citations now available); 54 remain open and listed in `05_AUDIT_REPORT.md` §5 / per-file §99 sections.

---

## §1 Vision

**v6.0 is the institutional-grade feasibility tool that lets every UAE real-estate participant — from a villa buyer with a 10,000 sqft plot to an Emaar finance team modelling a 500,000 sqft mixed-use scheme — model any plot-level scheme to material-line resolution, with every default value sourced and every override visually flagged in real-time against market base.** It absorbs v5.0's three-mode (Build-to-Sell · Build-to-Rent · Joint Venture) production code, extends it into 13 specialised land-use engines covering the full spectrum from house to data center, layers a quarterly-refreshed construction-cost database backed by RICS NRM 1 / ICMS 3 elemental classification, and ships a transparency-first single-mode UX where every input has a hover tooltip linking to the authoritative source. Public surface at `zaahi.io/feasibility` is the viral channel; Cloudflare anti-bot + 90-day data lag + Archibald AI personalised advice form a three-tier moat against scraping. The methodology is open enough that a Big-4 reviewer can verify any number in two clicks, and rigorous enough that a UAE bank credit committee can cite it in a project-finance memo.

### §1.1 Document architecture (Option A)

Per the founder direction, v6.0 ships as **rev-2 of the existing 5 spec files + 2 new appendix files** (Option A — selected over Option B's two-layer split because the existing 00–04 already mix overview and detail at the right level for the founder + Phase B implementer audience):

| File | Subject | Lines (rev-2) |
|---|---|---|
| `00_OVERVIEW.md` | This file — vision, engine roster, philosophy, distribution, glossary | ~300 |
| `01_LAND_USE_ENGINES.md` | 13 engines × inputs, formulas, outputs, UAE notes, worked examples | ~1,800 |
| `02_CONSTRUCTION_COST_DATABASE.md` | Database schema (RLS-policied), material breakdown, auto-fill, quarterly refresh | ~700 |
| `03_UX_FULLSCREEN_AND_DIFF.md` | Single-mode UX, fullscreen toggle, diff badges, tooltips, a11y, RTL, mobile | ~550 |
| `04_DISTRIBUTION_LEGAL_MOAT.md` | Public URL, telemetry, 3-tier moat, legal disclaimer, RERA pathway | ~800 |
| `05_AUDIT_REPORT.md` | rev-1 → rev-2 audit trail (frozen at `e6df5ed`) | 304 |
| `06_MASTER_TREE_ALIGNMENT.md` | NEW — proposal for §70 ANALYTICS ENGINE sub-node "Feasibility Modelling" | ~250 |
| `07_METHODOLOGY.md` | NEW — institutional reference: RICS NRM 1 / USALI 12th / IVS 2025 / ICMS 3 / Brueggeman / Rushmore | ~600 |

Per Zhan ratification 5 May 2026 — `MASTER_TREE_final.md` is canonical and **NOT modified by this rev**. The alignment proposal in `06_MASTER_TREE_ALIGNMENT.md` becomes input for a future `MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v-bump amendment that founder ratifies separately.

---

## §2 v5.0 → v6.0 delta (rev-2)

| Layer | v5.0 (production today) | v6.0 (this spec) | Status |
|---|---|---|---|
| Modes / engines | 3 tabs (BtS · BtR · JV) | **Same 3 modes preserved as the foundation**, layered under **13 specialised engines** + Off-Plan modifier + Fractional/VARA modifier | EXTEND |
| Engine roster | 9 canonical land uses (Residential / Commercial / Mixed Use / Hotel / Industrial / Educational / Healthcare / Agricultural / Future Development), routed to 3 tabs via `mapCategoryToDefaults` | **13 engines:** Residential · Office · Retail · Hospitality · Industrial / Logistics · Healthcare · Educational · Senior Living · Data Center · Mixed-Use · Infrastructure · Off-Plan (cross-cutting) · Land-Hold (with Rezoning Upside sub-mode). Plus Fractional Ownership as a VARA-tokenisation modifier flag. Agricultural deferred to v7 per Zhan 5 May 2026; Awqaf (religious endowment) conditional 14th pending separate Zhan ratification. | NEW (5 new engines: Office split, Retail split, Healthcare, Educational, Senior Living, Data Center — net +5) |
| BUA convention | `BUA = GFA × 1.85` (lib `useState` line 238–239: `buaRatio = 1.85`) | **`BUA = GFA × 1.85` retained** (rev-2 fix from 0.95× to 1.85× per Zhan ratification 5 May 2026 — CRITICAL audit finding 01-1) | **STAYS** |
| UX surface | SidePanel-embedded only | SidePanel **+** fullscreen overlay (toggle-able, all sections force-expanded, state preserved) | EXTEND |
| Default values | Hardcoded per category in `mapCategoryToDefaults` | **Database-driven** — `CostPreset` lookup by `(district, landUse, subClass, projectSizeBand)` returning `currentQuarter` (paid) or `laggedPublic` (public) | EXTEND |
| Cost granularity | 4 lines (construction · brand · consultancy · infrastructure psf BUA) + contingency | **Material level** per RICS NRM 1 elemental classification + ICMS 3 levels 1–3 mandatory: concrete (M-grade), rebar (Ø spec), aggregates, masonry, roofing, façade, glazing, MEP, finishing, FF&E, soft costs, regulatory fees | NEW |
| Transparency | Hardcoded defaults; user-editable; no source attribution | Every field auto-filled from market median; tooltip shows source provider + sample size + scope + quarter; **live diff badge** shows delta vs market base on user override | NEW |
| PDF export | jsPDF (client-side, ~50ms latency) | **Hybrid:** jsPDF retained for SidePanel embedded mode (zero-roundtrip preservation); weasyprint added for `/feasibility` public route + admin quarterly reports + investor exports (server-rendered, branded cover-page consistent with viktor-package output) | EXTEND |
| Distribution | Auth-gated SidePanel inside app | Public `zaahi.io/feasibility` (no auth, no email gate) **+** SidePanel mode preserved for authenticated users in `/parcels/map` | NEW |
| Data freshness | Static defaults | Quarterly cron refresh from DLD / RERA / supplier feeds; admin UI for Zhan/Dymo manual overrides; **90-day public lag** (moat tier 2) | NEW |
| Anti-scrape | None | Cloudflare anti-bot + rate limit + honeypots; data-tier gating; AI-bound advice | NEW |
| Verdict thresholds | BtS ROI > 20% strong; BtR yield > 7% strong (`btsVerdict`, `btrVerdict` in lib) | **Stays** for BtS/BtR baseline. Engine-specific verdicts add nuance (e.g., Hospitality EBITDAR margin > 35% strong; Data Center stabilised LTV / kW > target) per `01_LAND_USE_ENGINES.md` per-engine tables | EXTEND |
| Math primitives | `deriveArea, deriveLand, deriveConstruction, deriveFinance, deriveBtSRevenue, deriveBtRRental, computeBtS, computeBtR, computeJv` (`src/lib/feasibility.ts`) | **Stays** — v6.0 wraps these as the foundation; engine-specific helpers added in `src/lib/feasibilityEngines.ts` (Phase B new file) | EXTEND |
| Currency / formatting | `fmtAed, fmtAedExact, fmtPct, fmtInt, fmtInputNumber, parseNumberInput` | **Stays** | EXTEND |
| Verdict UI | Inline badge in results panel (3 tones: GREEN / GOLD / GRAY) | Adds **live diff badge** per input — 4-tone (green ≤ 15 % / amber 15–30 % / amber-bold 30–50 % / red ≥ 50 %) per `03_UX_FULLSCREEN_AND_DIFF.md` §3.2 | EXTEND |
| Save / load | Client-side per session only | Save to Supabase `SharedFeasibilityCalc` table if authenticated; shareable read-only slug `/feasibility/r/{slug}` (rev-2: model name unified — was `SavedFeasibility` in 03 / `SharedFeasibilityCalc` in 04 in rev-1; rev-2 standardises to `SharedFeasibilityCalc`) | NEW |
| Tooltips | None | Every label has hover tooltip: plain-language definition + formula context + source (with sample size + scope + quarter) + UAE-specific note | NEW |
| Accessibility | WCAG ≈ 3.8:1 contrast on small labels (Style Guide §7.1 — fails AA) | **WCAG AA 4.5:1 mandated** (use `DIM` `rgba(245, 241, 232, 0.70)` not `SUBTLE 0.55` for 11px labels). All 10 a11y upgrades in `03_UX_FULLSCREEN_AND_DIFF.md` §5.2 | EXTEND (fix) |
| Mobile / iPad | SidePanel breaks below 768 px | iPad-first; <768 px forces fullscreen; tooltips trigger on tap | EXTEND |
| Languages at launch | EN only (v5 production) | **EN + AR at v6 launch.** RU queued v6.1 (1–2 weeks post-launch). UK / SQ / FR deferred to v7 per Master Tree §77 mandate. | NEW (partial coverage) |
| Methodology citations | None — defaults are unsourced | **Every formula and default cited** — RICS NRM 1 (cost), USALI 12th Edition (hospitality P&L), IVS 2025 (cap rate / DCF), ICMS 3 (construction measurement), Brueggeman & Fisher (real estate finance fundamentals), Rushmore (hotel valuation), JLL / Knight Frank / CBRE / Cushman public reports (UAE benchmarks). Full citation list in `07_METHODOLOGY.md`. | NEW |

---

## §3 Thirteen specialised engines + 2 modifiers

Per Zhan ratification 5 May 2026 (Q4). Each engine is a **calibration layer over the existing v5.0 primitives**, not a replacement. Engine choice drives: (a) which secondary metrics surface in the results panel, (b) which default values pre-fill from the database, (c) which UAE-specific notes appear in tooltips, (d) which verdict thresholds apply. Detail in `01_LAND_USE_ENGINES.md`.

| # | Engine | Primary metric | Sub-classes | Maps to v5 mode | Methodology source |
|---|---|---|---|---|---|
| 1 | **Residential** (off-plan + ready) | ROI (BtS) **or** Net Yield (BtR) | apartment, villa, townhouse, branded residence | BtS / BtR | RICS NRM 1; Brueggeman & Fisher Ch. 11–14 |
| 2 | **Office** (Grade A/B/C) | NOI / Cap Rate; Lease NPV | prime, secondary, free zone | BtR (operating-asset variant) | IVS 105 (Investment Property); Cushman & Wakefield UAE office reports |
| 3 | **Retail** (mall, high-street, F&B) | NOI / Cap Rate; Anchor uplift | super-prime, prime, secondary, neighbourhood | BtR | Cushman & Wakefield UAE retail; Knight Frank UAE retail review |
| 4 | **Hospitality** (3★–7★ + serviced apartment + resort) | RevPAR · ADR · Occupancy → EBITDAR margin | mid-scale, upscale, luxury, ultra-luxury | BtR (operating-asset variant) | **USALI 12th Edition (July 2024)**; Rushmore Hotel Investments 7th Edition; HVS UAE hotel reports |
| 5 | **Industrial / Logistics** (warehouse Grade A/B + cold storage + light manufacturing + free-zone variants) | Net Yield; Cap Rate | Grade A logistics, Grade B, cold storage, JAFZA / KIZAD / DSO free zone | BtR | JLL UAE Industrial Q3 2025; Cushman UAE Logistics |
| 6 | **Healthcare** (hospital, clinic, specialty centre, diagnostic) | Cost / bed; NOI per bed; payback | hospital, clinic, specialty (e.g. fertility), diagnostic | BtR | DHA / DHCC framework; ICMS 3; Saudi Arabia comparable benchmark (SAR 2–3M / bed per Argaam Sept 2024) |
| 7 | **Educational** (K-12 school + nursery + university + training) | Cost / student-capacity; tuition NOI | nursery, K-12 (curriculum-specific: UK / US / IB / Indian), university, training | BtR | KHDA Education Cost Index 2025-26 (2.35 %); ADEK; international benchmark |
| 8 | **Senior Living** (independent + assisted + memory care) | Cost / key; EBITDAR per key; Cap Rate | independent living, assisted living, memory care, continuum-of-care | BtR (operating-asset variant) | Knight Frank UK Seniors Housing Trading Performance Review 2025/26; NIC Map (US benchmark); UAE-specific RATIFY |
| 9 | **Data Center** (hyperscale + edge + colocation) | $ / MW capex; rent / kW / month; PUE | hyperscale (>100 MW), enterprise (10–100 MW), edge (<10 MW), colocation | BtR | JLL Global Data Center Outlook 2025 (USD 10.7 M / MW global avg, 2026 forecast USD 11.3 M / MW); Cushman Data Center reports |
| 10 | **Mixed-Use** | Blended IRR | component split per engines 1–9 | BtS / BtR / mixed | Brueggeman & Fisher Ch. 18; ICMS 3 cross-asset measurement |
| 11 | **Infrastructure** (PPP / concession) | DCF NPV; IRR | district cooling, parking, schools (PPP variant), hospitals (PPP variant), toll | DCF custom | UAE Cabinet Resolution No. 1 of 2017 (federal PPP framework); IVS 200 (Business Interests); Brueggeman & Fisher Ch. 19 |
| 12 | **Off-Plan** (cross-cutting wrapper — user picks Off-Plan + base engine 1–9) | Project IRR + escrow-cleared NPV; peak developer-locked capital | wraps any of engines 1–9 with timing-aware variants | BtS (timing-aware) | Dubai Law 8/2007 (escrow); Dubai Law 13/2008 (Oqood); Brueggeman & Fisher Ch. 21 (development financing) |
| 13 | **Land-Hold** (passive appreciation, with Rezoning Upside sub-mode for "Future Development" land use) | CAGR after costs; leveraged IRR | freehold, leasehold (25/50/99), musataha, usufruct | Buy-and-hold | DLD historical transactions per district; IVS 105 (Investment Property) |

**Modifiers** (apply on top of any base engine, not separate engines):

- **Off-Plan** modifier (engine #12 above) — when active, the base engine's revenue and cost are passed through Off-Plan timing logic (construction draw curve, sales velocity, escrow release schedule, handover lag).
- **Fractional / VARA** modifier — when active, signals VARA-tokenisation pathway (Asset-Referenced Virtual Asset). Calculator surfaces additional fields (VARA Category 1 issuer licence holder, whitepaper status, audit confirmation). Compliance pathway per VARA Virtual Asset Issuance Rulebook 2025 (see `04_DISTRIBUTION_LEGAL_MOAT.md` §6 and `07_METHODOLOGY.md` §5).

**v5 backwards compatibility:** the four canonical v5 land uses NOT mapped 1-to-1 in the v6 engine list:

- **Educational** → maps to Engine 7 (Educational) directly. Scope expanded.
- **Healthcare** → maps to Engine 6 (Healthcare) directly. Scope expanded.
- **Agricultural / Farm** → DEFER to v7 per Zhan ratification 5 May 2026. Until then: routed through Engine 13 Land-Hold with manual override of construction PSF.
- **Future Development** → handled as Engine 13 Land-Hold "Rezoning Upside" sub-mode per Zhan ratification 5 May 2026. The sub-mode applies a discounted CAGR (typically 12–18 % vs 8–12 % standard land-hold) plus a probability-weighted upside for successful rezoning.

**Awqaf (religious endowment land use):** Conditional 14th engine — pending separate Zhan ratification before Phase B. Awqaf land cannot be sold (Sharia perpetuity), so a feasibility model collapses to cost-only with rental yield against the awqaf trustee. UAE has significant awqaf footprint that periodically surfaces in feasibility requests.

---

## §4 Transparency-first philosophy (unchanged from rev-1)

The single most important behavioural change v6.0 introduces is **defaults are not hidden, defaults are sourced.** Every numeric field on the form has four states the user can perceive in under one second:

1. **AI-filled value** — populated by the database lookup on `(district, landUse, subClass, projectSizeBand)`. Rendered with subtle gold underline to indicate "auto-populated, not user-supplied."
2. **Source attribution** — hover tooltip on the field label shows: median source + sample size + scope + quarter + provider. Example: *"Median from 23 Dubai Hills mid-rise projects, Q4 2025, Faithful + Gould BCIS UAE index — RICS NRM 1 elemental category 2.A Substructure."*
3. **Plain-language definition** — same tooltip explains the term. Example: *"FAR = Floor Area Ratio. Maximum total built area divided by plot area; set by DDA per district. Used in: GFA = Plot Area × FAR. Per RICS NRM 1 §1.5: Gross Floor Area is the total of all enclosed spaces measured to the internal face of perimeter walls."*
4. **Live diff badge** — when the user overrides any value, a small badge appears immediately to the right showing delta vs the market median. Colour: green ≤ 15 %, amber 15–30 %, amber-bold 30–50 %, red ≥ 50 %. Hover discloses the source and threshold logic.

The reason this matters: **the calculator is no longer a black box that brokers can dismiss with "that's not what we see in the market"; every number is checkable in two clicks, and every variance from the market base is visually flagged.** This is the v6.0 product moat against incumbent calculators (Bayut, Property Finder, Allsopp, in-house developer Excel sheets) that ship hardcoded defaults with no provenance.

**Institutional defensibility:** every formula in `01_LAND_USE_ENGINES.md` traces to a specific industry standard or peer-reviewed source documented in `07_METHODOLOGY.md`. Every default value carries an authoritative URL or named publication. A CFO of a UAE developer reviewing the calculator can verify any line in the methodology document; a Big-4 feasibility consultant can map every metric to RICS NRM 1 / USALI 12th / IVS 2025 / ICMS 3.

---

## §5 Distribution model — public, viral, no gate (unchanged from rev-1)

Per `04_DISTRIBUTION_LEGAL_MOAT.md` §1.

| Layer | Decision |
|---|---|
| URL | `zaahi.io/feasibility` — no subdirectory, no namespace |
| Authentication | **None required** for the calculation itself |
| Email capture | **None on the calc surface.** Optional "Save calculation" button surfaces a soft prompt for free-account creation; clicking "skip" preserves the calculation in `localStorage` and produces a shareable read-only slug |
| Sharing | Every calculation gets a unique slug at `/feasibility/r/{slug}`, read-only, no PII leaked. Slug = `crypto.randomUUID()` truncated to 8 chars |
| PDF export | Available without auth via weasyprint server route; PDF carries the public-tier disclaimer |
| Telemetry | Anonymous only — engine used, district selected, IRR/NPV bin, PDF export count, share count. No PII, no IP fingerprinting beyond Cloudflare anti-bot. |
| Goal | **Viral max** — every UAE participant should be one search away from the calculator. The viral surface seeds platform subscription conversion downstream (target Phase B: 1 % calculator-to-subscription conversion at 4,000 monthly active calculations → ~40 sign-ups, supporting investor-package P&L Y1 Platform revenue target AED 510 k from 40 subscribers across 5 tiers — Developer AED 50 k / Broker AED 20 k / Architect AED 10 k / Investor / Buyer AED 5 k / Owner AED 3 k per year). |

The investor-package P&L tier prices are **inlined here** rev-2 (audit finding 04-1) so the spec lives independently on this branch. For the canonical narrative the values come from `drafts/investor-package-v7:docs/investor-package/P_AND_L_STATEMENT.md` §3.1 / §6 / §15.2 (read-only access).

---

## §6 Legal liability mitigation (rev-2 enhancements)

The single largest legal risk a public feasibility tool faces is **reliance damages** — an investor commits AED 50 M to a project on the basis of the calculator's output, the project under-performs, the investor sues for the delta. The mitigation stack:

1. **Contractual disclaimer.** Comprehensive Terms of Use accepted on first calculation. Multi-tier liability cap (rev-2 fix to audit finding 04-2 — counsel-aware proposal): AED 100 cap for indirect / consequential damages; aggregate cap tied to subscription consideration paid for direct damages with USD-equivalent floor; carve-outs for fraud, gross negligence, IP infringement. Detail in `04_DISTRIBUTION_LEGAL_MOAT.md` §4.3.
2. **No professional-advice attestation.** (rev-2 fix to audit finding 00-1 — was "No PII attestation" typo.) Calculator does not represent licensed feasibility-consultant output. Output panel and PDF cover-page state explicitly: *"This is an indicative model. It does not constitute a feasibility study under UAE law and must not be relied upon for investment commitments without professional consultant sign-off."*
3. **Source transparency.** Every default value carries source attribution; the user can see exactly which benchmark was used and override it. This shifts the locus of decision from ZAAHI to the user.
4. **Public vs paid data tiers.** Public surface uses 90-day-lagged data; paid subscribers see current-quarter data. The lag is itself a legal-defensibility layer: nobody can credibly sue for relying on the calculator's "real-time accuracy" when the calculator's footer reads "Q4 2025 data, lagged 90 days, current as of 5 February 2026."
5. **Refined IP claim.** (rev-2 fix to audit finding 04-3.) The calculator's user interface design, brand assets, database aggregation, and curated-default selection are exclusive IP. The underlying formulas (industry-standard real-estate finance) and individually-cited public-source default values are NOT separately proprietary — the spec acknowledges that the methodology is by design publicly visible. What is restricted is commercial reuse of the aggregated calculator output, scraped database, or substantial reproduction of the UI. Counsel-final draft in `04_DISTRIBUTION_LEGAL_MOAT.md` §4.3 §11.
6. **RERA approval pathway research.** Whether a public methodology requires RERA pre-approval is **OPEN — FOUNDER RATIFY** (see `04_DISTRIBUTION_LEGAL_MOAT.md` §5). Initial web research did not surface a RERA pre-approval requirement specifically for non-broker public feasibility tools, but RERA's broker code of ethics demands no misleading claims and source-backed methodology — both of which v6.0 satisfies. Confirmation pending direct counsel consultation in Phase B legal budget.

Arabic translation of the disclaimer is flagged as `PENDING UAE COUNSEL REVIEW` and is not in scope for Phase A.

---

## §7 Three-tier competitive moat (unchanged structure, refined cost framing)

A public viral calculator is by definition a public methodology. Competitors will scrape and clone it; the moat strategy assumes this and degrades it. Detail in `04_DISTRIBUTION_LEGAL_MOAT.md` §3.

| Tier | Mechanism | Cost imposed on the copier |
|---|---|---|
| **Tier 1 — Technical anti-bot** | Cloudflare Bot Fight Mode + rate limit (30 calcs / IP / hour) + honeypot fields + zero raw-API endpoint exposure (all calcs server-rendered HTML on the public route) | Browser-automation infra (~USD 500 / month per 10 worker IPs) + IP rotation (residential proxies, USD 200+ / month for 100 IPs) + JS-rendering compute + captcha-solving service if Turnstile triggers (~USD 2 / 1000 solves per Anti-Captcha 2025 published rates). Total scrape cost for full district × engine × sub-class matrix realistically USD 1–3 k / quarter to maintain a fresh mirror. (rev-2: realistic preset count revised per audit finding 04-5 — see `04_DISTRIBUTION_LEGAL_MOAT.md` §3.1 for updated math.) |
| **Tier 2 — Data freshness gating** | Database split: `currentQuarter` (paid) vs `laggedPublic` (current quarter minus 90 days). Public tool reads `laggedPublic`. Authenticated subscribers (Developer / Broker / Architect / Investor / Owner subscription tiers) read `currentQuarter`. | The cost imposed on a copier here is **lost data freshness** — their mirror is always 90 days behind. For a Q3 2026 deal, the mirror shows Q2 2026 prices — and Q2 was already 5 % below Q3 per Turner & Townsend escalation forecast. The scraper's data **ages further the longer it sits**. Subscription becomes the only path to live data. (rev-2: framing fix per audit finding 04-4 — column was previously "subscription cost" which described the legitimate-user cost, not the scraper cost.) |
| **Tier 3 — AI-bound personalised advice** | Calculator + Archibald AI = contextual guidance ("this plot has DDA affection plan capping height at 14 m, your model assumes 28 m — please adjust"). Not formula-extractable; requires AI integration cost and continuous training. | Scraper can mirror the formulas but cannot mirror the AI commentary; the AI commentary is what brokers actually use to close meetings. Building a comparable AI integration + maintaining the parcel database (114 ZAAHI plots + 556k PMTiles plots) + maintaining the affection-plan database (DDA-API-fed, currently ZAAHI proprietary) is a multi-year rebuild. The formulas are the floor; the commentary is the ceiling. **Tier 3 is the decisive moat.** |

---

## §8 Glossary (rev-2 — terminology drift fixed, added engine-specific terms)

| Term | Definition (used in v6.0 spec set) |
|---|---|
| **BUA** | Built-Up Area — total floor area including walls, columns, balconies, parking podium, services, plant rooms, circulation. Per v5 production canon: **`BUA = GFA × 1.85`** (rev-2 fix). Per RICS NRM 1 §1.5 conventions, BUA in UAE practice is broader than IPMS Gross Internal Area; the 1.85× multiplier reflects Dubai mid-rise typology where parking podium adds ~50 % to typical floor area and services/circulation contribute another ~30 %. |
| **GFA** | Gross Floor Area — total floor area within the building envelope, measured to internal face of perimeter walls; typically excluding plant / service / parking. Plot Area × FAR. Maps to RICS NRM 1 Gross Internal Area conventions. |
| **SFA** | Saleable / Sellable Floor Area — net area available for sale or lease; GFA × efficiency % (typically 75–85 %). Equivalent to "Net Saleable Area" in Brueggeman & Fisher Ch. 11. |
| **FAR** | Floor Area Ratio — maximum GFA permitted divided by plot area; set by DDA / Dubai Municipality / master developer. UAE typical residential range 1.5 – 4.0; commercial 3.0 – 12.0; data center 0.4 – 0.8 (low-rise large-footprint). FOUNDER RATIFY (LU-2 in audit) — canonical district-level lookup table required from DDA Master Planning Guidelines + per-parcel affection plan. |
| **IRR** | Internal Rate of Return — discount rate that makes cash-flow NPV equal zero. Per Brueggeman & Fisher Ch. 5 §5.4. |
| **NPV** | Net Present Value — sum of discounted future cash flows minus initial investment. Per Brueggeman & Fisher Ch. 5 §5.3 / IVS 200 §40. |
| **DCF** | Discounted Cash Flow — valuation method summing time-weighted discounted cash flows. Per IVS 105 §70. |
| **RevPAR** | Revenue Per Available Room — Hotel total room revenue ÷ available room nights ≡ ADR × Occupancy. Per USALI 12th Edition §1.4 (Operating Statistics). |
| **ADR** | Average Daily Rate — hotel rooms revenue ÷ rooms sold. Per USALI 12th §1.4. |
| **NOI** | Net Operating Income — gross rental revenue − operating expenses (excl. debt service, CapEx, tax). Per IVS 105 §60. |
| **EBITDAR** | Earnings Before Interest, Tax, Depreciation, Amortisation, **and Rent** — the standard hospitality metric replacing NOI in operator-asset frameworks. Per USALI 12th §3.1. |
| **GOP** | Gross Operating Profit — hospitality. Total Revenue − Departmental Expenses − Undistributed Operating Expenses. Per USALI 12th §2.3. |
| **GOPPAR** | Gross Operating Profit Per Available Room — GOP / available room nights. Per USALI 12th §1.4. |
| **Cap Rate** | Capitalisation Rate — NOI ÷ Property Value (or NOI ÷ Asset Cost). UAE benchmarks Q3 2025: office prime 6.5 – 7.5 %; office secondary 7.5 – 8.5 %; retail super-prime 5.5 – 6.5 %; retail prime 6.5 – 7.5 %; industrial / warehouse 7.25 – 8.25 % (JLL Q3 2025 [src 6]); residential apartments 5.0 – 7.0 %; residential villas 4.5 – 6.0 % (Knight Frank Q3 2025 [src 17]). Per IVS 105 §50. (rev-2 fix to audit finding 00-2 — glossary now matches `01_LAND_USE_ENGINES.md` §2.2 table.) |
| **ROI** | Return on Investment — Net Profit ÷ Total Investment. |
| **Payback** | Years until cumulative net cash flow recovers initial capital. |
| **Contingency** | Reserve for cost overruns; 5 % low / 7.5 % medium / 10 % high-risk per v5 canon, aligned with RICS NRM 1 §1.5 risk allowance categories. |
| **Soft costs** | Design fees, supervision, permits, legal, marketing — non-physical construction spend. Per RICS NRM 1 §3 (Soft Cost categories) / ICMS 3 Level 1 — Project Costs (other than construction). |
| **FF&E** | Furniture, Fittings & Equipment — moveable contents, especially for hospitality. Per USALI 12th §6 (FF&E Reserve). |
| **MEP** | Mechanical, Electrical, Plumbing — building services. Per RICS NRM 1 §2.D (Services elements). |
| **PUE** | Power Usage Effectiveness — Total Facility Power ÷ IT Equipment Power. Data center efficiency metric; UAE typical 1.4 – 1.8; hyperscale target ≤ 1.3. Per Uptime Institute conventions. |
| **ARVA** | Asset-Referenced Virtual Asset — VARA category for real-estate-backed digital tokens. Per VARA Virtual Asset Issuance Rulebook 2025 §3. |
| **BBS** | Bar Bending Schedule — rebar quantity table per element / drawing. |
| **CPI** | Construction Price Index — inflation index for construction inputs. UAE FCSC Construction CPI tracked quarterly. |
| **DLD** | Dubai Land Department — registers all property transactions; charges 4 % transfer fee. Legal default 50 / 50 split between buyer and seller per Dubai Real Property Registration Law; market practice in 2026 = buyer-only as dominant convention. (rev-2 fix to audit finding 01-10 — convention framing.) |
| **RERA** | Real Estate Regulatory Agency — Dubai broker-licensing and code-of-ethics regulator under DLD. |
| **DDA** | Dubai Development Authority — master-plan / FAR / height authority for free-zone districts (TECOM, DIFC, DSC, etc.). |
| **DHA** | Dubai Health Authority — healthcare facility licensing and regulation. |
| **DHCC** | Dubai Healthcare City — healthcare free zone. AED 1.3 B Phase 1 expansion plan announced 2026 ([DHCC News](https://www.dhcc.ae/media/news/dubai-healthcare-city-authority-unveils-aed13-billion-development-plan)). |
| **KHDA** | Knowledge and Human Development Authority — Dubai education regulator. Education Cost Index 2025-26 = 2.35 % per [KHDA News](https://web.khda.gov.ae/en/About-Us/News/2025/Education-Cost-Index). |
| **ADEK** | Abu Dhabi Department of Education and Knowledge — Abu Dhabi education regulator. |
| **VARA** | Virtual Assets Regulatory Authority — Dubai virtual-asset and tokenisation regulator. Virtual Asset Issuance Rulebook 2025 (latest update 19 June 2025) governs ARVA issuance for tokenised real estate. |
| **Trakheesi** | DLD digital permit system for advertising property; AED 1,000 + AED 20 KIF = AED 1,020 per standard listing; AED 5,020 (AED 5,000 + AED 20 KIF) for project-launch event permits. (rev-2 — added launch-event variant per audit finding RE-2.) |
| **Oqood** | DLD interim register for off-plan sales (Law 13/2008); precondition for developer collecting payments. |
| **Escrow** | RERA-approved bank account for off-plan project funds (Law 8/2007 mandatory). |
| **EIBOR** | Emirates Interbank Offered Rate — UAE benchmark interest rate; 3-month ≈ 3.59 % April 2026 per [CBUAE](https://www.centralbank.ae/en/forex-eibor/eibor-rates/). |
| **QFZP** | Qualifying Free Zone Person — ADGM / DIFC tax status, 0 % CT on qualifying income per Ministerial Decision 229 of 2025. |
| **LTV** | Loan-to-Value — mortgage principal ÷ property value. UAE CBUAE caps: 80 % residents / 75 % non-residents / 75 % off-plan. |
| **DSCR** | Debt Service Coverage Ratio — NOI ÷ annual debt service. Used for project-finance underwriting. |
| **Rule of 40** | SaaS health metric — Revenue Growth % + EBITDA Margin %. Used in `07_METHODOLOGY.md` §5 for Platform exit valuation discussion. |

---

## §9 Cross-spec wayfinding

| File | Subject |
|---|---|
| `00_OVERVIEW.md` | This file |
| `01_LAND_USE_ENGINES.md` | 13 engines × inputs, formulas, outputs, UAE notes, worked examples |
| `02_CONSTRUCTION_COST_DATABASE.md` | Database schema (RLS-policied), material breakdown, auto-fill, quarterly refresh |
| `03_UX_FULLSCREEN_AND_DIFF.md` | Single-mode UX, fullscreen toggle, diff badges, tooltips, a11y, RTL, mobile |
| `04_DISTRIBUTION_LEGAL_MOAT.md` | Public URL, telemetry, 3-tier moat, legal disclaimer, RERA pathway |
| `05_AUDIT_REPORT.md` | rev-1 → rev-2 audit trail (frozen at `e6df5ed`) — 32 findings catalogued |
| `06_MASTER_TREE_ALIGNMENT.md` | NEW — proposal for §70 ANALYTICS ENGINE sub-node "Feasibility Modelling" |
| `07_METHODOLOGY.md` | NEW — institutional reference: RICS NRM 1, USALI 12th, IVS 2025, ICMS 3, Brueggeman / Fisher, Rushmore, Wyatt, HVS, JLL / Knight Frank / CBRE / Cushman public reports |

Sources cited per-file at end of each spec; consolidated source matrix in `07_METHODOLOGY.md` §99.

---

*End of overview rev-2. Read `01_LAND_USE_ENGINES.md` next.*

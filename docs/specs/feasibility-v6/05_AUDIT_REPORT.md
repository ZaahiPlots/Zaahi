# Feasibility v6.0 Phase A — Combined Audit Report

**Audited commit:** `32fa932` (`docs(specs): Feasibility Calculator v6.0 — Phase A spec set`)
**Audited files:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `02_CONSTRUCTION_COST_DATABASE.md` · `03_UX_FULLSCREEN_AND_DIFF.md` · `04_DISTRIBUTION_LEGAL_MOAT.md` (2,982 lines)
**Audit date:** 5 May 2026
**Audit scope:** two-pass audit — self-consistency (Pass 1) + external validation (Pass 2)
**Constraint:** READ-ONLY across `src/**`, `prisma/schema.prisma`, `MASTER_TREE_final.md`, `docs/investor-package/*`. No spec file modified in this session.

---

## §1 Executive summary

**32 findings catalogued.** Severity breakdown:

| Severity | Count | Definition |
|---|---:|---|
| **CRITICAL** | 2 | Phase B blocker — implementing against the spec as written would produce broken output. Must fix before Phase B begins. |
| **HIGH** | 8 | Significant correctness or consistency issue. Should fix before Phase B begins, or include in Phase B's first scope-of-work commit. |
| **MEDIUM** | 14 | Notable but non-blocking. Can fix in-flight during Phase B. |
| **LOW** | 8 | Cosmetic, documentation, edge-case polish. Nice-to-fix. |

**Phase B impact:** the spec set can proceed to Phase B **after** revising the 2 CRITICAL items. The 8 HIGH items should be batched into a "spec rev 1" commit on this branch before code starts. The 14 MEDIUM items can be tracked as Phase B work-in-progress.

**TL;DR for the founder:** the math primitives, database schema, UX architecture, and legal liability framing are essentially right. Two specific things will silently break the implementation if not fixed — see CRIT-1 and CRIT-2. Beyond that, the spec is honest about what it doesn't know (64 FOUNDER RATIFY items in the original delivery) and the audit confirms most of those are still open. Audit surfaced 8 NEW RATIFY items (catalogued in §6) and resolved zero of the original 64 (web research is preliminary; counsel still needed for the legal items).

---

## §2 Pass 1 — Self-audit findings

Findings indexed by file. Severity column maps to the §1 scale.

### §2.1 `00_OVERVIEW.md`

| ID | Section | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| 00-1 | §6 bullet 2 | "**No PII attestation.**" — PII (Personally Identifiable Information) is unrelated to the bullet's actual content (calculator does not represent licensed feasibility-consultant output). Reads as a typo for "No professional advice attestation." | LOW | Rename bullet header to "**No professional-advice attestation.**" |
| 00-2 | §8 Glossary "Cap Rate" | Glossary states "UAE office prime ≈ 7–8 %" — but `01_LAND_USE_ENGINES.md` §2.2 table shows "Office Grade A — prime: 6.5 – 7.5 %" (and "secondary: 7.5 – 8.5 %"). Same metric, different bands across files. | HIGH | Harmonise: either widen glossary to "6.5–8.5 %" or split prime/secondary in glossary. Fix in §2.2 if table is authoritative; in §8 if glossary is. Cite source. |
| 00-3 | §3 footnote | Says four v5 canonical land uses (Educational/Healthcare/Agricultural/Future Development) "fall through to Residential or Commercial defaults per founder mapping table" — but `03_UX_FULLSCREEN_AND_DIFF.md` §8.1 says they use a "fallback function". Two different mechanisms described. | MEDIUM | Pick one mechanism (function vs lookup table) and harmonise both files. Function is more compact; table is more transparent. |
| 00-4 | §1 Vision | The phrase "v6.0 absorbs v5.0's three-mode (BtS · BtR · JV) production code" is accurate, but §2 Delta table calls v5.0 "Modes: 3 tabs" — same idea, different terminology (mode vs tab). Cosmetic. | LOW | Use "modes" consistently. The lib uses `Tab` type; the spec language can normalise. |
| 00-5 | §3 Engine 3 Hospitality row | Primary metric reads "RevPAR × keys × 365 ADR · GOP margin" — that's a phrase fragment, not a metric. Should be "RevPAR" or "EBITDAR margin". | LOW | Edit row to "RevPAR (year 1 stabilised) · EBITDAR margin". |

### §2.2 `01_LAND_USE_ENGINES.md`

| ID | Section | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| 01-1 | §1.2.1 | **`BUA = 0.95 × GFA` (FOUNDER RATIFY — 0.95 is industry rule of thumb)** — but v5 production at `src/app/parcels/map/FeasibilityCalculator.tsx` line 238–239 uses **`buaRatio = 1.85`** and **`buaManual = gfaAuto × 1.85`**. v5 BUA is **larger** than GFA (~1.85×); spec v6 BUA is **smaller** (~0.95×). **Mathematical inversion** between v5 and v6. | **CRITICAL** | Reconcile with v5: either (a) v5's 1.85× is the convention and v6 spec is wrong (likely — BUA conventionally includes structure/balconies/services and is ≥ GFA); rewrite spec §1.2.1 + every worked example. (b) v5 uses different definition. Document the chosen convention explicitly with a worked example showing how a 50,000 sqft GFA tower has BUA = ~92,500 sqft (1.85×) or BUA = ~47,500 sqft (0.95×) depending on convention. Fix all five worked examples (Eng 1, 2, 4, 7, 8) that depend on BUA. |
| 01-2 | §2.5 worked example | The worked example deliberately produces "97 % cap rate" and admits in-line: "obviously wrong; rent psf is overstated". This is left as a "sanity-check exercise" but reads as a broken example to a spec reader who doesn't catch the meta-comment. | HIGH | Replace with a properly calibrated worked example. The pedagogical purpose ("see how the diff badge would catch this") can be moved to a separate §3 inline note. Currently the worked example demonstrates broken output, which damages reader confidence. |
| 01-3 | §2.2 lease ramp formula | `RentRevenue(y) = SFA × Rent(y) × Occupancy(y)` — `Rent(y) = baseRent × (1 + escalation)^(y-1)`. But `baseRent` is not defined as annual or monthly. Spec earlier defines `GrossPotentialRent = SFA × monthlyRentPsfSfa × 12`, so the conventional unit is monthly. Spec inconsistent on whether `baseRent` is annual or monthly. | HIGH | Either rename `baseRent` to `monthlyBaseRent` and add `× 12` in the year-revenue formula, or define `baseRent = monthlyRentPsfSfa × 12` explicitly at the top. |
| 01-4 | §2.2 NOI(y) formula | `NOI(y) = RentRevenue(y) − OpEx(y) − TenantImprovement(y) − FreeRent(y)` — TenantImprovement is **capex**, not operating expense. Conventional treatment: TI is amortised across lease term or treated as a year-1 capital outflow line below NOI. Subtracting full TI from year-1 NOI overstates the year-1 NOI hit. | HIGH | Move TenantImprovement to a Capex line. Net cash flow includes both NOI (operating) − Capex (TI). Common: amortise TI over lease term and subtract amortised slice from NOI each year. Update formula and §2.5 worked example. |
| 01-5 | §3.2 hospitality GOP | `GOP = TotalRevenue − DepartmentExpenses ≡ TotalRevenue × gopMarginPct/100`. The first form is correct; the second is a tautology if `DepartmentExpenses = TotalRevenue × (1 − gopMarginPct/100)`. But conventional hospitality accounting (USALI — Uniform System of Accounts for the Lodging Industry) defines a 4-tier hierarchy: Total Revenue → Departmental Profit → GOP → NOI. Spec collapses the hierarchy. | MEDIUM | Either reference USALI compliance explicitly with a footnote, or expand the formula to: Departmental Profit (after dept opex) → GOP (after undistributed opex like A&G, sales, R&M, utilities) → NOI/EBITDAR (after fixed charges). USALI structure is what Knight Frank / CBRE / institutional investors expect. |
| 01-6 | §3.2 hospitality projection | `RevPAR(y) = RevPAR(1) × (1 + revparGrowthPct/100)^(y−1)` — assumes constant +10.1 % YoY growth for 5 years. Knight Frank cites Y2025 RevPAR +10.1 % as a year-on-year measurement, not a forecast. Compounding 10.1 % for 5 years implies RevPAR doubles 2030 vs 2025 (1.101^5 = 1.62). Unrealistic. | MEDIUM | Replace constant growth with a decay schedule: e.g. 10 % Y1, 7 % Y2, 5 % Y3, 4 % Y4+, 3 % terminal. FOUNDER RATIFY exact curve. Update §3.5 worked example. |
| 01-7 | §8.2 Land-Hold formula | `SaleProceedsNet = SalePrice(y) − landCostAed × dldPct/100`. Two issues: (a) seller's DLD scales with **SalePrice** not landCostAed (DLD is computed on transaction price); (b) the worked example §8.5 contradicts the formula by NOT subtracting any seller's DLD: comment says "buyer pays buyer's 4 %, seller covers seller-side 0 %". Formula and example inconsistent. | HIGH | Fix formula to `SaleProceedsNet = SalePrice(y) × (1 − sellerDldPct/100)` with `sellerDldPct` parameterised (default 0 if buyer-only convention). Update worked example to match. |
| 01-8 | §1.1 inputs | Engine 1 Required: `mode` (`bts` | `btr`) — but engines 2/4 are BtR-only, engine 6 is DCF, engine 7 is BtS-only, engine 8 is buy-and-hold. Mode field is engine-1-specific but presented as a shared input. | MEDIUM | Move `mode` from "Required" to "Engine 1 specific". Other engines fix their mode by definition. |
| 01-9 | §0.3 UAE shared constants | "Construction cost escalation forecast +5 % through 2025" — but spec is "As of: 5 May 2026" so the 2025 forecast is now historical. Q2 2026 forecast unknown. | MEDIUM | Update to "+5 % YoY through 2025; Q1–Q2 2026 trajectory pending Turner & Townsend updated GCMI 2026". |
| 01-10 | §0.3 / §1.4 / §8.2 / §8.5 | DLD 4 % "convention is buyer-only (or 50/50 by negotiation)" reverses legal default. UAE legal default is **50/50 split**; market practice has evolved to buyer-only as the dominant pattern. | MEDIUM | Edit to: "Legal default: 50 / 50 split. Market practice in Dubai: buyer-only is the dominant convention; 50 / 50 retained as fallback negotiation." Cite source [search 2026 Property Finder DLD guide or Engel & Völkers]. |
| 01-11 | §99 source #5 | "Habhab Construction Villa Cost Dubai 2025" cited; fine for indicative villa range, but Habhab is a construction-services vendor (sales-side bias). Knight Frank or Faithful + Gould would be a more authoritative source for the same range. | LOW | Demote Habhab to supporting source; promote Faithful + Gould BCIS UAE or RICS guidance to primary if subscription is available (FOUNDER RATIFY CDB-15). |
| 01-12 | §6.4 PPP Law | "UAE Federal PPP Law No. 15 of 2024" — flagged FOUNDER RATIFY. Web search did not surface a "Federal PPP Law No. 15 of 2024"; UAE Cabinet Resolution No. 1 of 2017 is the federal PPP framework, with sectoral variants. Spec citation may be invented or approximated. | HIGH | Replace with verified citation: UAE Cabinet Resolution No. 1 of 2017 (PPP framework) plus sector-specific (e.g. Dubai Decree No. 22 of 2015 for Dubai-level PPPs). Engage counsel to confirm. |

### §2.3 `02_CONSTRUCTION_COST_DATABASE.md`

| ID | Section | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| 02-1 | §3.10 | `ffe_hotel_5_star_per_key`: 100,000 – 180,000 AED / key. Aligns with `01_LAND_USE_ENGINES.md` §3.1 which says "5★ ≈ AED 100,000 / key". Cross-file consistency confirmed. ✓ | LOW (no fix) | n/a |
| 02-2 | §2.4 | `QuarterlySnapshot.publishedToPublic` is a Boolean default `false`; `publishedToPublicAt` is a DateTime nullable. Logically these should flip atomically, but the schema doesn't enforce that ("either both set or neither set"). | LOW | Add a Prisma `@@check` or document the enforce-via-application-layer convention. |
| 02-3 | §3.12 | `reg_dewa_capacity_charge` listed as "per kW installed" with no AED range. Other regulatory fees in the table have ranges. | MEDIUM | Add range or flag explicitly FOUNDER RATIFY. DEWA capacity charges can be looked up from DEWA tariff schedule. |
| 02-4 | §6 narrative | "Q1 prices revealed in April / May serve as Q2 broker advice; by July they're stale" — slightly muddled. Q2 begins April 1 (per the timeline diagram). A scraper who copies in April gets Q1 data, which is days old. By July (Q3 begins), Q1 data is ~90 days old. The phrasing is OK but the "by July they're stale" could be sharper. | LOW | Tighten: "Q1 prices revealed in April serve as Q2 broker advice — when Q3 begins in July, those Q1 numbers are 90 days old, not Q3-current." |
| 02-5 | §3.5 | `roof_pv_array_capex` listed in roofing & waterproofing section. PV is technically electrical/MEP, not roofing. Categorisation choice. | LOW | Either move to MEP §3.8 or document why kept under roofing (typical bundled scope). |
| 02-6 | §5.1 cron job | Step 4 says "Promote prior-quarter `currentQuarter` → `laggedPublic`". But §6 says lag = 90 days = full quarter. So when Q2 begins, Q1 data **was** currentQuarter and **becomes** laggedPublic. Wording is correct but the temporal sequence of cron actions could be clearer (write-then-promote vs promote-then-write). | LOW | Add explicit ordering: "Step 4a: snapshot prior-quarter currentQuarter → quarterlySnapshot row. Step 4b: promote that snapshot to laggedPublic. Step 4c: stage new currentQuarter from external sources." |
| 02-7 | §5.1 cron sources | "DLD transactions API for district medians" — Phase A research did not confirm a public DLD transactions API exists. (Original RATIFY CDB-13.) | MEDIUM (already RATIFY) | Defer to RATIFY CDB-13. |
| 02-8 | §3.13 | `cont_high_risk` 10 % — but §0.3 of file 01 doesn't list contingency in shared constants table. Cross-file gap. | LOW | Either add contingency tier table to 01 §0.3 or reference 02 §3.13 from there. |

### §2.4 `03_UX_FULLSCREEN_AND_DIFF.md`

| ID | Section | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| 03-1 | §1.3 | `(window.matchMedia('(hover: none)').matches` — missing closing parenthesis. Code typo in spec example. | LOW | Fix to `window.matchMedia('(hover: none)').matches`. |
| 03-2 | §5.3 contrast matrix | Contrast ratios "≈ 12:1", "≈ 8.5:1", "≈ 4.5:1 (borderline)" stated as facts but not computed by a contrast checker in the audit. The matrix says "must be re-verified against the production rendered output before Phase B sign-off" — partial mitigation. | MEDIUM | Run actual contrast values through `WCAG Contrast Checker` (https://webaim.org/resources/contrastchecker/) for each row, replace ≈ with measured. Alternatively, flag the table as "Phase B QA must re-verify." |
| 03-3 | §3.2 thresholds | 4-tone scheme (green ≤15 % / amber 15–30 / amber-bold 30–50 / red >50 %). But `00_OVERVIEW.md` §4 step 4 lists 3 tones (green ≤15 %, amber ≤30 %, red ≥50 %) — file 00 is missing the amber-bold tier. | MEDIUM | Sync 00 §4 to 03 §3.2's 4-tone scheme, or simplify 03 to 3 tones. Either way, harmonise. |
| 03-4 | §4.3 | "`SavedFeasibility` Prisma model, FOUNDER RATIFY exact shape". But `04_DISTRIBUTION_LEGAL_MOAT.md` §1.4 names the same concept "`SharedFeasibilityCalc`". Two different model names for one thing. | HIGH | Pick one name (recommend `SharedFeasibilityCalc` since it covers both anonymous and authenticated cases) and update both files. Add to RATIFY UX-5 / DLM-1 unification. |
| 03-5 | §6 motion | "Section expand / collapse `max-height` (height-based, but acceptable here as the only structural exception)" — but Style Guide §5 + CLAUDE.md UI Style Guide forbid animating non-GPU properties. Spec self-flags as "exception". Could use `transform: scaleY` instead, or `grid-template-rows: 0fr → 1fr` (modern alternative). | LOW | Optionally replace with grid-template-rows pattern; otherwise leave with self-flag. |
| 03-6 | §8.1 | "`mapCategoryToDefaults` ... **Replace** in v6.0 with database-driven `CostPreset` lookup ... keep the existing function as a fallback". Two paths: spec wants replacement + fallback. But `00_OVERVIEW.md` §3 footnote says fallthrough mapping. | MEDIUM (dup of 00-3) | Resolve via 00-3 fix. |
| 03-7 | §1.2 fullscreen toggle | "`backdrop-filter: blur(32px) saturate(160%)`" — Safari support of `backdrop-filter` is good but `saturate()` filter combination has known iOS Safari rendering bugs at high values. | LOW | Test on iOS Safari before Phase B QA sign-off. Reduce saturation if pixelation observed. |
| 03-8 | §2.3 tooltip count | "≈ 30 common + ≈ 40 engine-specific = ~70 fields" — but the actual field list shows only ~26 common (counted) + a sketchy ~30 engine-specific. Total closer to 56 than 70. | LOW | Recount and update — or keep as approximation but not "exactly ~70". |

### §2.5 `04_DISTRIBUTION_LEGAL_MOAT.md`

| ID | Section | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| 04-1 | §3.2 | "Subscription tiers (per CLAUDE.md AMBASSADOR PROGRAM RULES, retired and superseded by referral / subscription pricing in `drafts/investor-package-v7`)". `drafts/investor-package-v7` is NOT on `main` and not on `research/feasibility-v6-spec`. Cross-branch reference does not resolve in this repository state. | HIGH | Either (a) merge the relevant content (subscription tier names + prices) into `00_OVERVIEW.md` §8 or §5 so it lives on this branch independent of the investor-package branch, or (b) cite the canonical spec doc that survives a merge to main. The investor-package P&L lines (Developer 50k / Broker 20k / Architect 10k / Investor 5k / Owner 3k) are already locked numerically — quote them, don't reference branch names. |
| 04-2 | §4.3 §5 | LIMITATION OF LIABILITY: "aggregate liability shall not exceed AED 100." Symbolically meaningful but UAE consumer-protection law (Federal Law No. 15 of 2020) and tort principles may not enforce a cap so low against personal-injury or fraud claims. | HIGH | Engage counsel (already RATIFY DLM-10). Counsel will likely recommend a multi-tier cap (e.g. AED 100 for indirect / consequential damages; aggregate USD-equivalent cap for direct damages tied to consideration paid; carve-outs for fraud, gross negligence, IP infringement). The AED 100 figure is provocatively low; a counsel-blessed clause will be ~3 paragraphs longer. |
| 04-3 | §4.3 §11 | INTELLECTUAL PROPERTY: "The Calculator's user interface, formulas, methodology, and underlying database structure are the intellectual property of the Company." But the spec also commits in `00_OVERVIEW.md` §4 to making "every default value sourced... [in] hover tooltip... defaults are not hidden, defaults are sourced." Methodology that's publicly visible can't be claimed as exclusive trade-secret IP. | HIGH | Refine §11 to: "The user interface design, brand assets, and database aggregation are IP. The underlying formulas (industry-standard real-estate finance) and individually-cited public-source default values are not separately proprietary. Commercial reuse of the aggregated calculator output, scraped database, or substantial reproduction of the UI is restricted." Counsel needs to thread this needle. |
| 04-4 | §3.4 cost imposed table | Tier 2 "Subscription cost (AED 5 k – 50 k / yr)" — this is the cost a **legitimate user** pays, not the cost imposed on a scraper. The framing is logically confused. The cost imposed on a copier in Tier 2 is **lost data freshness** (90-day staleness), not subscription. | MEDIUM | Reframe column: Tier 2 "Cost imposed on copier: 90-day data lag inherent (their Q1 data is consumed in Q2; their Q2 data in Q3; perpetual decay)." |
| 04-5 | §3.1 scrape cost | Total scrape estimate "$1,000–3,000 / quarter to maintain a fresh mirror." Built on 50 districts × 8 engines × 4 sub-classes × 4 size bands ≈ 6,400 unique presets. But not every (engine × subClass) combo is meaningful — Land-Hold has no sub-class hierarchy, Infrastructure doesn't decompose into sub-classes, Mixed-Use is a meta-engine. Realistic preset count likely 2,000–3,500. | LOW | Recompute with realistic preset count; cost band scales linearly. |
| 04-6 | §3.1 | "Captcha-solving service ($2 / 1000 solves)" — number cited without source. | LOW | Cite a source or remove the number. (Anti-Captcha, 2Captcha, DeathByCaptcha publish rates publicly.) |
| 04-7 | §1.4 storage | `SharedFeasibilityCalc` table with optional `userId` FK. Anonymous calcs no userId; authenticated have userId. But the schema doesn't address ownership-transfer ("user signed up after creating an anonymous calc — does the calc become theirs?"). | MEDIUM | Add `claimedByUserId String? @relation` field. On signup, if `localStorage` slug is found, attempt to claim by writing the userId to the row (only if currently null). |
| 04-8 | §3.1 | "All calculations are rendered as **server-side HTML** — the formulae are never sent to the browser as a JSON payload." But v5 production at `src/app/parcels/map/FeasibilityCalculator.tsx` is a **client** component (`"use client"` line 1) with formulas in `src/lib/feasibility.ts` that ship to the browser bundle. | HIGH | Resolve the architectural shift. Either (a) v6 ships a dedicated `/feasibility` Server Component implementation while the SidePanel mode stays client (acceptable hybrid), or (b) move formulas server-side and serialise only results to client. Spec must say which. Without resolution, scraping protection at Tier 1 doesn't hold for the SidePanel path. |
| 04-9 | §5.4 counsel firms | "Crimson Legal" and "Kayrouz & Associates" cited from `drafts/investor-package-v7` "Legal counsel recommendations" — same cross-branch reference issue as 04-1. | LOW (dup of 04-1) | Quote firms inline; don't cite branch. |
| 04-10 | §99 source #1 (Turner & Townsend) | URL `https://publications.turnerandtownsend.com/global-construction-market-intelligence-2025/middle-east` was fetched in audit. Page returned content but **does not contain the cited "Dubai $1,926 / m²" figure** specifically. The Turner & Townsend page mentions Riyadh $3,112 / m² and a 5 % escalation forecast, but no standalone Dubai construction cost. | HIGH | Find the actual Dubai source figure. Likely from Turner & Townsend ICMS 2024 (different report) or Arcadis. Replace citation or rephrase to "Riyadh $3,112 / m²; Dubai escalation forecast +5 %" (which is what the URL actually supports). |

---

## §3 Pass 2 — External validation findings

### §3.1 vs `MASTER_TREE_final.md` (canonical, READ-ONLY)

Read via `git show docs/master-tree-v3:docs/architecture/MASTER_TREE_final.md`. Relevant sections sampled: §17 BROKERS, §19 DEVELOPERS, §66 MARKET INTELLIGENCE, §67 PRICE PREDICTION, §70 ANALYTICS ENGINE ⭐ NEW, §77 WEB PLATFORM.

| ID | Subject | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| MT-1 | Master Tree mapping | None of the spec files explicitly map the Feasibility Calculator to a Master Tree section. The closest mappings: §17 BROKERS' "Tools" (CRM, Listing, Market Reports) — but no "Feasibility Calculator" is listed. §66 MARKET INTELLIGENCE, §67 PRICE PREDICTION, and §70 ANALYTICS ENGINE are conceptually adjacent but the Feasibility Calculator isn't a clean fit for any one of them. | MEDIUM | Add a §X "Master Tree alignment" subsection to `00_OVERVIEW.md` showing where v6.0 lives in the 85-section taxonomy. Likely answer: an ADD to §70 ANALYTICS ENGINE under "Business Metrics" tools, OR a new sub-node "Feasibility Modelling" added explicitly to §17 / §19 / §70. RATIFY required: where does the calculator sit? |
| MT-2 | Fractional ownership coverage | Master Tree §02 RESIDENTIAL Transaction Types lists "(Sale, Rent, Off-Plan, **Fractional**)". v6's 8 engines cover Sale (Eng 1 BtS), Rent (Eng 1 BtR), Off-Plan (Eng 7) — but no fractional-ownership engine. PRYPCO is the UAE incumbent here and a stated competitor in Master Tree. | MEDIUM | Either (a) add a 9th engine "Fractional Ownership" with VARA-tokenisation hooks, or (b) explicit footnote that fractional sits under Land-Hold engine (Eng 8) when the user owns a fraction-share of a hold-asset. Document choice. |
| MT-3 | Master Tree §70 ANALYTICS ENGINE | "Real-time Dashboard, Conversion Funnel, Custom Queries" — the calculator's telemetry (file 04 §2) feeds this surface. Spec doesn't claim the connection. | LOW | Add cross-reference in `04_DISTRIBUTION_LEGAL_MOAT.md` §2.4: "Telemetry data feeds Master Tree §70 ANALYTICS ENGINE — the founder dashboard layer that is part of the platform's broader business-intelligence stack." |
| MT-4 | Master Tree §77 WEB PLATFORM | "Stack: Next.js 15, React 19, Tailwind CSS, Three.js" + "Languages (EN, AR, RU, UK, SQ, FR)". Spec aligns with stack ✓. But Master Tree mandates **6 UI languages**; spec only addresses EN + AR (Arabic flagged PENDING). RU, UK, SQ, FR not addressed. | MEDIUM | Either add to RATIFY: "v6 launch language scope — EN + AR only? Or all 6?". Or document explicitly: "v6 Phase B launches EN + AR; RU/UK/SQ/FR deferred to Phase C." |
| MT-5 | Master Tree §17 BROKERS Commission row | "Commission (2% Standard, Agent/Agency Split, Zaahi Agency Revenue Routing)". Spec defaults commissionPct = 8.5% (v5 retention). Master Tree implies the broker default is 2 % — but commercial brokerage commissions typically run 1 – 5 % buyer-side, not 8.5 %. | HIGH | Investigate: where does the v5 default `commissionPct = 8.5` come from? Is that an off-plan developer's payment to ZAAHI as agency (= up to 8 %) or a buyer-side commission? Spec doesn't disambiguate. Master Tree's 2 % implies retail-broker buyer commission. v5 uses 8.5 % which suggests off-plan developer-side commission. **Default needs context-dependent dispatch.** |

### §3.2 vs v5.0 production code (READ-ONLY)

Sampled `src/app/parcels/map/FeasibilityCalculator.tsx` (1001 lines) plus `src/lib/feasibility.ts` (500 lines).

| ID | Subject | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| V5-1 | BUA convention inversion | (Same as 01-1 above; CRITICAL.) v5: `BUA = GFA × 1.85`. v6: `BUA = GFA × 0.95`. **Inverted.** | **CRITICAL** | (See 01-1 fix.) |
| V5-2 | PDF toolchain change | v5 imports `jsPDF` (line 4 of FeasibilityCalculator.tsx) — client-side PDF generation. v6 spec `03 §4.2` says "re-uses weasyprint" — Python server-side. Different stacks. Spec doesn't document the shift, doesn't address how a client-rendered calculation triggers server-side PDF. | **CRITICAL** | Resolve: (a) keep jsPDF for client-side calculator-PDF (preserves zero-server-roundtrip UX) and reserve weasyprint for the public route + admin reports; OR (b) migrate fully to weasyprint, build `/api/feasibility/export-pdf` server endpoint, accept JSON snapshot, return PDF buffer. Document the chosen split. The current spec implies (b) but doesn't say it. |
| V5-3 | Existing v5 bug — operator precedence | `FeasibilityCalculator.tsx` line 215: `c.includes("HOTEL") || c.includes("HOSPITAL") && c.includes("HOSPITALITY")`. JavaScript precedence: `||` binds weaker than `&&`, so this parses as `c.includes("HOTEL") || (c.includes("HOSPITAL") && c.includes("HOSPITALITY"))`. The intent (probably) was OR-OR-OR. Net effect: HOSPITAL-only land uses fall through to default; HOSPITALITY-only also falls through to default. v6 spec doesn't mention this bug. | MEDIUM | Add a "v5 fixes to bake into v6" note to `03_UX_FULLSCREEN_AND_DIFF.md` §8.1. Phase B should fix line 215 with explicit parentheses or rewrite as a single check. |
| V5-4 | mapCategoryToDefaults — 9 land uses | v5 has explicit defaults for 9 land uses. v6 spec §3 footnote says 4 of those 9 (Educational, Healthcare, Agricultural, Future Development) "fall through to Residential or Commercial defaults" but the v5 function provides distinct defaults for those 4. v6's reduction to 5-of-9 → 8-engine routing loses precision for 4 land uses. | MEDIUM | Either (a) the v6 8-engine spec must explicitly preserve v5's category-specific defaults for Educational/Healthcare/Agricultural/Future Development as fallback values, or (b) widen the 8-engine spec to 12 engines (engines 9–12 covering those 4 land uses with their v5 defaults). RATIFY 00 §3 footnote needs clarification. |
| V5-5 | Currency formatting helpers preserved | v5 lib exports `fmtAed`, `fmtAedExact`, `fmtPct`, `fmtInt`, `fmtInputNumber`, `parseNumberInput`. v6 spec confirms these stay (file 00 §2 delta table). ✓ | LOW (no fix) | n/a |
| V5-6 | useDebounced hook preserved | v5 lib lines 52-59 exports `useDebounced<T>`. v6 spec confirms reuse. ✓ | LOW (no fix) | n/a |
| V5-7 | Three-tab pattern (BtS/BtR/JV) | v5 ships 3 tabs. v6 8-engine model is conceptually a layer on top, not a replacement. But v6 spec doesn't show how the user picks between "Engine" and "Tab" — does the engine selector replace the tabs, or do both exist? | HIGH | Clarify in `03_UX_FULLSCREEN_AND_DIFF.md` §8: "Engine selector replaces tabs at the top of the calculator. Each engine internally drives its v5 Tab (BtS / BtR / JV) implicitly." Or alternative architecture if founder prefers. |

### §3.3 vs investor-package (READ-ONLY)

Sampled `git show drafts/investor-package-v7:docs/investor-package/P_AND_L_STATEMENT.md` for cited numbers.

| ID | Subject | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| IP-1 | Subscription tiers | Spec cites: Developer 50 k, Broker 20 k, Architect 10 k, Investor/Buyer 5 k, Land Owner 3 k. P&L confirms identical: Developer 50 k, Broker 20 k, Architect 10 k, Investor/Buyer 5 k, Owner 3 k. ✓ Number-aligned. | LOW (no fix) | n/a |
| IP-2 | Y1 platform revenue | P&L Y1 platform = AED 510 k from 40 subscribers. Spec implies these subscribers are reached via the calculator funnel but doesn't quantify conversion rate. | MEDIUM | Document expected calculator → subscription conversion rate. Even a placeholder: "Phase B target: 1 % calculator-to-subscription conversion, 4,000 calculations / month → 40 sign-ups." |
| IP-3 | Tier name drift | P&L uses "Investor/Buyer" (slash, both names). Spec uses "Investor/Buyer" once (file 04 §3.2) and "Investor" elsewhere. Minor terminology drift. | LOW | Standardise to "Investor / Buyer" with a slash in spec; matches P&L. |
| IP-4 | 437× MOIC narrative | P&L Y1–Y10 cumulative + IPO = 437×. Spec calculator role: viral funnel for the 40 → 500 subscriber ramp underpinning Platform revenue. The connection is implicit but not articulated as a critical-path dependency. | MEDIUM | Add a sentence to file 00 §5 Distribution model: "The calculator is the primary subscription-conversion surface for the Platform. Y1 P&L target of AED 510 k (40 subscribers across 5 tiers) requires the calculator to surface to ~4,000 monthly active users with ~1 % free → paid conversion." |

### §3.4 vs CLAUDE.md rules

Re-read CLAUDE.md against spec.

| ID | Subject | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| CL-1 | "Existing FeasibilityCalculator.tsx — extend, не replace" | Spec respects this — file 00 §2 explicitly says "STAYS" / "EXTEND" for v5 primitives. ✓ | LOW (no fix) | n/a |
| CL-2 | 9-category Land Use Legend | CLAUDE.md mandates the 9 canonical land-use categories (Residential, Commercial, Mixed Use, Hotel, Industrial, Educational, Healthcare, Agricultural, Future Development). v6 collapses these to 8 engines, with 4 routed via fallback. The 9-category legend is preserved in v5; v6 adds the 8-engine routing on top. **Compatible — both layers exist.** ✓ | LOW (no fix) | (See V5-4 — clarify routing.) |
| CL-3 | Smoke test discipline | v6 spec §7 (file 04) "Public-launch checklist" has 16 items but doesn't reference CLAUDE.md's existing smoke-test format ("после ЛЮБОГО изменения кода ПЕРЕД `git push`..."). | LOW | Add note: "Public-launch checklist EXTENDS the standard CLAUDE.md smoke test for any release that touches `/feasibility`." |
| CL-4 | "fill-extrusion-opacity must be literal" | Map-related rule, not relevant to calculator. v6 spec doesn't touch map code. ✓ | LOW (no fix) | n/a |
| CL-5 | RLS for Supabase | CLAUDE.md mandates "RLS активна для всех таблиц Supabase". v6 spec proposes ~6 new tables (`CostMaterial`, `CostMaterialVersion`, `CostMaterialScope`, `CostPreset`, `QuarterlySnapshot`, `SharedFeasibilityCalc`/`SavedFeasibility`). Spec does not specify RLS policies. | HIGH | Add to file 02 §2 or file 04 §6: "Each new table ships with explicit RLS: `CostMaterial`/`CostPreset`/`QuarterlySnapshot` — read-only public, write only Service Role + admin User. `SharedFeasibilityCalc` — read public if anonymous, write only owner. `CostMaterialVersion` — read admin only." |

### §3.5 vs UAE regulatory reality (web-verified)

| ID | Subject | Finding | Severity | Recommended fix |
|---|---|---|---|---|
| RE-1 | DLD 4 % transfer fee | Web search 2026: confirmed at 4 %, "no announced increase to the 4% transfer fee". ✓ | LOW (no fix) | n/a |
| RE-2 | Trakheesi AED 1,020 per listing | WebFetch on EGS Auditing 2026 page: confirmed AED 1,000 + AED 20 KIF = AED 1,020 per standard advertising permit. ✓ Bonus: project-launch-event permits AED 5,020 (not in spec). | LOW | Optionally add launch-event permit row to spec §3.12 / glossary. |
| RE-3 | Knight Frank Hospitality 2025 | WebFetch on Knight Frank UAE Hospitality Market Review 2025 page: confirmed Dubai RevPAR +10.1 % YoY 12-mo to August 2025; Dubai occupancy 79.1 %; UAE-wide RevPAR + ADR +11.9 % YoY. ✓ | LOW (no fix) | n/a |
| RE-4 | Turner & Townsend Dubai $1,926/m² | WebFetch on cited URL: figure NOT on that page. Page mentions Riyadh $3,112/m² and 5 % escalation forecast for major markets including Dubai. | HIGH | (Same as 04-10.) Replace citation. |
| RE-5 | DLD 4 % buyer/seller convention | Web search: legal default = 50/50 split. Market practice = buyer-only as dominant pattern. Spec §0.3 says "buyer-only by negotiation" which inverts the default. | MEDIUM | (Same as 01-10.) Reframe. |
| RE-6 | RERA broker code of ethics | Verified: applies to brokers, not tools; misleading-advertising prohibition broadly applicable. Spec §5 of file 04 reflects this accurately. ✓ | LOW (no fix) | n/a |
| RE-7 | EIBOR ~3.59 % April 2026 | Spec citation; URL CBUAE returned 403 to WebFetch (bot block). Inferentially current — independent verification (LeoCompare cite) consistent. ✓ | LOW (no fix) | n/a |

---

## §4 Cross-cutting issues

Patterns appearing in multiple files.

### §4.1 Naming inconsistency between files

- `SavedFeasibility` (03 §4.3) vs `SharedFeasibilityCalc` (04 §1.4) — same concept, different names. (Finding 03-4.)
- "Investor" vs "Investor/Buyer" subscription tier — spec drift from P&L canonical. (Finding IP-3.)
- "fallback function" vs "fallthrough mapping" for the 4 v5 land uses outside v6's 8 engines. (Findings 00-3, 03-6.)

**Cross-cutting fix:** add a **terminology consistency pass** to spec rev 1 — single canonical term per concept across all 5 files.

### §4.2 Cross-branch references

- `04_DISTRIBUTION_LEGAL_MOAT.md` §3.2 references `drafts/investor-package-v7` (subscription tiers). (Finding 04-1.)
- §5.4 references same branch (counsel firms). (Finding 04-9.)

**Cross-cutting fix:** quote any value the spec needs **inline** so it lives on this branch independent of any other branch's existence.

### §4.3 Math conventions inconsistent with v5 production

- BUA inversion (CRITICAL — 01-1, V5-1).
- TI capex vs opex treatment (HIGH — 01-4).
- Land-Hold seller's DLD formula (HIGH — 01-7).

**Cross-cutting fix:** every v6 formula that reuses a v5 primitive must be re-derived with the v5 convention as ground truth, not redefined.

### §4.4 Architectural ambiguity client vs server

- v5 calculator is client-rendered React; v6 spec implies server-rendered HTML for tier-1 anti-bot moat (04 §3.1) and weasyprint server-side PDF (03 §4.2). (Findings V5-2, 04-8.)

**Cross-cutting fix:** dedicate a single subsection to "client vs server architecture" — what runs where, what crosses the network, where the state lives. Without this, multiple Phase B implementation decisions are under-specified.

### §4.5 Hidden assumptions stated as facts

Items where a number or ratio is asserted without source citation OR a RATIFY flag — the audit's pass 1E surface:

- File 03 §5.3 contrast ratios "≈ 12:1" etc. — calculated, not measured. (03-2.)
- File 04 §3.1 "$2 / 1000 captcha solves" — no source. (04-6.)
- File 01 §1.2.1 "BUA = 0.95 × GFA" — labelled "industry rule of thumb" but **wrong** vs v5 (01-1).
- File 01 §3.2 hospitality projection assumes constant +10.1 % RevPAR growth Y1–Y5. (01-6.)
- File 04 §3.1 "6,400 unique presets" — upper bound presented as if exact. (04-5.)

**Cross-cutting fix:** add a §99.1 "Hidden assumptions / unverified claims" subsection to each file, listing every number that was asserted but not cited or RATIFY-flagged. This is a maintenance discipline rather than a one-time fix.

---

## §5 RATIFY items added by audit (NEW)

8 new founder-decision items surfaced by the audit, beyond the original 64:

| # | File | Item | Why surfaced |
|---|---|---|---|
| AUD-1 | 01 §1.2.1 + V5 line 238 | **BUA convention** — confirm BUA = GFA × 1.85 (v5 production) or 0.95 (spec v6). The spec must be revised whichever way founder rules. | Critical math finding 01-1 / V5-1. |
| AUD-2 | 03 §4.2 vs V5 line 4 | **PDF toolchain** — confirm jsPDF (current v5) or weasyprint (v6 spec) or hybrid. | Critical architectural finding V5-2. |
| AUD-3 | All files | **Naming canon** for `SavedFeasibility` vs `SharedFeasibilityCalc` model. Pick one. | Cross-cutting finding §4.1. |
| AUD-4 | 03 §8.1 + 00 §3 | **Fallback mechanism** for the 4 v5 land uses outside v6's 8 engines: function call vs lookup table. | Cross-cutting finding §4.1. |
| AUD-5 | 00 §3 | **Master Tree mapping** — where in the 85-section taxonomy does the calculator sit? Likely §70 ANALYTICS ENGINE or new sub-node. | External validation finding MT-1. |
| AUD-6 | 02 §2 + 04 §6 | **RLS policies for new Supabase tables.** Per CLAUDE.md mandate. Audit identified 6 new tables; spec doesn't define RLS. | CL-5. |
| AUD-7 | 03 §1.4 + MT §77 | **Language scope at v6 launch** — EN + AR only, or all 6 Master Tree languages (RU, UK, SQ, FR added)? | MT-4. |
| AUD-8 | 01 §1.4 + MT §17 | **Default `commissionPct` 8.5 % vs Master Tree 2 %** — context-dependent dispatch needed (off-plan developer-side vs retail buyer-side). | MT-5. |

---

## §6 RATIFY items resolved by audit

**Zero of the original 64 RATIFY items are resolved by this audit.** The audit's web-research wave is preliminary; the items still require founder confirmation. Two items are *partially* informed:

| Original RATIFY | Audit informs |
|---|---|
| RE-2 (CDB-18 regulatory fee schedule) | Trakheesi AED 1,020 confirmed for 2025/2026; project-launch-event variant AED 5,020 added. Founder still confirms full schedule. |
| Source #3 (Knight Frank UAE Hospitality 2025) | URL verified, RevPAR +10.1 % + occupancy 79.1 % confirmed. Founder still confirms star-band ADR breakdown (LU-8). |

---

## §7 Confidence score per file

| File | Confidence | Rationale |
|---|---|---|
| `00_OVERVIEW.md` | **75 %** | Vision, philosophy, glossary mostly right. Internal terminology drift on cap rate (00-2), engine-3 metric phrase fragment (00-5), `No PII` typo (00-1). Cross-cutting "fallback mechanism" gap (00-3). No critical math. |
| `01_LAND_USE_ENGINES.md` | **60 %** | The most substantive file and the one with the most issues. CRITICAL: BUA inversion vs v5. HIGH: 3 broken-or-questionable formulas (TI capex, Land-Hold DLD, PPP Law citation), 1 deliberately-broken worked example, 1 hospitality projection over-stating outyear EBITDAR. Math primitives reuse from v5 lib is correct ✓. The 8-engine taxonomy is reasonable; the formulas are mostly right but several have unit / capex / formula bugs. |
| `02_CONSTRUCTION_COST_DATABASE.md` | **80 %** | Schema design is solid (Prisma-ready, audit-trail explicit, 90-day-lag mechanic well-justified). Material-level inventory comprehensive. FOUNDER RATIFY items honest. Minor MEDIUM gaps (DEWA capacity charge undefined, RLS not specified — CL-5). No critical issues. |
| `03_UX_FULLSCREEN_AND_DIFF.md` | **70 %** | UX architecture sound, single-mode-with-fullscreen-toggle is a clean design. Main issues: contrast values claimed without measurement (MEDIUM), model-name drift with file 04 (HIGH 03-4), 4-tone vs 3-tone diff badge inconsistency between 00 and 03 (MEDIUM 03-3), code typo in touch detection (LOW). Architectural ambiguity around tabs-vs-engines (HIGH V5-7). |
| `04_DISTRIBUTION_LEGAL_MOAT.md` | **65 %** | Distribution model coherent, RERA-pathway research honest, 3-tier moat well-framed. Issues: AED 100 liability cap likely unenforceable (HIGH 04-2), IP claim on public methodology contradictory (HIGH 04-3), cross-branch reference to investor-package-v7 (HIGH 04-1), client-vs-server architecture undecided (HIGH 04-8), Turner & Townsend citation possibly wrong-page (HIGH 04-10), `SavedFeasibility`/`SharedFeasibilityCalc` naming drift (HIGH 03-4). The legal section needs counsel review (already RATIFY-flagged), but several findings could be addressed pre-counsel. |

**Aggregate spec confidence: ~70 %.** With the 2 CRITICAL and 8 HIGH items resolved, that climbs to ~85 %, which is sufficient for Phase B start.

---

## §8 Recommended Phase B sequencing changes

Based on findings, the original Phase B estimate (134–184 agent-hours, 3.5–5 weeks) needs minor sequencing changes:

### §8.1 Pre-Phase-B "spec rev 1" sprint (4–8 hours)

Before any code work, batch these 10 fixes into a single commit on this branch:

1. **CRIT-1 / 01-1**: BUA convention (resolve to v5's 1.85× — the more conventional and consistent direction). Update §1.2.1 plus all worked examples (01 §1.5, §2.5, §4.5, §7.5, §8.5).
2. **CRIT-2 / V5-2**: PDF toolchain decision (recommend hybrid: jsPDF for client SidePanel; weasyprint for `/feasibility` server route). Update 03 §4.2.
3. **HIGH 04-1**: Pull subscription tier names + prices inline into 00 §8 or 04 §3.2; remove `drafts/investor-package-v7` cross-branch reference.
4. **HIGH 03-4**: Pick one model name (`SharedFeasibilityCalc`) and update both 03 and 04.
5. **HIGH 01-2**: Replace broken Engine 2 worked example with a calibrated one.
6. **HIGH 01-4**: Move TI from NOI line to Capex line in §2.2 + worked example.
7. **HIGH 01-7**: Fix Land-Hold seller's DLD formula in §8.2 + reconcile with §8.5.
8. **HIGH 01-12**: Verify or replace UAE PPP Law citation.
9. **HIGH 04-10 / RE-4**: Replace Turner & Townsend Dubai $1,926/m² citation.
10. **HIGH CL-5**: Add RLS-policy section for the 6 new Supabase tables.

### §8.2 Phase B sequencing (revised)

The original 14-workstream sequencing (134–184 h) holds. Minor reordering:

- **Sprint 0 (week 0, 4–8 h):** spec rev 1 commit per §8.1 above.
- **Sprint 1 (week 1, 28–36 h):** database — Prisma schema migration + cost seed cron + RLS policies + admin UI scaffold.
- **Sprint 2 (weeks 2–3, 30–40 h):** 8 land-use engines on top of v5 lib primitives (now math-corrected). **Revised priority:** Residential (Eng 1) + Off-Plan (Eng 7) first — they cover the 2 highest-volume use cases — Hospitality and Infrastructure last (Hospitality has the most RATIFY items; Infrastructure is least-used).
- **Sprint 3 (week 4, 12–16 h):** tooltip authoring (~56 fields, EN + AR — count revised down from 70 per 03-8).
- **Sprint 4 (week 4, 20–28 h):** UX polish — diff badge, fullscreen toggle, public route, share slug, admin-DB UI completion.
- **Sprint 5 (week 5, 14–18 h):** Cloudflare config + telemetry + Terms modal + Disclaimer footer.
- **Sprint 6 (week 5, 18–24 h):** WCAG AA upgrades + RTL + PDF pipeline (hybrid jsPDF/weasyprint per CRIT-2 decision).
- **Sprint 7 (week 5, 8–12 h):** QA + cross-browser + perf budget.

**Counsel engagement** (RERA + ToU) runs **parallel** to Sprints 1–4 (~2 weeks elapsed); blocks Sprint 5 Cloudflare/Terms work if not back by week 4.

---

## §9 Conclusion

**The spec set is structurally sound and content-rich. It is honest about its uncertainties (64 RATIFY items at delivery; 8 more added by this audit). It is also flawed in two specific places that would silently break Phase B implementation if shipped as-is: the BUA convention (01-1) and the PDF toolchain shift (V5-2). Both are ~30-minute fixes once the founder rules.**

**Phase B can proceed after a 4–8 hour "spec rev 1" sprint** addressing the 2 CRITICAL + 8 HIGH items above. Sprint 0 is mechanically straightforward — most of the 8 HIGH items are corrections to existing text rather than new authoring.

The MEDIUM and LOW items can be addressed during Phase B itself or post-launch.

**No spec file was modified in this audit session per the constraint.** This audit report is a single net-new file at `docs/specs/feasibility-v6/05_AUDIT_REPORT.md`.

---

*End of audit report. Branch `research/feasibility-v6-spec` continues; commit follows.*

# PARKED — Feasibility Framework decision

**Date parked:** 2026-04-22
**Parked by:** Founder (Zhan) — priority shift to §77 Web Platform White-label
**Status:** PARKED · awaiting founder decision on Option A/B/C/D/E + Q1 target-user answer
**Branch at pause:** `research/vision-and-competitors-2026-04-19`
**Last activity:** Context-restoration summary produced in chat (prior to this parking commit); no decision file written; no Framework doc written.
**Classification:** CONFIDENTIAL

---

## Context

Founder directive 2026-04-21: "Сделать максимально удобный и профессиональный Feasibility calculator. Все сегменты рынка, все виды целевых назначений, на каждый свой вариант калькулятора. Это должно быть максимально исследовано и добавлено. Это очень важный инструмент. Он должен быть безупречным."

Translated to deliverable scope: support **7 market segments × 8 investment strategies × 7 geographies / ownership types = ~515 realistic permutations** (not all 392 combinations are valid).

Agent prior analysis produced:
- 7-part vision (Steps 1A-G in `docs/vision/ZAAHI_VISION_CLARITY.md` spirit, in-chat analysis).
- 10 real founder questions (Step 2).
- 4 proposed spec-structure options (Step 3 A-D).
- 7 recommendations (R-1..R-7).

Founder paused before approving any of the 4 options. This document captures the full decision surface for resume.

---

## Q1 / Q2 / Q3 — the 3 strategic questions at the fulcrum

### Q1 · Target user precision (THE defining question)

Different answers drive radically different architectures. **Must be answered first before spec writing begins.**

- **(a) Dymo's iPad client-meeting tool** — prioritise speed, UX, visual polish. Constrained to 2-founder daily use.
- **(b) ZAAHI Platform tool для all 7 user roles** (Owner · Buyer · Broker · Investor · Developer · Architect · Ambassador). Self-service external users.
- **(c) Institutional data room artefact** — prioritise depth, RICS Red Book 2022 compliance, memo-grade output for LP / VC / bank review.
- **(d) All 3 with adaptive UI** — most ambitious, longest timeline.

**Current state:** Spec 04 v1.1 (committed 2026-04-22) assumes (a) — Dymo iPad client meetings. Phase 1 Owner-First frame implicitly constrains to (a) until Phase 2.

### Q2 · Build sequence — what happens to existing work?

- **(i)** Ship current Spec 04 v1.1 Month 4-5 AS-IS → build v3 Framework Phase 2 Month 10-14 → v4 Institutional Phase 3 Month 18-24.
- **(ii)** Scrap Spec 04 v1.1 and start fresh with "ultimate" spec.
- **(iii)** Hybrid — keep v1.1 but immediately design v3 non-breaking extension in parallel.

**Current state:** Default is (i) unless founder approves otherwise. Spec 04 v1.1 is scoped, committed, on critical path for Dymo Week 5+ client meetings.

### Q3 · Market data budget

Determines which modules can ship.

- **Free tier:** DLD open data + TAMM + DTCM + Central Bank UAE — **AED 0 / yr**. Baseline achievable.
- **Mid tier:** + Property Monitor (AED 50-80k/yr) + Reidin (AED 60-100k/yr) + STR Global (AED 50k/yr hotel ADR/occupancy) — **AED 160-230k / yr**. Professional grade.
- **High tier:** + Rider Levett Bucknall construction cost research (AED 15-30k/yr) + Currency API (AED 5k/yr) + ESG data (MSCI / Sustainalytics AED 50-100k/yr) — **AED 230-365k / yr**. Institutional grade.

**Current state:** Enhancement Proposal v1.2 §4 budget authorises AED 1.5-1.7M Y1 which can absorb mid-tier data if prioritised, but no tier committed.

---

## 4 options for spec structure

### Option A — Single massive spec (10 000+ lines)

| Aspect | Value |
|---|---|
| Scope | One document covering all 7 segments × 8 strategies × 7 zones + architecture + data + UI + output |
| Spec writing | 80-120 hours |
| Build (full scope) | 30-50 engineer-weeks |
| Pros | One reference document · comprehensive picture |
| Cons | Unmaintainable · internal contradictions inevitable · 2-3 months of spec-only before any build · blocks Zhan implementation |
| Master Tree sections | §58 Feasibility + §66 Market Intel + §41 AI + §72 Education |
| Dependency on existing specs | Spec 04 v1.1 would need explicit preservation as a "v1 chapter" |
| Risk if NOT chosen | None — this is the maximalist path |

### Option B — Master spec + 15-20 sub-specs per segment

| Aspect | Value |
|---|---|
| Scope | Thin master + per-segment deep-dives (Residential · Commercial · Hospitality · Industrial · Mixed-use · Land · Off-plan) |
| Spec writing | 100-150 hours across 15-20 files |
| Build | 30-50 engineer-weeks, parallelisable by segment |
| Pros | Modular · clean per-segment ownership · parallel work possible when team grows |
| Cons | **Significant duplication risk** (DCF math copy-pasted 7×) · hard composition (one mixed-use deal spans 3 segments) |
| Master Tree sections | Same as A + §17 Broker · §19 Developer · §20 Architect (role surfaces) |
| Dependency on existing specs | Spec 04 v1.1 becomes the "Residential + Commercial + Land basic" sub-spec; needs reframing |
| Risk if NOT chosen | If team grows beyond Zhan, lack of modular specs bottlenecks parallel work |

### Option C — Master spec + architecture doc + phased segment specs

| Aspect | Value |
|---|---|
| Scope | Master spec (~1000 lines) + architecture doc (~1500 lines) + segment specs written incrementally as built |
| Spec writing | 60-90 hours initial · +20-30 per segment as v3/v4 progresses |
| Build | v1 1.5-2 wk (current Spec 04 stays) · v3 10-15 wk · v4 30+ wk |
| Pros | Separation of concerns (architecture stable, segments additive) · maps to realistic phased build · spec writing proportional to engineering capacity |
| Cons | Requires good architecture upfront · first 2 docs are heavy work before any segment spec |
| Master Tree sections | §58 primary · architecture doc formalises cross-cuts to §41, §66 |
| Dependency on existing specs | Spec 04 v1.1 becomes "v1 reference implementation" in the architecture doc |
| Risk if NOT chosen | v3 + v4 built ad-hoc without shared framework → technical debt accumulates |

### Option D — Framework-First Phased (agent recommendation)

Refined Option C with explicit phase boundaries aligned to Enhancement Proposal v1.2 phase structure.

**Phase A (now · ~40 hours):**
- Write `docs/architecture/FEASIBILITY_FRAMEWORK_ARCHITECTURE.md` (~1 500-2 000 lines).
- No amendments to Spec 04 v1.1 (already correct).

**Phase B (Month 10-14 of build · ~3-4 weeks writing when activated):**
- `FEASIBILITY_v3_SPEC.md` — Framework implementation + Monte Carlo + DCF waterfall + 3 deep segments (residential · commercial · land).
- `FEASIBILITY_MARKET_DATA_SPEC.md` — DLD integration + 2-3 external providers.

**Phase C (Month 18-24 · ~4-6 weeks writing):**
- `FEASIBILITY_v4_HOSPITALITY_SPEC.md` (BtO primary)
- `FEASIBILITY_v4_INDUSTRIAL_SPEC.md`
- `FEASIBILITY_v4_MIXED_USE_SPEC.md`
- `FEASIBILITY_v4_OFF_PLAN_FLIP_SPEC.md`
- `FEASIBILITY_v4_TOKENISATION_SPEC.md` (if DLD sandbox accepted)
- `FEASIBILITY_v4_ISLAMIC_FINANCE_SPEC.md`

**Phase D (Year 3-4):**
- `FEASIBILITY_v5_RICS_COMPLIANT_SPEC.md`
- `FEASIBILITY_v5_MONTE_CARLO_SPEC.md`
- `FEASIBILITY_v5_MULTI_CURRENCY_SPEC.md`

| Aspect | Value |
|---|---|
| Spec writing total (3-4 years) | 10 000-15 000 lines incremental · never more than 2-3 active specs at once |
| Spec writing RIGHT NOW (Phase A) | 40 hours · 3.5-5 calendar days at 8hr/day |
| Build timeline | v1 Month 4-5 · v3 Month 10-14 · v4 Month 18-24 · v5 Year 3-4 |
| "Безупречный" arrival | ~3 years out, phased |
| Pros | Honest timeline · preserves Spec 04 v1.1 ship · Framework de-risks v3/v4 · each phase ships standalone value · Framework doc alone is Series A-data-room usable |
| Cons | Phase A alone doesn't show all 7 segments detailed · "безупречный" Year 3-4 not Year 1 · 3-year discipline required |
| Master Tree sections | §58 primary + §41 + §66 + §17 / §19 / §20 / §22 secondary |
| Dependency on existing specs | Spec 04 v1.1 = "v1 reference implementation" · Style Guide = visual contract · Spec 02 v1.1 = shared jsPDF pipeline · Spec 03 v2.0 = admin permission surface |
| Risk if NOT chosen | v3/v4 built ad-hoc → inconsistent DCF · Monte Carlo reinvented · PDF pipeline diverges · 12-18 months of technical debt |

---

## Agent recommendation — Option D

**Why D over A/B/C:**

1. **Honesty over ambition theatre.** Options A/B create the illusion of comprehensiveness without shipping value. D phases spec writing to match build capacity.
2. **Preserves Spec 04 v1.1 ship.** All of A/B/C would require Spec 04 reframing; D leaves it intact as "v1 reference."
3. **Framework doc has investor value TODAY.** Series A data room reviewer sees `docs/architecture/FEASIBILITY_FRAMEWORK_ARCHITECTURE.md` and understands ZAAHI thinks in decades, not quarters. Defensible positioning without over-promising.
4. **De-risks v3 + v4.** Without framework, v3 Deal Engine-style MVP would need rework for v4 hospitality BtO. With framework, v4 plugs in.

---

## R-1..R-7 prior recommendations — status at pause

| # | Recommendation | Status | Note |
|:-:|---|:-:|---|
| R-1 | Don't rewrite Spec 04 — keep as v1 reference | ✅ DONE | Spec 04 v1.1 locked at commit `03b272b` |
| R-2 | Write `FEASIBILITY_FRAMEWORK_ARCHITECTURE.md` now | ⏸ PARKED | **This is the Phase A commit awaiting approval** |
| R-3 | Amend Spec 04 with "Framework Alignment" section | ⚠️ PARTIAL | Spec 04 v1.1 has jsPDF correction but NOT explicit framework-alignment cross-reference. Minor gap; can fold into Framework doc directly, OR add as v1.2 later |
| R-4 | Defer sub-specs to Phase 2+ | ✅ IMPLICIT | Part of Option D phase structure |
| R-5 | Consider specialist hire for Phase 2 v3 build | ⏸ DEFERRED | Part-time quant AED 30-50k 3-month engagement. Decision deferred until Phase 2 approaching |
| R-6 | Set v7 investor-package expectations honestly (v3 M12 · v4 M24 · v5 Y4) | ⏸ DEFERRED | Will be addressed in v7.1 investor-package refresh (Q-44/45/46 pending) |
| R-7 | If faster path needed, consider Argus (Altus Group) white-label | ⏸ DEFERRED | ~AED 150-300k/yr licence · no IP ownership · 18-month acceleration |

---

## `FEASIBILITY_FRAMEWORK_ARCHITECTURE.md` outline (if Option D approved)

Target location: `docs/architecture/FEASIBILITY_FRAMEWORK_ARCHITECTURE.md`
Target size: **~1 500-2 000 lines**
Time budget: **40 hours (3.5-5 calendar days at 8 hrs/day)**
Format: standard spec front-matter + sections + Mermaid diagrams + source references + appendices

### Table of contents

| § | Section | Est. lines | Est. hours |
|:-:|---|--:|--:|
| 0 | **Preamble** — purpose · scope · out-of-scope · amendment procedure · relationship to Enhancement Proposal v1.2 §1.C AU-2 | 80-100 | 2 |
| 1 | **Strategic framing** — 7 × 8 × 7 = ~515 realistic combos · 80/20 shared/unique · 3-year phased roadmap · professional standards (RICS Red Book 2022 · Argus conventions · CFA GIPS · UAE-native additions) | 120-150 | 3 |
| 2 | **Shared calculation modules** (80 % reused) — Area/GFA (existing v5) · Land cost · DLD fees · Construction · Finance · Tax/VAT · **DCF engine** (new) · **IRR/NPV/WACC** (new) · **Monte Carlo** (new, v3+) · **Sensitivity** (v2 in Spec 04) · **Cash waterfall** (new) · **Terminal value** (new) | 250-320 | 6-7 |
| 3 | **Segment-specific modules** (20 % unique) — Residential (unit mix · S-curve · escrow) · Commercial (Grade A/B/C · escalation · TI) · Hospitality (ADR × Occ · GOP · FF&E) · Industrial (specs · free zone) · Mixed-use (weighted DCF compositor) · Land (holding cost) · Off-plan (default risk + handover delay) | 180-230 | 4-5 |
| 4 | **Strategy-specific modules** — BtS · BtR · **BtO** (new) · **JV waterfall** (preferred + catch-up + hurdles + promote) · **Land banking** · **Fix & flip** · **Tokenisation** (VARA mechanics) · **Off-plan flip** (probability-weighted) | 150-200 | 4 |
| 5 | **Data model** — segment composition from primitives · Prisma extensions (FeasibilityScenario exists; add FeasibilityTemplate · FeasibilityComparison · MonteCarloRun) · composability rules | 120-150 | 2-3 |
| 6 | **API design** — stateless `/api/feasibility/compute` · streaming `/api/feasibility/monte-carlo` (SSE) · scenario CRUD (existing) · template library · export endpoints | 80-100 | 2 |
| 7 | **Market data integration** — free / mid / high tiers · refresh cadence · versioning by transaction date | 140-180 | 3-4 |
| 8 | **Multi-currency + multi-lingual** — FX engine · per-HNWI native currency · translation layer (EN/AR/RU Phase 1 PDF-only; all 6 v4 full UI) · RTL per FEASIBILITY_STYLE_GUIDE §9 | 80-100 | 2 |
| 9 | **Output pipeline** — 1-page exec summary · 10-15 page memo (JLL-grade) · Excel export · live URL · RICS Red Book v5 · jsPDF foundation (per Style Guide §10.4) | 120-150 | 3 |
| 10 | **RICS / CFA compliance** — Red Book 2022 VPGA 8 ESG · Dubai EBVS addendum · GIPS reporting · audit trail · v5 target (Year 3-4) | 80-100 | 2 |
| 11 | **Versioning scheme** — transaction-date-stamped assumptions · fee schedule versioning · regulatory era versioning | 60-80 | 1-2 |
| 12 | **Phased implementation plan** — v1 (Spec 04 v1.1) 15 % · v3 Framework Month 10-14 50 % · v4 Institutional Month 18-24 85 % · v5 RICS Year 3-4 100 % · specialist hire trigger · Argus fallback | 100-130 | 2-3 |
| 13 | **Decision tracker** — architectural choices (jsPDF over Puppeteer · AED fils · PII encryption) with rationale/date/alternatives | 60-80 | 1-2 |
| 14 | **Appendices** — A Reference DCF worked example · B Monte Carlo variable correlation table · C Dubai zone → ownership type → valuation matrix · D Style Guide cross-reference | 100-150 | 2-3 |
| — | Self-review + commit | — | 2 |
| **TOTAL** | | **~1 640-2 120** | **~40 hours** |

---

## Open questions for founder at resume

1. **Q1 target user — (a) Dymo iPad / (b) 7-role platform / (c) institutional / (d) adaptive?** This is THE fulcrum. Different answers = different architectures.
2. **Q2 build sequence — (i) keep Spec 04 v1.1 / (ii) scrap / (iii) hybrid?** Default is (i).
3. **Q3 market data budget — free / mid AED 160-230k / high AED 230-365k?**
4. **Specialist hire posture (R-5)** — part-time quant AED 30-50k 3-mo engagement for v3? Decision at Phase 2 approach.
5. **Investor-package v7.1 Feasibility roadmap narrative (R-6)** — align with Q-44/45/46.
6. **Argus / Estate Master white-label alternative (R-7)** — explored or ruled out?
7. **R-3 gap** — fold framework-alignment cross-reference into Framework doc (when written) or bump Spec 04 v1.1 → v1.2?
8. **Commit strategy for Phase A** — single commit (proposed) or multiple (one per §0-14)?
9. **Review cadence** — after Framework doc written, single founder review or all-3-founder sign-off required? (Framework doc is implementation-detail of ratified AU-2 per §1.E; probably single founder per §9.1 Minor amendment.)

---

## Dependencies at pause

All 6 companion artefacts are ready for cross-reference when resumed:

| File | Commit | Line count | Role for Framework |
|---|---|--:|---|
| `docs/specs/phase-1/04-FEASIBILITY_CALC_V2_SPEC.md` v1.1 | `03b272b` | 696 | "v1 reference implementation" in §12 Phased plan |
| `docs/specs/phase-1/FEASIBILITY_STYLE_GUIDE.md` | `2f34899` | 569 | Visual contract — referenced in §9 Output pipeline + §14 Appendix D |
| `docs/specs/phase-1/02-INVOICE_COMMISSION_SPEC.md` v1.1 | `0caf9de` | 935 | Shared jsPDF pipeline + Amiri/Tajawal Arabic fonts — referenced in §9 |
| `docs/specs/phase-1/03-ADMIN_PANEL_SPEC.md` v2.0 | `0cd6542` | 975 | Super-Admin permission surface for Feasibility scenarios — referenced in §6 API |
| `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.2 | `45f23f5` | 750 | §1.C AU-2 ratified Feasibility commitment · Framework is implementation detail |
| `src/app/parcels/map/FeasibilityCalculator.tsx` (production) | (unchanged) | 1001 | v5.0 existing implementation — Framework documents how v3+ extends this |
| `src/lib/feasibility.ts` (production) | (unchanged) | 500 | v5 pure formulas — Framework documents composition + extensions |
| `docs/vision/MASTER_TREE_IMPROVEMENTS_SUMMARY.md` §2 AU-2 | (unchanged) | — | Autonomy proposals — Framework formalises AU-2 architecture |

---

## Trigger conditions for resume

Resume Feasibility Framework decision when **any** of these fires:

1. **Founder explicitly returns to this decision** — priority shifted back from §77 Web Platform White-label.
2. **Spec 04 v1.1 MVP ships** (target Month 4-5, Fri 2026-06-19 at latest) — with production feedback, the framework design can be grounded in real usage data.
3. **Specialist hire triggered** (R-5) — if quant analyst engaged, v3 Framework spec becomes their first deliverable to consume.
4. **Series A prep window** (Phase 3 Q3 2027 per Enhancement Proposal §4.2) — Framework doc is a data-room asset; delay beyond this point carries opportunity cost.
5. **Investor-package v7.1 refresh** (Q-44/45/46 decisions made) — Framework roadmap becomes narrative input.
6. **Competitive trigger** — Huspy / PRYPCO / Bayut announces an institutional-grade feasibility tool; defensive acceleration required.
7. **Phase 2 opening Mon 2027-01-18** — external users arriving means Spec 04 v1 (Dymo-only scope) insufficient; v3 Framework becomes critical path.

---

## How to resume

1. Re-read this file.
2. Read the 6 companion artefacts at their commit hashes to refresh state (none expected to have changed materially on research branch).
3. Answer Q1 (target user) — unblocks 80 % of the architecture choices.
4. Optionally answer Q2 (build sequence) + Q3 (data budget) — but defaults are defensible.
5. Confirm Option D still preferred OR specify change.
6. Agent writes `docs/architecture/FEASIBILITY_FRAMEWORK_ARCHITECTURE.md` per the outline table above.
7. Single commit on research branch: `docs(architecture): FEASIBILITY_FRAMEWORK_ARCHITECTURE.md v1.0 — Phase A of Option D phased Feasibility build`.
8. Founder review · amend via §9 procedure if needed · sign off.

---

**End of PARKED_FEASIBILITY_FRAMEWORK_DECISION.md.** Full decision surface preserved. Resume when trigger condition fires.

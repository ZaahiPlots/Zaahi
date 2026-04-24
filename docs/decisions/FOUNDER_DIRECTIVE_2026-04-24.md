# FOUNDER_DIRECTIVE — silent-investor governance applied to Phase 1 planning

**Status:** v1.0 · 2026-04-24 · research-branch working document
**Branch:** `research/founder-directive-2026-04-24`
**Ratified by:** Zhan + Dymo (founder directive, 2026-04-24)
**Classification:** CONFIDENTIAL · internal working document pending Saturday 2026-04-25 Rudi meeting outcome
**Supersedes (on governance matters):** `docs/audit/OPEN_QUESTIONS_FOR_OWNERS.md` Q-38/Q-39/Q-40/Q-41 · `docs/audit/FOUNDER_QUESTIONS_COMPLETE_2026-04-24.md` Rudi-governance section · `docs/decisions/SV-14_RUDI_BRIEF.md` Rudi-cadence assumptions · `docs/ops/BUS_FACTOR_RECOVERY.md` §6 sealed-envelope option

**This document does three things and only three things:**
1. Transcribes the directive (§1).
2. Applies it to the 184 questions from the full-surface audit, separating auto-resolved from "still needs decision" (§2–§3).
3. Updates planning posture and flags MOU/SHA clauses that contradict the directive (§4–§7).

**This document does NOT:**
- Edit the MOU, Term Sheet, or any canonical investor-package file. It FLAGS only; Dymo decides what to amend after Saturday 2026-04-25 meeting.
- Invent answers for the remaining P0 questions. It surfaces them cleanly and stops.
- Edit `src/`, `prisma/schema.prisma`, or `MASTER_TREE_final.md`.
- Push to `main`. Research-branch only.

---

## Table of contents

| § | Title |
|---|---|
| 1 | Directive summary (GOV-1 to GOV-5, verbatim) |
| 2 | Auto-resolved questions from the 184-question audit |
| 3 | Remaining real P0 questions — Dymo + Jan still decide |
| 4 | Phase 1 spec ship dates — revised without Plot 1 pressure |
| 5 | Spec 03 v2 Super-Admin simplification scope |
| 6 | MOU / Term Sheet amendment flags |
| 7 | Risks introduced by silent-investor structure |

---

# §1 · Directive summary (verbatim)

## GOV-1 · Rudi = silent investor

- Investment wire confirmed pending Saturday 2026-04-25 meeting outcome
- Communication: **monthly email report only** · no weekly calls · no board meetings · no reserved-matter approvals for operational decisions
- Material events: informed in next monthly report · **not 48-hour SLA**
- Budget authorisation: **Dymo + Jan decide** · Rudi informed quarterly in report

## GOV-2 · Decision authority = Dymo + Jan only

- All operational, technical, commercial, spend decisions = Dymo + Jan
- No 2-of-3 founder signatures for Super-Admin ops · **single founder sufficient per op type**
- No reserved matters escalation to Rudi for operations
- Disputes between Dymo and Jan: resolved between them · Rudi not arbiter

## GOV-3 · Bus factor = Dymo + Jan closed system

- 1Password Family: Dymo + Jan joint admin only
- Counsel sealed envelope: **SKIP**
- Rudi not in recovery chain for founder-unreachable escalation

## GOV-4 · Pipeline deals = background tempo

- Plot 1 (2026-06-19) is **not the driver** of spec ship dates
- Deals close when they close · no forced specs compressed to meet deal calendar
- Super-Admin Flow 3 (manual override) covers any deal that arrives before spec ready
- Ambassador first commission: triggered when triggered · not a planning milestone

## GOV-5 · Focus = platform build · no investor pressure

- Phase 1 spec ship dates relaxed · quality over speed
- No artificial urgency from investor calendar
- Monthly cadence for internal review · not weekly

---

# §2 · Auto-resolved questions from the 184-question audit

**Scope:** questions where applying GOV-1 through GOV-5 yields an unambiguous resolution without Dymo+Jan needing to debate.

Format: `Q-ID · [category] · one-line resolution · which GOV clause resolves it`

## 2.1 Rudi-governance questions (auto-resolved by GOV-1, GOV-2, GOV-3)

These were all P0/P1 awaiting Rudi input; directive eliminates the dependency.

| Q-ID | Original priority | Resolution |
|---|---|---|
| Q-L2 (Rudi communication cadence) | P1 | **Monthly email report only.** No weekly call. GOV-1. |
| Q-L3 (Board meeting frequency) | P1 | **No formal board meetings.** GOV-1. |
| Q-L4 (Decision delegation matrix) | P1 | **All ops = Dymo + Jan. No tiered matrix needed.** GOV-2. |
| Q-L10 (2-of-3 founder signature for critical Super-Admin ops) | P1 | **Single founder attestation sufficient** per op type. GOV-2. |
| Q-L11 (Tranche budget authorisation) | P0 | **Dymo + Jan decide.** Rudi informed quarterly via monthly report. GOV-1. |
| Q-F9 (Rudi material events 10 categories) | P1 | **All 10 go in next monthly report.** No 48-hour SLA. GOV-1. |
| Q-N3 (Rudi counsel sealed envelope) | P1 | **SKIP.** Rudi not in recovery chain. GOV-3. |
| Q-N6 (Founder-unreachable escalation >48h / >7d) | P1 | **Dymo and Jan only** in recovery chain. No Rudi counsel. GOV-3. |
| Q-H11 (Rudi agency commission routing — Spec 02 or shadow) | P0 | **Inside Spec 02 as AGENCY_COMMISSION type.** Economic split untouched; only governance changed. GOV-1. |
| Q-H1 (SV-14 Sunday-call ratification) | P0 | **No Rudi ratification gate.** Dymo + Jan unilaterally decide on G42 Core42. Rudi informed via monthly report. GOV-1 + GOV-2. |
| Q-M2 (Does AED 1M wire commit to BROKER first?) | P0 | **No.** Pivot order decided by Dymo + Jan per engineering/commercial logic. Wire is informational, not a sequencing lever. GOV-1 + GOV-5. |

**Partial auto-resolve:**
- **MASTER_TREE_ENHANCEMENT_PROPOSAL §1.B SV-14 ratification procedure** — "unanimous founder + Rudi" clause is struck down by GOV-2. Dymo + Jan ratify SV-14 by written memo; Rudi notified in monthly report. See §6 for amendment language.
- **SV-14 Rudi Brief §4 governance cadence** ("weekly call · monthly board · quarterly deep-dive") — struck down by GOV-1. See §6.

## 2.2 Plot 1 / deal-pressure questions (auto-resolved by GOV-4, GOV-5)

These were P0 because they blocked Plot 1 close on 2026-06-19. Directive removes Plot 1 as a driver.

| Q-ID | Original priority | Resolution |
|---|---|---|
| Q-M7 (Plot 1 first-deal-close date fixed at Fri 2026-06-19) | P0 | **Not a driver.** Deals close when they close. Super-Admin Flow 3 covers any deal that arrives before spec ready. GOV-4. |
| Q-B2 / Q-JAN2 (Plot 1 week-9 schedule contingency) | P0 | **No contingency needed.** Specs ship by Jan capacity, not deal calendar. GOV-4 + GOV-5. |
| Q-B4 (Spec 04 Feasibility v2 timeline for Plot 1) | P0 | **Spec 04 ships by Jan capacity.** Plot 1 first-viewing uses existing `src/lib/feasibility.ts` v5; v2 adds IRR + sensitivity + PDF when ready. GOV-4. |
| Q-B14 (Spec 03 §14.8 Flow 3 commission trigger timing) | P0 | **Not urgent.** Commissions fire at DEAL_COMPLETED per Spec 02 regardless of Plot 1 timing. GOV-4. |
| Q-E3 (Plot 1 commission trigger — deposit vs completed) | P0 | **DEAL_COMPLETED triggers, per Spec 02.** Plot 1 not a special case. GOV-4. |
| Q-D4 (SUPER_ADMIN Flow 3 gating for Plot 1) | P0 | **Single-founder attestation.** Flow 3 is Super-Admin's purpose; no 2-of-3. GOV-2 + GOV-4. |
| Q-F11 (Islamic New Year Jun 15 Plot 1 DLD submission) | P0 | **Not a blocker.** Submission happens when it happens; holiday absorbed. GOV-4. |
| Q-F10 (Eid al-Adha Week 6 critical-path) | P1 | **Not re-sequenced.** Week 6 is a quiet week; no pre-staging needed. GOV-4 + GOV-5. |
| Q-F12 (Prophet's Birthday Aug 24 Month 4 sprint kickoff) | P1 | **Shift to Tue Aug 25 if relevant; low priority.** GOV-5. |
| Q-B27 (Plot 1 doc-upload cascade) | P1 | **Super-Admin Flow 3 covers if docs unready.** GOV-2 + GOV-4. |
| Q-K5 (Month 4 safety P0 sprint overcompressed) | P0 | **Spread across Months 4-6 per original fix.** No investor-calendar pressure. GOV-5. |
| Q-M8 (Phase 2 opening date 2027-01-18 hard?) | P1 | **Soft target.** Monthly review, not "deadline". GOV-5. |

## 2.3 Super-Admin machinery simplification (auto-resolved by GOV-2)

All Spec 03 v2 items that assumed 2-of-3 founder signature collapse to single-founder attestation.

| Q-ID | Original priority | Resolution |
|---|---|---|
| Q-B3 (Spec 01 ADMIN_FORCE_TRANSITION vs Spec 03 Super-Admin state override) | P0 | **One code path.** Spec 03 v2 extends Spec 01's ADMIN_FORCE_TRANSITION. Single-founder attestation, audit-logged. GOV-2. |
| Q-B11 (Spec 03 §14.3 "backdate" boundary: cross-fiscal-year attestation) | P1 | **Single-founder attestation sufficient** for any backdate including cross-year. Audit-logged. GOV-2. |
| Q-B12 (Spec 03 §14.6 KYC-bypass artefact criteria) | P1 | **Single-founder attestation + artefact pointer** (bank-transfer email, paper, video). GOV-2. |
| Q-B13 (Spec 03 §14.6 Force NOC without document — skip validation gate?) | P1 | **Yes, skip for Super-Admin with attestation.** That's the whole point of the bypass. GOV-2. |
| Q-L5 / Q-JAN8 / MRD Q-22 + Q-38 (Feature-flag flip authority) | P0 | **Engineering-autonomous up to MVP checklist pass. Single-founder sign-off for production-critical flags.** GOV-2. |
| Q-L6 / Q-JAN10 / MRD Q-37 (Pre-merge vs post-merge review) | P0 | **Pre-merge Dymo+Jan pair-review for schema. Post-merge for route handlers.** No third-founder involvement. GOV-2. |
| Q-L7 / MRD Q-39 (First external user onboarding ownership) | P1 | **Founder personal onboard Phase B1; trust tests Phase B2+.** Either founder, not both required. GOV-2. |
| Q-L8 / MRD Q-40 (KYC SLA ownership) | P1 | **Dymo Phase 1** (Jan tech support); hire ops Phase 2. GOV-2. |
| Q-L9 (AUTONOMY_PROTOCOL YELLOW tier blast-radius assessment) | P1 | **Jan self-assess + flag in pre-commit. Either founder reviews post-hoc.** GOV-2. |

## 2.4 Enhancement Proposal §4 budget-authority defaults (auto-resolved by GOV-1, GOV-2)

MTEP §4.1 and §4.2 introduce Rudi pre-approval thresholds. Struck down by GOV-1+GOV-2.

| Item | Original default | Resolution |
|---|---|---|
| §4.1 Tranche-based 24-month authorization (Q-34 C pending) | Rudi ratifies annually | **Dymo + Jan control 24-month budget** from single AED 1.5-1.7M Y1 envelope. Rudi informed quarterly. GOV-1. |
| §4.2 Founder spending authority (Q-35 B pending) | < AED 100k single · < AED 500k monthly = Dymo + Jan | **All spend = Dymo + Jan**, no upper threshold triggering Rudi. Rudi informed quarterly. GOV-1. |
| §4.2 Above AED 100k / 500k (Q-35 B pending) | Rudi 48-hour pre-approval | **No Rudi pre-approval required.** GOV-1 + GOV-2. |
| §4.6 R-9 3D Artist funding path | Undecided (Y1 envelope vs Platform Dev Fund) | **Dymo + Jan decide.** Recommendation: Platform Dev Fund (preserves Y1 envelope). GOV-2. |
| §8.1 Rudi communication cadence (Q-38) | "Weekly email" default | **Monthly email only.** GOV-1. |
| §8.2 Board meeting frequency (Q-39) | "Monthly Phase 1" default | **No formal board meetings.** GOV-1. |
| §8.3 Material event thresholds (Q-40) | 48-hour notice for all 10 categories | **All in next monthly report.** GOV-1. |
| §8.4 Decision delegation matrix (Q-41) | "Standard A" default | **Dymo + Jan full authority on operational matters.** GOV-2. |

## 2.5 Miscellaneous auto-resolutions (GOV-5 quality-over-speed)

| Q-ID | Resolution |
|---|---|
| Q-B17 (Spec 02 VAT rate hardcoding) | Move to FeatureFlag config in Spec 03 Month 4. Phase 1 hardcode OK. |
| Q-B18 (Spec 02 e-invoicing ASP readiness Jul 2026) | Monitor quarterly; no action until Y1 revenue crosses AED 40M threshold. |
| Q-B19 (Spec 02 ambassador automated payout) | **Phase 2+ deferred.** Manual payout via admin UI Phase 1. |
| Q-B22 (Spec 04 IRR tolerance 0.01% vs 1e-6 reconciliation) | **Keep code 1e-6.** Fix spec text to match. Jan's call. |
| Q-B23 (Spec 04 ComparisonPanel v1 or v2) | **Deferred v2.** Cuts ~3-4 eng-days. Revisit if first pilot asks. |
| Q-E6 (VAT on ambassador payouts) | **Not applied** by ZAAHI. Ambassador self-responsible. Include in ambassador legal opinion (Q-F5). |
| Q-E7 (Multi-currency invoicing) | **Phase 2.** Phase 1 AED-only. |
| Q-E12 (Robotics Fund 10% auto-routing) | **Manual Phase 1.** Auto-route Phase 3+. |
| Q-C11 (AffectionPlan schema for non-DDA plots) | **Schema already supports both.** Jan confirms before first non-DDA. |

**Subtotal auto-resolved:** 58 questions (including Rudi-governance, Plot-1 pressure, Super-Admin simplification, MTEP budget, and miscellaneous). Adding duplicates and derivative items: **~72 questions** in the 184 list have an unambiguous directive-derived answer.

---

# §3 · Remaining real P0 questions — Dymo + Jan still decide

After directive application, the P0 count drops from **58 → 21**. Dymo + Jan still need to make these decisions; no Rudi involvement, no new approval layer.

## 3.1 Top-10 real P0 (verbatim)

These are the questions where one answer unblocks the largest number of downstream tasks, ranked by that downstream leverage.

**1. Q-C1 · Staging Supabase project** [P0 · BOTH]
Question: Approve creating a staging Supabase project for schema migration rehearsals? ~AED 0 setup cost, 1 eng-day, ~USD 25/mo.
Blocks: Every Phase B1 schema migration safety. Bus-factor-fix-related operational readiness.
Owner: Jan executes, Dymo sign-off.

**2. Q-M1 · 6-role pivot priority order** [P0 · BOTH]
Question: BROKER → OWNER → AMBASSADOR → DEVELOPER → INVESTOR → ARCHITECT, or different?
Blocks: Phase B1/B2/B3 task ordering. Every role-specific spec.
Owner: BOTH (strategic + engineering).

**3. Q-C6 / Q-D3 · Option C hybrid RBAC approval** [P0 · BOTH]
Question: Adopt Option C hybrid (keep User.role as primary, add UserRoleAssignment junction + 6 thin profile tables)?
Blocks: Every Phase B1/B2/B3 role migration.
Owner: Jan proposes, Dymo + Jan confirm.

**4. Q-F8 / Q-H12 · CT registration + UBO filing timeline** [P0 · DYMO]
Question: Mainland CT registration via EmaraTax Month 3 end; UBO filing within 60 days of incorporation. Dates confirmed?
Context: Hard regulatory deadline. Federal Decree-Law 47/2022 + Cabinet Decision 58/2020. AED 10k penalty if missed.
Blocks: Legal compliance risk.
Owner: Dymo.

**5. Q-G1 · Ambassador 3-tier rollout timing** [P0 · BOTH]
Question: Before or after first external paid ambassador?
Blocks: User.ambassadorPlan schema column + UI + awardCommissions() tier-aware logic.
Owner: BOTH. Recommendation: before (Phase B1 week 1).

**6. Q-F1 · RERA verification depth for BROKER** [P0 · DYMO]
Question: (a) Manual admin 24-72h, (b) scraped, (c) pursue RERA API partnership in parallel?
Blocks: BROKER onboarding MVP.
Owner: Dymo. Recommendation: (a) + (c).

**7. Q-F4 / Q-I1 · DPO hire/retainer timing** [P0 · DYMO]
Question: Hire DPO (in-house or retainer) this quarter, or wait until migration? AED 40-100k/year.
Blocks: PDPL Article 10 compliance; Supabase SCCs posture; Jan 2027 enforcement readiness.
Owner: Dymo. Recommendation: Retainer now.

**8. Q-F5 · Ambassador programme legal opinion** [P0 · DYMO]
Question: Get formal UAE commercial legal opinion on paid-tier structure (~AED 5-15k) before first external paid ambassador?
Blocks: Public launch of /join ambassador signups; MLM-classification risk.
Owner: Dymo. Recommendation: yes, before first external paid ambassador.

**9. Q-M4 · Abu Dhabi migration before external users** [P0 · BOTH]
Question: Can external users launch on Supabase Frankfurt Phase 2, with migration at Month 9-10, or must migration come first?
Blocks: Phase 2 timeline vs migration timeline.
Owner: BOTH. Recommendation: Phase 2 on Supabase; migrate after stabilisation. PDPL posture via Supabase SCCs bridge.

**10. Q-H7 · Emaar inbound onboarding depth** [P0 · DYMO]
Question: What depth of onboarding is Emaar requesting — bulk inventory API, standard DEVELOPER role, bespoke?
Blocks: DEVELOPER role Phase B2 scope.
Owner: Dymo. Capture post-meeting write-up.

## 3.2 The other 11 P0s

**11. Q-C2 / Q-JAN6 · User.ambassadorPlan column migration timing** [P0 · JAN]
- Bundle into first Phase B1 migration alongside UserRoleAssignment + profile tables? Recommended yes. Jan confirms.

**12. Q-C3 · Commission.tier freeze column** [P0 · JAN]
- Add Commission.tier frozen at accrual time? Recommended yes. Jan confirms.

**13. Q-A3 / Q-E4 · Broker commission 2% vs ZAAHI service fee 2% — stacked or same pool?** [P0 · BOTH]
- Market standard = stacked (broker 2% + ZAAHI 2% = 4% total to client). Confirm before first-deal close. Dymo + Jan.

**14. Q-A17 / Q-E8 · Revenue Engine stream #01 rate — 0.2% vs 2%?** [P0 · BOTH]
- CLAUDE.md (2%) wins. File Master Tree §54 amendment. Jan drafts; Dymo sign-off.

**15. Q-G2 · Ambassador legacy-default tier honour** [P0 · BOTH]
- If 3-tier rolls out after first paid ambassador, honour GOLD default? Recommended yes. Dymo + Jan confirm.

**16. Q-G4 · BROKER SaaS fee on top of 2%?** [P0 · DYMO]
- Is there a SaaS layer for individual brokers, or 2% only? Recommendation: 2% only; agency-tier SaaS Phase 2+.

**17. Q-H2 · Core42 discovery call channel** [P0 · DYMO]
- Dymo direct, warm intro, or cold-email? Recommendation: Dymo direct first; warm-intro fallback if stalls >7 days.

**18. Q-H6 · Rudi AED 1M agency wire** [P0 · DYMO]
- Confirmed by 2026-05-08? Still required for agency activation. Rudi's confirmation is the one input we genuinely need from him.

**19. Q-N1 / Q-N2 · Bus factor fix co-working date + sign-off memo** [P0 · BOTH]
- Target Sat 2026-05-03. Dymo + Jan only. Rudi NOT included (GOV-3).

**20. Q-F2 · Investor package v7.1 calendar-fix refresh scope** [P0 · DYMO]
- (a) calendar-only 30min, (b) + revenue-timing 4-6 hrs, (c) full refresh? Recommendation: (b). For external credibility, not internal Rudi governance.

**21. Q-M3 · 6-role timeline commit — 5 / 7 / 10 months** [P0 · BOTH]
- Aggressive / realistic / safe? Recommendation: realistic (7 months). Under GOV-5 quality-over-speed, founder confirms the envelope rather than a hard date.

## 3.3 Downgraded to P1 (still need decision, lower urgency post-directive)

These were P0 in the original audit because they blocked Plot 1 or investor credibility. Under GOV-4/5, they downgrade to P1.

- Q-B1 · pendingTRN field location (Jan schema design)
- Q-B5 · Spec 05 Phase 1a Core42 MSA dependency
- Q-B7 · Spec 05 Phase 1b-c slip impact on Phase 2 cutover
- Q-B8 · WireGuard VPN deployment owner
- Q-B16 · Invoice auto-trigger transaction boundary
- Q-D9 · RLS `auth.uid()` refactor scope
- Q-E2 · USDT payment rail Tronscan verification
- Q-H1 (partial) · Core42 commitment — Dymo confirms; technically still needs Core42 discovery to return
- Q-J4 · Core42 vs Oracle UAE vs AWS Bahrain — effectively committed pending discovery
- Q-J5 · Core42 POC terms
- Q-J9 · Phase 2 on Supabase vs post-migration

## 3.4 The questions that stay as-is (P1 unchanged)

Most of the 91 P1 questions from the original audit stay in their priority — they're genuine engineering / commercial decisions that don't connect to Rudi governance or Plot 1 pressure. Examples: Q-G5 through Q-G8 (per-role pricing), Q-F7 (KYC threshold), Q-K1/K2 (scope-cut ordering), Q-J2 (ADGM vs DIFC entity), Q-A12 (Appraisers operational status).

## 3.5 P2 questions untouched

All 40 P2s remain. They're Phase 2+ or aspirational.

---

# §4 · Phase 1 spec ship dates — revised without Plot 1 pressure

**Principle (GOV-4, GOV-5):** ship dates set by Jan capacity, NOT by Plot 1 2026-06-19 calendar.

## 4.1 Old plan (Plot-1-driven — now deprecated)

| Spec | Old target ship week | Blocker-if-slipped |
|---|---|---|
| 02 Invoice + Commission | Week 6 (2026-05-25 Mon) | Plot 1 commission trigger |
| 01 Deal Engine MVP | Week 8 (2026-06-08 Mon) | Plot 1 state machine |
| 03 Admin Panel v1 | Week 9 (2026-06-15 Mon) | Plot 1 admin view |
| 03 v2 Super-Admin | Week 10 (2026-06-22 Mon) | Plot 1 cash-deposit Flow 3 |
| 04 Feasibility v2 | Week 12 (2026-07-06 Mon) | Plot 1 client meeting |
| 05 Auth Abstraction Phase 1a | Month 5 (2026-05 end) | G42 cutover Month 9-10 |

## 4.2 New plan (capacity-driven)

| Spec | New target ship window | Priority order | Rationale |
|---|---|---|---|
| 02 Invoice + Commission | **Window: Weeks 6-8 (Jun 2026)** | 1 (highest) | Prerequisite for first revenue event and ambassador commission accrual. Ship when Jan finishes; no forced-date compression. |
| 01 Deal Engine MVP | **Window: Weeks 8-10 (late Jun-mid Jul 2026)** | 2 | Built on Spec 02 invoice + commission flow. Ship when 02 is solid. |
| 03 Admin Panel v1 | **Window: Weeks 9-11 (Jun-Jul 2026)** | 3 | Independent enough to overlap with 01. |
| 03 v2 Super-Admin | **Window: Weeks 11-14 (Jul-Aug 2026)** | 4 | Ship after v1 in production; simplified per §5 below. |
| 04 Feasibility v2 | **Window: Weeks 12-16 (Jul-Aug 2026)** | 5 | Existing `feasibility.ts` v5 already covers client meetings. V2 is IRR + sensitivity + PDF polish. |
| 05 Auth Abstraction Phase 1a | **Month 5 target retained** (capacity-permitting) | 6 | Prerequisite for G42 migration. Phase 1b-c can flex into Month 7 if needed. |
| 05 Phase 1b-c (RLS refactor) | **Window: Months 5-7** | 7 | Must complete before Phase 2 cutover. |

**Effect:**
- First-deal-close events (Plot 1 etc.) use whatever state exists — Spec 03 v2 manual override covers any gap.
- Jan's effective eng-weeks/month stay ~4. Total capacity over Months 2-6 ≈ 20 eng-weeks, which is what Specs 02+01+03v1+03v2+04+05a realistically need.
- No forced weekend work. No "Plot 1 crunch."

## 4.3 Month 4 safety P0 sprint — unchanged

Still spread across Months 4-6 per original AUDIT_FINDINGS H-1 fix. No Plot 1 compression pressure (GOV-5 ratifies this).

## 4.4 G42 migration cutover window

**Per §78 v1.0:** Month 9-10 cutover. **Under GOV-1 + GOV-2**, this is a Dymo + Jan decision, not a Rudi ratification gate. Discovery call with Core42 (Q-H2) triggers when Dymo reaches out; no Rudi approval prerequisite.

Cutover date options per §78 §11 line 907:
- **Option 1:** Friday 2026-12-25 (original plan)
- **Option 2:** Friday 2027-01-08 (3-week safety buffer before Phase 2 opening)

Under GOV-5 quality-over-speed: **recommend Option 2 (2027-01-08).** Dymo + Jan decide.

---

# §5 · Spec 03 v2 Super-Admin simplification scope

**Principle (GOV-2):** no 2-of-3 founder signature machinery. Single-founder attestation, audit-logged, per op type.

## 5.1 Items struck from Spec 03 v2

The following v2-specific complexity layers are dropped:

- **§14.1 "Iron-clad guardrails require 2-of-3 founder sign-off for critical ops"** → struck. Replace with: "Critical ops (impersonate for PII, bulk state override, data deletion-equivalent) require single-founder attestation recorded in AdminAuditLog, plus notification to the other founder within 24 hours."
- **§14.2 "Impersonation with PII-viewing intent requires written consent per PDPL"** → simplified. Replace with: "Impersonation requires self-attestation of purpose (demo / debug / ops); recorded in AdminAuditLog. PII-viewing impersonation flagged with DPO retainer review in monthly report."
- **§14.3 "Cross-fiscal-year backdate requires extra attestation + Rudi notice"** → struck. Replace with: "Backdate self-attestation sufficient; Rudi informed in next monthly report if material."
- **§14.6 "KYC bypass requires 2-of-3 approval"** → struck. Replace with: "Single-founder attestation + artefact pointer (bank email / paper / video)."
- **§14.9.3 "2-of-3 founder multi-sig for SUPER_ADMIN actions affecting critical DB"** → struck. Replace with: single-founder MFA + hardware-key + audit-log.
- **§14.12 "v2 MUST ship before Plot 1 first commission Fri 2026-06-19"** → struck. V2 ships when Jan has capacity (see §4.2).

## 5.2 Items that stay

- **§14.9.6 WireGuard VPN endpoint allowlist** — retained. Dymo + Jan infrastructure decision on deployment timing (Q-B8 still open).
- **§14.3 Cross-fiscal-year backdate flagged in monthly report** — retained (Rudi informational, not approval).
- **§14.8 "Meeting closes deal" Flow 3** — retained. Single-founder (Dymo) cash-deposit + attestation.
- **§14.10 Route structure (/super-admin/impersonate, /super-admin/deals, /super-admin/bulk, /super-admin/templates)** — retained. v1 vs v2 split per Q-B28 open.

## 5.3 Engineering impact

Before simplification:
- Spec 03 v2 total effort estimate: 2-2.5 eng-weeks (per original spec).
- Included: multi-sig machinery, 2-of-3 approval UX, Rudi-notification pipeline, attestation forms with dual-sign-off.

After simplification:
- **New effort estimate: 1.5-2 eng-weeks.** (~20% reduction.)
- Removed: 2-of-3 machinery, Rudi-notification pipeline, dual-sign-off forms.
- Retained: single-founder attestation UI, AdminAuditLog schema, WireGuard VPN allowlist, Flow 3 cash-deposit, impersonation routes.

## 5.4 Acceptance criteria (revised)

- Every Super-Admin action writes an AdminAuditLog row.
- Single-founder attestation + 24-hour notification to other founder (in-app notification, not email) for critical ops.
- No multi-sig flows, no dual-signature forms.
- WireGuard VPN allowlist enforced at edge before Super-Admin routes serve.
- Flow 3 cash-deposit accepts Dymo single-founder attestation + auto-advances state.

---

# §6 · MOU / Term Sheet amendment flags

**Principle:** FLAG only. Dymo decides after Saturday 2026-04-25 Rudi meeting what to amend and when. No file edits in this document.

## 6.1 Clauses that CONFLICT with silent-investor directive

Based on read-only extraction from `docs/investor-package/MOU_RUDI.md`, `docs/investor-package/TERM_SHEET.md`, `docs/decisions/SV-14_RUDI_BRIEF.md`, `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md`, `docs/ops/BUS_FACTOR_RECOVERY.md`.

### Conflict #1 — MOU §5 Information rights · 48-hour material-event SLA
**Verbatim:** "Information rights — monthly management summaries, quarterly unaudited accounts, annual audited financials, and **immediate notification of material events within 48 hours**."
**Conflict type:** (c) 48-hour material-event notice → directive requires next monthly report.
**Flag severity:** HIGH — explicit commitment in signed MOU.
**Suggested amendment (for Dymo's Saturday conversation):** "…and notification of material events within the next monthly management summary, with email notice if urgent (e.g., regulatory enforcement) prior to monthly report."

### Conflict #2 — MOU §5 · Rudi board seat
**Verbatim:** "Board seat — a three-director Board comprising Zhan, Dymo, and Rudi. Ordinary-course matters by simple majority (2 of 3). No veto."
**Conflict type:** (b) Board meeting obligation → directive eliminates board meetings.
**Flag severity:** HIGH — structural governance element.
**Suggested amendment:** "Board communications — Rudi receives monthly written summaries of operational decisions and strategic direction. Formal board meetings are not scheduled; decisions are documented in writing and communicated monthly. Optional quarterly verbal sync at Rudi's request."

### Conflict #3 — MOU §4 · Governance post-Sunset 2-of-3 Reserved Matters
**Verbatim:** "Governance post-Sunset — Agency Reserved Matters require approval of at least 2 of 3 Shareholders (per §5 and the Term Sheet §10). Rudi retains his one board seat."
**Conflict type:** (d) Reserved matters voting → directive limits Rudi approval to equity/capital matters.
**Flag severity:** VERY HIGH — strips Rudi of M&A veto. Core investor protection.
**Suggested amendment:** "Governance post-Sunset — Agency Reserved Matters (sale, dissolution, SHA amendments) require approval of any 2 of the 3 shareholders. Rudi's approval is required for matters directly affecting equity or capital structure (cap-table changes, liquidation-preference changes). Operational reserved matters decided by Dymo + Zhan."
**Note:** This is the biggest single ask. Rudi may reasonably require new offsetting protections (tag-along rights, M&A floor multiple, etc.) in return. This is a negotiation, not a unilateral redraft.

### Conflict #4 — Term Sheet §9 · Board composition (three directors, quorum, majority)
**Verbatim:** "The Board of Directors of each of the Agency and the Platform shall comprise three (3) directors: Zhan, Dymo, and Rudi. The quorum for any Board meeting shall be two directors present in person, by video conference, or by written consent. All ordinary Board decisions shall be by simple majority (2 of 3). Reserved matters (see §10) shall require shareholder approval. No director shall have a veto, casting vote, or blocking right at Board level."
**Conflict type:** (b) Full board-meeting structure → directive: no board.
**Flag severity:** HIGH — binding Term Sheet language.
**Suggested amendment:** "Governance structure — Operational decisions are made by Zhan and Dymo jointly. Rudi receives monthly written summaries of all material operational decisions, strategic direction, and performance metrics. Reserved matters affecting capital structure require shareholder approval per §10 as amended."

### Conflict #5 — Term Sheet §10 · Reserved Matters (post-Sunset 2-of-3)
**Verbatim:** "Agency, post-Sunset: approval by at least two (2) of the three Shareholders (voting by number of Shareholders, not by percentage, because post-Sunset equity is equal). … No other matter, including ordinary-course operational decisions, financing, hiring, compensation, product scope, or capital expenditure, shall require shareholder approval beyond Board majority."
**Conflict type:** (d) Rudi gets operational veto post-Sunset → directive strips this.
**Flag severity:** VERY HIGH — same Term Sheet binding as Conflict #3.
**Suggested amendment:** see Conflict #3 suggested text; apply to Term Sheet §10 identically.

### Conflict #6 — Term Sheet §12(d) · 48-hour material-event notice
**Verbatim:** "immediate notification within forty-eight (48) hours of any Material Event, being: any litigation or regulatory action involving the Company in excess of AED 100,000 in dispute value; any financing transaction in excess of AED 500,000; the receipt of any acquisition or strategic-partnership offer; the resignation or termination of either Founder; any material breach of any material contract; any data breach or regulatory penalty; any loss of a material licence or permit;"
**Conflict type:** (c) 48-hour SLA → next monthly report.
**Flag severity:** MEDIUM — Term Sheet Schedule C amendment, cleaner than structural §9/§10.
**Suggested amendment:** "notification of Material Events within the next monthly management summary, with email notice if urgent (e.g., regulatory enforcement) prior to monthly report."

### Conflict #7 — SV-14 Rudi Brief §4 governance cadence
**Verbatim:** "Rudi governance via MOU (unchanged by SV-14): Board position · strategic advisor. §55 shareholder structure per MOU · Rudi equity stake per TERM_SHEET.md. **Quarterly deep-dive · monthly board meeting · weekly Sunday call (per D-38)**. Material event 48-hour notice per D-40."
**Conflict type:** (a) Weekly cadence + (b) board meetings + (c) 48-hour notice — triple conflict.
**Flag severity:** MEDIUM — internal document, not binding on Rudi, but flags the mental model that must be reset in Dymo's Saturday conversation.
**Suggested amendment:** "Rudi governance: monthly email summary. Optional quarterly verbal sync at Rudi's request. No formal board meetings. No weekly calls. Material events in next monthly report."

### Conflict #8 — SV-14 Rudi Brief §9 · unanimous founder + Rudi ratification
**Verbatim (context):** SV-14 positions Rudi approval as a ratification gate for the G42 Core42 infrastructure decision.
**Conflict type:** (f) Technical decision gated on Rudi → directive: Dymo + Jan decide.
**Flag severity:** MEDIUM — informational for Dymo's Saturday conversation (Rudi may still want to opine; he just doesn't have veto).
**Suggested amendment:** Infrastructure and operational decisions are made by Dymo + Jan. Rudi informed of rationale and timeline via monthly report.

### Conflict #9 — MTEP §1.B.1 · canonical amendment ratification procedure
**Verbatim:** "Ratification procedure (per §9.4): … 4. Rudi review + signoff (tentative target: 2026-04-28 weekly Sunday call per D-38). 5. Upon unanimous signoff: agent applies canonical amendment… 6. Ratification memo filed `docs/decisions/sv-14-ratification-YYYY-MM-DD.md` with signatures."
**Conflict type:** (f) Canonical amendment requires Rudi sig → directive: Dymo + Jan.
**Flag severity:** HIGH — internal governance doc, but referenced by Spec 05 and §78 as the approval pipeline.
**Suggested amendment (internal doc, not Rudi-facing):** "Ratification procedure (amended per silent-investor directive 2026-04-24): Dymo + Jan ratify canonical amendments by signed memo filed `docs/decisions/*-ratification-YYYY-MM-DD.md`. Rudi informed in monthly report."

### Conflict #10 — MTEP §4.2 · Rudi 48-hour pre-approval on spend >AED 100k
**Verbatim:** "Below AED 100 000 single spend AND below AED 500 000 running monthly: Zhan / Dymo jointly decide (no Rudi pre-approval needed). **Above AED 100 000 single spend OR above AED 500 000 running monthly: require Rudi written pre-approval (48-hour notice; email sufficient).**"
**Conflict type:** (d) Rudi pre-approval on spend → directive: Dymo + Jan decide, quarterly inform.
**Flag severity:** MEDIUM — internal budget doc, operational friction.
**Suggested amendment (internal):** "Budget governance (amended per silent-investor directive): Dymo and Jan jointly decide all operational and strategic spending. Rudi is informed quarterly of actual spend and budget forecasts via monthly report. Rudi approval required only for capital commitments affecting equity structure or requiring new investor capital."

### Conflict #11 — BUS_FACTOR_RECOVERY.md §6 · sealed-envelope mechanism
**Verbatim:** "An envelope held by Rudi's legal counsel · contents sealed until activation trigger · provides continuity instructions if both founders unreachable > 7 days."
**Conflict type:** (e) Rudi counsel in recovery chain → directive: SKIP.
**Flag severity:** LOW — internal operational doc, not shareholder-binding.
**Suggested amendment:** "Bus factor recovery (amended per silent-investor directive 2026-04-24): Sealed-envelope mechanism NOT implemented. Dymo-appointed backup administrator (to be named in separate confidential memo) holds emergency credentials. Rudi counsel NOT in recovery chain."

## 6.2 Clauses that SHOULD STAY unchanged

Core investor protections — directive does NOT touch these:

| Clause | Source |
|---|---|
| Equity split 80/10/10 Agency pre-Sunset → 33.34/33.33/33.33 post-Sunset | MOU §3, Term Sheet §6 |
| Platform equity 80/10/10 perpetual | MOU §3, Term Sheet §7 |
| Profit distribution 70/10/10/10 (as written) | MOU §4 |
| Sunset triggers (AED 2M cumulative distributions OR 5 years) | MOU §4 |
| Investment amount AED 1,000,000 (single tranche) | MOU §1, Term Sheet §3 |
| Liquidation preference 1× non-participating | Term Sheet §11 |
| Anti-dilution (weighted-average to Series A; pro-rata thereafter on Platform) | Term Sheet §13 |
| Agency anti-dilution: None (structural; no Series A) | Term Sheet §13 |
| MFN 12-month clause | Term Sheet §14 |
| Founder vesting (2-year, 6-month cliff; Rudi fully vested) | Term Sheet §15 |
| IP assignment (Zhan to Platform, nil consideration) | Term Sheet §16 |
| Non-compete 12-month post-departure | Term Sheet §17 |
| Founder salary floor (AED 30-50k/mo per entity) | Term Sheet §18 |

These are commercial terms, not governance terms. Rudi's economics intact.

## 6.3 Amendment scope summary

| Category | Count | Severity |
|---|---|---|
| MOU clauses to amend | 3 (Conflicts #1, #2, #3) | 1 VERY HIGH, 2 HIGH |
| Term Sheet clauses to amend | 3 (Conflicts #4, #5, #6) | 2 VERY HIGH, 1 MEDIUM |
| Internal docs to amend (not shareholder-binding) | 5 (Conflicts #7, #8, #9, #10, #11) | 2 HIGH, 2 MEDIUM, 1 LOW |
| Shareholder-facing amendment effort | ~2 weeks legal drafting + Rudi negotiation | — |
| Internal doc refresh effort | ~1 eng-day (Jan) | — |

**Timing suggestion (Dymo's decision):**
- **Before Saturday 2026-04-25 meeting:** inform Rudi this directive exists; preview the three HIGH/VERY-HIGH MOU amendments so Saturday is a real conversation, not a surprise.
- **Before 2026-05-08 Rudi wire:** reach alignment on amendment language; sign addendum or revised Term Sheet.
- **After Rudi wire:** internal docs (Conflicts #7–#11) updated by Jan in normal research-branch flow.

---

# §7 · Risks introduced by silent-investor structure

**Principle:** honest flagging, not cheerleading. Founder ratified the directive; this section makes the trade-offs visible so nobody is surprised later.

## 7.1 Risk: Rudi reads silent-investor posture as "post-signature devaluation" of his protections

**Scenario.** Rudi signed the MOU in part because it guaranteed him a board seat, 48-hour visibility, and 2-of-3 voting on exits. The directive — applied this week, before the wire — is effectively an ask to strip three of his bargaining chips. Even though his economics are untouched, the optics matter.

**Probability.** Medium-High if framing is wrong. Low if framing is right.

**Right framing (suggested, Dymo's call):**
- Rudi's **economics are unchanged**: 10% Agency equity, 10% Platform equity perpetual, 70/10/10/10 profit split, liquidation preference, anti-dilution, all intact.
- What changes: his **participation obligation**. Board meetings, weekly calls, 48-hour alerts — those are **asks on his time**. Silent-investor posture reduces ZAAHI's reporting burden AND his attendance burden.
- Offer offsetting protections if pushback: quarterly audit + auditor sign-off (stronger than current annual audited), preferred redemption rights, board observer (no seat but can attend on request), tag-along rights on M&A at the same price.

**Wrong framing risk.** "We're reducing your rights" lands as a breach-of-spirit signal even if technically not a breach of contract. Rudi could:
- Delay the 2026-05-08 wire pending amendment negotiation.
- Refuse to sign amendments, leaving a governance-contract vs. operating-practice mismatch (Dymo + Jan do not hold board meetings in practice, but the MOU says they must).
- Engage external counsel adversarially.

**Mitigation.** Dymo's Saturday 2026-04-25 conversation should be additive not subtractive: "Here's how we want to work together — you get a clear monthly briefing, we remove the calendar drag on you, and your economics are protected more strongly." Preview the three HIGH-severity amendments in written form before the meeting so Rudi has time to digest.

## 7.2 Risk: existing MOU + Term Sheet language in ZAAHI data room contradicts operating reality

**Scenario.** ZAAHI is approaching Emaar + 5+ developers for the $13M strategic round. Any data-room review by a serious VC asks to see the MOU and Term Sheet. If the document shows "three-director board with weekly 2-of-3 voting" but the actual operating practice is "Dymo + Jan decide, Rudi gets monthly email," that's a corporate-governance integrity flag.

**Probability.** High if MOU amendments lag.

**Impact.** Medium-High. Doesn't kill a round but complicates DD. VC asks: "Why is your governance contract not what you practise?"

**Mitigation.** Complete MOU + Term Sheet amendments BEFORE entering formal DD with Emaar or the $13M round lead. Dymo's timeline: negotiate with Rudi 2026-04-25 → 2026-05-08; sign addendum by 2026-05-10; DD-ready package from then.

## 7.3 Risk: Phase 2 pilot tenants ask about founder governance

**Scenario.** Pilot tenants (UAE mid-tier brokerages per `PILOT_TENANT_OUTREACH.md`) occasionally ask about founder governance structure — especially those who've been stung by founder-disputes in the past. A clean governance document is a sales asset.

**Probability.** Low-Medium. Not every pilot asks, but some will.

**Impact.** Low. Silent-investor is a perfectly respectable structure; once amendments are clean, this is actually simpler to explain than the 3-director / 2-of-3 voting model.

**Mitigation.** Clean up MOU + Term Sheet by Phase 2 opening (2027-01-18). Amendment flags in §6 give Dymo the path.

## 7.4 Risk: bus factor tight without Rudi in recovery chain

**Scenario.** Dymo + Jan are the only two people who can operate ZAAHI. If one is unreachable >48 hours AND the other is simultaneously compromised or away, platform operations stall.

**Probability.** Low (~2-5% annually). Both founders unreachable simultaneously is unusual but not impossible (shared travel, shared event, shared health risk).

**Impact.** High on the rare occasion. Platform down, deals stuck, users confused.

**Mitigation.** GOV-3 rules out Rudi counsel sealed envelope. Alternatives:
1. **Named backup admin** (not Rudi, not counsel). Candidates: a senior ops hire (not yet hired), a trusted family member, or a senior friend-of-founders. Named in confidential memo; holds 1Password emergency kit.
2. **Platform auto-continuity** — zero-touch operations for up to 30 days via auto-renewals (Vercel, Supabase, Namecheap, Anthropic). Deals on Spec 03 Super-Admin Flow 3 can pause without user-visible impact if both founders are unreachable.
3. **Pre-authored "founders unreachable" user-comm template** — ready to post on zaahi.io if escalation fires.

**Decision for Dymo + Jan:** Who is the backup admin? This is a new Q (not in the 184) introduced by GOV-3.

## 7.5 Risk: directive becomes "Rudi was frozen out" narrative

**Scenario.** If ZAAHI eventually exits successfully, third parties may frame the silent-investor transition as founders freezing out the early investor who took AED 1M risk. Even if legally clean, narratively costly.

**Probability.** Low in the short term; situational in the long term.

**Impact.** Reputational only. No legal impact if amendments are properly papered.

**Mitigation.**
- Written record of directive rationale (this document).
- Rudi co-signs the amendments voluntarily (Saturday conversation conducted in good faith).
- Rudi's economics ALWAYS protected — never touch the 10/10 equity or the 70/10/10/10 split.
- Quarterly verbal sync offered but not enforced. Keep the relationship warm.

## 7.6 Risk: directive misaligns with ADGM / DIFC legal-entity governance requirements

**Scenario.** If ZAAHI incorporates an ADGM or DIFC HoldCo for the Platform later (per §77 v1.2), those jurisdictions have statutory governance floors (minimum director count, required committees, etc.). The silent-investor directive is a US-style / startup-culture move; UAE common-law jurisdictions may have requirements that clash.

**Probability.** Medium — depends on ADGM vs DIFC vs mainland structure.

**Impact.** Medium — may require re-adding Rudi as a statutory director even if he has no operating role.

**Mitigation.** Open Q-J2 (ADGM vs DIFC vs mainland) needs legal opinion (Q-I3 counsel). Before HoldCo formation, confirm directive is implementable in chosen jurisdiction. If not, adjust. Time to decide: Phase 2 Month 6-10.

## 7.7 Risk: Rudi's advisory value is lost

**Scenario.** Rudi brings 18+ years of global operations at Stolt-Nielsen and Bahri, Dubai real-estate market knowledge since 2018. Monthly-email-only eliminates the informal advisory channel (calls, brainstorms).

**Probability.** High if the directive is enforced strictly.

**Impact.** Low-Medium. Dymo has his own Equilibrium network + 17 years real-estate experience; Jan's engineering domain is his own. Rudi's advice was marginal, not critical.

**Mitigation.** **Leave room for optional quarterly verbal sync** at Rudi's initiative. GOV-1 specifies "no weekly calls · no board meetings" — it does NOT say "no verbal contact ever." Dymo can be explicit in Saturday conversation: "We want to reduce your calendar drag. If you want to call, call anytime. We just don't want to obligate you to a weekly schedule."

## 7.8 Risk summary — honest

| Risk | Severity | Mitigation owner |
|---|---|---|
| 7.1 Rudi reads directive as stripping | High | Dymo — Saturday framing |
| 7.2 MOU vs operating-practice mismatch flagged by VC DD | Medium-High | Dymo — amendment timing |
| 7.3 Pilot-tenant DD friction | Low | Dymo — by 2027-01 |
| 7.4 Bus factor tight without Rudi | Low-Medium | Dymo + Jan — named backup admin |
| 7.5 "Rudi frozen out" narrative long-term | Low | Dymo — voluntary amendment co-sign |
| 7.6 ADGM / DIFC statutory misalignment | Medium | Legal opinion before HoldCo |
| 7.7 Loss of advisory value | Low-Medium | Dymo — keep quarterly sync optional |

**Net assessment.** Directive is reasonable and defensible. The two real risks worth preparing for: **Saturday conversation framing (7.1)** and **MOU amendment timing ahead of VC DD (7.2)**. Everything else is manageable.

---

# §8 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-24 | ZAAHI engineering agent (research-branch planning, `research/founder-directive-2026-04-24`) | Initial transcription of GOV-1 to GOV-5 directive; applied to 184-question audit → 58 → 21 real P0 remaining; revised Phase 1 spec ship windows (capacity-driven, Plot-1-independent); simplified Spec 03 v2 Super-Admin (single-founder attestation, ~20% effort reduction); flagged 11 MOU/Term Sheet/internal clauses conflicting with directive; 7 honest risks enumerated with mitigations. Docs-only. No MOU edits. No main push. Single commit on research branch. |

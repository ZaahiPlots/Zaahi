# OPEN QUESTIONS FOR OWNERS — Phase 1 Owner-First / Phase 2 External

**Document:** Decision surface for formal owner sign-off on Master Tree Enhancement Proposal (binding for Y1-Y3 execution).
**Prepared for:** Zhan Ryspayev (Founder/CEO/CTO), Dymo Tsvyk (Co-founder/Ops/Ambassador), Rudi Belin (Investor/Board).
**Prepared on:** 2026-04-21
**Branch:** `research/vision-and-competitors-2026-04-19`
**Purpose:** Resolve every ambiguity on the execution path *before* producing the final binding `MASTER_TREE_ENHANCEMENT_PROPOSAL.md`. Agent does not guess; owners decide.
**Strategic frame (locked by owners 2026-04-21):** Phase 1 (Months 1–9, Apr 2026 → Jan 2027) = **Platform completion to owner-first perfection + Agency commercial work parallel**. Phase 2 (Month 10+, Jan 2027 onward) = **Sequential external-participant onboarding** — brokers first, ambassadors / tier subs last. External platform revenue Y1 ≈ 0; Agency Y1 AED 7.8 M target unchanged.
**Preliminary decisions already confirmed by owners (not re-asked in this document):**
1. Phase 1 duration ceiling: 9 months.
2. Agency deals (Dymo pipeline) run parallel to Phase 1 build — unchanged AED 7.8 M Y1 target.
3. Dog-food scope: 2 founders only (Zhan + Dymo). Videographer is content producer, not primary user. Chief of Staff (Month 6-8) joins incrementally, not a Phase 1 design target.
4. Self-service feature-addition scope: open-ended, reviewed on cadence, no hard capability milestone.
5. Investor-package v7.1 decision deferred until after this questions cycle completes.
**Classification:** CONFIDENTIAL

---

## How to use this document

Each question has **one decision**, **explicit options**, an **agent recommendation** (not a preferred-answer bias — just the option that flows most naturally from existing research), a **default if no answer** (what agent will assume in the binding document), and the **owner(s)** whose sign-off matters.

Owners can answer in any form (inline edit, Slack, email, meeting). Agent compiles answers into `MASTER_TREE_ENHANCEMENT_PROPOSAL.md` after all are resolved. **Questions left unanswered use their default** — agent will call these out explicitly in the proposal document so they can be revisited.

Target cycle: 45 questions · 5 parts · ~10 working hours of owner deliberation (~12 min per question average).

---

# PART I — Phase-split foundations

*8 questions defining the shape of the Phase 1 → Phase 2 transition. These answers cascade into every other part — resolve first.*

### Q-1 · Part I · Strategic dilemma — Phase 2 trigger criteria
**Context.** Phase 1 is 9 months (Apr 2026 → Jan 2027). At Month 10 (Feb 2027) Phase 2 can open — but only if Phase 1 is "complete." How do we decide Phase 1 is complete?
**Question.** Is Phase 2 opening **time-based** (calendar fires at Month 10 regardless) or **metric-based** (opens only when pre-agreed KPIs are met)?
**Options.**
- **A · Time-based.** Phase 2 opens Mon 2027-01-18 regardless of platform state. Forcing function.
- **B · Metric-based.** Phase 2 opens when a checklist of KPIs is green (e.g., zero P0 bugs in last 30 days, all 10 owner-tool priorities shipped, founder signed "ready-to-onboard" attestation). No hard date.
- **C · Hybrid.** Opens Month 10 by default *unless* 2-of-3 founders file a delay motion before Month 9 end, extending to Month 12 maximum.
**Recommendation.** C — hybrid. Time pressure is a discipline; extension window prevents shipping broken product. 12-month cap prevents indefinite drift.
**Default if no answer.** C.
**Owner.** All three.

### Q-2 · Part I · Strategic dilemma — Phase 1 completion test
**Context.** "Owner-first perfection" is a vague standard unless operationalised. What is the test?
**Question.** How do we measure "§77 Platform complete"?
**Options.**
- **A · Parity checklist.** Feature-by-feature table against Bayut + Property Finder + Huspy + custom ZAAHI moats; Phase 1 complete when X / Y boxes green.
- **B · Founder satisfaction test.** "Both Zhan and Dymo prefer using zaahi.io over any alternative for any daily operational task." No feature checklist; subjective attestation.
- **C · Metric-based.** Specific numbers: ≥ 95 % daily-use tasks don't require a fallback tool · median deal-room action takes ≤ 3 clicks · all 114 parcels' affection plans accessible in 1 click · etc.
- **D · Mixed.** B + C — founder attestation anchored by a small set of must-pass metrics.
**Recommendation.** D — founder attestation as ultimate authority, metrics as objective signal against self-deception ("we're used to friction, so it seems fine").
**Default if no answer.** D.
**Owner.** Zhan + Dymo (Rudi ratifies).

### Q-3 · Part I · Sequence — staged external order
**Context.** Phase 2 opens 8 external participant types (brokers · developers · owners self-listing · buyers · investors · ambassadors · architects · bank mortgage widget). They cannot all open simultaneously — support load would crush 2 founders + Chief of Staff.
**Question.** What order?
**Options.**
- **A · Revenue-first.** Brokers (tier subs) → Ambassadors (lifetime USDT) → Developers (AED 50 k/yr tier) → Owners → Buyers → Investors → Architects → Bank widget.
- **B · Complexity-first.** Lowest support-burden first: Investors (read-only) → Buyers (search) → Architects (lightweight) → Owners self-listing → Brokers → Developers → Ambassadors → Bank widget.
- **C · Strategic sequence per original LAUNCH_PLAN.** Brokers (Month 10) → Developers (Month 12) → Owners + Buyers (Month 14) → Ambassadors (Month 15) → Investors + Architects (Month 16) → Bank widget (Month 18, partnership-gated).
- **D · Custom.** Owners specify.
**Recommendation.** C — aligns with existing LAUNCH_PLAN narrative, revenue-first without overloading support on Day 1 of Phase 2.
**Default if no answer.** C.
**Owner.** Zhan + Dymo.

### Q-4 · Part I · Financial implication — external revenue Y1 → Y2 shift
**Context.** Preliminary decision 1 locks Phase 1 at 9 months, implying Platform tier-subscription Y1 revenue (LAUNCH_PLAN target AED 400 k) shifts to Y2. Agency Y1 AED 7.8 M unchanged.
**Question.** Confirm external-revenue Y1 ≈ 0 acceptable, or require interim pilot revenue?
**Options.**
- **A · Zero external Y1.** Discipline: no outside user before Phase 1 complete. Platform revenue Y1 = 0 subscription; Y2 ~AED 1 M as Phase 2 opens mid-year.
- **B · Soft pilot (~AED 50 k Y1).** Month 6-9 invite 5-10 warm brokers at Gold tier (Dymo network only, no marketing). Tests onboarding flow with low load.
- **C · Limited launch (~AED 250 k Y1).** Month 7-9 allow 20-30 warm-network brokers + ambassadors. Higher support load but validates scaling.
**Recommendation.** B — soft pilot preserves dog-food discipline while giving one data point on external UX before full Phase 2 open. AED 50 k is immaterial to P&L; value is information.
**Default if no answer.** B.
**Owner.** Zhan + Dymo + Rudi (affects revenue forecast).

### Q-5 · Part I · Financial implication — IRR delta
**Context.** Phase 1 delay of external revenue by ~1 year shifts Platform IPO timing ~Y11 vs. base-case Y10, dropping lifetime IRR ~80 % → ~75 %. MOIC 437× unchanged.
**Question.** Accept IRR delta or require mitigation (compression elsewhere)?
**Options.**
- **A · Accept.** Discipline > IRR optics. 75 % IRR still top-decile.
- **B · Compress Phase 3.** Accelerate Equinix DX1 migration, Series A prep, GA launch to claw back 6 months.
- **C · Parallel-track some Phase 2 items.** Bank partnership conversations (relationship-only, no integration) start Month 7 instead of Month 10; shortens post-open-to-revenue gap.
**Recommendation.** A — accept. Mitigations that claw back months introduce scope creep risk; 75 % IRR is not a problem.
**Default if no answer.** A.
**Owner.** Rudi (primary financial impact).

### Q-6 · Part I · Interim activity — Month 7-9 pre-external prep
**Context.** Phase 1 is 9 months; Phase 2 opens Month 10. What happens in the Month 7-9 window beyond "finishing §77"?
**Question.** What is the pre-launch prep workstream in Months 7-9?
**Options.**
- **A · Pure §77 finishing.** All capacity on platform polish. No Phase 2 prep. External open begins Month 10 cold.
- **B · Parallel Phase 2 groundwork.** 20-30 % capacity on Phase 2 enablers (onboarding wizard, tier flow, support runbook, payment rails) so Month 10 opens hot.
- **C · Dymo-led partnership warm-up.** Founder BD effort on bank / developer / LeadingRE while Zhan focuses §77. Month 10 opens with partnership MOUs already drafted.
**Recommendation.** B + C combined — each founder's capacity on the track that fits (Zhan 20 % Phase 2 enablers, Dymo BD warm-up). Not A (cold open wastes the earned time).
**Default if no answer.** B + C.
**Owner.** Zhan + Dymo.

### Q-7 · Part I · Self-service cadence — review frequency
**Context.** Preliminary decision 4 locks self-service feature-addition as open-ended. But there still needs to be a forum where founders declare current pain points.
**Question.** What cadence for reviewing self-service needs?
**Options.**
- **A · Monthly.** Every month Zhan + Dymo triage pain points from the prior 30 days; fold into sprint.
- **B · Quarterly.** Every quarter revisit scope.
- **C · Ad-hoc only.** Raised in weekly stand-up when a pain point repeats 3 times.
**Recommendation.** A — monthly. Self-service capabilities compound; deferring 3 months = deferring 3× the pain.
**Default if no answer.** A.
**Owner.** Zhan + Dymo.

### Q-8 · Part I · Investor-package reconciliation preview
**Context.** Preliminary decision 5 defers v7.1 decision until end of this cycle. But we need to know if the Phase 1/2 shift is "material" enough to change the investor narrative.
**Question.** Owners' initial read — does Phase 1 Owner-First shift fundamentally change investor story?
**Options.**
- **A · Yes, material.** External revenue Y1 → Y2 is a meaningful P&L change; IRR 80→75 % disclosed; v7.1 probably required.
- **B · No, immaterial.** Agency revenue unchanged (95 % of Y1 top-line anyway); Platform Y1 was always <5 %. Narrative holds.
- **C · Maybe.** Decide after seeing exact numerical shift quantified in the enhancement proposal.
**Recommendation.** C — final v7.1 call after proposal quantifies. Do not commit to v7.1 scope until math is on paper.
**Default if no answer.** C.
**Owner.** Rudi (main audience) + Zhan.

---

# PART II — Phase 1 Owner-First execution

*15 questions on how Months 1-9 actually run. These shape the binding execution plan.*

### Q-9 · Part II · Roadmap priority — Phase 1 Master Tree sections
**Context.** Phase 1 focus = owner tooling. Agent proposed these sections ship in Phase 1: §77 Web Platform · §75 Admin Panel · §17 Broker (owner-side dashboard for founders managing own deals) · §31 Deal Engine · §58 Feasibility Calc v2 · §48 Long-tail SEO · §47 Notification Engine · §66 Market Intel · §41 Archibald AI · §35 3D builder UI · CMS.
**Question.** Approve this Phase 1 list as-is, modify, or reject?
**Options.**
- **A · Approve as-is.**
- **B · Add.** Specify additions (e.g., §22 Mortgage widget as P1 for Dymo's deal support; §45 Satellite §1.8 for own market reports).
- **C · Remove.** Specify removals (e.g., §48 SEO is for external acquisition, not Phase 1).
- **D · Re-rank.** Agent's order is dependency-driven; owners may want revenue-impact first.
**Recommendation.** A — approve as-is. Later quarterly review can add/remove based on actual friction.
**Default if no answer.** A.
**Owner.** Zhan + Dymo.

### Q-10 · Part II · §77 completeness — parity baseline
**Context.** If test is "founders don't want to switch" (Q-2 recommendation D), we still need a *floor* — the minimum feature set that makes switching-away unthinkable.
**Question.** What non-negotiable capabilities must §77 have by Phase 1 end?
**Options (multi-select; owners tick all that apply).**
- **a)** Full CRUD on every parcel field without SQL.
- **b)** Deal Engine state machine with all 10 states + manual override.
- **c)** Feasibility Calculator v2 live with PDF export.
- **d)** Archibald AI responding in 6 languages with UAE-specific knowledge.
- **e)** 3D rendering pipeline producing podium/body/crown buildings from any DDA affection plan input.
- **f)** DLD transaction data overlay (nightly refresh, plot-level comps).
- **g)** Broker pipeline tracking (owner side — founders tracking deals, not external brokers).
- **h)** Notification engine (WhatsApp + Email + SMS owner-configurable rules).
- **i)** Content management (publish blog / case study / market report without deploy).
- **j)** Admin panel CRUD for User / Parcel / Deal / Ambassador / Commission.
- **k)** Invoice + commission tracker (TRN-ready Tax Invoice issuance).
- **l)** Audit log owner dashboard (every mutation visible to founders).
- **m)** Configuration panel (toggle features / tiers / prices without code change).
**Recommendation.** All 13 — this is the minimum viable dog-food set. Anything less means a founder reaches for Excel / Notion / WhatsApp instead of zaahi.io on some daily task.
**Default if no answer.** All 13.
**Owner.** Zhan + Dymo.

### Q-11 · Part II · Owner-tool priority ranking — Top 10
**Context.** Given finite engineering capacity (Zhan full-time, ~4 eng-weeks/month after deal support), 10 priorities from Q-10 must ship by Month 9. Order matters — early wins compound.
**Question.** Rank the Q-10 items (a-m) in ship order, or approve agent's ranking?
**Agent's proposed order.**
1. **b Deal Engine state machine** — core commerce.
2. **j Admin panel CRUD** — enables every other tool.
3. **c Feasibility Calculator v2** — Dymo's client-meeting weapon.
4. **a Full parcel CRUD** — owner self-service for every add.
5. **k Invoice + commission tracker** — first real commission Month 3, needs to be ready.
6. **h Notification engine** — reduces daily WhatsApp / email churn.
7. **m Config panel (tiers/prices/toggles)** — self-service moat.
8. **d Archibald 6-lang UAE-specific** — owner leverage multiplier.
9. **f DLD transaction overlay** — every negotiation needs this.
10. **i CMS (publish without deploy)** — videographer content pipeline.
11-13. **g pipeline tracking · l audit dashboard · e 3D pipeline polish** — last if time permits.
**Options.**
- **A · Approve ranking as-is.**
- **B · Re-rank.** Specify.
- **C · Approve top 7; re-rank 8-13.** Top 7 is certain; tail flex.
**Recommendation.** A.
**Default if no answer.** A.
**Owner.** Zhan + Dymo.

### Q-12 · Part II · Admin panel — scope definition
**Context.** Admin panel (§75) is the engine of self-service. Scope varies from "toggle booleans" to "no-code form builder."
**Question.** What's the minimum admin-panel feature set by Month 9?
**Options.**
- **A · Minimal — 2026 MVP.** CRUD forms for 5 core entities (User, Parcel, Deal, Ambassador, Commission). No config-flag UI. Founders edit env vars / Prisma seeds directly.
- **B · Pragmatic — config panel added.** A + feature-flag toggle UI (enable/disable Archibald, enable/disable Ambassador signup, enable/disable tier gating, etc.) + tier-price editor.
- **C · Ambitious — audit + impersonation.** B + audit log browser + "view as user" impersonation for debugging + bulk-edit flows.
**Recommendation.** B — A is insufficient for self-service, C adds 3 eng-weeks for features used <5 % of the time.
**Default if no answer.** B.
**Owner.** Zhan (engineering call).

### Q-13 · Part II · Ambassador program — Phase 1 posture
**Context.** Current AGENCY_PLAYBOOK + MASTER_IMPLEMENTATION_PLAN target 50 paid ambassadors Y1 (AED 250 k revenue). Phase 1 Owner-First implies: **external participants delayed**. Ambassador program is external-participant.
**Question.** What's the Phase 1 (Month 1-9) posture on Ambassador signups?
**Options.**
- **A · Freeze.** Ambassador signup closed until Month 10. Zero Y1 subscription revenue.
- **B · Soft pilot.** Month 6-9 invite ≤ 10 warm brokers (Dymo network) at Gold tier. ~AED 50 k Y1 subscription. Tests downline walker + payout flow with low load.
- **C · Limited launch.** Month 7-9 allow ≤ 30 warm + referral at any tier. ~AED 150-250 k Y1 subscription.
- **D · As-was.** Keep Y1 target 50 paid, remove "Phase 1 owner-first" from Ambassador track (carve-out).
**Recommendation.** B — aligns with preliminary decision 1 (9-month Phase 1) + preliminary decision 3 (2-founder dog-food — 10 ambassadors is manageable).
**Default if no answer.** B.
**Owner.** Dymo (primary BD) + Zhan (infra).

### Q-14 · Part II · Safety P0 re-rank for owner-only threat model
**Context.** `MASTER_TREE_SAFETY_PROPOSALS.md` ranks P0 items (PDPL + DPO · MFA + UAE Pass · Audit log · Incident runbook) for a full multi-tenant SaaS. In Phase 1 Owner-First, only 2 users (founders) + a handful of admin signups. Does P0 rank change?
**Question.** Re-rank P0 Safety items for Phase 1 owner-only use?
**Options.**
- **A · Keep all P0 as-is.** Even for 2 users, PDPL applies (data about 114 parcel owners, prospects, leads = personal data). No rank change.
- **B · Defer user-facing MFA.** For 2 founders, password + hardware-key (YubiKey) is sufficient; full UAE Pass + passkeys push to Month 9 or Phase 2.
- **C · Defer PDPL Privacy Centre UI.** No external data-subjects yet (founders are self). PDPL Privacy Centre UI becomes Phase 2. Policy + internal handling remain Phase 1.
- **D · B + C combined.** Narrow safety investment to what's needed for 2-user platform + data-custody-of-leads.
**Recommendation.** D — pragmatic. Ship audit log + incident runbook + backup drill + PII encryption in Phase 1 (these protect the leads data that *does* exist). Defer Privacy Centre + UAE Pass + passkeys to Phase 2 (no data subjects to serve).
**Default if no answer.** D.
**Owner.** Zhan (technical) + Rudi (risk-acceptance).

### Q-15 · Part II · PDPL timing adjustment
**Context.** Q-14 option D defers Privacy Centre UI. But PDPL Article 18 breach-notification clock runs from Day 1 regardless of user count — any data incident on lead records triggers reporting.
**Question.** Does PDPL compliance investment (DPO + policy + Article 30 register) still ship Month 4, or shift?
**Options.**
- **A · Stay Month 4.** Compliance posture must be in place before any external audit or DD conversation.
- **B · Compress to what's legally required.** DPO designation + data-processing register shipped Month 4; Privacy Centre UI + right-to-deletion flow deferred to Month 9.
- **C · Defer all to Month 9.** Accept breach-notification risk.
**Recommendation.** B — B splits compliance (legally required) from UX (externally-facing). No external users in Phase 1 = no Privacy Centre consumer.
**Default if no answer.** B.
**Owner.** Zhan + Dymo.

### Q-16 · Part II · UAE Pass timing — Month 4 or Month 9
**Context.** UAE Pass integration is gated as P0 sovereignty (`MASTER_TREE_SOVEREIGNTY_PROPOSALS.md` §4). But UAE Pass's main use case = external user onboarding (verified identity). In Phase 1 Owner-First, founders don't need UAE Pass (they know who they are).
**Question.** When does UAE Pass integration ship?
**Options.**
- **A · Month 4.** Original plan. Gives optionality if government partnership conversation opens early (DLD / ICP / TAMM).
- **B · Month 7-8.** Ship late-Phase-1 so Month 10 external open has it. Saves ~4 eng-weeks of Zhan's early-Phase-1 capacity.
- **C · Month 9.** Tail of Phase 1, right before Phase 2 open.
- **D · On-demand trigger.** Ship whenever the first bank / government partnership MOU requires it.
**Recommendation.** B — UAE Pass requires partnership registration (~4-8 weeks), so starting Month 7 still hits Month 10 open. Frees Zhan's capacity early-Phase-1 for owner-tool work.
**Default if no answer.** B.
**Owner.** Zhan (capacity trade-off).

### Q-17 · Part II · DPO engagement timing
**Context.** DPO external retainer originally Month 4 (AED 120 k / yr = AED 10 k / mo). If external Privacy Centre UI deferred (Q-15 option B), does DPO need still fire Month 4?
**Question.** When does DPO retainer start?
**Options.**
- **A · Month 4.** Unchanged. DPO advises on data-processing register, incident runbook, privacy-by-design reviews regardless of user count. AED 120 k / yr from Month 4.
- **B · Month 6.** After data-processing register drafted internally by Zhan; DPO formalises + signs off. Saves ~AED 20 k.
- **C · Month 9.** DPO starts right before Phase 2 open. AED 50 k Y1 spend only.
**Recommendation.** B — internal drafting Month 4-5, DPO retained Month 6 to formalise. DPO's main value accrues when external users exist (data-subject requests). Month 6 start still gives 3 months runway to Phase 2 open.
**Default if no answer.** B.
**Owner.** Zhan + Rudi (budget).

### Q-18 · Part II · Chief of Staff hire trigger
**Context.** LAUNCH_PLAN + MASTER_IMPLEMENTATION_PLAN: Chief of Staff hired Month 6-8 at AED 30-45 k / mo. Original trigger: second Agency deal closed + Platform bandwidth request. Does Phase 1 Owner-First change the trigger?
**Question.** When does Chief of Staff hire?
**Options.**
- **A · Month 6-8 unchanged.** Original trigger (2nd deal + Rudi request). CoS helps with Phase 2 prep (Q-6 option C).
- **B · Month 8-9.** Pull trigger late-Phase-1 so CoS is live Week 1 of Phase 2 external onboarding. Tighter fit to actual need.
- **C · Month 10.** Hire on Phase 2 Day 1. Deferred hire saves AED 90-180 k from Phase 1 budget.
- **D · Skip.** Founders + Dymo handle Phase 2 with contractor support; revisit Month 15.
**Recommendation.** B — CoS hired Month 8 shadows founders through Phase 1 finish, owns Phase 2 onboarding operational setup. Skipping (D) risks burnout at exactly the wrong moment.
**Default if no answer.** B.
**Owner.** All three (budget + ownership).

### Q-19 · Part II · Videographer integration — Phase 1 or Phase 2
**Context.** Videographer retainer AED 10 k / mo starts Day 1 per LAUNCH_PLAN. Content is owner-generated (Dymo's narrative), consumed by external audience. In Phase 1 Owner-First, is content cadence still high, or does it dial down?
**Question.** Videographer integration scope Phase 1?
**Options.**
- **A · Full cadence as planned.** 2-3 pieces/week, feeding LinkedIn + Instagram + YouTube for brand-building ahead of Phase 2 external open. Total Phase 1 output ~80-100 pieces.
- **B · Half cadence, save capacity for Phase 2 launch moment.** 1 piece/week Phase 1; videographer builds Month 10 launch video, founder stories, case studies for Phase 2 open.
- **C · Minimal Phase 1 + hero launch.** Only monthly pieces Phase 1; videographer is 80 % on Month 10 launch materials.
**Recommendation.** A — content moat compounds with time. Half-cadence (B) wastes the retainer. LinkedIn algorithm rewards consistency.
**Default if no answer.** A.
**Owner.** Dymo (content ownership).

### Q-20 · Part II · Archibald AI scope for Phase 1 (owner-only)
**Context.** Archibald handles: lead qualification (Q-11 priority 8), content generation, internal research. In Phase 1 Owner-First, no external leads are qualified via Archibald — founders qualify manually. Does Archibald scope shrink?
**Question.** Phase 1 Archibald capabilities?
**Options.**
- **A · Full scope.** BANT agent + 6-lang + content gen + Feasibility explanations + research assistant. All 4 major capabilities.
- **B · Owner-tool scope.** Content generation + research assistant + Feasibility explanations. Skip BANT qualification flow (no external leads yet).
- **C · Minimal.** Just content generation (Archibald as a founder writing assistant).
**Recommendation.** B — BANT flow requires no public-facing chat, so ship internal use cases only.
**Default if no answer.** B.
**Owner.** Zhan + Dymo.

### Q-21 · Part II · Feasibility Calculator v2 effort
**Context.** POST_MEETING_BUILD_PLAN A2: 2-3 eng-weeks for Feasibility Calc v2. In Phase 1, it's Dymo's client-meeting weapon (directly supports Agency deal closure).
**Question.** When does Feasibility v2 ship?
**Options.**
- **A · Month 4-5.** Top of Phase 1, early so Dymo uses it in every meeting from Plot 3 onward.
- **B · Month 5-6.** Middle of Phase 1.
- **C · Month 7-9.** Tail of Phase 1.
**Recommendation.** A — priority 3 in Q-11 ranking. Dymo's 3-7x commission-per-floor-deal depends on credible feasibility output in real time.
**Default if no answer.** A.
**Owner.** Zhan.

### Q-22 · Part II · Deal Engine state machine — Phase 1 priority
**Context.** Deal Engine (§31) is priority 1 in Q-11 ranking. Shipping moves manual WhatsApp / email deal tracking to a state machine. Real Agency deals run through it from first deal (Month 3).
**Question.** Effort level + timing?
**Options.**
- **A · Full state machine Month 4-5.** 10 states, auto-transitions, notification integration, document uploader per transition. 3-4 eng-weeks. Matches POST_MEETING A1.
- **B · MVP state machine Month 3-4.** 5 core states (Initiated → Form F Signed → NOC Received → DLD Submitted → Commission Received), manual transitions, no auto-notifications. Ship in 1-2 eng-weeks to support Plot 1. v2 adds polish Month 5-6.
- **C · Defer to Month 6.** Plot 1 runs on Excel + WhatsApp; post-first-deal, Zhan ships Deal Engine with real data.
**Recommendation.** B — MVP first so Plot 1 actually uses it (validates design), polish v2 after feedback.
**Default if no answer.** B.
**Owner.** Zhan.

### Q-23 · Part II · 3D Builder UI for owner uploads
**Context.** Today adding a parcel requires manual geometry work. Phase 1 Owner-First implies owners should add parcels via UI, not script. Effort estimate: 4-6 eng-weeks for a full uploader with affection-plan parsing.
**Question.** Ship 3D Builder UI in Phase 1?
**Options.**
- **A · Yes, Month 6-8.** Zhan's capacity allocation: 4-6 eng-weeks late-Phase-1.
- **B · MVP only — "upload PDF + text fields, Zhan scripts the 3D later."** 1 eng-week. Fields cover price, land use, GFA, setbacks. 3D still scripted. Works for 5-10 parcels / month.
- **C · Defer to Phase 2.** Phase 1 sticks with scripts (current state). Phase 2 owner self-listing requires this anyway.
**Recommendation.** B — MVP unblocks Dymo from emailing scripts to Zhan, keeps full-3D-from-UI for Phase 2 (where external owners use it).
**Default if no answer.** B.
**Owner.** Zhan.

---

# PART III — Phase 2 External gate

*10 questions preparing the Month 10 external-open transition.*

### Q-24 · Part III · Staged external order confirmation
**Context.** Q-3 recommendation C staged order: Brokers (Month 10) → Developers (Month 12) → Owners + Buyers (Month 14) → Ambassadors (Month 15) → Investors + Architects (Month 16) → Bank widget (Month 18).
**Question.** Confirm order or modify?
**Options.**
- **A · Confirm.**
- **B · Fast-track Ambassadors** (revenue first). Ambassadors Month 10 alongside brokers.
- **C · Delay Bank widget.** Month 20+ to allow 2 more months of partnership conversations.
- **D · Custom.**
**Recommendation.** A — existing plan coherence.
**Default if no answer.** A.
**Owner.** Zhan + Dymo.

### Q-25 · Part III · Phase 2 prep deliverables — Month 8-9
**Context.** Q-6 option B + C allocates 20-30 % of Months 7-9 capacity to Phase 2 prep.
**Question.** What specifically must be shipped Month 8-9 to be ready for external open?
**Options (multi-select).**
- **a)** Onboarding wizard (sign-up → KYC → role-select → tier-payment → dashboard).
- **b)** Role-based access control refactor (brokers see different panel from investors).
- **c)** Support ticket system (Zendesk or built-in).
- **d)** Payment rail (Network International or Stripe UAE or USDT for Ambassador).
- **e)** RERA broker verification API (or scrape v1).
- **f)** Terms of Service + Privacy Policy + Broker Agreement + Ambassador Agreement (BSA-drafted).
- **g)** Email onboarding sequence (Resend + templates).
- **h)** Partnership MOUs drafted with 2-3 banks (Dymo BD).
- **i)** Support documentation (FAQ, help centre).
- **j)** Public landing pages per role (broker / developer / owner / etc.).
**Recommendation.** All 10 are Phase 2 requirements. Prioritise a, b, c, d, f for the first onboarded role (brokers Month 10).
**Default if no answer.** All 10 for staged rollout.
**Owner.** Zhan + Dymo + BSA.

### Q-26 · Part III · Tier subscription pricing — unchanged or review?
**Context.** CLAUDE.md locks Silver AED 1 k / Gold AED 5 k / Platinum AED 15 k one-time USDT, with 5/10/15 % L1 commission rates. These were approved 2026-04-15.
**Question.** Reconfirm pricing, or revisit for Phase 2 market?
**Options.**
- **A · Reconfirm as-is.**
- **B · Slight uplift.** Silver 1.5 k / Gold 7 k / Platinum 20 k (+30-40 %). Reflects post-Eid 2026 market.
- **C · Annual subscription added.** Alongside lifetime USDT, add AED subscription option (Silver 100 / mo, Gold 400 / mo, Platinum 1200 / mo) for lower-friction.
- **D · Developer tier priced.** AED 50 k / yr per LAUNCH_PLAN — confirm.
**Recommendation.** A + D. Tier pricing is a commitment already made in CLAUDE.md; changing before Phase 2 open is churn. Developer tier AED 50 k / yr separately confirmed.
**Default if no answer.** A + D.
**Owner.** Zhan + Dymo + Rudi (strategic pricing).

### Q-27 · Part III · Bank partnership Phase 2 timing
**Context.** Original plan: ENBD MOU by Month 11; widget live Month 15. Phase 1 Owner-First shift pushes bank widget Phase 2 (Q-24 confirmed Month 18). Does partnership *conversation* start later too?
**Question.** When do ENBD / ADCB conversations formally open?
**Options.**
- **A · Month 7-8 (Dymo BD Phase 1).** Q-6 option C — relationship building starts Phase 1; formal MOU lands Month 14-16; widget live Month 18.
- **B · Month 10.** Bank conversations open Day 1 of Phase 2; MOU Month 16-18; widget Month 20+.
- **C · Month 12+.** Defer until Phase 2 broker onboarding is stable.
**Recommendation.** A — partnership conversations take 6-12 months regardless, so starting Month 7-8 wastes less calendar.
**Default if no answer.** A.
**Owner.** Dymo.

### Q-28 · Part III · Marketing budget for Phase 2 open
**Context.** Phase 2 Month 10 launch needs marketing push (paid acquisition, PR, events). Zero dedicated marketing line in current Y1 budget.
**Question.** Phase 2 launch marketing budget?
**Options.**
- **A · AED 0 — organic only.** LinkedIn + content + Dymo's network. No paid. Saves AED 300-500 k.
- **B · AED 100-200 k Y1 (one-off).** Modest Month 10-12 spend — LinkedIn ads, Gulf News sponsored content, one major event (Cityscape Dubai Nov 2026). Earmarked for Phase 2 launch only.
- **C · AED 500 k-1 M Y1.** Aggressive — outdoor, radio, influencer, sponsorships. Signals arrival. Justifiable against AED 7.8 M revenue.
**Recommendation.** B — brand investment that scales. A is too tight for "arrival" moment; C is too speculative.
**Default if no answer.** B.
**Owner.** Dymo + Rudi (budget).

### Q-29 · Part III · PR / launch strategy for Phase 2 open
**Context.** Month 10 external open is a strategic milestone — first time ZAAHI becomes a broad market entity, not just Agency. Needs narrative.
**Question.** What's the Phase 2 launch story?
**Options.**
- **A · "Open platform — 114 parcels + 3D + Archibald, powered by UAE-native OS."**
- **B · "ZAAHI Brokers invited — first 100 at Gold tier."** Broker-first narrative.
- **C · "Dubai's first plot-centric graph — tokenisation-ready."** Differentiation narrative.
- **D · Combo tiered PR push — different message per week over 4 weeks.**
**Recommendation.** D — A for Week 1 (platform), B for Week 2 (brokers), C for Week 3 (sandbox track), + D brand moment Week 4.
**Default if no answer.** D.
**Owner.** Dymo (narrative) + Zhan (product truth).

### Q-30 · Part III · Community management role
**Context.** External onboarding = daily questions from users. Phase 2 volume will swamp 2 founders + CoS unless there's a dedicated community path.
**Question.** How is community / support handled Month 10+?
**Options.**
- **A · CoS does it.** Chief of Staff (hired Month 8, Q-18 rec B) absorbs community + partnership + comms.
- **B · Dedicated Community Manager hire Month 12.** After Phase 2 is live 2 months and volume is measurable.
- **C · Outsourced to UAE BPO.** Tier-1 questions (password reset, onboarding) to BPO; Tier-2 to CoS.
- **D · Archibald-first.** Archibald chatbot handles 70 %; escalates to CoS.
**Recommendation.** D + B — Archibald Month 10, Community Manager hire Month 12 when data shows volume.
**Default if no answer.** D + B.
**Owner.** Dymo.

### Q-31 · Part III · Support infrastructure scaling
**Context.** Support volume scales faster than user count (each user has questions during first 30 days). Month 10-12 is highest-friction window.
**Question.** Support stack for Phase 2?
**Options.**
- **A · Zendesk.** Industry standard. AED 30 k / yr.
- **B · Built-in support ticket system.** Integrate into §77 admin panel. 2-3 eng-weeks.
- **C · Slack Connect / WhatsApp Business.** Lean — conversations in existing tools, no ticket system yet. Works for <500 users.
**Recommendation.** C for first 3 months of Phase 2, migrate to A when volume > 100 tickets / month.
**Default if no answer.** C → A.
**Owner.** Zhan + Dymo.

### Q-32 · Part III · Onboarding wizard design priority
**Context.** Every external role (broker / developer / owner / investor / ambassador / architect) needs an onboarding wizard. Each is 1-2 eng-weeks to design.
**Question.** Build wizards?
**Options.**
- **A · Per-role wizard, polished.** 6 wizards × 2 weeks = 12 eng-weeks (Month 8-9 plus Month 10-11). Expensive but best onboarding UX.
- **B · Generic wizard with role-conditional fields.** Single wizard, ~4 eng-weeks. Branching based on role. Scales better.
- **C · No wizard — form-based.** Classic SaaS "fill this form, wait for admin to activate." 1 eng-week. Admin burden on founders.
**Recommendation.** B — generic wizard is 3x cheaper than A and 3x better UX than C. Phase 2 V1 acceptable.
**Default if no answer.** B.
**Owner.** Zhan.

### Q-33 · Part III · KYC / AML onboarding at scale
**Context.** Every external broker, ambassador, etc. needs AML / KYC checks (per Federal Law 10/2025). Manual = 30 min / user. 100 users = 50 hours.
**Question.** KYC / AML stack?
**Options.**
- **A · Manual via Dymo + CoS.** Fine for <50 users.
- **B · Refinitiv / LexisNexis API integration.** AED 5-15 / screen × volume. Ship Month 9-10.
- **C · UAE Pass gated.** Make UAE Pass mandatory for KYC-heavy roles (brokers, developers). Replaces manual check. Requires UAE Pass integration live (Q-16 rec B, Month 7-8).
**Recommendation.** C for UAE residents + B for non-residents (cross-border users).
**Default if no answer.** C + B.
**Owner.** Zhan + BSA.

---

# PART IV — Structural / financial / communication

*10 questions on binding governance structures. Ratify or amend.*

### Q-34 · Part IV · 24-month enhancement budget authorization
**Context.** `MASTER_TREE_IMPROVEMENTS_SUMMARY.md` §6.3 estimates AED 2.6-3.8 M total over 24 months (CapEx + OpEx). Phase 1 Owner-First shift may reduce some items (Privacy Centre UI deferred) but adds others (3D builder UI, admin panel). Net approximately unchanged.
**Question.** Authorize 24-month enhancement budget AED 2.6-3.8 M against Agency Y1-Y2 revenue?
**Options.**
- **A · Authorize full range AED 2.6-3.8 M.** Zhan has founder spending authority within the range.
- **B · Authorize lower end AED 2.6 M only.** Anything above requires Rudi sign-off.
- **C · Authorize by tranches.** Y1 AED 1.5 M / Y2 AED 1.3-2.3 M — re-approved annually.
**Recommendation.** C — aligns with quarterly board cadence, prevents runaway.
**Default if no answer.** C.
**Owner.** Rudi (financial authority) + Zhan (execution).

### Q-35 · Part IV · Founder spending authority
**Context.** Q-34 doesn't specify what size spend requires Rudi sign-off vs. founder autonomy.
**Question.** What spend threshold requires Rudi approval (above which founders must pre-consult)?
**Options.**
- **A · AED 50 k / single spend.** Tight.
- **B · AED 100 k / single spend OR AED 500 k / month running.** Medium.
- **C · AED 250 k / single spend OR AED 1 M / month running.** Loose.
**Recommendation.** B — aligns with monthly board cadence and typical MOU Reserved Matters lists.
**Default if no answer.** B.
**Owner.** Rudi + founders.

### Q-36 · Part IV · Sunset trigger — reconfirm
**Context.** MOU locks Sunset trigger as earlier of (a) AED 2 M cumulative Rudi distributions OR (b) 5 years. Post-Sunset equity rebalances 80/10/10 → 33.34/33.33/33.33.
**Question.** Reconfirm as binding in this document?
**Options.**
- **A · Reconfirm as-is.**
- **B · Tighten trigger.** AED 1.5 M or 4 years (faster Sunset). Dymo + Zhan benefit; Rudi accepts slightly less control window.
- **C · Loosen trigger.** AED 3 M or 6 years. Rudi benefits.
**Recommendation.** A — was negotiated in MOU; reopening invites churn.
**Default if no answer.** A.
**Owner.** All three (binding document).

### Q-37 · Part IV · Dividend policy — reconfirm
**Context.** 70/10/10/10 split (Platform Dev Fund / Rudi / Dymo / Zhan) locked per MOU. Perpetual, pre- and post-Sunset.
**Question.** Reconfirm in this document?
**Options.**
- **A · Reconfirm as-is.**
- **B · Modify.** Specify alternative (e.g., post-Sunset adjust to 60/13.33/13.33/13.33).
**Recommendation.** A.
**Default if no answer.** A.
**Owner.** All three.

### Q-38 · Part IV · Rudi communication cadence — reconfirm
**Context.** Existing plan: Weekly Sunday 20:00 UAE email; monthly 1-hour Board call; quarterly 2-hour deep-dive; ad-hoc 48-hour material events.
**Question.** Reconfirm cadence or modify?
**Options.**
- **A · Reconfirm as-is.**
- **B · Tighten.** Add bi-weekly 30-min call in addition to weekly email.
- **C · Loosen.** Monthly email only; quarterly call.
**Recommendation.** A — already a strong cadence; tightening burns founder time.
**Default if no answer.** A.
**Owner.** Rudi (receiver preference).

### Q-39 · Part IV · Board meeting frequency
**Context.** 1-hour monthly Board calls + 2-hour quarterly deep-dive.
**Question.** Reconfirm?
**Options.**
- **A · Reconfirm.**
- **B · Quarterly only.** Drop monthly; rely on weekly email.
- **C · Add annual Board retreat.** 1-day in-person October each year (pre-year-end planning).
**Recommendation.** A + C — annual retreat signal team maturity, trivial marginal cost.
**Default if no answer.** A + C.
**Owner.** Rudi + founders.

### Q-40 · Part IV · Material event thresholds
**Context.** MOU: 48-hour notice to Rudi on "material events." Not defined precisely.
**Question.** Define material-event threshold?
**Options (multi-select — all thresholds triggering 48-hour notice).**
- **a)** Any deal > AED 50 M signed.
- **b)** Any key-person resignation (founder, CoS, DPO, counsel).
- **c)** Any regulator inquiry / warning / fine.
- **d)** Any press event (positive or negative) reaching national audience.
- **e)** Any funding offer received (no founder commitment needed to trigger notice).
- **f)** Any cyber incident affecting >10 % of users or any PII exfiltration.
- **g)** Any litigation filed (by or against ZAAHI).
- **h)** Any single operational expense > AED 500 k.
- **i)** Any change in Ambassador treasury balance > AED 1 M in a single day.
- **j)** Any competitor acquisition / merger / major round affecting competitive dynamics.
**Recommendation.** All 10 — explicit + narrow. "Material" = Rudi wakes up to this.
**Default if no answer.** All 10.
**Owner.** Rudi + founders.

### Q-41 · Part IV · Decision delegation matrix
**Context.** Who approves what without Rudi / without unanimous?
**Question.** Decision-authority levels?
**Options.**
- **A · Standard matrix.** Hiring below CoS level: Zhan + Dymo agree. Hiring CoS or above: all three + Rudi. Product / eng architecture: Zhan sole. BD partnerships: Dymo sole (below material threshold). Legal filings: BSA drafts, 2/3 founders sign. Equity changes: all three + Rudi.
- **B · Tight matrix.** Everything except day-to-day code / content requires all three sign-off.
- **C · Loose matrix.** Each founder has full authority in their track (eng / BD), escalate only on disagreement.
**Recommendation.** A — standard.
**Default if no answer.** A.
**Owner.** All three.

### Q-42 · Part IV · Amendment procedure
**Context.** This enhancement proposal document becomes binding on signature. How do we amend when circumstances change?
**Question.** Amendment procedure tiers?
**Options.**
- **A · 3-tier.** Minor (single founder) · Medium (2/3 founders) · Major (all three + Rudi).
- **B · 2-tier.** Operational (2/3) · Strategic (all + Rudi).
- **C · 1-tier.** Any amendment = all three + Rudi.
**Recommendation.** A — matches Q-41 decision matrix.
**Default if no answer.** A.
**Owner.** All three.

### Q-43 · Part IV · Sign-off procedure + binding effect
**Context.** Once this proposal is signed, it becomes the working plan for Y1-Y3 execution. Who signs, and is it legally binding or internally binding?
**Question.** Nature of this document?
**Options.**
- **A · Internal binding only.** All three sign. Not a legal instrument. Amendable per Q-42.
- **B · Notarised.** UAE notary attests signatures. More weight, costs ~AED 500.
- **C · Attached to Shareholders Agreement.** Becomes Schedule to SA when SA signed post-LLC incorporation (Week 3).
**Recommendation.** A → C. Internal binding this cycle; upgrade to SA Schedule at Week 3 signing.
**Default if no answer.** A → C.
**Owner.** All three + BSA (drafting).

---

# PART V — Investor-package reconciliation

*3 questions on v7 investor-package narrative under the new sequence.*

### Q-44 · Part V · v7 narrative hold-test
**Context.** Investor package v7 assumes Platform Y1 tier subscription revenue AED 400 k + Ambassador signups Y1. Phase 1 Owner-First shifts these to Y2.
**Question.** Does v7 story hold under new sequence?
**Options.**
- **A · Holds — Agency Y1 AED 7.8 M is 95 % of Y1 revenue; 5 % shift is immaterial for investor narrative.**
- **B · Holds with disclaimer.** v7 stays, but a short addendum memo issued to Rudi acknowledging the revenue-timing shift.
- **C · Doesn't hold — requires v7.1.** Full P&L regenerated.
**Recommendation.** B — Rudi has already signed v7; unilateral amendment is awkward. Memo preserves relationship + documents the shift.
**Default if no answer.** B.
**Owner.** Rudi (investor) + Zhan.

### Q-45 · Part V · v7.1 scope if needed
**Context.** If Q-44 answer is B or C, v7.1 scope must be defined.
**Question.** If v7.1 issued, what's the scope?
**Options.**
- **A · Calendar-only fix.** Mon Apr 21 → Mon Apr 20 (already flagged in INVESTOR_PACKAGE_ISSUES.md). ~1.5 hr work + PDF re-render.
- **B · Calendar + revenue-timing.** Add Al Jurf burn + shift Platform tier subs Y1 → Y2. ~4-6 hr work.
- **C · Full refresh.** A + B + update all 12 investor-package docs to reflect Phase 1/2 sequence + IRR delta. 10-15 hr work.
**Recommendation.** B — what actually matters for investor narrative integrity; A alone is cosmetic.
**Default if no answer.** B.
**Owner.** Zhan + Rudi.

### Q-46 · Part V · v7.1 issue timing
**Context.** If v7.1 is issued, when?
**Options.**
- **A · Before first Board meeting Month 1.** Demonstrates discipline and transparency. Rudi sees revised numbers.
- **B · After first deal closes Month 3.** Use real data to validate updated assumptions.
- **C · Before Series A data room (Phase 3, ~Q3 2027).** Just-in-time; v7 sufficient until then.
- **D · Never — v7 + addendum memo (Q-44 option B) sufficient.**
**Recommendation.** A — sooner aligns with transparency cadence; no downside.
**Default if no answer.** A.
**Owner.** Rudi + Zhan + Dymo.

---

## Summary — what agent needs back from owners

**Time to answer:** ~10 hours of deliberation across 46 questions. Recommended cadence:
- Week 1: Part I (8 questions, foundational — answer first).
- Week 1-2: Part II (15 questions — most execution detail).
- Week 2: Parts III, IV, V (23 questions — residual structure + investor-package).

**Format for answers:** owners can inline-edit this file, or respond in Slack / email with "Q-N: option X [optional note]" format.

**Agent default behaviour:** each question has an explicit default. If an owner hasn't answered a question by the time Phase 2 proposal drafts, agent applies the default and explicitly marks it in `MASTER_TREE_ENHANCEMENT_PROPOSAL.md` so it can be revisited at first quarterly review.

**Critical-path questions (answer these first):**
- Q-1 (Phase 2 trigger criteria) — shapes execution discipline.
- Q-9 (Phase 1 Master Tree sections) — shapes Months 1-9 build.
- Q-13 (Ambassador Phase 1 posture) — shapes Y1 P&L.
- Q-14 (Safety P0 re-rank for owner-only) — shapes Zhan's capacity allocation.
- Q-34 (budget authorization) — unblocks everything with spend > AED 50 k.

These five alone let agent produce a ~80 %-accurate draft of the binding proposal.

---

**End of OPEN_QUESTIONS_FOR_OWNERS.md.** Companion: `AUDIT_FINDINGS.md`, `VERIFICATION_LOG.md`, `QUALITY_CHECKLIST.md`, `CORRECTIONS_SUMMARY.md`, `INVESTOR_PACKAGE_ISSUES.md`. Next artefact (after owner answers): `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md`.

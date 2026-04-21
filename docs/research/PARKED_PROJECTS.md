# Parked Research & Projects

Projects paused pending founder decisions or external dependencies.
When returning, check original research branch and any updates needed
to reflect changes since pause date.

---

## Wall + Archibald Unified System

Paused: 2026-04-16
Paused by: Founder decision (Dymo)
Reason: Blocked on UAE Advertiser Permit legal review (Federal Decree-Law 55/2023, enforcement since 1 Feb 2026). Legal counsel engagement required before proceeding.

Research artifact: docs/research/WALL_ARCHIBALD_SYSTEM.md
Branch: research/wall-archibald-system
Last commit: e4ac13c8512463e1aee6113c56c31fb22054752c
Word count: 8884

Open questions that must be resolved before resuming:
1. Posting eligibility model — verified professionals vs all approved users vs admin-invite-only
2. LLM provider scope — Claude-only through Sprint 4, or multi-vendor from day one
3. UAE Advertiser Permit status — does ZAAHI currently hold one; how does it cover user-generated promotional content on Wall

Return checklist:
- Re-verify UAE regulatory status (law may have evolved, enforcement precedents may exist)
- Re-verify Anthropic model availability and pricing (research assumed Opus 4.6, Sonnet 4.6, Haiku 4.5 availability and caching rates)
- Re-verify Cloudflare R2 pricing vs Supabase Storage
- Check if Abu Dhabi migration has shifted any infrastructure decisions
- Legal counsel sign-off on posting eligibility model

When resuming, create new branch from research/wall-archibald-system, update research doc with deltas from pause period, then proceed to Sprint 1 spec.

---

## UAE Government API Audit

Completed: 2026-04-16
Status: Report written, pending founder review

Research artifact: docs/research/GOV_API_AUDIT_UAE.md
Branch: research/gov-api-audit
Purpose: Catalog all official UAE government APIs for land/real-estate data (DLD, Dubai Pulse, Abu Dhabi open data, federal sources) to inform data integration strategy for ZAAHI.

Next step: Founder review of report and decision on which APIs to integrate first.

---

## UAE Compliance Desk Research (Draft)

Archived: 2026-04-16
Status: Draft from prior Claude session, not reviewed

Research artifact: docs/research/UAE_COMPLIANCE_DRAFT.md
Branch: research/uae-compliance-draft
Purpose: Early desk research on UAE compliance landscape (scope unclear, predates current research structure).

Next step: Founder decides — review and promote to formal research, or discard. No action required meanwhile.

---

## Feasibility Framework — Ultimate Tool Architecture Decision

Paused: 2026-04-22
Paused by: Founder decision (Zhan) — priority shift to §77 Web Platform White-label.
Status: PARKED — awaiting founder decision on Option A/B/C/D + Q1 target-user answer.

Decision artifact: docs/decisions/PARKED_FEASIBILITY_FRAMEWORK_DECISION.md
Branch: research/vision-and-competitors-2026-04-19
Purpose: Full decision surface for "безупречный" Feasibility Calculator covering 7 segments × 8 strategies × 7 geographies (~515 realistic permutations). Founder directive 2026-04-21 called for maximum professional + comprehensive tool; agent produced 3 strategic questions (Q1 target user · Q2 build sequence · Q3 data budget) + 4 spec-structure options (A single mega-spec / B per-segment sub-specs / C master + architecture + phased / D Framework-First Phased) + 7 recommendations (R-1..R-7). Agent recommended Option D · Phase A writing of docs/architecture/FEASIBILITY_FRAMEWORK_ARCHITECTURE.md (~1500-2000 lines · ~40 hours) to establish shared primitives for v3/v4/v5 builds over 3-year phased roadmap.

Open questions that must be resolved before resuming:
1. Q1 target user — (a) Dymo iPad · (b) 7-role platform · (c) institutional data room · (d) adaptive UI? THE fulcrum; different answers = different architectures.
2. Q2 build sequence — keep Spec 04 v1.1 as v1 reference / scrap / hybrid?
3. Q3 market data budget — free · mid AED 160-230k/yr · high AED 230-365k/yr?
4. Specialist hire posture (R-5) — part-time quant AED 30-50k 3-mo engagement for Phase 2 v3 build?

Trigger conditions for resume (any one):
- Founder explicitly returns to this decision.
- Spec 04 v1.1 MVP ships (Month 4-5 target · Fri 2026-06-19 latest) — production feedback available.
- Specialist hire triggered — quant analyst engaged, v3 Framework spec becomes their first deliverable.
- Series A prep window (Phase 3 Q3 2027) — Framework doc is a data-room asset.
- Investor-package v7.1 refresh (Q-44/45/46 decisions made) — Framework roadmap becomes narrative input.
- Competitive trigger — Huspy/PRYPCO/Bayut announces institutional-grade feasibility tool; defensive acceleration required.
- Phase 2 opening Mon 2027-01-18 — external users = Spec 04 v1 insufficient; v3 Framework becomes critical path.

Dependencies at pause (all 6 companion artefacts committed, ready for cross-reference on resume):
- Spec 04 v1.1 commit 03b272b (696 lines) — v1 reference implementation
- FEASIBILITY_STYLE_GUIDE commit 2f34899 (569 lines) — visual contract
- Spec 02 v1.1 commit 0caf9de (935 lines) — shared jsPDF pipeline
- Spec 03 v2.0 commit 0cd6542 (975 lines) — Super-Admin permission surface
- Enhancement Proposal v1.2 commit 45f23f5 (750 lines) — §1.C AU-2 ratified commitment
- src/app/parcels/map/FeasibilityCalculator.tsx (production 1001 lines, unchanged) — existing v5.0 implementation to extend
- src/lib/feasibility.ts (production 500 lines, unchanged) — v5 pure formulas to compose

When resuming, re-read PARKED_FEASIBILITY_FRAMEWORK_DECISION.md first; then answer Q1; then confirm Option D still preferred; then agent executes Phase A (~40 hours of spec writing with single commit at end).

---

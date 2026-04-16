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

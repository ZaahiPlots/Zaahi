# Private Plot Vault — Founder Decisions

**Revised 2026-05-13 (third pass)** — scope simplified to "personal plot tracker" per founder direction. D1–D5 + D-bonus ratified. D6 deferred to Phase 2.2. D7 LITE only (DISPUTED + admin arbitration → Phase 2.2). D8 / D9 obsolete (no new verification surface in Vault; promote routes through the existing Listings flow which already has its gates).

**No open sub-questions remain.** Implementation planning is fully unblocked.

---

## D1. Identity model — separate `VaultEntry` table

**Founder picks: A — separate VaultEntry model. ✓ RATIFIED.**

Rationale: Keeps `Parcel` table semantics clean, allows multiple users to track the same plot without write conflicts, makes Promote-to-Public an explicit data operation. Spec §3.1.

---

## D2. Visibility model — three-tier with SHARED implicit

**Founder picks: Three-tier with SHARED implicit (derived from `VaultShare` rows; no enum stored). ✓ RATIFIED.**

Rationale: API surface trichotomy (PRIVATE / SHARED / PUBLIC) without an explicit field. Visibility derived at API layer from existence of `VaultShare` rows. Simpler schema, cleaner data model.

---

## D3. Sharing — account-required only

**Founder picks: A — account-required MVP. Link-based deferred to Phase 2.3. ✓ RATIFIED.**

Rationale: Cohort-aligned (everyone has an account); PDPL-safer (recipient identified); no token-revocation infrastructure required for MVP. Spec §6.4.

---

## D4. Pricing model — freemium with AI features as paid

**Founder picks: Option 3 — Freemium with AI features as paid (Phase 2.3). ✓ RATIFIED.**

Rationale: Matches the "CRM with AI" framing Aigerim/Highgrove articulated. Monetizes the moat (proprietary data + AI), not the commodity (storage). Onboarding friction near zero.

---

## D5. MVP scope — Recommended (now smaller post-simplification)

**Founder picks: Recommended MVP. ✓ RATIFIED.**

Final scope (after spec simplification):
- Upload to vault (DDA auto-build / non-DDA manual fields)
- /vault list page with inline price edit + price history
- Vault map layer (mine) + Shared-with-me layer
- Share with named recipient (VIEW only)
- "Add to my vault" import-from-share with attribution
- Promote-to-Public via the existing Listings flow
- Conflict detection LITE (informational banner only)
- Attribution badges + provenance chain (2-hop)

**Estimate: 12–14 working days.** Spec §10.

---

## D6. Affection Plan parsing — DEFERRED to Phase 2.2

**Founder direction (simplification): non-DDA plot upload accepts manual fields in MVP. PDF parsing → Phase 2.2.**

Per spec §13, non-DDA plots in MVP accept user-entered area + optional lat/lng + land use, render as flat marker on the map. Phase 2.2 adds the Affection Plan PDF upload + Claude vision parse path (with `document` content block — meaningful extension of the existing image-only `parse-title-deed`).

Original three-way pick (A Claude vision / B manual only / C both) is moot — Phase 2.1 is effectively B, Phase 2.2 is C.

---

## D7. Conflict detection — LITE in MVP

**Founder direction (simplification): A — LITE only in MVP (informational banner). DISPUTED status + admin arbitration + aggregate market dashboard → Phase 2.2+ after cohort gives real signal.**

Earlier revision considered D7=B (FULL DISPUTED scope) based on developer-conversation validation, but the simplification reframes Vault as "personal plot tracker, not judicial." Conflict awareness in MVP is purely informational:
- Banner appears in side panel when 2+ users have the same plot with different data
- Redacted comparison modal shows public facts + @nicknames
- No DISPUTED status, no admin arbitration, no resolution flow
- Brokers handle outreach to each other themselves

The market-intelligence moat sits in Phase 2.2 once cohort signals what brokers actually want. Spec §15.

---

## D8. Verification name-match threshold — OBSOLETE

**Founder direction: no new verification surface in Vault.**

The Promote-to-Public flow routes through the existing `/api/parcels/submit` with the existing verification gates (Title Deed for owner, Contract for broker, admin verifies via existing PlotClaim queue). Vault does NOT introduce its own verification status, identity match, or admin queue tab.

The name-match threshold question is therefore moot for Phase 2.1. If Phase 2.2+ ever adds a separate Vault-specific verification surface, D8 reopens.

---

## D9. Verification docs storage — OBSOLETE

**Founder direction: no new verification documents in Vault, therefore no new storage bucket.**

Documents uploaded during Promote-to-Public continue to use the existing `registration-docs` Supabase bucket via the existing Listings submit flow.

---

## D-bonus. Vault → Deal commission attribution

**Founder picks: A — original sharer is default Deal broker. ✓ RATIFIED.**

When a Deal is created from a shared Vault entry, `Deal.brokerId = VaultEntry.ownerId` by default. Allows override by participants with explicit confirmation. Simplest, aligns with broker expectations.

---

## After founder ratification

All decisions ratified or moved to Phase 2.2/2.3. `implementation-plan.md` is fully unblocked. Day 1 can begin on `feat/vault-mvp` branch.

Next gate: founder reviews this revision + implementation-plan.md + spec.md together, gives explicit "go for Day 1." No code touches main until that go signal.

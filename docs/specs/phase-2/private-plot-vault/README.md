# Private Plot Vault — TL;DR

**Status:** Spec draft 2026-05-13. **Revised 2026-05-13 (third pass)** — scope simplified per founder direction: personal plot tracker, not legal pipeline. All decisions ratified, implementation unblocked. No code changes proposed yet.

## In one paragraph

Brokers, developers, and frankly all active participants in the Dubai market drown in plots that get forwarded to them — WhatsApp groups, broker chats, off-market leads, cold calls. They forget who sent which plot, can't remember if the price moved, and lose track of follow-ups. WhatsApp + Excel isn't a system. Private Plot Vault is **the personal plot tracker** — any approved ZAAHI user (cohort BROKER, OWNER, DEVELOPER, even founders) maintains their own private list of plots they're tracking, with attribution ("@aigerim sent me this on May 8"), inline price edits, follow-up dates, and selective sharing with named users. **It is NOT a legal pipeline** — public listings, document verification, regulator-grade compliance live in the existing Listings flow. Vault crosses into Listings only when the user clicks "Promote to Public Listing", which routes through the existing `/api/parcels/submit` (same form, same verification gates). The differentiator no UAE competitor has: **cross-user awareness** — when two vault users have the same plot with different data, both see an informational banner. Not adjudicated, not blocked, not arbitrated — just visible. Phase 2.2+ will look at aggregate dashboards and admin arbitration once cohort gives real signal on what brokers want.

## Four docs in this folder

| File | Purpose | Audience |
|---|---|---|
| **`README.md`** | This file. TL;DR + decisions summary. | 2-minute scan |
| **`spec.md`** | Full design — concept, data model, permissions, API surface, UX flow, map rendering, phasing, risks. | 25-30 minutes |
| **`decisions.md`** | The decisions only founder can make. All ratified in this revision. | 5 minutes |
| **`implementation-plan.md`** | Concrete Prisma schema, migration SQL, route signatures, day-by-day timeline. | 25 minutes |

## My honest assessment of the concept (post-simplification)

**Stronger than the prior revisions.** The earlier "MVP+" tried to bundle three big features into one MVP (Affection Plan parsing + verification gate + full conflict resolution). Pulling those out into Phase 2.2 leaves a tighter Phase 2.1 that ships a meaningfully complete personal-tracker in 12–14 days. What stays:

- **Attribution + provenance** — "видит кто прислал" lives in `addedByUserId` + `provenanceChain`, surfaced as a small badge.
- **Inline price edit + history** — broker updates a price in one click; every change writes to `VaultPriceHistory`.
- **Cross-user info banner** — when two vault users have the same plot with different data, both see it. No adjudication, no admin, no blocking. The market-intelligence moat sits in Phase 2.2.
- **Sharing + "Add to my vault" import** — the actual mechanism for "видит кто прислал" — recipient sees a share, imports it, attribution sticks. If they re-share, the chain grows.

What was pulled out:
- **Affection Plan PDF parsing** → Phase 2.2. MVP non-DDA plots accept manual fields (area + optional lat/lng + land use), render as flat marker. Phase 2.2 adds Claude-vision parsing with the `document` content block (extension of the existing image-only `parse-title-deed`).
- **Verification gate inside Vault** → never was needed. Promote-to-Public routes through the existing Listings submit form which already has the Title Deed / Contract gate.
- **DISPUTED status + admin arbitration + aggregate dashboard** → Phase 2.2. Cohort signal first.

## Master Tree placement (frozen — addition not modification)

The 12 blocks A–L stay frozen. Private Plot Vault is `A.10 Private Asset Vault` with interlocks into B (broker workflows), C (Deal engine via Promote), G (PDPL for shared data), H (broker onboarding), I (conflict detection — first I-block feature). 5 of 12 blocks touched.

## Ratified decisions

All 6 active decisions are ratified. 3 are obsolete or deferred under the simplified scope. Full table in `decisions.md`.

| # | Decision | Status |
|---|---|---|
| D1 | Separate `VaultEntry` table | ✓ Ratified |
| D2 | Three-tier visibility with SHARED implicit | ✓ Ratified |
| D3 | Account-required sharing | ✓ Ratified (link-based → Phase 2.3) |
| D4 | Freemium with AI features as paid | ✓ Ratified |
| D5 | Recommended MVP scope | ✓ Ratified |
| D6 | Affection Plan parsing | → Deferred to Phase 2.2 |
| D7 | Conflict detection LITE | ✓ Ratified (DISPUTED + dashboard → Phase 2.2) |
| D8 | Name-match threshold | Obsolete (no new vault verification surface) |
| D9 | Verification doc bucket | Obsolete (same) |
| D-bonus | Sharer = Deal broker | ✓ Ratified |

## Estimated complexity

- **MVP (Phase 2.1):** **12–14 working days.** 2 new enums, 4 new models, 13 new API routes + 1 modified, ~16 new component files, ~7 new lib modules. Demo-ready week 3.
- **Phase 2.2:** 12–18 days. Adds Affection Plan parser, kanban, per-permission shares, email digest, encryption, conflict aggregate dashboard, optional DISPUTED arbitration.
- **Phase 2.3:** 3–4 weeks. AI features, team accounts, paid tier launch.
- **Phase 2.4:** Mobile pipeline app — separate spec.

**Total to ship 2.1–2.3:** ~6–8 weeks of focused work.

The MVP went from 17–21 days (prior revision) to 12–14 days because three substantial features moved to Phase 2.2 (Affection Plan parser, full DISPUTED scope, market-intelligence dashboard) and one was removed entirely (vault verification surface — duplicated existing Listings flow).

## What this spec does NOT decide

- Pixel-level UI wireframes
- AI provider for Phase 2.3
- Whether non-Dubai plots are MVP scope (spec covers; founder picks)
- Concrete migration timeline (bound to MVP start)

## Day-1 readiness checklist (from implementation-plan §9)

- [ ] Founder ratification of all 6 active decisions ← **this revision**
- [ ] `feat/vault-mvp` branch off `main`
- [ ] CI runs Prisma generate + tsc + Next.js build
- [ ] Supabase dev DB accessible for `prisma migrate dev`
- [ ] 1 OWNER + 1 BROKER + 1 DEVELOPER cohort test accounts
- [ ] No competing branch in progress that overlaps `prisma/schema.prisma`

## Next step

Founder reads the revised 4 docs, gives explicit "go for Day 1." Engineering proceeds on `feat/vault-mvp` branch off main. No code touches main until that go signal.

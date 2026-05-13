# Private Plot Vault — TL;DR

**Status:** spec draft 2026-05-13. **Revised 2026-05-13** with founder additions (affection-plan ingress, verification gates, conflict detection, attribution, price history). Not yet approved. No code changes proposed.

## In one paragraph

Brokers and developers in Dubai keep their daily plot pipeline in WhatsApp threads and Excel. ZAAHI today only offers one mode for plot data — Public Listings, verified, visible to everyone. That's good for sellers ready to transact, but it's wrong for the daily reality of an active broker: they're tracking 50–500 plots in various stages, most of which they don't want public. Private Plot Vault adds a second mode at upload time: keep the plot to yourself, with the same map / feasibility / docs tooling, plus optional point-to-point sharing with named users. **Critical addition from founder review:** non-DDA plots are first-class — uploader provides an official Affection Plan PDF (NOT Site Plan, NOT DCR), ZAAHI parses the coordinates via Claude vision, and a 3D building appears for the owner only. Promote-to-Public is gated by verification — Contract+ID for brokers, Title Deed+ID with name match for owners. And ZAAHI does what no UAE competitor does: when two users have the same plot with different data, both see a banner — market intelligence as a side-effect of vault adoption.

## Four docs in this folder

| File | Purpose | Audience |
|---|---|---|
| **`README.md`** | This file. TL;DR + decisions tee-up. | 2-minute scan |
| **`spec.md`** | Full design — concept assessment, data model, permissions, API surface, UX flow, map rendering, phasing, risks. Now 17 sections (was 12). | 30–40 minutes deep read |
| **`decisions.md`** | The **9 decisions** only founder can make (5 original + 4 added in revision), framed with trade-offs. | 15 minutes |
| **`implementation-plan.md`** | Concrete Prisma schema, migration SQL, route signatures, day-by-day timeline. | 30 minutes |

## My honest assessment of the concept (post-revision)

**Still solid. Concept survived founder gap-review intact — the additions tighten it, not weaken it.** The pain (WhatsApp + Excel) is real, the moat opportunity (no competitor in Dubai offers affection-plan auto-parse OR cross-user conflict detection) is real, and the existing ZAAHI architecture absorbs the additions cleanly:

- **Affection Plan parsing** reuses the existing `parse-title-deed` Claude-vision pattern — sibling route, same shape.
- **Verification gates** reuse the existing PlotClaim admin queue pattern — new tab on `/admin/queue`.
- **Conflict detection** is genuinely new but architecturally clean: one new lib (`vault-conflict.ts`), one compound index, `O(N)` recompute per plot tuple where N is typically 1–5.
- **Attribution + price history** are tiny additions, ~2 days combined.

One framing nuance preserved from original: brand externally as "Vault" (trust signal), model internally as **stage-aware pipeline** because that's what brokers actually live in.

**Real concerns I'm flagging in the revision:**

1. **Affection Plan parse accuracy.** Vision LLM can hallucinate. Mitigation: confidence score + editable review form + PDF preserved in bucket for re-extraction. Risk bounded but real — recommend testing on 5–10 real PDFs from founder during Day 6.
2. **Verification name-match for Arabic transliterations.** "Mohammed" vs "Mohamed" could score < 0.92. Mitigation: tunable threshold (Decision D8), admin override always available.
3. **Conflict detection false positives.** Two brokers legitimately at AED 50M and 50.5M shouldn't trigger conflict. Mitigation: ≥ 5% price tolerance baked into `vault-conflict.ts`.
4. **Original Cannibalization risk preserved.** Vault could cannibalize Public Listings. Mitigated by (a) verification gates make Promote-to-Public meaningful, not free, (b) platform fee applies on Vault→Deal too, (c) pricing tilted for scale.

## Master Tree placement (frozen — addition not modification)

The 12 blocks A-L stay frozen. Private Plot Vault is a **new module under Block A (Assets)** — `A.10 Private Asset Vault` — with explicit interlocks into B (broker workflows), C (deal engine for promote-to-deal), D (AI subsystem for parse-affection-plan), G (PDPL for selective sharing + verification docs), H (broker onboarding hook), I (conflict detection = first I-block feature in MVP), and J (future white-label adjacency). 7 of 12 blocks touched — proves it's a real platform feature.

## Top decisions for founder (full version in `decisions.md`)

Original 5 + 4 new = **9 decisions**. Compressed list:

1. **Identity model** — separate `VaultEntry` table (A) **(recommended)** or flip `Parcel.visibility` (B). Separate table preserves Parcel cleanliness; supports multiple brokers tracking same plot.
2. **Visibility — binary or three-tier?** Three-tier with SHARED implicit **(recommended)**.
3. **Sharing — account-required or link-based?** Account-required for MVP **(recommended)**; link-based as Phase 2.3 polish.
4. **Pricing.** Freemium with AI features as paid **(recommended)** — matches Highgrove ask, monetizes the moat.
5. **MVP scope.** Recommended MVP+ — see Decision D5 in decisions.md.
6. **[NEW] Affection Plan parsing.** Claude vision **(recommended for MVP)**, manual fallback in Phase 2.2.
7. **[NEW] Conflict detection scope.** Lite (banner only) **for MVP (recommended)**, full DISPUTED in Phase 2.2.
8. **[NEW] Verification name-match threshold.** **0.92 recommended** — balanced between transliteration tolerance and fraud risk.
9. **[NEW] Verification docs storage.** New `vault-verification-docs` bucket **(recommended)**, separate from `registration-docs`.

D-bonus (still relevant): Original sharer gets broker share on Vault→Deal **(recommended)**.

## Estimated complexity — REVISED

- **MVP+ (Phase 2.1):** **17–21 working days** (was 10–14). Adds affection-plan ingress + verification gates + conflict detection lite + attribution + price history. New table, 3 new enums, 4 new models, 6 new API routes + 2 modifications. Vault map layer, /vault list page, multi-step upload wizard with PDF parse, share modal, promote-with-verification, admin queue tab.
- **Phase 2.2 (pipeline depth + full conflict resolution):** 10–14 days.
- **Phase 2.3 (AI features, team accounts, paid tier launch):** 3–4 weeks.
- **Phase 2.4 (mobile pipeline app):** Out of scope, separate spec.

Total to ship Phases 2.1–2.3: **8–10 weeks** of focused work (was 6–8; the affection-plan parser + verification gate adds ~1 week to MVP). MVP demo-ready in week 3.

## What this spec does NOT decide

- Exact UI wireframes — covered conceptually in spec.md §6, but pixel-level designs are post-decision.
- AI provider / model choice for Phase 2.3 — depends on D4 + budget.
- Whether non-Dubai plots are MVP scope — spec.md §7 covers, founder picks.
- Concrete migration timeline — bound to MVP start.
- Cost ceiling on Affection Plan parsing — currently ~$0.02–0.05 per parse; track via billing dashboard.

## Next step

Founder reads `spec.md` + `decisions.md` + `implementation-plan.md`, picks on each of the **9 decisions**, then implementation plan firms from "17–21 days" into a day-by-day commitment. Engineering proceeds on `feat/vault-mvp` branch off `main`.

No code touches main until decisions signed off AND `implementation-plan.md` approved.

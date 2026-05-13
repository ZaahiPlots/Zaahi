# Private Plot Vault — Founder Decisions

Five decisions only founder can make. Each has my recommendation + trade-offs. Implementation planning is blocked on these.

---

## D1. Identity model — separate `VaultEntry` table, or flip a flag on `Parcel`?

| | Option A — separate `VaultEntry` model | Option B — `Parcel.visibility` field |
|---|---|---|
| **Schema impact** | 3 new tables, 0 changes to Parcel | Drop `@@unique([emirate,district,plotNumber])`, add `visibility` field, add per-user uniqueness |
| **Risk to public listings** | None — `Parcel` table semantics unchanged | Every public-listings query must filter by visibility; missed filter = data leak |
| **Multi-broker tracking same plot** | Trivial (each gets their own VaultEntry row) | Requires composite uniqueness, doubles row count |
| **PII surface (owner contact)** | Lives on VaultEntry only, never touches Parcel | Mingles into Parcel — PII shape spreads |
| **Promote-to-Public** | Explicit operation (creates a Parcel row, links via `promotedParcelId`) | Toggle a flag — easier to reason about superficially, harder to audit |
| **Migration complexity** | Additive (no backfill of existing parcels needed) | Requires backfilling `visibility = PUBLIC` on 100s of existing rows |

**Recommendation: Option A.** Reasons in spec §3.1.

**Founder picks: ☐ A  ☐ B  ☐ Other approach**

---

## D2. Visibility model — binary or three-tier?

| | Binary (PRIVATE / PUBLIC) | Three-tier (PRIVATE / SHARED / PUBLIC) |
|---|---|---|
| **Conceptual clarity** | Simpler | More accurate — "shared" is a distinct state |
| **API surface** | One visibility field | Same field, more values |
| **UX** | Bool toggle on the entry | Visibility derived from share rows (entry stays PRIVATE if no shares, becomes SHARED implicitly when first share added) |
| **Server-side** | Check `visibility === PUBLIC` | Check `visibility !== PUBLIC` for vault, then check shares table for SHARED |

**Recommendation: three-tier, where SHARED is implicit (derived from `VaultShare` rows existing, not a stored field).** Effectively binary at the DB level (`PRIVATE | PUBLIC`), three-tier at the UX/API level. Best of both.

**Founder picks: ☐ Binary  ☐ Three-tier (implicit SHARED)  ☐ Three-tier (stored)**

---

## D3. Sharing model — account-required, link-based, or both?

| | Account-required | Link-based (token URL) |
|---|---|---|
| **Recipient friction** | Must have a ZAAHI account | Just clicks a URL |
| **PDPL safety** | Strong — recipient is identified, consent traceable | Weak — anyone with the link gets in, screenshots/forwards possible |
| **Cohort-pilot alignment** | Yes — cohort is closed, all users approved | No — link-based defeats cohort gating |
| **MVP scope fit** | Yes — small set of broker pairs to test with | No — link-based needs token revocation, expiry, abuse logging |
| **Viral / acquisition lever** | Limited — recipient has to register | Strong — recipient becomes potential cohort applicant |

**Recommendation: account-required for MVP (Phase 2.1). Link-based as Phase 2.3 polish if founder sees adoption pain.** Spec §6.4.

**Founder picks: ☐ Account-only for MVP  ☐ Both from MVP  ☐ Link-only**

---

## D4. Pricing model

Four options in spec §9. Quick comparison:

| | Free unlimited | Freemium by plot count | **Freemium by AI features** | Per-share fee |
|---|---|---|---|---|
| **Direct revenue** | Zero | Modest, predictable | Higher, depends on AI value | Volatile |
| **Onboarding friction** | None | None (until N) | None | Low |
| **Aligns with Highgrove "CRM with AI" pitch** | No | No | **Yes** | No |
| **Moat monetization** | No | No | **Yes** (proprietary data + AI on top) | No |
| **Cannibalizes Public Listings** | Maximum risk | Some risk | Some risk | Lowest risk |
| **Time-to-revenue** | Never | ~2 weeks post-launch | After Phase 2.3 (6–8 weeks) | ~2 weeks post-launch |

**Recommendation: Freemium with AI features as paid (Option 3).** Best alignment with the stated use case, monetizes the moat rather than the commodity. Trade-off: revenue arrives later (post Phase 2.3) — needs founder runway.

**Founder picks: ☐ Free unlimited  ☐ Freemium by plot count  ☐ Freemium by AI features  ☐ Per-share  ☐ Other**

---

## D5. MVP scope cut

I'm proposing the MVP as 10–14 days of focused work. Three reasonable scope cuts to choose from:

| | Minimum viable | Recommended MVP | Maximum MVP |
|---|---|---|---|
| Upload to vault | ✓ | ✓ | ✓ |
| Map layer for owned entries | ✓ | ✓ | ✓ |
| List/table view | ✓ | ✓ | ✓ |
| Edit / delete | ✓ | ✓ | ✓ |
| Stage field (LEAD / CONTACTED / …) | ✓ (single field) | ✓ (kanban-ready data, list-only UI) | ✓ + kanban UI |
| Share with named recipient | — | ✓ (view-only) | ✓ (view + feasibility) |
| "Shared with me" surface | — | ✓ | ✓ |
| Promote-to-public | — | ✓ | ✓ |
| Activity log | — | ✓ (server-side; basic in-app feed) | ✓ + email digest |
| AI / smart suggestions | — | — | — |
| **Estimate** | 5–7 days | **10–14 days** | 15–18 days |
| **Value to broker** | "Better than Excel" | "Daily tool" | "Daily tool + visible sharing" |

**Recommendation: Recommended MVP (the 10–14 day version).** "Minimum viable" doesn't actually replace WhatsApp+Excel (no sharing). "Maximum MVP" trades scope for risk at the start. The middle one is right.

**Founder picks: ☐ Minimum viable  ☐ Recommended MVP  ☐ Maximum MVP  ☐ Custom (specify)**

---

## D-bonus. R5 from spec — Ambassador commissions on Vault→Deal

If a Vault entry is shared with a buyer, and the buyer makes an in-app Deal offer that closes, **who gets the broker share of the 0.25 % platform fee?**

Three reasonable answers:

- **A. Original sharer (recommended).** They sourced the lead, shared it, the deal happened through their share. Standard real-estate broker semantics.
- **B. Whichever User is named as `broker` on the Deal at signing.** Lets the buyer override (e.g., they were already working with a different broker) — but creates a dispute surface.
- **C. Split 50/50 between sharer and Deal broker.** Most fair if buyer also had a representing broker; but adds accounting complexity.

**Recommendation: A.** Simplest, aligns with how brokers expect it to work. Implementation: when a Deal is created from a shared Vault entry, set `Deal.brokerId = VaultEntry.ownerId` by default. Allow override by participants with explicit confirmation.

**Founder picks: ☐ A  ☐ B  ☐ C  ☐ Other**

---

## After founder decides

Each decision unblocks part of the implementation plan. Once all 5 are picked:

1. I write `implementation-plan.md` in this same folder — concrete schema diff (Prisma syntax ready to drop into `prisma/schema.prisma`), `prisma migrate dev --name vault_mvp` ready, route signatures, component-level task list.
2. Estimate firms up (currently 10–14 days for the recommended MVP — would tighten to a day-by-day plan).
3. Founder approves the implementation plan, then engineering proceeds Phase 2.1.

No code touches main until the implementation plan is approved.

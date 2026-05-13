# Private Plot Vault — Full Spec

**Status:** Draft 2026-05-13. Concept review + design proposal. No code changes, no schema migrations, no production deploys.
**Author:** ZAAHI agent (Claude Opus 4.7).
**Reviewer:** Zhan (founder).

---

## 1. Concept assessment first — is this the right shape?

The brief framed it as "Vault." That's the right marketing word — it signals privacy, control, trust. But internally the data model should be **pipeline**, because that's the operational reality the feature is replacing.

A working broker's WhatsApp + Excel today has columns like:

- Plot number
- Land use, area, location
- Source (DDA scrape / cold call / referral / off-market lead)
- **Stage** (Cold lead / Spoke to owner / Sent NDA / Negotiating / Term sheet / Signed / Listed publicly / Lost to competitor)
- Owner contact (phone, email, agent name)
- Notes, follow-up date
- Documents (title deed scan, affection plan)

The "Vault" framing gets us only column 1–4 + 7. The "pipeline" framing also gets us **stage** — the column that defines what the broker does next every morning. If we don't have stages, we're a slightly better Excel; if we do, we're a CRM the broker doesn't have today.

**Recommendation:** brand externally as "Private Vault" (privacy/trust signal), model internally as **stage-aware private inventory**. The stages can be very simple in MVP — just a `stage` enum on the entry, displayed as a kanban-ish list. Real CRM features (drag-and-drop kanban, automation, AI) come in Phase 2.2 / 2.3.

This duality is fundamental to the feature working as Highgrove's daily tool rather than yet-another-storage.

### Where I'd push back if I were the architect (and what to do about it)

- **"Storage" framing risks low engagement.** Brokers won't open ZAAHI daily just to look at a list of plots they uploaded. They open WhatsApp daily because there's *activity* — new leads, follow-up reminders, conversation. Vault needs activity surfaces: stage changes, owner-replied notifications, share recipient viewed it, etc. Without this, Vault becomes a static dump and engagement decays. **Mitigation:** even MVP should have a basic activity feed + email digest.
- **"Selective share" framing risks complexity creep.** Per-user permission grids, expiry, revocation, audit log — these are real-CRM features, not MVP features. **Mitigation:** MVP ships one permission level (view-only) and one expiry option (never; revocable). Granular permissions are Phase 2.2.

### Fundamental issue I want to flag

The most subtle risk is **Vault cannibalizing Public Listings revenue.** ZAAHI's current revenue path is 0.25 % platform fee on closed Deals. If a broker uploads to Vault, shares with a buyer, the deal closes off-platform via WhatsApp anyway, ZAAHI sees zero. Three structural mitigations to design in from day one:

1. **Vault → Deal conversion is the only way to move money.** Make the in-app Deal flow strictly better than off-platform for the broker (escrow, audit trail, compliance docs auto-generated, DLD integration). The 0.25 % fee is a small price for the workflow they'd otherwise rebuild manually.
2. **Promote to Public is a one-click action.** When a broker decides "this plot is ready to market widely," it's a single button to flip visibility. Friction here means the broker stays private even when public would serve them.
3. **Pricing model that taxes scale.** If Vault is free for the first N plots and paid above, large brokers economically lean toward listing publicly (free) rather than warehousing privately (paid above the threshold). See §9 for pricing options.

If these three are in place, Vault grows the pie rather than cannibalizing the slice.

---

## 2. Where it lives in Master Tree v3.0

Master Tree is frozen — 12 blocks A through L (per `CLAUDE.md`), 85 modules total. Private Plot Vault is a **new module under Block A (Assets)**:

```
Block A — Assets
  A.1   …existing 9 modules (land, residential, commercial, off-plan,
        distressed, digital, rental, insurance, management)…
  A.10  Private Asset Vault    ← addition
```

Interlocks with:

- **Block B (Participants)** — brokers and developers are the primary actors; their daily workflow shifts from external tools to A.10.
- **Block C (Transactions)** — Promote-to-Public and Vault-direct-Deal flow both terminate in the existing Deal engine (C.1 deal engine, C.4 JV, C.9 disputes).
- **Block G (Compliance)** — PDPL applies to shared plot data (owner contacts, prices). Selective-share is a PDPL surface that needs the same care as PII routes (G.5).
- **Block H (Growth)** — Vault is the **hook** for broker onboarding in Phase 2 (founder noted). Sticky daily-use feature drives retention metric.
- **Block I (Intelligence)** — Phase 2.3 AI features (Aigerim's "CRM with AI") sit here. Cat/Falcon/RoboMole are existing agents; Vault gets a new agent slot.
- **Block J (Ecosystem)** — Broker office accounts (multi-user Vault sharing within a single brokerage) is a J.7 (white-label) adjacency.

The fact that the feature legitimately touches 6 of the 12 blocks is a sign it's a real platform feature, not a side surface — which is the right shape for "daily tool."

---

## 3. Data model

### 3.1 Identity decision — VaultEntry vs Parcel.visibility

Today the `Parcel` model has `@@unique([emirate, district, plotNumber])`. That constraint exists because the public assumption is **one plot, one row**. Vault breaks that — three different brokers may all be tracking DDA plot 6457940 privately, each with their own price, notes, stage, sharing graph.

**Option A (recommended): separate `VaultEntry` model**

```
model VaultEntry {
  id           String          @id @default(cuid())
  ownerId      String          // who created the vault entry
  owner        User            @relation("VaultEntryOwner", fields: [ownerId], references: [id])

  // Plot identity — refers to a real plot in the world, not necessarily a Parcel row.
  emirate      String
  district     String
  plotNumber   String
  // Optional FK to a Parcel row IF one exists. Set when the underlying
  // plot is also publicly listed (by anyone, including the vault owner).
  // NULL is the common case — Vault entries usually describe plots that
  // have no Parcel row yet.
  publicParcelId String?
  publicParcel   Parcel?       @relation("VaultEntryPublicParcel", fields: [publicParcelId], references: [id])

  // Snapshot of plot facts (so vault works even if DDA scrape never happened
  // for this plot). When publicParcelId is set, these duplicate Parcel fields
  // — accept the redundancy as a denormalisation for read performance and
  // for the case where the broker overrides DDA values with their own.
  area         Float?
  latitude     Float?
  longitude    Float?
  geometry     Json?
  landUse      String?

  // Broker's own data (private, never derived from DDA)
  askingPriceFils  BigInt?     // their target sale price for the owner
  ownerContact     Json?       // { name, phone, email, role, notes } — PII; encrypted at rest is a Phase 2.2 ask
  brokerNotes      String?     // free-form notes, markdown allowed
  stage            VaultStage  @default(LEAD)
  source           String?     // "cold-call" | "referral" | "dda-scrape" | "off-plan" | ...
  nextFollowUpAt   DateTime?

  // Visibility / sharing
  visibility   VaultVisibility @default(PRIVATE)  // PRIVATE | SHARED
  // Promote-to-Public path: when the broker hits "Promote", this flips a flag
  // and a new public Parcel row gets created (or links to existing). The
  // VaultEntry remains as the broker's pipeline record.
  promotedAt   DateTime?
  promotedParcelId String?

  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  shares       VaultShare[]
  activity     VaultActivity[]

  @@unique([ownerId, emirate, district, plotNumber])  // one user, one entry per plot
  @@index([ownerId])
  @@index([stage])
  @@index([publicParcelId])
}

enum VaultStage {
  LEAD              // just added, haven't engaged owner yet
  CONTACTED         // spoken to owner, no commitment
  NEGOTIATING       // back-and-forth on price/terms
  AGREEMENT_SIGNED  // NDA / authorisation to market
  PROMOTED          // moved to Public Listings
  LOST              // abandoned, owner went elsewhere, etc.
  CLOSED            // converted to Deal (still tracked here for history)
}

enum VaultVisibility {
  PRIVATE
  SHARED
}
```

**Why this over flipping `Parcel.visibility`:**

- Keeps the public `Parcel` table semantically clean ("listed plots only").
- Allows N brokers to track the same physical plot without write conflicts.
- "Promote to Public" is an explicit operation (creates a `Parcel` row) rather than a flag toggle — easier to reason about and audit.
- PII (owner contact) lives on `VaultEntry`, not on `Parcel`, which never carries owner-contact today.
- Doesn't require touching the `@@unique([emirate, district, plotNumber])` constraint that the existing Public-Listings code relies on.

**Option B (rejected): `Parcel.visibility` field**

- Would require dropping the existing unique constraint (and replacing with composite that includes ownerId).
- Forces the public-listings code path to filter every query by visibility — adds risk of accidental data leaks.
- Mingles broker-private fields (owner contact, broker notes, next-follow-up) into the Parcel model, which today is shape-stable.
- Rejected.

### 3.2 Sharing model

```
model VaultShare {
  id              String      @id @default(cuid())
  vaultEntryId    String
  vaultEntry      VaultEntry  @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  ownerId         String      // the sharer (same as vaultEntry.ownerId, denormalised for query)
  recipientUserId String      // ZAAHI account user receiving access
  recipient       User        @relation("VaultShareRecipient", fields: [recipientUserId], references: [id])

  permission      VaultSharePermission @default(VIEW)
  // MVP: VIEW only. Phase 2.2 adds FEASIBILITY (can run calculator) and OFFER (can submit Deal offer).
  expiresAt       DateTime?   // NULL = never (revocable any time)
  revokedAt       DateTime?
  revokedReason   String?

  createdAt       DateTime    @default(now())
  // Last time the recipient viewed/opened the entry — drives "X viewed your plot" notification.
  lastViewedAt    DateTime?

  @@unique([vaultEntryId, recipientUserId])
  @@index([recipientUserId, revokedAt])  // for "shared with me" listing
}

enum VaultSharePermission {
  VIEW            // see the plot on map + side panel + docs
  FEASIBILITY     // VIEW + run feasibility calculator (Phase 2.2)
  OFFER           // FEASIBILITY + can submit a Deal offer (Phase 2.2+)
}
```

### 3.3 Activity log (for "X viewed your plot" notifications)

```
model VaultActivity {
  id           String      @id @default(cuid())
  vaultEntryId String
  vaultEntry   VaultEntry  @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  actorUserId  String?     // who did it; NULL for system events
  actor        User?       @relation("VaultActivityActor", fields: [actorUserId], references: [id])
  kind         String      // "created" | "stage_changed" | "shared" | "share_revoked" | "viewed_by_recipient" | "promoted_to_public" | "note_added" | "follow_up_logged"
  payload      Json?       // shape varies by kind
  createdAt    DateTime    @default(now())

  @@index([vaultEntryId, createdAt])
}
```

### 3.4 Migration

Single migration adds three new tables + two enums. **Parcel table is untouched** — this is the win of Option A. Existing flow keeps working. No backfill needed for existing parcels (they're already public; not relevant to Vault).

---

## 4. Permissions model integration

ZAAHI today has a clean three-tier permissions model:

| Tier | Mechanism | Examples |
|---|---|---|
| **Public** | `PUBLIC_API` allow-list in `src/middleware.ts` | `/api/layers/*`, `/api/registration/*`, `/api/auth`, `/api/notify-admin` |
| **Auth-required** | Bearer-checked, then `getApprovedUserId(req)` in handler | `/api/parcels/map`, `/api/me/*`, `/api/parcels/[id]` |
| **Deal Room** | Auth + per-deal participant check in handler | `/api/deals/[id]/*` |

Vault adds a **fourth tier — owner-scoped + share-scoped:**

- `/api/me/vault/*` — auth + `entry.ownerId === userId` (owner)
- `/api/vault/shared-with-me/*` — auth + active `VaultShare` row where `recipientUserId === userId && revokedAt IS NULL && (expiresAt IS NULL || expiresAt > now())`
- `/api/vault/entries/[id]` — auth + (`entry.ownerId === userId` **OR** active share)

Each handler returns `404` (not `403`) when access is denied, to avoid leaking entry existence to non-participants — same pattern as Deal Room handlers today.

---

## 5. API surface

New routes (auth-required throughout):

| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/me/vault/entries`               | List entries owned by caller, paginated, with optional `stage` / `search` filter |
| POST   | `/api/me/vault/entries`               | Create a new vault entry (single plot upload) |
| GET    | `/api/me/vault/entries/[id]`          | Detail of one entry (owner only) |
| PATCH  | `/api/me/vault/entries/[id]`          | Update fields (price, notes, stage, follow-up date) |
| DELETE | `/api/me/vault/entries/[id]`          | Hard delete (with confirmation; activity row preserved) |
| POST   | `/api/me/vault/entries/[id]/promote`  | Promote-to-Public — creates a `Parcel` row via the existing `/api/parcels/submit` path, links `promotedParcelId` |
| GET    | `/api/me/vault/map`                   | GeoJSON of all caller's entries — fed into the new `vault-plots-3d` MapLibre layer |
| POST   | `/api/me/vault/entries/[id]/shares`   | Share with a named recipient (by email or nickname) |
| GET    | `/api/me/vault/entries/[id]/shares`   | List active shares for this entry |
| POST   | `/api/me/vault/shares/[id]/revoke`    | Revoke a share |
| GET    | `/api/vault/shared-with-me`           | Entries shared TO the caller |
| GET    | `/api/vault/shared-with-me/map`       | GeoJSON for "shared with me" map layer |
| GET    | `/api/vault/entries/[id]`             | Polymorphic GET — owner sees same as `/api/me/vault/entries/[id]`; share-recipient sees a redacted view (no broker notes, no follow-up dates) |

Reused / modified routes:

- `/api/parcels/submit` — adds an optional `target: "vault" | "public"` field (default `"public"`). When `"vault"`, the handler creates a `VaultEntry` instead of a `Parcel`. This keeps the upload modal logic centralized.
- `/api/parcels/by-plot-number/[plotNumber]` — extended to also surface "you have a vault entry for this plot" hint when called by the entry's owner.

No PMTiles changes. No `/api/layers/*` changes. No middleware changes (Vault routes follow existing auth-required pattern).

---

## 6. UX flow

### 6.1 Upload — single decision point at the start

The existing `AddPlotModal` becomes a two-step wizard:

```
Step 0 — Where?
  ○ Public Listing — visible to all approved users, ambassador commissions apply
  ○ Private Vault — only you (and people you share with) see this

Step 1+ — same fields as today (plot number, price, docs, role)
         …with an extra "Stage" picker if Vault.
```

The Step 0 choice routes the submit to either `/api/parcels/submit` (with `target: "public"`, existing flow) or `/api/me/vault/entries` (new). Same form fields downstream — keeps the modal small and reduces double-coding.

### 6.2 Vault tab on `/parcels/map`

A new top-level tab next to "ZAAHI Plots / DDA / AD / Saudi / Oman" in the layers panel:

- **My Vault (N)** — caller's own entries
- **Shared with me (M)** — entries others have shared with caller

Visibility is **per-tab toggle**, default off (Vault entries don't appear unless the user opens the tab — keeps the map non-cluttered for users who don't use Vault).

When a Vault tab is on, the entries render as a new MapLibre layer (`vault-plots-3d`) with distinct styling:

- **Owned by me**: dashed gold outline, semi-transparent fill (visually distinct from solid ZAAHI listings)
- **Shared with me**: dotted teal outline, "shared" badge on popup
- Same hover + click → SidePanel pattern as ZAAHI plots, but the SidePanel header shows "PRIVATE — only you" or "SHARED BY <name>" instead of "LISTED ON ZAAHI"

### 6.3 Vault list view at `/vault`

A new top-level page (sibling to `/dashboard`) — a list/kanban of the broker's entries:

- Sortable + filterable by stage, district, source, next-follow-up
- Click entry → SidePanel (same component as map click)
- Click entry → "Open in map" → flies to the plot location with the entry expanded
- Bulk actions: bulk stage update, bulk export to CSV, bulk delete

MVP: list-only. Phase 2.2 adds kanban view + drag-stage.

### 6.4 Share flow

From an entry's SidePanel, "Share" button opens a modal:

```
Share "Plot 6457940 — Al Barari"

Recipient: [pick from your network ▾]  or  [type email/nickname]
           e.g. Aigerim (Highgrove)

Permission: ⦿ View only
            ⦾ View + Feasibility (Phase 2.2)
            ⦾ View + Make offer (Phase 2.2)

Expiry:    ⦿ Never (you can revoke any time)
           ⦾ In 7 days
           ⦾ In 30 days

[ Send share notification ]   [ Cancel ]
```

Recipient gets: in-app notification, "you have a new Vault share from X" entry in their /vault → Shared with me. Email digest mentions it (uses existing notifications infrastructure).

### 6.5 Promote to Public

From an entry's SidePanel:

```
[ Promote to Public Listing ]
```

Click → confirmation modal:

```
Promote "Plot 6457940 — Al Barari" to Public Listing?

This will:
  ✓ Create a public listing visible to all approved users
  ✓ Activate ambassador commissions (your share: 50% of platform fee)
  ✓ Keep your Vault entry as the pipeline record (stage = PROMOTED)
  ✓ Apply to plots not already publicly listed by another broker

[ Yes, promote ]   [ Cancel ]
```

Backend: calls `/api/me/vault/entries/[id]/promote` → which internally creates a `Parcel` row (PENDING_REVIEW status, like all public listings) + sets `vaultEntry.promotedParcelId` + transitions `vaultEntry.stage = PROMOTED`. Admin verification flow is the existing one — no change.

---

## 7. Map rendering implications

Public listings today render via `loadZaahiPlots` in `src/app/parcels/map/page.tsx:2373` — fetches `/api/parcels/map` (Postgres-driven), pushes into MapLibre source `zaahi-plots-buildings` (a single GeoJSON source), feeds the `ZAAHI_BUILDINGS_3D` layer with `fill-extrusion-opacity: 1` (per CLAUDE.md spec).

Vault uses the same pattern, separate source + layer:

| | Public listings | Vault — owned | Vault — shared |
|---|---|---|---|
| Source ID | `zaahi-plots-buildings` (existing) | `vault-mine-buildings` (new) | `vault-shared-buildings` (new) |
| API | `/api/parcels/map` | `/api/me/vault/map` | `/api/vault/shared-with-me/map` |
| Layer ID | `ZAAHI_BUILDINGS_3D` | `VAULT_MINE_3D` | `VAULT_SHARED_3D` |
| `fill-extrusion-opacity` | `1` | **`0.85`** (slightly translucent — visually distinct from solid public listings, more solid than 0.35 PMTiles) | **`0.55`** (more translucent — "borrowed", not yours) |
| Outline style | solid gold | dashed gold | dotted teal |
| Visible by default | yes | only when "My Vault" tab toggled on | only when "Shared with me" tab toggled on |

**CLAUDE.md compliance:**

- `fill-extrusion-opacity` stays a literal number per layer (not a data expression) — rule preserved.
- ZAAHI Signature 3D logic (`loadZaahiPlots`, podium/body/crown, scaleRingFromCentroid) — untouched. Vault entries can reuse the same tier-emission helpers when they have full geometry; if they only have a coordinate placeholder (per CLAUDE.md "non-DDA placeholder polygon" rule), they render as a flat colored marker instead.
- PMTiles — untouched. Vault entries are per-user dynamic data; pre-baking doesn't make sense.

**Performance:**

- Highgrove-class user with 1000 vault entries: client gets ~1MB of GeoJSON. Fine. We can paginate / spatially filter to map viewport in Phase 2.2 if it becomes a hot spot. MVP loads all caller's entries at once.

---

## 8. Feasibility tools integration

Existing feasibility calculator (`src/app/parcels/map/FeasibilityCalculator.tsx`) operates on a parcel via its `affectionPlan` (FAR, GFA, max-height, setbacks). For Vault entries, three cases:

1. **DDA plot with affection plan available** — feasibility uses DDA data even though there's no `Parcel` row. The `/api/me/vault/entries/[id]` payload includes a server-side-fetched affection plan (cached against the plot number, same way DDA caches today).
2. **Plot has no affection plan (off-plan, non-DDA, etc.)** — feasibility falls back to user-entered FAR/GFA/height fields. The broker types in their own assumptions. Tools still run.
3. **Shared recipient with permission < FEASIBILITY** — feasibility section is hidden from the SidePanel.

No new feasibility logic. The calculator gets a thin adapter layer that accepts either a `Parcel` or a `VaultEntry` shape.

---

## 9. Pricing model — four options for founder

This is a founder decision, not an engineering decision. I lay out four options with honest trade-offs:

### Option 1 — Free, no limits

Vault is fully free for all approved users.
- **Pro:** zero friction onboarding for the cohort pilot. Maximises adoption.
- **Con:** zero direct revenue. Relies entirely on Vault→Deal conversion for monetisation. Heavy users (Highgrove) cost storage without paying.
- **Risk:** cannibalises Public Listings without compensating revenue.

### Option 2 — Freemium (Vault free up to N, paid above)

Free up to N plots (suggest N = 25). Above that, ~30 AED / month per additional 25 plots.
- **Pro:** trial users see zero cost; serious users self-select into paid. Caps storage cost.
- **Con:** N is a magic number. Plot count != value to user — a single 500M AED off-plan deal is worth more than 100 villa leads. Pricing per plot is a weak signal.
- **Risk:** brokers game N by deleting/re-adding plots (need anti-gaming check).

### Option 3 — Freemium with AI as paid (my recommendation)

Vault itself is free at any scale. AI/CRM features are paid:
- Smart stage suggestions ("this looks ready to promote")
- Prospect scoring (which owner most likely to sell)
- Market alerts (similar plots transacted nearby)
- Auto-categorize bulk Excel/CSV import
- Team accounts (multi-user vault for a brokerage)

Tier suggestion: Pro at ~150 AED / month per user; Brokerage at ~500 AED / month for up to 5 users.
- **Pro:** matches the Highgrove "CRM with AI" framing exactly. The moat (proprietary data + AI on top) is what's monetized, not commodity storage. Onboarding stays frictionless. Brokers convert to Pro when they hit "this would be 10x faster if it suggested follow-ups for me."
- **Con:** longer revenue runway (no money until AI ships in Phase 2.3).
- **Risk:** founder has to fund Phase 2.3 AI work before seeing return.

### Option 4 — Per-share fee

Vault + AI both free. Charge per outbound share (e.g., 5 AED per active share per month).
- **Pro:** aligns price with the action that has economic value (sharing = potential deal flow).
- **Con:** chokepoint at the moment of highest user energy ("I'm trying to send this to my buyer NOW") is the worst place to ask for money. Will reduce shares, which reduces deals, which reduces 0.25 % platform fees.
- **Risk:** loses revenue from both directions.

**My pick: Option 3.** Reasons in the README TL;DR. Option 1 is a viable launch-strategy fallback (run free for 6 months, gather usage data, then layer in pricing).

---

## 10. Phasing + estimate

| Phase | Scope | Estimate | Outcome |
|---|---|---|---|
| **2.1 MVP** | Upload-to-vault toggle in AddPlotModal · 3 new tables · vault map layer · /vault list page · simple share (view-only, revocable) · promote-to-public · basic activity log · "shared with me" map layer | **10–14 days** | Brokers can move Excel into ZAAHI. Cohort cohort can test. |
| **2.2 Pipeline depth** | Kanban view · stage automation · per-permission share (VIEW / FEASIBILITY / OFFER) · email digest (daily follow-up summary) · CSV import for bulk plot upload · activity log surfaces | **7–10 days** | Brokers can run their day in ZAAHI; daily-use hook completed. |
| **2.3 Intelligence** | AI smart-categorize · prospect scoring · market alerts · team accounts (multi-user vault for a brokerage) · paid tier launch | **3–4 weeks** (AI work is variable depending on provider choice and feature scope) | The moat. Highgrove's "CRM with AI" ask answered. Revenue line opens. |
| **2.4 Mobile** | iOS / Android pipeline app with offline support, push notifications, voice notes | Out of scope here; separate spec. | Daily-tool reality (mobile is the broker's real device). |

Total to ship Phases 2.1–2.3 with one engineer focused: **6–8 weeks** of focused work. MVP demo-ready in week 2.

---

## 11. Risks & edge cases

### High-risk
- **R1 — Public-listing cannibalization.** Mitigation: §1 (three structural defenses). Monitor monthly `vault_promoted_to_public_count / vault_entries_created_count` ratio. If <5 % after 90 days, pricing or UX needs adjustment.
- **R2 — PDPL on shared owner-contact PII.** Mitigation: VaultShare carries explicit consent acknowledgement at creation time. Audit log every recipient view. Encrypt `ownerContact` Json at rest in Phase 2.2 (uses Supabase `pgsodium` or app-side AES-256 — founder decision). For MVP, store unencrypted but warn in UI.

### Medium-risk
- **R3 — Two brokers claim the same vault plot leads to conflict.** Both can have separate VaultEntry rows (unique by `[ownerId, emirate, district, plotNumber]`). When either promotes to Public, both keep their pipeline state; the public Parcel row links to one of them via `publicParcelId`. Both vault entries still surface their independent stage / notes / follow-up — no merge.
- **R4 — Vault entry references DDA plot that doesn't exist.** Per CLAUDE.md "Add a participant" rules: 7-digit DDA numbers attempt scrape, 9-digit non-DDA accept placeholder polygon by coordinates. Same logic applies — Vault upload calls the same `/api/parcels/by-plot-number/[n]` probe.
- **R5 — Vault entry → Deal conversion bypasses the ambassador commission distribution path.** Need a clear rule: if the deal originated from a shared Vault entry, the original sharer is the implicit broker on the Deal (gets the broker share of the 0.25 %). Decision needed in §decisions doc.

### Low-risk
- **R6 — UI clutter on /parcels/map with thousands of vault entries.** Mitigation: per-user spatial-filter in Phase 2.2 (load only entries within current viewport bounding box).
- **R7 — User accidentally promotes a sensitive plot to public.** Mitigation: confirmation modal (§6.5), undo within 24 hours by demoting back (creates a `vaultEntry.demoted` event).
- **R8 — Cohort role gating.** Vault should be available to OWNER, BROKER, DEVELOPER cohort roles. BUYER cohort role doesn't need it (no inventory to track). Check this against `User.role` at API entry. Spec.md doesn't go deeper; Phase 2.1 implementation will use the existing `getApprovedUserId` + role filter.

### Edge cases (not risks, just things to spec out in implementation plan)
- Vault entry with both owned and shared layers visible on map — same plot might render twice? Yes if same plot number is in both. Decision: dedupe by (ownerId, plotNumber) on client; show owned variant first.
- Sharing your Vault entry back to yourself — block at API layer (`recipientUserId === ownerId` returns 400).
- Sharing to a user who later gets their cohort registration rejected — share auto-revokes on user.status transitions.
- Promoting a vault entry whose plot is already publicly listed by someone else — link to existing `Parcel` via `publicParcelId` instead of creating a duplicate. Activity log records the link.
- Deleting a vault entry that has been shared — soft confirm ("3 people will lose access"), then cascade-delete shares.
- Vault entry payload size with many docs — same 10 doc / 10 MB each limit as `/api/parcels/submit` today.

---

## 12. Summary

Plot Vault is a real product opportunity, well-fit to the existing architecture (cleanly absorbs into Block A with interlocks into B/C/G/H/I/J), and not technically risky. The MVP is doable in 2 weeks with one engineer. The moat (AI in Phase 2.3) is what makes it a daily tool rather than a private storage. Founder needs to make 5 decisions (see `decisions.md`) before implementation planning begins.

# Private Plot Vault — Full Spec

**Status:** Draft 2026-05-13. **Revised 2026-05-13 (third pass)** — simplified scope per founder direction: Vault is a personal plot tracker. Verification gates removed (live in the existing Listings flow). Affection Plan PDF parsing deferred to Phase 2.2. Conflict detection remains LITE (informational banner). No code changes, no schema migrations, no production deploys.
**Author:** ZAAHI agent (Claude Opus 4.7).
**Reviewer:** Zhan (founder).

---

## 1. Concept — single paragraph

Brokers, developers, and frankly all active participants in the Dubai market drown in plots that get forwarded to them — WhatsApp groups, broker chats, off-market leads, cold calls. They forget who sent which plot, can't remember if the price moved, and lose track of follow-ups. WhatsApp + Excel isn't a system. Private Plot Vault is **the personal plot tracker** — any approved ZAAHI user (cohort BROKER, OWNER, DEVELOPER, even founders) maintains their own private list of plots they're tracking, with attribution ("@aigerim sent me this on May 8"), inline price edits, follow-up dates, and selective sharing with named users. **It is NOT a legal pipeline** — public listings, document verification, regulator-grade compliance live in the existing Listings flow. Vault crosses into Listings only when the user clicks "Promote to Public Listing", which routes through the existing `/api/parcels/submit` (the same form public-list-from-scratch uses, with the same verification gates). The differentiator that no UAE competitor has: **cross-user awareness** — when two vault users have the same plot with different data, both see an informational banner. Not adjudicated, not blocked, not arbitrated — just visible. Phase 2.2+ will look at aggregate dashboards and admin arbitration once cohort gives real signal on what brokers want.

---

## 2. Where it lives in Master Tree v3.0

Frozen 12 blocks, 85 modules. New module under **Block A (Assets) → `A.10 Private Asset Vault`**.

Interlocks:
- **B (Participants)** — primary actors are brokers, developers, owners; founders use it too as ordinary users.
- **C (Transactions)** — Promote-to-Public exits Vault into the existing Deal flow.
- **G (Compliance)** — PDPL on shared data (owner contacts, prices). No new verification surface; existing Listings gate handles regulator-grade.
- **H (Growth)** — Vault is the daily-tool hook for broker onboarding in Phase 2.
- **I (Intelligence)** — Conflict detection is the first I-block feature in MVP (information only); aggregate market dashboard arrives in Phase 2.2.

5 of 12 blocks touched — proves it's a real platform feature.

---

## 3. Data model

### 3.1 Identity — separate `VaultEntry` model (D1=A ratified)

Today the `Parcel` model has `@@unique([emirate, district, plotNumber])`. Multiple users can track the same plot privately without breaking that constraint by living in a separate table.

```
model VaultEntry {
  id           String          @id @default(cuid())
  ownerId      String                                                  // the user whose vault this row lives in
  owner        User            @relation("VaultEntryOwner", fields: [ownerId], references: [id])

  // ── Attribution (§16) ─────
  // For a direct upload: addedByUserId == ownerId.
  // For an "Add to my vault" import from a share: addedByUserId points
  // to the user who shared it. Provenance chain appends as entries
  // travel between users.
  addedByUserId       String?
  addedBy             User?       @relation("VaultEntryAddedBy", fields: [addedByUserId], references: [id])
  importedFromShareId String?
  provenanceChain     Json?           // append-only [{ userId, nickname, addedAt }, …]

  // Plot identity
  emirate         String
  district        String
  plotNumber      String
  publicParcelId  String?
  publicParcel    Parcel?         @relation("VaultEntryPublicParcel", fields: [publicParcelId], references: [id])

  // Plot facts — denormalised. For DDA plots populated from the existing
  // DDA scrape on first upload. For non-DDA: user enters manually
  // (area, optional lat/lng). MVP renders a flat marker on map if no
  // geometry. Phase 2.2 ships Affection Plan PDF parsing for non-DDA.
  area         Float?
  latitude     Float?
  longitude    Float?
  geometry     Json?                                                    // GeoJSON polygon — set for DDA hits
  landUse      String?

  // Broker's data
  askingPriceFils  BigInt?
  ownerContact     Json?                                                // { name, phone, email, role, notes } — PII
  brokerNotes      String?         @db.Text
  stage            VaultStage      @default(LEAD)
  source           String?                                              // "cold-call" | "referral" | "dda-scrape" | "off-plan" | …
  nextFollowUpAt   DateTime?

  // Promote-to-Public bookkeeping — the actual promote routes through
  // the EXISTING /api/parcels/submit flow (which carries its own
  // verification gates). promotedAt + promotedParcelId are set on
  // successful promote completion.
  promotedAt       DateTime?
  promotedParcelId String?

  // ── Conflict detection (§15) — LITE, informational only ─────
  // Set true when ≥ 2 VaultEntry rows exist for the same
  // (emirate, district, plotNumber) tuple across different users AND
  // any conflict-relevant field disagrees beyond tolerances. Maintained
  // by src/lib/vault-conflict.ts on entry create / update / delete.
  conflictsWithOthers Boolean   @default(false)
  conflictedFields    Json?     // [{ field, values: [{ userId, value }] }]

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  shares       VaultShare[]
  activity     VaultActivity[]
  priceHistory VaultPriceHistory[]

  @@unique([ownerId, emirate, district, plotNumber])
  @@index([ownerId])
  @@index([stage])
  @@index([publicParcelId])
  @@index([nextFollowUpAt])
  @@index([emirate, district, plotNumber])     // drives conflict detection
}

enum VaultStage { LEAD CONTACTED NEGOTIATING AGREEMENT_SIGNED PROMOTED LOST CLOSED }
enum VaultSharePermission { VIEW FEASIBILITY OFFER }
```

Note: D2 ratified as "three-tier with SHARED **implicit** (derived from VaultShare rows)" — so no `VaultVisibility` enum or `visibility` field. Visibility is computed at API layer based on `VaultShare` row existence.

### 3.2 Sharing model

```
model VaultShare {
  id              String                @id @default(cuid())
  vaultEntryId    String
  vaultEntry      VaultEntry            @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  ownerId         String                                               // denormalised from vaultEntry.ownerId
  recipientUserId String
  recipient       User                  @relation("VaultShareRecipient", fields: [recipientUserId], references: [id])
  permission      VaultSharePermission  @default(VIEW)                  // MVP: VIEW only at the API gate
  expiresAt       DateTime?                                             // NULL = never
  revokedAt       DateTime?
  revokedReason   String?
  createdAt       DateTime              @default(now())
  lastViewedAt    DateTime?

  @@unique([vaultEntryId, recipientUserId])
  @@index([recipientUserId, revokedAt])
  @@index([ownerId])
}
```

### 3.3 Activity log

```
model VaultActivity {
  id            String      @id @default(cuid())
  vaultEntryId  String
  vaultEntry    VaultEntry  @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  actorUserId   String?                                                // NULL for system events
  actor         User?       @relation("VaultActivityActor", fields: [actorUserId], references: [id])
  kind          String                                                 // UPPER_SNAKE_CASE per src/lib/activity.ts convention
  payload       Json?
  createdAt     DateTime    @default(now())

  @@index([vaultEntryId, createdAt])
}
```

`kind` values (closed enum lives in `src/lib/vault-activity.ts`):

```
CREATED                — entry first created
STAGE_CHANGED          — stage field updated
PRICE_CHANGED          — askingPriceFils updated (also writes VaultPriceHistory)
NOTE_ADDED             — brokerNotes appended/updated
FOLLOW_UP_LOGGED       — nextFollowUpAt set or moved
SHARED                 — VaultShare row created
SHARE_REVOKED          — VaultShare.revokedAt set
VIEWED_BY_RECIPIENT    — share-recipient opened the entry (debounced 1h)
IMPORTED_FROM_SHARE    — "Add to my vault" used on a shared entry
PROMOTED_TO_PUBLIC     — promote completed, publicParcelId set
CONFLICT_DETECTED      — conflictsWithOthers transitioned false→true
CONFLICT_RESOLVED      — conflictsWithOthers transitioned true→false (auto, e.g. other user updated their price to match)
```

Each VaultActivity write also calls `void logActivity(...)` for the actor — populating the existing user-centric `ActivityLog` table that drives the dashboard "Recent Activity" surface. Same fire-and-forget pattern.

### 3.4 Price history

```
model VaultPriceHistory {
  id           String      @id @default(cuid())
  vaultEntryId String
  vaultEntry   VaultEntry  @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  priceFils    BigInt
  setByUserId  String
  source       String                                                 // "manual" | "import" | "promote-sync"
  note         String?
  createdAt    DateTime    @default(now())

  @@index([vaultEntryId, createdAt])
}
```

One row per price change. Append-only. Drives the "Price history (N changes)" expandable section in the side panel.

### 3.5 Migration impact

- 2 new enums (`VaultStage`, `VaultSharePermission`)
- 4 new models (`VaultEntry`, `VaultShare`, `VaultActivity`, `VaultPriceHistory`)
- 4 new back-relation lines on `User` (`vaultEntriesOwned`, `vaultEntriesAddedBy`, `vaultSharesReceived`, `vaultActivityAuthored`)
- 1 new back-relation line on `Parcel` (`vaultEntryLinks`)
- No changes to any existing field, index, or enum value
- **Parcel table structurally untouched** — Public Listings flow unaffected

---

## 4. Permissions model

Four-tier mapping (existing Public / Auth / Deal-Room + new vault tier):

| Tier | Mechanism | Examples |
|---|---|---|
| Public | `PUBLIC_API` allow-list | `/api/layers/*`, `/api/registration/*` |
| Auth-required | Bearer + `getApprovedUserId` | `/api/parcels/map`, existing `/api/me/*` |
| Deal Room | Auth + participant check | `/api/deals/[id]/*` |
| **Vault** | Auth + owner-or-active-share check | `/api/me/vault/*`, `/api/vault/*` |

Specifically:
- `/api/me/vault/*` — `entry.ownerId === userId`
- `/api/vault/shared-with-me/*` — active `VaultShare` row (`revokedAt IS NULL` AND `(expiresAt IS NULL OR expiresAt > now())`)
- `/api/vault/entries/[id]` — owner OR active share recipient
- `/api/me/vault/conflicts/[plotNumber]` — caller must own at least one entry for the plot (prevents fishing)

`404` (not `403`) on access denial — same pattern as Deal Room handlers. PII (`brokerNotes`, `ownerContact`, `nextFollowUpAt`) NEVER leaks to non-owners — server-side enforced in serialize helpers.

Founders (`User.role = ADMIN`) get no special vault privileges — they're ordinary users in their own vault. Admin role is checked only on the (existing) admin queue endpoints, which Vault MVP does not extend.

---

## 5. API surface

All routes auth-required (Bearer + `getApprovedUserId`).

### 5.1 Core vault routes

| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/me/vault/entries`               | List + filter + paginate |
| POST   | `/api/me/vault/entries`               | Create entry |
| GET    | `/api/me/vault/entries/[id]`          | Detail (owner only) |
| PATCH  | `/api/me/vault/entries/[id]`          | Update — `price_changed` activity + `VaultPriceHistory` row on price change; triggers conflict recompute |
| DELETE | `/api/me/vault/entries/[id]`          | Hard delete; activity preserved on cascade |
| POST   | `/api/me/vault/entries/[id]/promote`  | Promote-to-Public — see §6.5 below |
| GET    | `/api/me/vault/map`                   | GeoJSON for the vault-mine MapLibre source |
| POST   | `/api/me/vault/entries/[id]/shares`   | Share with recipient |
| GET    | `/api/me/vault/entries/[id]/shares`   | List active shares for the entry |
| POST   | `/api/me/vault/shares/[id]/revoke`    | Revoke a share |
| GET    | `/api/vault/shared-with-me`           | Entries shared TO the caller |
| GET    | `/api/vault/shared-with-me/map`       | GeoJSON for the vault-shared MapLibre source |
| POST   | `/api/vault/shared-with-me/[id]/import` | "Add to my vault" — creates a new VaultEntry for the caller with addedByUserId attribution |
| GET    | `/api/vault/entries/[id]`             | Polymorphic GET — owner full / share-recipient redacted |
| POST   | `/api/me/vault/plot-lookup`           | Pre-check by plot number: `{ source: "dda" \| "not_found", existing: VaultEntrySummary? }` — drives the upload wizard branching |

### 5.2 Conflict detection routes (LITE)

| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/me/vault/conflicts`                  | All caller's entries currently in conflict |
| GET    | `/api/me/vault/conflicts/[plotNumber]`     | Redacted comparison: `{ entries: [{ addedByNickname, priceFils, area, landUse, addedAt }] }`. Server strips `brokerNotes`, `ownerContact`, `nextFollowUpAt`. |

### 5.3 Modified existing route

`/api/parcels/submit` — accepts an optional `target: "vault" | "public"` field (default `"public"`). When `"vault"`, the handler:
- Skips the `Parcel` + `PlotClaim` create path
- Creates a `VaultEntry` instead
- Returns `{ vaultEntryId }` instead of `{ parcelId, claimId }`

All other fields stay the same — keeps the upload form logic centralised. The verification document upload UI (Title Deed / Contract) is gated to target=public; vault path skips it.

### 5.4 What's NOT a new route

- **No verification routes.** Promote-to-Public reuses `/api/parcels/submit` with the existing verification flow (Title Deed for owner, Contract for broker, admin queue). The vault `promote` endpoint just calls into a refactored helper (see §6.5) and links the resulting Parcel back to the VaultEntry.
- **No Affection-Plan parse route.** Non-DDA plots accept manual fields in MVP. PDF parsing → Phase 2.2.
- **No DISPUTED arbitration routes.** Phase 2.2.
- **No market-intelligence dashboard route.** Phase 2.2.
- **No admin verification queue extension.** Existing PlotClaim queue handles promote-from-vault same as direct-public-list (one queue, one verification UI, one flow).

No middleware changes. No `/api/layers/*` changes.

---

## 6. UX flow

### 6.1 Upload wizard

Three steps, not five. The earlier 5-step version mixed in verification doc upload (now in Listings flow) and Affection Plan parsing (now Phase 2.2).

```
Step 1 — Plot number (mandatory first input)
  [emirate selector, default Dubai]
  [district selector or autocomplete]
  [text input: 5-10 digit plot number]
  → POST /api/me/vault/plot-lookup
  → branches:

  A) DDA hit
     Map preview from existing DDA scrape.
     Auto-filled: area, geometry, landUse, plot details.
     [Continue]

  B) Not in DDA — manual entry mode
     "We don't have this plot in DDA yet. Add it manually for now —
      Phase 2.2 will support Affection Plan PDF upload to auto-build
      the 3D geometry."
     [area sqft] [latitude] [longitude]   ← all optional
     [land use selector]
     If lat/lng entered → flat marker on map.
     If left blank → entry exists in list view only, no map render.
     [Continue]

Step 2 — Your data
  Asking price · source ("cold-call"/"referral"/"DDA scrape"/"off-plan"/free text)
  · stage (LEAD by default) · follow-up date · owner contact
  (name/phone/email/role/notes — all optional) · broker notes (free text)
  [Continue]

Step 3 — Confirm
  Side-by-side preview of plot data + your input + 3D building projection
  (or flat marker for non-DDA without geometry).
  [Add to my vault]

  → POST /api/me/vault/entries
  → entry created; appears on map immediately (only you see it).
  → if conflict detected (other users have entries on same plot):
    banner appears, see §15.
```

### 6.2 Vault tabs on `/parcels/map`

Two new toggleable layers in the layers panel:
- **My Vault (N)** — caller's own entries, default off
- **Shared with me (M)** — entries others have shared with caller, default off

Each toggle controls visibility of its respective MapLibre layer (§7).

### 6.3 `/vault` list page

New top-level route, gated by `<AuthGuard>`. Three views:
- **All entries** (default) — table of caller's vault
- **Shared with me** — table of entries shared TO caller
- **Conflicts (N)** — table filtered to entries where `conflictsWithOthers = true`

Columns: plot number, district, stage, **asking price (inline editable)**, next follow-up, share count, **attribution badge** ("Added by you" or "From @nickname"), **conflict indicator**.

Inline price edit: click price cell → text field → Enter saves via PATCH → toast confirms + emits PRICE_CHANGED activity + writes VaultPriceHistory row + triggers conflict recompute.

### 6.4 Share flow

Side panel "Share" button → modal:

```
Share "Plot 6457940 — Al Barari"

Recipient: [pick from recent contacts ▾]  or  [type email / nickname]
Permission: ⦿ View only    ⦾ View + Feasibility  (Phase 2.2)
Expiry:    ⦿ Never (revocable)   ⦾ In 7 days   ⦾ In 30 days

[ Send share notification ]   [ Cancel ]
```

Recipient gets in-app `VAULT_SHARE_RECEIVED` notification + appearance in their `/vault` → Shared with me + on the shared map layer.

Recipient sees full plot data EXCEPT `brokerNotes`, `nextFollowUpAt`, and `ownerContact.notes` — server-side redacted in the polymorphic GET handler.

### 6.5 Promote to Public (simplified)

```
[ Promote to Public Listing ]
```

Click → opens the **existing** `AddPlotModal` in "promote-from-vault" mode:
- Plot number, area, geometry, land use → prefilled from VaultEntry
- Asking price → prefilled (editable)
- Required documents → user uploads now if not already
- Owner / Broker flow selector → user picks
- Submit → routes to `/api/parcels/submit` with `target: "public"` AND a new `fromVaultEntryId` field

On successful submit:
- New `Parcel` row created with `PENDING_REVIEW` status (existing behavior)
- `VaultEntry.publicParcelId` set + `stage = PROMOTED` + `promotedAt` set
- `PROMOTED_TO_PUBLIC` activity emitted
- Admin verifies via the existing PlotClaim queue (no new queue)
- On admin approval: Parcel → `LISTED`. Vault entry stays as the broker's pipeline record.

No new verification UI. No new admin queue. Everything goes through the path that already works.

### 6.6 "Add to my vault" from a share (the attribution mechanism)

Recipient of a share sees the entry in their `/vault` → Shared with me. A button on the side panel:

```
[ Add to my vault ]
```

Click → `POST /api/vault/shared-with-me/[id]/import` → creates a new VaultEntry for the recipient with:
- `addedByUserId = sharerUserId` (this is the attribution — "видит кто прислал")
- `importedFromShareId = share.id`
- Plot identity, geometry, area, landUse copied
- `ownerContact` copied (with original attribution note)
- `brokerNotes` NOT copied (private to original owner)
- `askingPriceFils` copied as starting point (recipient can edit)
- `stage = LEAD` (recipient starts fresh)
- `provenanceChain = [...previousChain, { userId: sharer, nickname, addedAt: now }]`

Recipient now has the plot in their own vault, can run their own pipeline on it, and the attribution badge surfaces who originally shared it. If they share onward, the chain grows.

### 6.7 Conflict banner (§15 UX)

When `conflictsWithOthers = true` on an entry:

Side panel banner (top):
```
⚠ 2 other users also have this plot in their vaults with different data.

  [ View comparison ]
```

Modal:
```
Plot 6457940 — Al Barari
Your data:           AED 50 M    1,200 sqm    Residential
@aigerim (broker):   AED 48 M    1,200 sqm    Residential
@unknown_dev:        AED 65 M    1,400 sqm    Mixed Use

Other users' broker notes and owner contacts are private — only public
facts (plot number, district, price, area, land use) are shown.
```

No "resolve" button. No DISPUTED status. No admin involvement. **Informational only.** Brokers handle outreach to each other themselves (the @nicknames give them the contact).

---

## 7. Map rendering

Two new MapLibre layers, both with literal `fill-extrusion-opacity` per CLAUDE.md rule:

| | Public listings (existing) | Vault — mine (new) | Vault — shared (new) |
|---|---|---|---|
| Source ID | `zaahi-plots-buildings` | `vault-mine-buildings` | `vault-shared-buildings` |
| API | `/api/parcels/map` | `/api/me/vault/map` | `/api/vault/shared-with-me/map` |
| Layer ID | `ZAAHI_BUILDINGS_3D` | `VAULT_MINE_3D` | `VAULT_SHARED_3D` |
| `fill-extrusion-opacity` | `1` | **`0.85`** | **`0.55`** |
| Outline | solid gold | dashed gold | dotted teal |
| Default visible | yes | only when "My Vault" tab toggled on | only when "Shared with me" tab toggled on |

Plus a small `symbol` layer `vault-conflict-markers` that draws a red corner-bug on polygons where `conflictsWithOthers = true`. No `fill-extrusion-opacity` on a `symbol` layer — the CLAUDE.md rule about literal opacity values applies only to fill-extrusion layers.

ZAAHI Signature 3D logic (`loadZaahiPlots`, `emitTiers`, podium/body/crown, `scaleRingFromCentroid`) untouched. PMTiles untouched.

For non-DDA vault entries without geometry: flat marker via the `symbol` layer (no extrusion). For non-DDA entries WITH user-entered lat/lng but no polygon: small radial extrusion (5m radius, 3m height) as visual placeholder. Phase 2.2 replaces these with real geometries from parsed Affection Plans.

---

## 8. Feasibility integration

Existing feasibility calculator works on a parcel via its `affectionPlan` data. For Vault entries:

- **DDA hit:** feasibility reads the existing `AffectionPlan` Prisma row (DDA scrape data) keyed by plot number. No change.
- **Non-DDA manual entry:** feasibility falls back to user-entered fields (area, optional FAR/GFA/height). User types in assumptions. Tools still run.
- **Shared recipient with permission < FEASIBILITY:** feasibility section hidden from the side panel. (FEASIBILITY permission ships in Phase 2.2; MVP gates it as "Coming soon".)

Thin adapter accepts either a `Parcel` or a `VaultEntry` shape — same calculator component.

---

## 9. Pricing model

Four options (full trade-off table in the original spec preserved). Recommendation: **Option 3 — Freemium with AI features as paid.** Vault is free at any scale; AI features (smart categorization, prospect scoring, market alerts) are paid in Phase 2.3. Matches Highgrove's "CRM with AI" framing. Monetises the moat, not the commodity.

---

## 10. Phasing + estimate (revised, simpler scope)

| Phase | Scope | Estimate |
|---|---|---|
| **2.1 MVP** | Vault loop — upload (DDA + manual non-DDA) · list view · map layer · share + import · promote-via-existing-submit · price edit + history · attribution · **conflict detection LITE (info banner only)** | **12–14 working days** |
| **2.2 Pipeline depth + non-DDA parsing + market intelligence** | Kanban · stage automation · per-permission shares (FEASIBILITY/OFFER) · email digest · CSV import · **Affection Plan PDF parse (Claude vision)** · **conflict aggregate dashboard** · **optional DISPUTED admin arbitration** if cohort signal demands | 12–18 days (range depends on Phase 2.2 design once cohort feedback arrives) |
| **2.3 Intelligence** | AI smart-categorize · prospect scoring · market alerts · team accounts · paid tier launch | 3–4 weeks |
| **2.4 Mobile** | iOS / Android pipeline app | Separate spec |

**Total to ship Phases 2.1–2.3:** ~6–8 weeks focused work. MVP demo-ready in week 3.

The drop from "17–21 days MVP+" (prior revision) to "12–14 days MVP" reflects three real simplifications:
- Verification gate logic moved out of Vault → -3 days
- Affection Plan PDF parser moved to Phase 2.2 → -5 days
- DISPUTED state + admin arbitration + market dashboard moved to Phase 2.2 → -5 days

Net: ~13 days removed. Add back ~6 days for the things that stayed (attribution, price history, conflict LITE, manual non-DDA fields, promote-bridge to existing submit, /vault page, share-import mechanism).

---

## 11. Risks & edge cases

### High-risk
- **R1 — Vault cannibalising Public Listings revenue.** Brokers may keep deals in Vault + close off-platform. Mitigated by (a) 0.25% platform fee still applies on Vault→Deal conversions if the deal goes through the in-app flow, (b) Promote-to-Public is one click that prefills the entire Listings form, (c) pricing in Phase 2.3 makes AI features paid → revenue path opens.
- **R2 — PDPL on shared owner-contact PII.** `ownerContact` carries phone/email. Server-side redaction in share recipient view (`ownerContact.notes` hidden). Original sharer's owner-contact propagates to import only with consent acknowledgement at share-create time. Phase 2.2 adds encryption at rest.

### Medium-risk
- **R3 — Two users have the same plot with different data.** This is the explicit informational feature, not a bug. Conflict banner surfaces it; brokers self-resolve via contact (the @nickname is visible). Phase 2.2 may add DISPUTED arbitration if cohort wants it.
- **R4 — Non-DDA plots without geometry.** Map renders flat marker; feasibility falls back to user-entered fields. Acceptable for MVP; full PDF parsing in Phase 2.2.
- **R5 — Vault → Deal commission attribution.** D-bonus ratified: original sharer is Deal broker by default. `Deal.brokerId = VaultEntry.ownerId` when deal originates from a shared vault entry.
- **R6 — Import-from-share creates duplicate data per user.** Three brokers sharing the same plot → three independent VaultEntry rows with the same plot identity. Conflict detection fires. This is intentional — each user owns their own pipeline view; conflict surface tells them they're not alone.

### Low-risk
- **R7 — UI clutter on /parcels/map with thousands of vault entries.** Phase 2.2 viewport-spatial-filter. MVP fine for cohort scale.
- **R8 — User accidentally promotes a sensitive plot to public.** Confirmation modal in §6.5 + the existing Listings submit form requires verification docs as a soft gate.
- **R9 — Cohort role gating.** OWNER / BROKER / DEVELOPER get full vault; BUYER cohort role can read shares but not create entries (post-MVP polish, founder decision).

### Edge cases
- **Sharing your own entry to yourself** → 400 `cannot_share_with_self` (recipientUserId === ownerId check).
- **Recipient gets cohort registration rejected after a share was created** → share auto-revokes on user.status transition; recipient's view dries up.
- **Sharing the same entry twice to the same recipient** → re-share updates the existing share row (revokedAt cleared, expiresAt extended), no duplicate.
- **Deleting a vault entry that has been shared** → soft-confirm modal ("3 people will lose access"), then cascade-delete shares.
- **Two users upload the same plot manually and one of them has a typo in district** → conflict detection runs on `(emirate, district, plotNumber)` tuple, so a district typo means no conflict surfaces. Acceptable for MVP; Phase 2.2 may add fuzzy district matching.

---

## 12. Summary

Vault MVP is **a personal plot tracker**, full stop. Differentiation:

1. **Attribution + provenance** — "видит кто прислал" lives in `addedByUserId` + `provenanceChain`, surfaced as a small badge.
2. **Inline price edit + history** — broker can update a price in 1 click; every change writes to `VaultPriceHistory`.
3. **Cross-user info banner** — when two vault users have the same plot with different data, both see it. No adjudication, no admin, no blocking. Just visible. The market-intelligence moat sits here in Phase 2.2 once cohort gives signal on what brokers want.

What it explicitly is NOT:
- A public listings replacement (existing Listings flow is the legal pipeline)
- A regulator-compliance surface (verification lives in Listings, not Vault)
- An arbitration / dispute system (Phase 2.2 if cohort demands it)
- An automated Affection Plan parser (Phase 2.2)

MVP estimate: **12–14 working days**. Demo-ready week 3. Phase 2.1–2.3 total: 6–8 weeks.

Founder decisions are all ratified (see decisions.md). No open sub-questions remain.

---

## 13. Non-DDA plots — MVP behaviour (simplified)

When the plot-lookup returns `not_found` (plot not in DDA scrape), MVP shows the manual entry path described in §6.1 Branch B. User enters:
- Area (sqft) — optional but used by feasibility
- Latitude + longitude — optional; if provided, flat marker on map; if blank, list-only entry
- Land use — selector (Residential / Commercial / Mixed Use / Hotel / Industrial / Educational / Healthcare / Agricultural / Future Development)

Phase 2.2 adds the Affection Plan PDF upload path:
- Same UI Branch B but with "[Upload Affection Plan PDF]" button
- Server calls a new `parse-affection-plan` route (Claude vision with `document` content block — extends the existing `parse-title-deed` pattern, which is image-only today)
- Returns parsed coordinate table + setbacks + FAR + maxFloors → auto-builds 3D geometry
- Confidence score surfaces in the UI; broker edits before confirm

The MVP `affectionPlanSource` / `affectionPlanData` schema fields proposed earlier are NOT in this revision. When Phase 2.2 ships, those fields are added in a separate additive migration. Cleaner — Phase 2.1 schema stays small.

---

## 14. (Section removed — verification gates live in the existing Listings flow)

This section in the prior revision described a new VaultVerificationStatus enum + verification document model + admin queue extension. All of that is **replaced by the existing `/api/parcels/submit` verification path**. Promote-to-Public bridges Vault to Listings via the existing form (with its Title Deed / Contract upload + admin review). No new verification surface.

---

## 15. Conflict detection — LITE only

### 15.1 What triggers detection

A conflict exists between VaultEntry rows when:
1. **Same** `(emirate, district, plotNumber)` tuple
2. **Different** `ownerId`
3. **At least one** of: `askingPriceFils`, `area`, `landUse`, significant `geometry`, or `maxFloors` disagrees beyond tolerance

### 15.2 Detection mechanism

`src/lib/vault-conflict.ts` exports `recomputeConflictsForPlot(emirate, district, plotNumber)`. Called from:
- `POST /api/me/vault/entries` after create
- `PATCH /api/me/vault/entries/[id]` if any conflict-relevant field changed
- `DELETE /api/me/vault/entries/[id]` to clear conflicts when a participant disappears

Recompute is `O(N)` per plot tuple where N is typically 1–5 (compound index `[emirate, district, plotNumber]` makes the lookup fast).

Emits `CONFLICT_DETECTED` / `CONFLICT_RESOLVED` activity events.

### 15.3 User-facing surface

Banner in side panel + indicator in /vault list + "Conflicts (N)" tab. Detail modal (§6.7) shows redacted comparison. That's the entire feature in MVP.

### 15.4 False-positive tolerances (in `src/lib/vault-conflict.ts`)

- Price: > 5% relative difference (50M vs 50.5M = 1% → no conflict)
- Area: > 2% relative difference
- Land use: exact-string mismatch
- Max floors: any integer difference

Tunable post-MVP if cohort signals false-positive issues.

### 15.5 Deferred to Phase 2.2

- DISPUTED status with admin arbitration
- Aggregate market-intelligence dashboard (per-district stats, time trends)
- Owner-can-claim resolution (verified Listings owner takes precedence)

All wait on cohort signal — that's the founder's explicit framing.

---

## 16. Attribution + Price History

### 16.1 Attribution

Three surfaces:
- **Direct upload** — `addedByUserId === ownerId`. Badge: "Added by you" (or omitted if it's the only attribution).
- **Imported from share** — `addedByUserId !== ownerId`, set when user clicks "Add to my vault" on a shared entry. Badge: "Added from share by @<addedBy.nickname>".
- **Provenance chain** — preserved in `provenanceChain` Json. Breadcrumb: "@first → @second → you". MVP supports the 2-hop case (one share, one import); deeper chains arrive in Phase 2.2 when re-sharing imported entries is supported.

### 16.2 Price edit + history

Every PATCH that changes `askingPriceFils`:
- Writes a `VaultPriceHistory` row (new value, actor, source = "manual", optional note)
- Emits a `PRICE_CHANGED` activity event
- Triggers conflict recompute (price is conflict-relevant)

UI:
- **Inline edit** — click price in list or side panel → text input → Enter saves → toast confirms
- **Price history** — expandable in side panel: "Price history (3 changes)" → click to expand → table of timestamps + values + optional notes
- Sparkline / market comparison — Phase 2.2 polish

Owner-only edit. Share recipients see current price (not history).

---

## 17. Constraints — verified

| Constraint | This spec |
|---|---|
| Master Tree v3.0 frozen | A.10 only |
| ZAAHI Signature 3D | Untouched |
| `fill-extrusion-opacity` literal | All three new fill-extrusion layers (mine 0.85, shared 0.55) — literal. Conflict-markers is `symbol` (no extrusion). |
| Auth flow / `src/app/page.tsx` | Untouched |
| `/api/layers/*` | Untouched |
| `page.tsx` map page edits | Additive — new layers + tabs only |
| `schema.prisma` | 2 new enums + 4 new models + 5 back-relation lines on existing models. No existing field / index changed. |
| `prisma migrate deploy` only in prod | Migration scripted; not applied here |
| Cohort role gating | OWNER / BROKER / DEVELOPER get vault. ADMIN role gets no special vault privileges. |
| Existing `parse-title-deed` route reuse | NOT reused in MVP (PDF support deferred to Phase 2.2 along with the affection-plan parser). |
| Existing PlotClaim admin queue reuse | Indirect — Promote-to-Public routes through the existing public-listing submit + verification flow, which already uses the PlotClaim queue. No new admin queue tab in MVP. |
| Existing `storage-signed-url.ts` reuse | Not reused — Vault MVP does not introduce new private buckets (verification docs live in the existing `registration-docs` bucket via the existing Listings submit flow). |

# Private Plot Vault — Implementation Plan (Phase 2.1 MVP)

**Status:** Draft 2026-05-13. **Revised 2026-05-13 (third pass)** — simplified scope to match `spec.md` revision: personal plot tracker, no new verification surface, no Affection Plan parser, conflict detection LITE only.
**Scope:** Phase 2.1 — **12–14 working days**. Phases 2.2 / 2.3 / 2.4 out of scope.

Ratified decisions baked in:
- **D1** Option A — separate `VaultEntry` model
- **D2** Three-tier visibility with SHARED implicit (derived from `VaultShare` rows; no enum)
- **D3** Account-required sharing only
- **D4** Freemium with AI features as paid (Phase 2.3)
- **D5** Recommended MVP — list view + map + share + import + promote-via-existing-submit + price edit + conflict LITE
- **D-bonus** Sharer gets broker share on Vault→Deal

Decisions superseded by simplified scope:
- **D6** Affection Plan parsing → moved to Phase 2.2 (MVP non-DDA accepts manual fields)
- **D7** Conflict detection → LITE only in MVP (DISPUTED + admin arbitration + dashboard → Phase 2.2)
- **D8, D9** → obsolete (no new verification surface in Vault; promote routes through existing Listings flow)

---

## 1. Prisma schema diff — paste-ready

### 1.1 New enums (place near existing `RegistrationStatus`, line ~645)

```prisma
// ── PRIVATE PLOT VAULT — Phase 2.1 MVP (spec: docs/specs/phase-2/private-plot-vault) ─

enum VaultStage {
  LEAD              // just added; haven't engaged owner yet
  CONTACTED         // spoken with owner, no commitment
  NEGOTIATING       // back-and-forth on price/terms
  AGREEMENT_SIGNED  // NDA / authorisation to market
  PROMOTED          // moved to Public Listings (still tracked here for history)
  LOST              // abandoned, owner went elsewhere
  CLOSED            // converted to Deal (kept for history)
}

enum VaultSharePermission {
  VIEW
  FEASIBILITY  // declared now; Phase 2.2 ships gate behaviour
  OFFER        // declared now; Phase 2.2 ships gate behaviour
}
```

### 1.2 New models (end of `schema.prisma`)

```prisma
model VaultEntry {
  id              String      @id @default(cuid())
  ownerId         String
  owner           User        @relation("VaultEntryOwner", fields: [ownerId], references: [id])

  // Attribution (§16.1)
  addedByUserId       String?
  addedBy             User?       @relation("VaultEntryAddedBy", fields: [addedByUserId], references: [id])
  importedFromShareId String?
  provenanceChain     Json?

  // Plot identity
  emirate         String
  district        String
  plotNumber      String
  publicParcelId  String?
  publicParcel    Parcel?     @relation("VaultEntryPublicParcel", fields: [publicParcelId], references: [id])

  // Plot facts (denormalised — populated from DDA scrape on DDA hits;
  // user-entered for non-DDA. Phase 2.2 adds Affection Plan PDF parsing
  // to auto-fill these for non-DDA plots.)
  area         Float?
  latitude     Float?
  longitude    Float?
  geometry     Json?
  landUse      String?

  // Broker's data
  askingPriceFils  BigInt?
  ownerContact     Json?
  brokerNotes      String?     @db.Text
  stage            VaultStage  @default(LEAD)
  source           String?
  nextFollowUpAt   DateTime?

  // Promote bookkeeping
  promotedAt       DateTime?
  promotedParcelId String?

  // Conflict detection (§15 — LITE, info only)
  conflictsWithOthers Boolean   @default(false)
  conflictedFields    Json?

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

model VaultShare {
  id              String                @id @default(cuid())
  vaultEntryId    String
  vaultEntry      VaultEntry            @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  ownerId         String
  recipientUserId String
  recipient       User                  @relation("VaultShareRecipient", fields: [recipientUserId], references: [id])
  permission      VaultSharePermission  @default(VIEW)
  expiresAt       DateTime?
  revokedAt       DateTime?
  revokedReason   String?
  createdAt       DateTime              @default(now())
  lastViewedAt    DateTime?

  @@unique([vaultEntryId, recipientUserId])
  @@index([recipientUserId, revokedAt])
  @@index([ownerId])
}

model VaultActivity {
  id            String      @id @default(cuid())
  vaultEntryId  String
  vaultEntry    VaultEntry  @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  actorUserId   String?
  actor         User?       @relation("VaultActivityActor", fields: [actorUserId], references: [id])
  kind          String      // UPPER_SNAKE_CASE; closed enum in src/lib/vault-activity.ts
  payload       Json?
  createdAt     DateTime    @default(now())

  @@index([vaultEntryId, createdAt])
}

model VaultPriceHistory {
  id           String      @id @default(cuid())
  vaultEntryId String
  vaultEntry   VaultEntry  @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  priceFils    BigInt
  setByUserId  String
  source       String      // "manual" | "import" | "promote-sync"
  note         String?
  createdAt    DateTime    @default(now())

  @@index([vaultEntryId, createdAt])
}
```

### 1.3 Existing-model relation additions

**`User`** (after Cohort Pilot relations, ~line 158):

```prisma
  // Private Plot Vault v2.1 relations
  vaultEntriesOwned     VaultEntry[]    @relation("VaultEntryOwner")
  vaultEntriesAddedBy   VaultEntry[]    @relation("VaultEntryAddedBy")
  vaultSharesReceived   VaultShare[]    @relation("VaultShareRecipient")
  vaultActivityAuthored VaultActivity[] @relation("VaultActivityActor")
```

**`Parcel`** (after Cohort Pilot relations, ~line 201):

```prisma
  // Private Plot Vault v2.1
  vaultEntryLinks       VaultEntry[]    @relation("VaultEntryPublicParcel")
```

### 1.4 Touch surface summary

- 2 new enums (`VaultStage`, `VaultSharePermission`)
- 4 new models (`VaultEntry`, `VaultShare`, `VaultActivity`, `VaultPriceHistory`)
- 4 new back-relation lines on `User`
- 1 new back-relation line on `Parcel`
- 0 changes to existing fields, indexes, or enum values
- **`Parcel` table structurally untouched** — Public Listings flow unaffected

---

## 2. Migration SQL preview

```sql
CREATE TYPE "VaultStage" AS ENUM (
  'LEAD','CONTACTED','NEGOTIATING','AGREEMENT_SIGNED',
  'PROMOTED','LOST','CLOSED'
);
CREATE TYPE "VaultSharePermission" AS ENUM ('VIEW','FEASIBILITY','OFFER');

CREATE TABLE "VaultEntry" (
    "id"                  TEXT NOT NULL,
    "ownerId"             TEXT NOT NULL,
    "addedByUserId"       TEXT,
    "importedFromShareId" TEXT,
    "provenanceChain"     JSONB,
    "emirate"             TEXT NOT NULL,
    "district"            TEXT NOT NULL,
    "plotNumber"          TEXT NOT NULL,
    "publicParcelId"      TEXT,
    "area"                DOUBLE PRECISION,
    "latitude"            DOUBLE PRECISION,
    "longitude"           DOUBLE PRECISION,
    "geometry"            JSONB,
    "landUse"             TEXT,
    "askingPriceFils"     BIGINT,
    "ownerContact"        JSONB,
    "brokerNotes"         TEXT,
    "stage"               "VaultStage" NOT NULL DEFAULT 'LEAD',
    "source"              TEXT,
    "nextFollowUpAt"      TIMESTAMP(3),
    "promotedAt"          TIMESTAMP(3),
    "promotedParcelId"    TEXT,
    "conflictsWithOthers" BOOLEAN NOT NULL DEFAULT false,
    "conflictedFields"    JSONB,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VaultEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VaultShare" (
    "id"              TEXT NOT NULL,
    "vaultEntryId"    TEXT NOT NULL,
    "ownerId"         TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "permission"      "VaultSharePermission" NOT NULL DEFAULT 'VIEW',
    "expiresAt"       TIMESTAMP(3),
    "revokedAt"       TIMESTAMP(3),
    "revokedReason"   TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt"    TIMESTAMP(3),
    CONSTRAINT "VaultShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VaultActivity" (
    "id"           TEXT NOT NULL,
    "vaultEntryId" TEXT NOT NULL,
    "actorUserId"  TEXT,
    "kind"         TEXT NOT NULL,
    "payload"      JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VaultActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VaultPriceHistory" (
    "id"           TEXT NOT NULL,
    "vaultEntryId" TEXT NOT NULL,
    "priceFils"    BIGINT NOT NULL,
    "setByUserId"  TEXT NOT NULL,
    "source"       TEXT NOT NULL,
    "note"         TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VaultPriceHistory_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "VaultEntry_ownerId_emirate_district_plotNumber_key"
  ON "VaultEntry"("ownerId","emirate","district","plotNumber");
CREATE INDEX "VaultEntry_ownerId_idx"           ON "VaultEntry"("ownerId");
CREATE INDEX "VaultEntry_stage_idx"             ON "VaultEntry"("stage");
CREATE INDEX "VaultEntry_publicParcelId_idx"    ON "VaultEntry"("publicParcelId");
CREATE INDEX "VaultEntry_nextFollowUpAt_idx"    ON "VaultEntry"("nextFollowUpAt");
CREATE INDEX "VaultEntry_plot_lookup_idx"       ON "VaultEntry"("emirate","district","plotNumber");

CREATE UNIQUE INDEX "VaultShare_vaultEntryId_recipientUserId_key"
  ON "VaultShare"("vaultEntryId","recipientUserId");
CREATE INDEX "VaultShare_recipientUserId_revokedAt_idx"
  ON "VaultShare"("recipientUserId","revokedAt");
CREATE INDEX "VaultShare_ownerId_idx" ON "VaultShare"("ownerId");

CREATE INDEX "VaultActivity_vaultEntryId_createdAt_idx"
  ON "VaultActivity"("vaultEntryId","createdAt");

CREATE INDEX "VaultPriceHistory_vaultEntryId_createdAt_idx"
  ON "VaultPriceHistory"("vaultEntryId","createdAt");

-- FK constraints (omitted for brevity — same cascade pattern as cohort tables):
-- VaultShare / VaultActivity / VaultPriceHistory on vaultEntryId: CASCADE
-- All userId FKs: RESTRICT on delete, except actorUserId which is SET NULL
```

Notes:
- `prisma migrate deploy` only in production
- No backfill, no data movement
- Estimated execution time on production Supabase: < 2 seconds
- Reversible: drop tables then enums

---

## 3. Route signatures

All auth-required (Bearer + `getApprovedUserId`).

### 3.1 Core vault routes

```ts
// src/app/api/me/vault/entries/route.ts
// GET ?stage&search&conflict&cursor&limit
// → 200 { items: VaultEntrySummary[], nextCursor, total }
//
// POST body: VaultEntryCreate
// → 201 VaultEntrySummary
// → 409 duplicate ({ existingId })

const VaultEntryCreate = z.object({
  emirate: z.enum(["DUBAI","ABU_DHABI","SHARJAH","AJMAN","UAQ","RAK","FUJAIRAH"]),
  district: z.string().trim().min(1).max(120),
  plotNumber: z.string().trim().regex(/^\d{5,10}$/),
  area: z.number().positive().max(1e9).optional(),
  latitude: z.number().min(22).max(27).optional(),
  longitude: z.number().min(51).max(57).optional(),
  geometry: z.unknown().optional(),    // only set for DDA hits in MVP
  landUse: z.string().trim().max(64).optional(),
  askingPriceFils: z.string().regex(/^\d{1,16}$/).optional(),
  ownerContact: z.object({
    name:  z.string().trim().max(120).optional(),
    phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/).optional(),
    email: z.string().email().optional(),
    role:  z.string().trim().max(40).optional(),
    notes: z.string().max(2000).optional(),
  }).optional(),
  brokerNotes: z.string().max(8000).optional(),
  stage: z.nativeEnum(VaultStage).default("LEAD"),
  source: z.string().trim().max(40).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});
```

```ts
// src/app/api/me/vault/entries/[id]/route.ts
// GET    → VaultEntryFull | 404
// PATCH  body: VaultEntryUpdate → VaultEntryFull
//        - writes VaultPriceHistory + PRICE_CHANGED activity on askingPriceFils change
//        - triggers recomputeConflictsForPlot if any conflict-relevant field changed
// DELETE → 204; cascades shares/activity/priceHistory

const VaultEntryUpdate = VaultEntryCreate.partial().omit({
  emirate: true, district: true, plotNumber: true,
});
```

```ts
// src/app/api/me/vault/map/route.ts
// GET → { features: GeoJSON.Feature[] }
//   one Feature per VaultEntry. Polygon when geometry present;
//   Point when only (lat, lng); skipped when neither.

// src/app/api/me/vault/plot-lookup/route.ts
// POST { emirate, district, plotNumber }
// → 200 { source: "dda" | "not_found",
//         existing: VaultEntrySummary | null,
//         ddaData?: { area, geometry, landUse }   // populated if source==="dda"
//       }
```

```ts
// src/app/api/me/vault/entries/[id]/shares/route.ts
// POST body: VaultShareCreate → VaultShareSummary
// GET → { items: VaultShareSummary[] }
const VaultShareCreate = z.object({
  recipientLookup: z.union([
    z.object({ email: z.string().email() }),
    z.object({ nickname: z.string().trim().min(1).max(64) }),
    z.object({ userId: z.string().cuid() }),
  ]),
  permission: z.enum(["VIEW"]).default("VIEW"),    // MVP gates to VIEW
  expiresAt: z.string().datetime().optional(),
});

// src/app/api/me/vault/shares/[id]/revoke/route.ts
// POST { reason?: string } → { revokedAt }
```

```ts
// src/app/api/vault/shared-with-me/route.ts
// GET → { items: VaultEntryShareSummary[] }    (includes sharedBy nickname)

// src/app/api/vault/shared-with-me/map/route.ts
// GET → GeoJSON for the vault-shared MapLibre source

// src/app/api/vault/shared-with-me/[id]/import/route.ts
// POST → 201 { newVaultEntryId }
//   Creates new VaultEntry for caller with:
//     - addedByUserId   = original sharer
//     - importedFromShareId = share.id
//     - plot identity / geometry / area / landUse copied
//     - ownerContact copied
//     - brokerNotes NOT copied (private to original owner)
//     - askingPriceFils copied as starting point
//     - stage = LEAD
//     - provenanceChain = [...original, { userId: sharer, nickname, addedAt: now }]
//   Emits IMPORTED_FROM_SHARE activity on the new entry.
```

```ts
// src/app/api/vault/entries/[id]/route.ts
// GET → polymorphic
//   owner: VaultEntryFull (everything)
//   active share recipient: VaultEntryFull MINUS
//     - brokerNotes
//     - nextFollowUpAt
//     - ownerContact.notes
//     - activity[] except the SHARED kind
//   else: 404
//
//   side effect: if recipient, updates VaultShare.lastViewedAt + emits
//   VIEWED_BY_RECIPIENT activity (debounced 1h per recipient)
```

### 3.2 Conflict routes (LITE)

```ts
// src/app/api/me/vault/conflicts/route.ts
// GET → { items: VaultEntrySummary[] }   (caller's entries in conflict)

// src/app/api/me/vault/conflicts/[plotNumber]/route.ts
// GET ?emirate&district
// → 200 {
//     plotNumber, emirate, district,
//     entries: Array<{
//       addedByNickname: string,
//       priceFils: string | null,
//       area: number | null,
//       landUse: string | null,
//       maxFloors: number | null,
//       createdAt: string,
//     }>
//   }
// → 403 if caller has no entry for this plot (anti-fishing)
//
// Server strips brokerNotes, ownerContact, nextFollowUpAt from OTHER users' entries.
```

### 3.3 Promote-to-Public (bridges into existing Listings flow)

```ts
// src/app/api/me/vault/entries/[id]/promote/route.ts
// POST body: SubmitListingPayload (extends existing /api/parcels/submit body)
// → 200 { vaultEntryId, parcelId, claimId }
// → 409 already_promoted
//
// Internals:
//   1. Validate caller owns the VaultEntry and it isn't already promoted
//   2. Call src/lib/parcel-create.ts (extracted on Day 4) with the
//      submit payload — runs existing PENDING_REVIEW creation + PlotClaim
//   3. Set vaultEntry.publicParcelId, promotedAt, stage = PROMOTED
//   4. Emit PROMOTED_TO_PUBLIC activity + VAULT_PROMOTED_TO_PUBLIC notification
//
// User uploads required documents (Title Deed / Contract) in the existing
// Listings submit form UI — no new verification surface in Vault.
// Admin verification continues through the existing PlotClaim queue.
```

### 3.4 Modified existing route

`/api/parcels/submit` — accepts optional `target: "vault" | "public"` (default `"public"`). When `vault`, skips Parcel + PlotClaim create and creates a `VaultEntry` instead. Otherwise unchanged.

No middleware changes. No `/api/layers/*` changes.

---

## 4. Component-level map

New files under `src/app/`:

```
src/app/vault/
  page.tsx                          — /vault list page (gated by AuthGuard)
  VaultListView.tsx                 — table + filters
  VaultListItem.tsx                 — single row
  PriceEditCell.tsx                 — inline edit (Enter saves; pencil icon to edit)
  PriceHistoryDropdown.tsx          — expandable mini-table
  AttributionBadge.tsx              — "Added by you" / "From @nickname"
  ConflictsTab.tsx                  — Conflicts tab pane
  EmptyState.tsx                    — first-visit prompt

src/app/parcels/map/
  AddPlotWizard/                    — 3-step wizard
    Step1PlotLookup.tsx             — plot number + DDA-hit branch / manual branch
    Step2Details.tsx                — broker data form
    Step3Confirm.tsx                — preview + submit
  VaultSidePanelAdapter.tsx         — wraps SidePanel for VaultEntry shape
  ShareModal.tsx                    — share dialog
  PromoteToPublicModal.tsx          — opens existing AddPlotModal in "promote-from-vault" mode
  ConflictBanner.tsx                — top-of-side-panel banner
  ConflictDetailModal.tsx           — redacted comparison view
  ImportFromShareButton.tsx         — "Add to my vault" button on shared entries
```

New library files under `src/lib/`:

```
src/lib/vault-activity.ts           — closed UPPER_SNAKE_CASE kind enum + payload caps
src/lib/vault-share.ts              — share create / revoke / recipient lookup
src/lib/vault-permission.ts         — getVaultEntryAccess(userId, entryId)
                                       returns "owner" | "share" | "none"
src/lib/vault-serialize.ts          — BigInt → string + PII redaction by viewer role
src/lib/vault-conflict.ts           — recomputeConflictsForPlot + tolerances
src/lib/vault-price-history.ts      — write VaultPriceHistory row + PRICE_CHANGED activity
src/lib/vault-import.ts             — clone share into new VaultEntry with attribution
src/lib/parcel-create.ts            — NEW: extracted parcel-creation logic from
                                            /api/parcels/submit so the promote endpoint
                                            can reuse it cleanly
```

Existing helpers reused: `getApprovedUserId`, `prisma`, `supabase`, `serialize`, `logActivity` (from `src/lib/activity.ts`).

`src/lib/storage-signed-url.ts` is **not** modified — Vault MVP introduces no new private storage buckets. Verification documents uploaded during Promote-to-Public continue to use the existing `registration-docs` bucket via the existing Listings submit flow.

---

## 5. Day-by-day breakdown

**12–14 working days** at 8 h, one engineer focused. 2-day buffer.

### Day 1 — Schema + migration

Add 2 enums + 4 models + 5 back-relations to `prisma/schema.prisma`. Run `prisma migrate dev --name vault_mvp`. Verify in Prisma Studio. Smoke seed test rows. **Deliverable:** schema merged on `feat/vault-mvp` branch.

### Day 2 — Lib foundations

Build the 7 NEW lib modules: `vault-activity.ts` (closed UPPER_SNAKE_CASE kind enum), `vault-conflict.ts` (recompute + tolerances), `vault-share.ts`, `vault-permission.ts`, `vault-serialize.ts` (PII redaction by viewer role), `vault-price-history.ts`, `vault-import.ts`.

### Day 3 — Core CRUD API

`POST/GET /api/me/vault/entries`. `GET/PATCH/DELETE /api/me/vault/entries/[id]`. PATCH triggers `recomputeConflictsForPlot` if conflict-relevant field changed; writes `VaultPriceHistory` on price change. Zod schemas inline.

### Day 4 — Map + sharing + import + parcel-create extraction

`/api/me/vault/map` (GeoJSON). `/api/me/vault/plot-lookup` (DDA hit check via existing seed-dda helper). Share routes. `/api/vault/shared-with-me` + map + import. **Refactor:** extract parcel-create logic from `/api/parcels/submit` into `src/lib/parcel-create.ts` (~2 h).

### Day 5 — Polymorphic GET + conflict + promote

`GET /api/vault/entries/[id]` (owner full / share-recipient redacted). `/api/me/vault/conflicts` + `/conflicts/[plotNumber]` (anti-fishing 403). `/api/me/vault/entries/[id]/promote` (calls `parcel-create.ts`, links `publicParcelId`).

**End of Day 5 — backend feature-complete.** UI begins Day 6.

### Day 6 — Upload wizard

`Step1PlotLookup.tsx` (DDA branch auto-fill / manual branch). `Step2Details.tsx`. `Step3Confirm.tsx`. Submit to `/api/me/vault/entries`.

### Day 7 — Vault map layers

`loadVaultMine` + `loadVaultShared`. Two new sources + two new `fill-extrusion` layers (literal opacities 0.85 / 0.55) + one `symbol` layer for conflict markers. Tab toggles in layers panel.

### Day 8 — VaultSidePanelAdapter + ConflictBanner

`VaultSidePanelAdapter.tsx` wrapping existing `SidePanel`. Header copy: "PRIVATE — only you" / "SHARED BY @nickname" / "PROMOTED → public listing". `ConflictBanner.tsx` + `ConflictDetailModal.tsx`.

### Day 9 — /vault list page + inline price edit

`src/app/vault/page.tsx`. `VaultListView.tsx` (filters by stage / district / search). `PriceEditCell.tsx`. `AttributionBadge.tsx`. `PriceHistoryDropdown.tsx`. `ConflictsTab.tsx`.

### Day 10 — ShareModal + ImportFromShareButton + PromoteToPublicModal

`ShareModal.tsx` (recipient picker + VIEW permission + expiry). `ImportFromShareButton.tsx` ("Add to my vault" — POSTs to import). `PromoteToPublicModal.tsx` — opens existing `AddPlotModal` in "promote-from-vault" mode with VaultEntry data prefilled; submit calls promote endpoint.

### Day 11 — Notifications + activity feed integration

In-app notifications with UPPER_SNAKE_CASE kinds: `VAULT_SHARE_RECEIVED`, `VAULT_SHARE_VIEWED`, `VAULT_SHARE_REVOKED`, `VAULT_CONFLICT_DETECTED`, `VAULT_PROMOTED_TO_PUBLIC`. Side-panel activity feed (last 5 events) via `VaultActivity`. Every VaultActivity write also calls `void logActivity(...)` for the actor → populates user-centric `ActivityLog`.

### Day 12 — Polish + edge cases

Loading skeletons. Empty states. Error toasts (401 → /, 404 silent, 409 modal-resurface, 500 generic). a11y (aria-label, kbd nav, focus return). Mobile (list collapses to cards; side panel full-screen sheet).

### Day 13 — Smoke + UAT prep

CLAUDE.md-format smoke checklist:
- [ ] `pnpm build` clean
- [ ] DDA plot upload → auto 3D building
- [ ] Non-DDA plot upload manual → flat marker
- [ ] Share with cohort user — VIEW-only enforced
- [ ] Recipient sees plot on their map + `/vault` → Shared with me
- [ ] Recipient cannot see brokerNotes / nextFollowUpAt / ownerContact.notes
- [ ] Recipient "Add to my vault" → new VaultEntry with "From @nickname" badge
- [ ] Conflict banner appears when 2nd user uploads same plot with > 5 % price diff
- [ ] Conflict detail modal shows ONLY public facts; @nicknames visible
- [ ] Inline price edit writes VaultPriceHistory + PRICE_CHANGED activity
- [ ] Price history dropdown shows chronological changes
- [ ] Promote-to-Public opens existing AddPlotModal in promote mode → submit creates Parcel (PENDING_REVIEW) + links back
- [ ] Admin verifies Parcel via existing PlotClaim queue → vault entry stage = PROMOTED
- [ ] Existing AddPlot Public flow untouched (regression)
- [ ] `/api/parcels/map` old shape 200 (regression)
- [ ] PMTiles AD heights magic intact (regression)
- [ ] scrollbar-gutter still in CSS (regression)

Preview deploy + founder/cohort walkthrough.

### Day 14 — UAT fixes + production push

Address P0 / P1 from UAT. Production `prisma migrate deploy` in pipeline. Monitor first 24 h.

---

## 6. What this plan deliberately defers

| Item | Phase | Why |
|---|---|---|
| Affection Plan PDF parsing (Claude vision via `document` content block) | 2.2 | Existing `parse-title-deed` is image-only; new route needed. ~5 days; cohort signal first |
| Verification surface inside Vault | n/a | Lives in existing Listings flow. Promote bridges. |
| DISPUTED status + admin arbitration | 2.2 | Cohort signal first |
| Aggregate market-intelligence dashboard | 2.2 | Cohort signal first |
| Kanban drag-and-drop UI | 2.2 | High value, high cost. List view ships first. |
| Per-permission shares (FEASIBILITY / OFFER) | 2.2 | Enum declared; gates ship later |
| Email daily digest | 2.2 | Needs cron; in-app feed is MVP substitute |
| CSV bulk import | 2.2 or 2.3 | Quality-of-life |
| Link-based sharing (token URLs) | 2.3 | D3 — account-only MVP |
| Encrypted-at-rest `ownerContact` | 2.2 | PDPL polish |
| AI smart-categorize, prospect scoring, market alerts | 2.3 | Paid-tier launch |
| Team accounts (multi-user brokerage vault) | 2.3 | Needs Organization model |
| Mobile pipeline app | 2.4 | Separate spec |

---

## 7. Constraints — verified

| Constraint | This plan |
|---|---|
| Master Tree v3.0 frozen | A.10 only |
| ZAAHI Signature 3D | Untouched |
| `fill-extrusion-opacity` literals | Two new extrusion layers (mine 0.85, shared 0.55) + 1 symbol layer (no extrusion) |
| Auth flow / `src/app/page.tsx` | Untouched |
| `/api/layers/*` | Untouched |
| `page.tsx` map page edits | Additive — new sources/layers + 2 new tab toggles |
| `schema.prisma` | 2 enums + 4 models + 5 back-relation lines; existing fields untouched |
| `prisma migrate deploy` only in prod | Migration scripted, not applied here |
| Cohort role gating | OWNER / BROKER / DEVELOPER get full vault; ADMIN role gets no special privileges (founders are ordinary users) |
| `Parcel.ownerId` / `verifiedOwnerUserId` invariant | Untouched |
| `parse-title-deed` reuse | NOT reused in MVP |
| `storage-signed-url.ts` reuse | NOT reused — no new vault buckets in MVP |

---

## 8. Risks specific to this plan

- **Day 4 import-cycle risk.** Promote endpoint reuses `/api/parcels/submit` logic. ~2 h refactor extracts parcel-create into `src/lib/parcel-create.ts`; both routes call into the lib. Done on Day 4.
- **Day 7 map clutter.** Stage-coloured fills on top of existing public listings could look noisy. Mitigated by tabs default-OFF (per spec §6.2).
- **Day 10 recipient-lookup ambiguity.** Typed email matching no user → 404 `recipient_not_found`. UI: "We couldn't find that user. Make sure they're an approved cohort member."
- **Day 13 cohort test pool.** UAT needs at least 1 OWNER + 1 BROKER. If short, founder accounts cover both sides.
- **Conflict detection write amplification.** Every entry create / update fires `recomputeConflictsForPlot`. With compound index, `O(N)` where N is entries on that plot (typically 1–5). Cohort scale: fine. Phase 2.2 may batch.

---

## 9. Day-1 readiness checklist

- [ ] Founder ratification of all 6 active decisions (D1, D2, D3, D4, D5, D-bonus)
- [ ] `feat/vault-mvp` branch off `main`
- [ ] CI runs Prisma generate + tsc + Next.js build
- [ ] Supabase dev DB accessible for `prisma migrate dev`
- [ ] 1 OWNER + 1 BROKER + 1 DEVELOPER cohort test accounts
- [ ] No competing branch in progress that overlaps `prisma/schema.prisma`

---

## 10. After MVP lands

Phase 2.2 covers: kanban + pipeline depth + per-permission shares + email digest + encryption + **Affection Plan PDF parser** + **conflict aggregate dashboard** + optional DISPUTED admin arbitration (gated on cohort signal). Estimate 12–18 days. Gated on 2–4 weeks of cohort feedback first.

Phase 2.3 covers AI / intelligence + team accounts + paid tier launch. 3–4 weeks. Founder decision on AI provider + budget.

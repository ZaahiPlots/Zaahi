# Private Plot Vault — Implementation Plan (Phase 2.1 MVP)

**Status:** Draft 2026-05-13. Gated on `spec.md` + `decisions.md` (all founder picks marked APPROVED).
**Scope:** Phase 2.1 — 10–14 days, Recommended MVP. Phases 2.2/2.3/2.4 out of scope here.

Approved decisions baked in:
- **D1** Option A — separate `VaultEntry` model, Parcel untouched.
- **D2** Three-tier with SHARED implicit (derived from `VaultShare` rows; DB stores only PRIVATE / PUBLIC indirectly via promote).
- **D3** Account-required only — recipient must be an approved cohort user.
- **D4** Freemium with AI features as paid — MVP is free; pricing surfaces in 2.3.
- **D5** Recommended MVP — list view + map layer + share view-only + promote.
- **D-bonus** Sharer gets broker share on Vault→Deal — `Deal.brokerId = VaultEntry.ownerId` default.

---

## 1. Prisma schema diff — paste-ready

Drop these blocks into `prisma/schema.prisma`. Order: enums above models; new models at the bottom; existing `User` and `Parcel` get back-relations added.

### 1.1 New enums (place near the existing `RegistrationStatus` enum, around line 645)

```prisma
// ── PRIVATE PLOT VAULT — Phase 2.1 MVP (spec docs/specs/phase-2/private-plot-vault) ─

// Stage of a broker's private pipeline entry. Single linear progression
// for MVP — kanban view + automation come in Phase 2.2.
enum VaultStage {
  LEAD              // just added; haven't engaged owner yet
  CONTACTED         // spoken with owner, no commitment
  NEGOTIATING       // back-and-forth on price/terms
  AGREEMENT_SIGNED  // NDA / authorisation to market
  PROMOTED          // moved to Public Listings (still tracked here)
  LOST              // abandoned, owner went elsewhere, etc.
  CLOSED            // converted to a Deal (kept for history)
}

// Permission a share grants to its recipient. MVP supports VIEW only;
// FEASIBILITY and OFFER come in Phase 2.2.
enum VaultSharePermission {
  VIEW
  FEASIBILITY  // declared now to avoid an enum-add migration later
  OFFER
}
```

### 1.2 New models (place at end of `schema.prisma`)

```prisma
// Broker's / developer's private pipeline entry for a single plot.
// Plot identity (emirate, district, plotNumber) refers to a real plot
// in the world, not necessarily a `Parcel` row — most entries describe
// plots that have no public listing.
//
// `publicParcelId` is set when the plot is ALSO publicly listed (by
// anyone, including the vault owner via Promote-to-Public). Linking
// is informational; the public listing has independent lifecycle.
//
// `ownerContact` carries PII (phone, email, name, role). MVP stores
// unencrypted; Phase 2.2 will encrypt at rest. Always served via the
// vault routes which gate on ownerId / active share.
//
// `@@unique([ownerId, emirate, district, plotNumber])` enforces the
// invariant that a single user has at most one Vault entry per plot.
// Multiple users CAN have their own entries for the same plot — that's
// the explicit win of the separate-table model (decision D1).
model VaultEntry {
  id              String      @id @default(cuid())
  ownerId         String
  owner           User        @relation("VaultEntryOwner", fields: [ownerId], references: [id])

  // Plot identity
  emirate         String
  district        String
  plotNumber      String
  publicParcelId  String?
  publicParcel    Parcel?     @relation("VaultEntryPublicParcel", fields: [publicParcelId], references: [id])

  // Snapshot of plot facts (denormalised — survives even when no DDA
  // scrape exists for this plot; broker can override DDA values).
  area            Float?
  latitude        Float?
  longitude       Float?
  geometry        Json?
  landUse         String?

  // Broker's own data (never derived from DDA)
  askingPriceFils BigInt?
  ownerContact    Json?       // { name, phone, email, role, notes } — PII
  brokerNotes     String?     @db.Text
  stage           VaultStage  @default(LEAD)
  source          String?     // "cold-call" | "referral" | "dda-scrape" | "off-plan" | …
  nextFollowUpAt  DateTime?

  // Promote-to-Public bookkeeping
  promotedAt        DateTime?
  promotedParcelId  String?   // FK lifted out as relation for the Parcel side; nullable string here
  // (not a Prisma relation field — the promoted parcel is referenced via
  //  publicParcel above; promotedParcelId is the historical record even
  //  if publicParcel is later linked to a different row.)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  shares          VaultShare[]
  activity        VaultActivity[]

  @@unique([ownerId, emirate, district, plotNumber])
  @@index([ownerId])
  @@index([stage])
  @@index([publicParcelId])
  @@index([nextFollowUpAt])  // for the daily-digest "follow up today" query
}

// Per-recipient access grant on a single VaultEntry. MVP grants VIEW
// only; permission enum has FEASIBILITY and OFFER declared so Phase 2.2
// can ship without an enum migration.
//
// `@@unique([vaultEntryId, recipientUserId])` enforces one-grant-per-user;
// re-sharing updates the existing row (revokedAt cleared, expiresAt
// extended) rather than inserting a duplicate.
model VaultShare {
  id              String                @id @default(cuid())
  vaultEntryId    String
  vaultEntry      VaultEntry            @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  ownerId         String                // denormalised from vaultEntry.ownerId for filter performance
  recipientUserId String
  recipient       User                  @relation("VaultShareRecipient", fields: [recipientUserId], references: [id])

  permission      VaultSharePermission  @default(VIEW)
  expiresAt       DateTime?             // NULL = never
  revokedAt       DateTime?
  revokedReason   String?

  createdAt       DateTime              @default(now())
  lastViewedAt    DateTime?             // updated on every GET by recipient

  @@unique([vaultEntryId, recipientUserId])
  @@index([recipientUserId, revokedAt])
  @@index([ownerId])
}

// Append-only audit log for a VaultEntry. Drives the activity feed in
// the side panel and the daily digest email (Phase 2.2). Never pruned —
// activity row size is bounded by `payload` Json which we cap at 4 KB
// at write time in lib/vault-activity.ts.
model VaultActivity {
  id            String      @id @default(cuid())
  vaultEntryId  String
  vaultEntry    VaultEntry  @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  actorUserId   String?     // NULL for system events (e.g., share auto-revoked on user rejection)
  actor         User?       @relation("VaultActivityActor", fields: [actorUserId], references: [id])
  kind          String      // see lib/vault-activity.ts for the closed enum of allowed values
  payload       Json?
  createdAt     DateTime    @default(now())

  @@index([vaultEntryId, createdAt])
}
```

### 1.3 Existing-model relation additions

These are additive — three lines on `User`, one on `Parcel`. Place them inside the existing relation block of each model.

**`User`** (after the Cohort Pilot relations around line 158):

```prisma
  // Private Plot Vault v2.1 relations
  vaultEntriesOwned     VaultEntry[]    @relation("VaultEntryOwner")
  vaultSharesReceived   VaultShare[]    @relation("VaultShareRecipient")
  vaultActivityAuthored VaultActivity[] @relation("VaultActivityActor")
```

**`Parcel`** (after the Cohort Pilot relations around line 201):

```prisma
  // Private Plot Vault v2.1 — entries that reference this public parcel
  vaultEntryLinks       VaultEntry[]    @relation("VaultEntryPublicParcel")
```

### 1.4 Touch surface summary

- 2 new enums
- 3 new models
- 4 new back-relation lines
- 0 changes to any existing field
- 0 changes to any existing `@@unique` or `@@index`
- **`Parcel` table is structurally untouched** — guarantees Public Listings keep working without retest.

---

## 2. Migration SQL preview (what `prisma migrate dev --name vault_mvp` will generate)

```sql
-- CreateEnum
CREATE TYPE "VaultStage" AS ENUM (
  'LEAD', 'CONTACTED', 'NEGOTIATING', 'AGREEMENT_SIGNED',
  'PROMOTED', 'LOST', 'CLOSED'
);

-- CreateEnum
CREATE TYPE "VaultSharePermission" AS ENUM ('VIEW', 'FEASIBILITY', 'OFFER');

-- CreateTable VaultEntry
CREATE TABLE "VaultEntry" (
    "id"               TEXT NOT NULL,
    "ownerId"          TEXT NOT NULL,
    "emirate"          TEXT NOT NULL,
    "district"         TEXT NOT NULL,
    "plotNumber"       TEXT NOT NULL,
    "publicParcelId"   TEXT,
    "area"             DOUBLE PRECISION,
    "latitude"         DOUBLE PRECISION,
    "longitude"        DOUBLE PRECISION,
    "geometry"         JSONB,
    "landUse"          TEXT,
    "askingPriceFils"  BIGINT,
    "ownerContact"     JSONB,
    "brokerNotes"      TEXT,
    "stage"            "VaultStage" NOT NULL DEFAULT 'LEAD',
    "source"           TEXT,
    "nextFollowUpAt"   TIMESTAMP(3),
    "promotedAt"       TIMESTAMP(3),
    "promotedParcelId" TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VaultEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable VaultShare
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

-- CreateTable VaultActivity
CREATE TABLE "VaultActivity" (
    "id"           TEXT NOT NULL,
    "vaultEntryId" TEXT NOT NULL,
    "actorUserId"  TEXT,
    "kind"         TEXT NOT NULL,
    "payload"      JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VaultActivity_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "VaultEntry_ownerId_emirate_district_plotNumber_key"
  ON "VaultEntry"("ownerId", "emirate", "district", "plotNumber");
CREATE INDEX "VaultEntry_ownerId_idx"          ON "VaultEntry"("ownerId");
CREATE INDEX "VaultEntry_stage_idx"            ON "VaultEntry"("stage");
CREATE INDEX "VaultEntry_publicParcelId_idx"   ON "VaultEntry"("publicParcelId");
CREATE INDEX "VaultEntry_nextFollowUpAt_idx"   ON "VaultEntry"("nextFollowUpAt");

CREATE UNIQUE INDEX "VaultShare_vaultEntryId_recipientUserId_key"
  ON "VaultShare"("vaultEntryId", "recipientUserId");
CREATE INDEX "VaultShare_recipientUserId_revokedAt_idx"
  ON "VaultShare"("recipientUserId", "revokedAt");
CREATE INDEX "VaultShare_ownerId_idx"          ON "VaultShare"("ownerId");

CREATE INDEX "VaultActivity_vaultEntryId_createdAt_idx"
  ON "VaultActivity"("vaultEntryId", "createdAt");

-- Foreign keys
ALTER TABLE "VaultEntry"   ADD CONSTRAINT "VaultEntry_ownerId_fkey"        FOREIGN KEY ("ownerId")        REFERENCES "User"("id")       ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VaultEntry"   ADD CONSTRAINT "VaultEntry_publicParcelId_fkey" FOREIGN KEY ("publicParcelId") REFERENCES "Parcel"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VaultShare"   ADD CONSTRAINT "VaultShare_vaultEntryId_fkey"   FOREIGN KEY ("vaultEntryId")   REFERENCES "VaultEntry"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "VaultShare"   ADD CONSTRAINT "VaultShare_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VaultActivity" ADD CONSTRAINT "VaultActivity_vaultEntryId_fkey" FOREIGN KEY ("vaultEntryId")  REFERENCES "VaultEntry"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "VaultActivity" ADD CONSTRAINT "VaultActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId")   REFERENCES "User"("id")       ON DELETE SET NULL ON UPDATE CASCADE;
```

**Notes for whoever runs it:**

- **`prisma migrate deploy` only** in production (per CLAUDE.md prohibition on `db push`).
- No backfill, no data movement. New tables start empty.
- Reversible: `DROP TABLE` + `DROP TYPE` in inverse order. Down-migration is trivial.
- Estimated execution time on production Supabase: <2 seconds (no data scan, just DDL).

---

## 3. Route signatures — TypeScript / Zod

All routes follow the existing `getApprovedUserId` + Zod-validation + Prisma pattern from `src/app/api/parcels/submit/route.ts`. Files placed under `src/app/api/me/vault/` and `src/app/api/vault/`.

### 3.1 Owner-scoped routes (`/api/me/vault/*`)

```ts
// src/app/api/me/vault/entries/route.ts
//
// GET /api/me/vault/entries
//   ?stage=LEAD|CONTACTED|…  (optional, repeatable for "in" filter)
//   ?search=<plot number or district substring>
//   ?cursor=<cuid>           (pagination)
//   ?limit=<1..100, default 50>
//
// → 200 { items: VaultEntrySummary[], nextCursor: string | null, total: number }
// → 401 unauthorized

type VaultEntrySummary = {
  id: string;
  plotNumber: string;
  emirate: string;
  district: string;
  stage: VaultStage;
  askingPriceFils: string | null;     // BigInt → string for JSON
  source: string | null;
  nextFollowUpAt: string | null;       // ISO
  shareCount: number;                  // count of active (not-revoked, not-expired) shares
  createdAt: string;
  updatedAt: string;
};

// POST /api/me/vault/entries
// body: VaultEntryCreate (Zod schema below)
// → 201 { id, ...VaultEntrySummary }
// → 400 validation_failed
// → 409 duplicate ({ existingId }) when the unique constraint fires

const VaultEntryCreate = z.object({
  emirate: z.enum(["DUBAI", "ABU_DHABI", "SHARJAH", "AJMAN", "UAQ", "RAK", "FUJAIRAH"]),
  district: z.string().trim().min(1).max(120),
  plotNumber: z.string().trim().regex(/^\d{5,10}$/),
  askingPriceFils: z.string().regex(/^\d{1,16}$/).optional(),    // BigInt as string
  landUse: z.string().trim().max(64).optional(),
  source: z.string().trim().max(40).optional(),
  stage: z.nativeEnum(VaultStage).default("LEAD"),
  ownerContact: z.object({
    name: z.string().trim().max(120).optional(),
    phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/).optional(),
    email: z.string().email().optional(),
    role: z.string().trim().max(40).optional(),
    notes: z.string().max(2000).optional(),
  }).optional(),
  brokerNotes: z.string().max(8000).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  area: z.number().positive().max(1e9).optional(),
  latitude: z.number().min(22).max(27).optional(),
  longitude: z.number().min(51).max(57).optional(),
  geometry: z.unknown().optional(),  // GeoJSON polygon — validated downstream
});
```

```ts
// src/app/api/me/vault/entries/[id]/route.ts
//
// GET    /api/me/vault/entries/[id]    → 200 VaultEntryFull | 404
// PATCH  /api/me/vault/entries/[id]    body: VaultEntryUpdate → 200 VaultEntryFull
// DELETE /api/me/vault/entries/[id]    → 204

type VaultEntryFull = VaultEntrySummary & {
  publicParcelId: string | null;
  promotedAt: string | null;
  ownerContact: { name?, phone?, email?, role?, notes? } | null;
  brokerNotes: string | null;
  area: number | null;
  latitude: number | null;
  longitude: number | null;
  geometry: GeoJSON.Polygon | null;
  landUse: string | null;
  shares: VaultShareSummary[];
  activity: VaultActivitySummary[];        // last 20 entries
};

const VaultEntryUpdate = VaultEntryCreate.partial().omit({ emirate: true, district: true, plotNumber: true });
// identity fields are immutable post-creation (use DELETE + re-create if wrong)
```

```ts
// src/app/api/me/vault/map/route.ts
//
// GET /api/me/vault/map  → 200 { features: GeoJSON.Feature[] }
//
// Compact GeoJSON for the MapLibre source `vault-mine-buildings`. One
// Feature per VaultEntry that has a usable polygon OR (lat, lng) — the
// latter renders as a flat marker per CLAUDE.md "non-DDA placeholder" rule.
```

```ts
// src/app/api/me/vault/entries/[id]/promote/route.ts
//
// POST /api/me/vault/entries/[id]/promote
// body: { confirmDuplicates?: boolean }  // pass true to link to existing Parcel
//                                        // when one already exists for this plot
// → 200 { vaultEntry: VaultEntryFull, parcelId: string, created: boolean }
// → 409 { error: "public_listing_exists", existingParcelId } when confirmDuplicates !== true
// → 400 already_promoted
```

```ts
// src/app/api/me/vault/entries/[id]/shares/route.ts
//
// POST /api/me/vault/entries/[id]/shares
// body: VaultShareCreate
// → 201 VaultShareSummary
// → 400 cannot_share_with_self
// → 404 recipient_not_found
// → 409 already_shared (returns existing share row)

const VaultShareCreate = z.object({
  recipientLookup: z.union([
    z.object({ email: z.string().email() }),
    z.object({ nickname: z.string().trim().min(1).max(64) }),
    z.object({ userId: z.string().cuid() }),
  ]),
  permission: z.enum(["VIEW"]).default("VIEW"),     // MVP: VIEW only at the API layer
  expiresAt: z.string().datetime().optional(),       // NULL/omit = never
});

// GET /api/me/vault/entries/[id]/shares
// → 200 { items: VaultShareSummary[] }

// POST /api/me/vault/shares/[id]/revoke
// body: { reason?: string }
// → 200 { revokedAt }
```

### 3.2 Recipient-scoped routes (`/api/vault/shared-with-me/*`)

```ts
// src/app/api/vault/shared-with-me/route.ts
//
// GET /api/vault/shared-with-me  ?stage&search&cursor&limit
// → 200 { items: VaultEntryShareSummary[], nextCursor, total }

type VaultEntryShareSummary = Omit<VaultEntrySummary, "shareCount"> & {
  sharedBy: { id: string; nickname: string };
  sharedAt: string;                   // share.createdAt
  permission: VaultSharePermission;
  expiresAt: string | null;
};

// GET /api/vault/shared-with-me/map  → 200 { features: GeoJSON.Feature[] }
// Same shape as /api/me/vault/map; feeds the `vault-shared-buildings` source.
```

### 3.3 Polymorphic entry GET (works for owner OR active-share recipient)

```ts
// src/app/api/vault/entries/[id]/route.ts
//
// GET /api/vault/entries/[id]  → 200 (one of two shapes)
//
//   if caller is owner:
//     return VaultEntryFull (everything)
//
//   if caller is active share recipient (revokedAt IS NULL,
//                                        expiresAt > now() OR NULL):
//     return VaultEntryFull MINUS:
//       - brokerNotes
//       - nextFollowUpAt
//       - ownerContact.notes
//       - activity[] (recipients only see {kind: "shared_with_you"})
//     PLUS:
//       - sharedBy: { id, nickname }
//       - permission
//       - viewedAt (the recipient's lastViewedAt — sets on first GET)
//
//   else: 404 (NOT 403 — same pattern as Deal Room handlers)
```

### 3.4 Modified existing route

```ts
// src/app/api/parcels/submit/route.ts — extend the SubmitSchema:
//
//   target: z.enum(["public", "vault"]).default("public")
//
// When target === "vault", the handler:
//   - skips the Parcel create + PlotClaim create code path
//   - instead does prisma.vaultEntry.create({...})
//   - returns { vaultEntryId } instead of { parcelId, claimId }
//
// All other fields stay the same — no double-coding the upload form.
```

No middleware changes. No `/api/layers/*` changes. No changes to existing routes other than the one above.

---

## 4. Component-level map

New files under `src/app/`:

```
src/app/vault/
  page.tsx                          — /vault list page (Day 9)
  VaultListView.tsx                 — table + filter UI
  VaultListItem.tsx                 — single row
  EmptyState.tsx                    — first-visit prompt

src/app/parcels/map/
  VaultSidePanelAdapter.tsx         — wraps SidePanel for VaultEntry data (Day 7)
  ShareModal.tsx                    — share dialog (Day 10)
  PromoteToPublicModal.tsx          — promote confirmation (Day 11)
```

Modified files:

```
src/app/parcels/map/page.tsx
  + import installVaultLayer
  + state: vaultMineOpen, vaultSharedOpen
  + layer registry entries: VAULT_MINE_3D, VAULT_SHARED_3D
  + load helpers (mirror loadZaahiPlots structure)
  + new tab in the layers panel

src/app/parcels/map/AddPlotModal.tsx
  + new Step 0: target picker (Public Listing / Private Vault)
  + on submit, route to /api/me/vault/entries or /api/parcels/submit
```

New library files under `src/lib/`:

```
src/lib/vault-activity.ts           — typed wrapper for VaultActivity writes
                                       (closed enum of `kind` values, payload size cap)
src/lib/vault-share.ts              — share creation, revocation, recipient lookup
src/lib/vault-permission.ts         — gate helper: getVaultEntryAccess(userId, entryId)
                                       returns "owner" | "share" | "none"
src/lib/vault-serialize.ts          — BigInt → string + PII redaction by viewer role
```

Existing helpers reused unchanged: `getApprovedUserId`, `prisma`, `supabase`, `serialize`.

---

## 5. Day-by-day breakdown

One engineer focused, 8h day, including coffee. **12 working days, with a 2-day buffer to land at 14.**

### Day 1 — Schema + migration

- Add the 2 enums + 3 models + 4 back-relations to `prisma/schema.prisma`.
- Run `npx prisma migrate dev --name vault_mvp` against dev DB.
- Verify in Prisma Studio: tables exist, FKs correct, indexes present.
- Smoke test: insert one row in each table via `prisma db seed`-style script.
- **Deliverable:** schema merged on a `feat/vault-mvp` branch; migration committed.
- **Risk gate:** if schema review surfaces issues, fix here before any code.

### Day 2 — Backend foundation: entries CRUD

- `src/lib/vault-activity.ts` — `writeActivity(entryId, kind, payload?, actorUserId?)`. Closed enum of kinds.
- `src/lib/vault-serialize.ts` — BigInt and Date handling, redaction map.
- `src/app/api/me/vault/entries/route.ts` — GET (list + filter + paginate) and POST (create).
- `src/app/api/me/vault/entries/[id]/route.ts` — GET, PATCH, DELETE.
- Zod schemas live next to handlers; no separate validators dir.
- Unit smoke tests via `curl` against `pnpm dev`.

### Day 3 — Backend continued: map + sharing setup

- `src/app/api/me/vault/map/route.ts` — GeoJSON serialization. Includes only entries with usable geometry OR (lat,lng) pair. Caps response at 5000 features (returns 200 with a paginated cursor — but MVP returns all because we don't expect >5000 entries per user in cohort).
- `src/lib/vault-permission.ts` — the access helper.
- `src/lib/vault-share.ts` — recipient lookup (by email / nickname / userId), share create / revoke functions.
- `src/app/api/me/vault/entries/[id]/shares/route.ts` — POST (create), GET (list).
- `src/app/api/me/vault/shares/[id]/revoke/route.ts` — POST.

### Day 4 — Backend: shared-with-me + polymorphic GET

- `src/app/api/vault/shared-with-me/route.ts` — list view for recipients.
- `src/app/api/vault/shared-with-me/map/route.ts` — GeoJSON for shared layer.
- `src/app/api/vault/entries/[id]/route.ts` — polymorphic GET (owner OR active share recipient). PII redaction logic. Updates `share.lastViewedAt` on every recipient GET.
- Server-side test plan: 8 e2e-ish scenarios (owner / non-owner / active-share / revoked / expired / not-found / cohort-rejected / self-share).

### Day 5 — Backend: promote + activity surface

- `src/app/api/me/vault/entries/[id]/promote/route.ts` — orchestrates the Parcel create (reuses the existing `/api/parcels/submit` logic via internal import — same Zod validation, status PENDING_REVIEW). Sets `vaultEntry.promotedAt` + `promotedParcelId` + `stage = PROMOTED`. Writes activity row.
- Activity surfaces: PATCH on stage emits `stage_changed` activity. Share create emits `shared`. Share revoke emits `share_revoked`. Recipient GET emits `viewed_by_recipient` (debounced — only once per recipient per 1 h).
- **End of Day 5: full backend feature-complete.** UI starts Day 6.

### Day 6 — Frontend: AddPlotModal toggle

- Edit `src/app/parcels/map/AddPlotModal.tsx`:
  - Add Step 0 with two radio buttons + descriptive text.
  - Re-route submit on Step 0 choice.
  - When target=vault, also collect: source, stage (default LEAD), follow-up date, owner contact.
- Visual styling per `CLAUDE.md` UI STYLE GUIDE (glass background, gold accents, no system inputs).
- Submit happy-path tested end-to-end against the Day 2 API.

### Day 7 — Frontend: Vault map layer (owned)

- New helper `loadVaultMine(map)` next to `loadZaahiPlots` — fetches `/api/me/vault/map`, builds GeoJSON source `vault-mine-buildings`, adds layer `VAULT_MINE_3D`.
- Layer config: `fill-extrusion-color` per stage (LEAD = teal, CONTACTED = amber, NEGOTIATING = gold, AGREEMENT_SIGNED = green, PROMOTED = gold solid, LOST = grey, CLOSED = navy). Outline: dashed gold. `fill-extrusion-opacity: 0.85` (literal — per CLAUDE.md no-data-expression rule).
- Tab in layers panel: "My Vault (N)" with count badge. Toggle drives `visibility: "visible" / "none"` on the layer.
- Hover and click handlers → `VaultSidePanelAdapter` opens with full data (calls `/api/me/vault/entries/[id]`).

### Day 8 — Frontend: Shared-with-me layer + SidePanel adapter

- New helper `loadVaultShared(map)` — `vault-shared-buildings` source, `VAULT_SHARED_3D` layer. Dotted teal outline, opacity 0.55.
- Tab: "Shared with me (M)".
- `VaultSidePanelAdapter.tsx` — wraps the existing `SidePanel` component but with VaultEntry shape. Header reads "PRIVATE — only you" or "SHARED BY <nickname>" or "PROMOTED → public listing".
- Permission-aware sections: feasibility section hidden when permission < FEASIBILITY (always hidden in MVP since VIEW only).

### Day 9 — Frontend: /vault list page

- New top-level route `src/app/vault/page.tsx` — gated by `<AuthGuard>`.
- Table view with columns: plot number, district, stage, asking price, next follow-up, share count.
- Filters: stage multi-select, search (matches plot number or district substring), source dropdown.
- Row click → opens entry in side-panel adapter (no navigation; same panel as map).
- "Open in map" button → navigates to `/parcels/map` with `?focus=<entryId>` query param; the map page reads this on mount and flies to the plot.
- Empty state: "Add your first plot to your vault. Brokers and developers use this to keep their daily pipeline organised."

### Day 10 — Frontend: ShareModal

- `src/app/parcels/map/ShareModal.tsx`.
- Recipient picker:
  - Recent contacts (from previous shares; pulled via a side route GET `/api/me/vault/recent-recipients`).
  - Free-text email or nickname lookup.
- Permission: VIEW only (radio disabled at FEASIBILITY/OFFER in MVP — but rendered greyed-out with "Phase 2.2" tooltip to signal roadmap).
- Expiry: Never / 7 days / 30 days.
- Submit → `POST /api/me/vault/entries/[id]/shares` → toast "Shared with X" + close.
- Recipient sees in-app notification (uses existing `Notification` model — Day 12 will wire it formally).

### Day 11 — Frontend: PromoteToPublicModal + share list/revoke UI

- `src/app/parcels/map/PromoteToPublicModal.tsx`.
- Confirmation copy per spec §6.5.
- Submit → `POST /api/me/vault/entries/[id]/promote` → on success, toast + close + side-panel refresh.
- Edge: if 409 (existing public listing), modal swaps to "There's already a public listing for this plot. Link to it?" → user confirms → re-POST with `confirmDuplicates: true`.
- In `VaultSidePanelAdapter`, add a "Shares" section listing active shares with revoke button for each.

### Day 12 — Activity feed + notifications integration

- Notifications: extend `Notification` model usage (existing) with new `kind` values: `vault_share_received`, `vault_share_viewed`, `vault_share_revoked`. Re-use existing `/api/me/notifications` infrastructure.
- Activity feed: small section at bottom of `VaultSidePanelAdapter` showing last 5 activity rows ("3h ago: shared with @aigerim", "yesterday: stage changed to NEGOTIATING").
- Email digest (Phase 2.2 cleanup — DEFERRED out of MVP; left as a TODO ticket).

### Day 13 — Polish + edge cases

- Loading skeletons on list view and side panel.
- Empty states: no vault entries, no shares, no activity.
- 4xx error toasts: 401 redirects to /, 404 silent, 409 surfaces in modal, 500 generic "try again".
- A11y: `aria-label` on toggle tabs, kbd nav on list, focus return on modal close.
- Mobile: list view collapses to cards; side panel becomes full-screen sheet (existing `SidePanel` already supports this — see line 258).
- Visual QA against UI STYLE GUIDE checklist.

### Day 14 — Smoke + cohort deploy

- Smoke checklist (CLAUDE.md format):
  - [ ] `pnpm build` clean
  - [ ] Upload to vault works (4 stages tested)
  - [ ] Vault map layer renders + click opens side panel
  - [ ] Share with cohort user works
  - [ ] Recipient sees on their `/vault` → Shared with me + on map layer
  - [ ] Recipient cannot see brokerNotes / nextFollowUpAt (PII redaction)
  - [ ] Revoke share removes recipient access immediately
  - [ ] Promote-to-Public creates Parcel (PENDING_REVIEW) + links back
  - [ ] PMTiles still render (regression)
  - [ ] /api/parcels/map still returns 200 with old shape (regression)
  - [ ] Existing AddPlot Public flow still works
- Deploy to preview branch on Vercel; founder + 1 cohort broker UAT.
- Production push pending founder approval.

---

## 6. What this plan deliberately defers

| Item | Phase | Why |
|---|---|---|
| Kanban drag-and-drop UI | 2.2 | High value but high engineering cost; list view ships first |
| Per-permission shares (FEASIBILITY, OFFER) | 2.2 | Enum already declared; ships when feasibility runs on Vault data |
| Email daily-digest of follow-ups | 2.2 | Needs cron infrastructure; in-app activity feed is the MVP substitute |
| AI smart suggestions, prospect scoring, market alerts | 2.3 | The moat — separate spec, longer effort, paid tier launch |
| Team accounts (multi-user vault for a brokerage) | 2.3 | Needs new Organization model — too large for MVP |
| CSV bulk import | 2.3 (or earlier if cohort screams) | Quality-of-life, not blocking |
| Link-based sharing (token URLs) | 2.3 | Decision D3 — account-only for MVP |
| Encrypted-at-rest `ownerContact` | 2.2 | PDPL-correct path; MVP stores plaintext with PII warning in UI |
| Mobile native app | 2.4 | Separate spec, separate effort |

---

## 7. Constraints — verified against this plan

| Constraint | This plan |
|---|---|
| Master Tree v3.0 frozen | Adds new module A.10; doesn't modify A.1–A.9 or any other block |
| ZAAHI Signature 3D | Untouched — Vault uses `emitTiers`-style helpers but writes to NEW source/layer IDs |
| `fill-extrusion-opacity` is a literal number | Two new layers — both use literal numbers (0.85 mine, 0.55 shared) |
| Auth flow / `src/app/page.tsx` | Untouched — Vault APIs use existing `getApprovedUserId` |
| `/api/layers/*` | Untouched — Vault is at `/api/me/vault/*` and `/api/vault/*`, not under `/api/layers` |
| `page.tsx` map page edits | Touched, but additively — new layer registrations + tab; no removal of existing |
| `schema.prisma` | New enums + new models + back-relation lines on existing models; no existing field touched |
| `prisma migrate deploy` only in prod | Migration scripted but not applied here; left for the implementing engineer in production gate |
| `Parcel.ownerId` / `verifiedOwnerUserId` invariant | Untouched — Vault does NOT mutate Parcel rows except via Promote which goes through the normal `/api/parcels/submit` path |
| Cohort role gating | Vault APIs use existing `getApprovedUserId`; further role gating (OWNER / BROKER / DEVELOPER only) added as Day 2 helper |

---

## 8. Risks specific to this plan (vs. spec-level risks)

- **Day 5 import-cycle risk.** The promote endpoint wants to reuse `/api/parcels/submit` logic. If the submit handler is a Next.js route handler (not a library function), inter-route calls are awkward. **Mitigation:** extract the parcel-create logic into `src/lib/parcel-create.ts` as part of Day 5 (small refactor of `submit/route.ts` to thin wrapper). Adds ~2 hours but produces a clean library boundary.
- **Day 7 visual-cluttering of map.** Stage-coloured fills on top of existing public listings may look noisy. **Mitigation:** Day 7 also adds the "My Vault" tab toggle as default-OFF (per spec §6.2); user opts in.
- **Day 10 recipient-lookup ambiguity.** If two cohort users share a nickname (shouldn't happen — unique constraint) or the typed email matches no user, the share creation needs a friendly error. **Mitigation:** spec'd as 404 `recipient_not_found`. UI shows "We couldn't find that user. Make sure they're an approved cohort member."
- **Day 14 cohort-user-pool size.** UAT needs at least one OWNER and one BROKER cohort user. **Mitigation:** if not enough cohort users registered by Day 14, founder accounts (Zhan / Dymo) act as both sides for the test.

---

## 9. Day-1 readiness checklist

Before the engineer (or future-me) starts Day 1, confirm:

- [ ] Founder picks on D1–D5 + D-bonus signed off (this plan assumes recommended picks)
- [ ] `feat/vault-mvp` branch created off `main`
- [ ] CI pipeline runs Prisma generate + tsc + Next.js build on the branch
- [ ] Supabase dev DB accessible for `prisma migrate dev`
- [ ] Test cohort accounts exist (1 OWNER, 1 BROKER, 1 DEVELOPER) for UAT
- [ ] No competing branch in progress that overlaps `prisma/schema.prisma`

If any unchecked → resolve before Day 1.

---

## 10. After MVP lands

Phase 2.2 plan (kanban + pipeline depth + per-permission shares + email digest + encryption) becomes a separate doc: `docs/specs/phase-2/private-plot-vault/phase-2.2-pipeline-depth.md`. Estimated 7–10 days, gated on MVP cohort feedback (2–4 weeks of UAT) before scope-locks.

Phase 2.3 (AI) is a research+spec effort before implementation. Probably needs founder decision on AI provider (Anthropic / OpenAI / hybrid via Vercel AI SDK) and budget.

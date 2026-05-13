# Private Plot Vault — Implementation Plan (Phase 2.1 MVP+)

**Status:** Draft 2026-05-13. **Revised 2026-05-13** to integrate founder additions (Affection-plan ingress, verification gates, conflict detection, attribution, price history).
**Scope:** Phase 2.1 — **17–21 days**, MVP+. Phases 2.2/2.3/2.4 out of scope.

Approved decisions baked in:
- **D1** Option A — separate `VaultEntry` model
- **D2** Three-tier with SHARED implicit
- **D3** Account-required only
- **D4** Freemium with AI features as paid
- **D5** Recommended MVP+ — list view + map layer + share view-only + promote-with-verification + affection-plan ingress + conflict-lite + attribution + price history
- **D-bonus** Sharer gets broker share on Vault→Deal

New decisions (D6–D9 in decisions.md, **pending founder pick**):
- **D6** Affection Plan parsing strategy — Claude vision (recommended), manual fallback (Phase 2.2), or both
- **D7** Conflict detection scope — lite (banner only, recommended for MVP) or full (DISPUTED status)
- **D8** Verification name-match auto-pass threshold — recommended 0.92
- **D9** Verification doc storage bucket — recommended new `vault-verification-docs` bucket separate from `registration-docs`

---

## 1. Prisma schema diff — paste-ready

### 1.1 New enums (near line 645 of schema.prisma)

```prisma
// ── PRIVATE PLOT VAULT — Phase 2.1 MVP+ (spec docs/specs/phase-2/private-plot-vault) ─

enum VaultStage {
  LEAD              // just added; haven't engaged owner yet
  CONTACTED         // spoken with owner, no commitment
  NEGOTIATING       // back-and-forth on price/terms
  AGREEMENT_SIGNED  // NDA / authorisation to market
  PROMOTED          // moved to Public Listings (still tracked here)
  LOST              // abandoned, owner went elsewhere
  CLOSED            // converted to Deal (kept for history)
}

enum VaultSharePermission {
  VIEW
  FEASIBILITY  // declared now; Phase 2.2 ships behaviour
  OFFER        // declared now; Phase 2.2 ships behaviour
}

enum VaultVerificationStatus {
  NONE
  PENDING
  VERIFIED
  REJECTED
}
```

### 1.2 New models (end of schema.prisma)

```prisma
model VaultEntry {
  id              String      @id @default(cuid())
  ownerId         String
  owner           User        @relation("VaultEntryOwner", fields: [ownerId], references: [id])

  // Attribution (§16)
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

  // Snapshot
  area         Float?
  latitude     Float?
  longitude    Float?
  geometry     Json?
  landUse      String?

  // Affection-plan source (§13)
  affectionPlanSource           String?
  affectionPlanData             Json?
  affectionPlanDocPath          String?
  affectionPlanParseConfidence  Float?

  // Broker's data
  askingPriceFils  BigInt?
  ownerContact     Json?
  brokerNotes      String?     @db.Text
  stage            VaultStage  @default(LEAD)
  source           String?
  nextFollowUpAt   DateTime?

  // Verification (§14)
  verificationStatus       VaultVerificationStatus @default(NONE)
  verificationFlow         String?
  verificationDocsJson     Json?
  identityMatchScore       Float?
  verificationSubmittedAt  DateTime?
  verifiedById             String?
  verifiedAt               DateTime?
  verificationRejection    String?

  // Promote
  promotedAt       DateTime?
  promotedParcelId String?

  // Conflict detection (§15)
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
  @@index([emirate, district, plotNumber])   // drives conflict detection
  @@index([verificationStatus])
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
  kind          String      // closed enum in src/lib/vault-activity.ts
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

`User` (after Cohort Pilot relations, around line 158):

```prisma
  // Private Plot Vault v2.1 relations
  vaultEntriesOwned     VaultEntry[]    @relation("VaultEntryOwner")
  vaultEntriesAddedBy   VaultEntry[]    @relation("VaultEntryAddedBy")     // NEW (attribution)
  vaultSharesReceived   VaultShare[]    @relation("VaultShareRecipient")
  vaultActivityAuthored VaultActivity[] @relation("VaultActivityActor")
```

`Parcel` (after Cohort Pilot relations, around line 201):

```prisma
  // Private Plot Vault v2.1
  vaultEntryLinks       VaultEntry[]    @relation("VaultEntryPublicParcel")
```

### 1.4 Touch surface

- 3 new enums (was 2)
- 4 new models (was 3)
- 9 new fields on VaultEntry vs the original spec
- 5 new back-relation lines on User + 1 on Parcel
- 0 changes to any existing field
- 0 changes to any existing index
- **Parcel table structurally untouched**

---

## 2. Migration SQL preview (what `prisma migrate dev --name vault_mvp_plus` will generate)

```sql
-- Enums
CREATE TYPE "VaultStage" AS ENUM ('LEAD','CONTACTED','NEGOTIATING','AGREEMENT_SIGNED','PROMOTED','LOST','CLOSED');
CREATE TYPE "VaultSharePermission" AS ENUM ('VIEW','FEASIBILITY','OFFER');
CREATE TYPE "VaultVerificationStatus" AS ENUM ('NONE','PENDING','VERIFIED','REJECTED');

-- VaultEntry
CREATE TABLE "VaultEntry" (
    "id"                            TEXT NOT NULL,
    "ownerId"                       TEXT NOT NULL,
    "addedByUserId"                 TEXT,
    "importedFromShareId"           TEXT,
    "provenanceChain"               JSONB,
    "emirate"                       TEXT NOT NULL,
    "district"                      TEXT NOT NULL,
    "plotNumber"                    TEXT NOT NULL,
    "publicParcelId"                TEXT,
    "area"                          DOUBLE PRECISION,
    "latitude"                      DOUBLE PRECISION,
    "longitude"                     DOUBLE PRECISION,
    "geometry"                      JSONB,
    "landUse"                       TEXT,
    "affectionPlanSource"           TEXT,
    "affectionPlanData"             JSONB,
    "affectionPlanDocPath"          TEXT,
    "affectionPlanParseConfidence"  DOUBLE PRECISION,
    "askingPriceFils"               BIGINT,
    "ownerContact"                  JSONB,
    "brokerNotes"                   TEXT,
    "stage"                         "VaultStage" NOT NULL DEFAULT 'LEAD',
    "source"                        TEXT,
    "nextFollowUpAt"                TIMESTAMP(3),
    "verificationStatus"            "VaultVerificationStatus" NOT NULL DEFAULT 'NONE',
    "verificationFlow"              TEXT,
    "verificationDocsJson"          JSONB,
    "identityMatchScore"            DOUBLE PRECISION,
    "verificationSubmittedAt"       TIMESTAMP(3),
    "verifiedById"                  TEXT,
    "verifiedAt"                    TIMESTAMP(3),
    "verificationRejection"         TEXT,
    "promotedAt"                    TIMESTAMP(3),
    "promotedParcelId"              TEXT,
    "conflictsWithOthers"           BOOLEAN NOT NULL DEFAULT false,
    "conflictedFields"              JSONB,
    "createdAt"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VaultEntry_pkey" PRIMARY KEY ("id")
);

-- VaultShare, VaultActivity, VaultPriceHistory — DDL similar shape
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
  ON "VaultEntry"("ownerId", "emirate", "district", "plotNumber");
CREATE INDEX "VaultEntry_ownerId_idx"          ON "VaultEntry"("ownerId");
CREATE INDEX "VaultEntry_stage_idx"            ON "VaultEntry"("stage");
CREATE INDEX "VaultEntry_publicParcelId_idx"   ON "VaultEntry"("publicParcelId");
CREATE INDEX "VaultEntry_nextFollowUpAt_idx"   ON "VaultEntry"("nextFollowUpAt");
CREATE INDEX "VaultEntry_plot_lookup_idx"      ON "VaultEntry"("emirate", "district", "plotNumber");
CREATE INDEX "VaultEntry_verificationStatus_idx" ON "VaultEntry"("verificationStatus");

CREATE UNIQUE INDEX "VaultShare_vaultEntryId_recipientUserId_key"
  ON "VaultShare"("vaultEntryId", "recipientUserId");
CREATE INDEX "VaultShare_recipientUserId_revokedAt_idx"
  ON "VaultShare"("recipientUserId", "revokedAt");
CREATE INDEX "VaultShare_ownerId_idx" ON "VaultShare"("ownerId");

CREATE INDEX "VaultActivity_vaultEntryId_createdAt_idx"
  ON "VaultActivity"("vaultEntryId", "createdAt");

CREATE INDEX "VaultPriceHistory_vaultEntryId_createdAt_idx"
  ON "VaultPriceHistory"("vaultEntryId", "createdAt");

-- Foreign keys (omitted for brevity — same pattern as original spec)
-- All FK cascades: VaultShare/Activity/PriceHistory on VaultEntry CASCADE;
-- VaultEntry.ownerId / addedByUserId on User RESTRICT/SET NULL appropriately.
```

**Notes:**
- `prisma migrate deploy` only in production
- No backfill, no data movement
- Estimated execution time on production Supabase: <3 seconds
- Reversible (DROP order: tables → enums)

---

## 3. Route signatures

### 3.1 Core vault routes (preserved from original — see original implementation-plan.md §3.1–3.3 for full Zod schemas)

13 routes from original spec unchanged. The `VaultEntryCreate` Zod schema gets new optional fields:

```ts
const VaultEntryCreate = z.object({
  // existing identity + broker fields …
  emirate, district, plotNumber, askingPriceFils, landUse, source, stage,
  ownerContact, brokerNotes, nextFollowUpAt, area, latitude, longitude, geometry,

  // NEW — Affection-plan ingress
  affectionPlanSource: z.enum(["dda", "uploaded"]).optional(),
  affectionPlanData: z.object({
    plotAreaSqm: z.number().optional(),
    maxGfaSqm: z.number().optional(),
    maxFloors: z.number().int().optional(),
    maxHeightMeters: z.number().optional(),
    far: z.number().optional(),
    setbacks: z.array(z.object({ side: z.string(), building: z.number().optional(), podium: z.number().optional() })).optional(),
    landUseMix: z.array(z.object({ category: z.string(), areaSqm: z.number() })).optional(),
    buildingLimitGeometry: z.unknown().optional(),
  }).optional(),
  affectionPlanDocPath: z.string().max(1024).optional(),
  affectionPlanParseConfidence: z.number().min(0).max(1).optional(),

  // NEW — attribution (server fills if not provided)
  importedFromShareId: z.string().cuid().optional(),
});
```

### 3.2 NEW — Affection-plan ingress routes

```ts
// src/app/api/me/vault/plot-lookup/route.ts
// POST { emirate, district, plotNumber }
// → 200 { source: "dda" | "not_found", existing: VaultEntrySummary | null }
//   - "dda" means we have DDA scrape data for this plot; client gets
//     the geometry + affectionPlanData precomputed
//   - "existing" is set when the CALLER already has a vault entry for
//     this plot (lets the wizard short-circuit to edit-mode)
//   - 401 unauthorized

const PlotLookupSchema = z.object({
  emirate: z.enum(["DUBAI","ABU_DHABI","SHARJAH","AJMAN","UAQ","RAK","FUJAIRAH"]),
  district: z.string().trim().min(1).max(120),
  plotNumber: z.string().trim().regex(/^\d{5,10}$/),
});
```

```ts
// src/app/api/me/vault/parse-affection-plan/route.ts
// POST { pdfPath: string }
// → 200 { parsed: AffectionPlanShape, confidence: number, warnings: string[] }
// → 400 { error: "wrong_document_type" | "parse_failed" | "unreadable_pdf",
//          reason?: string }
// → 401 unauthorized
// → 429 rate_limit_exceeded (10/user/hour)
//
// Internals:
//   1. Verify caller owns pdfPath (must start with userId/)
//   2. Sign read URL (5 min TTL) via vault-affection-plans bucket helper
//   3. Call Claude vision API with AFFECTION_PLAN_SYSTEM prompt
//   4. Validate parsed output (required fields, geometry sanity, UAE bounds)
//   5. Return parsed + confidence (LLM self-rated)

const ParseAffectionPlanSchema = z.object({
  pdfPath: z.string().min(1).max(1024).regex(/^[a-zA-Z0-9._\-\/]+$/),
});

// AffectionPlanShape — matches the JSON we then store on VaultEntry.affectionPlanData
type AffectionPlanShape = {
  plotAreaSqm: number;
  maxGfaSqm?: number;
  maxFloors?: number;
  maxHeightMeters?: number;
  far?: number;
  setbacks?: Array<{ side: string; building?: number; podium?: number }>;
  landUseMix?: Array<{ category: string; areaSqm: number }>;
  buildingLimitGeometry?: GeoJSON.Polygon;
};
```

### 3.3 NEW — Verification gate routes

```ts
// src/app/api/me/vault/entries/[id]/verification/route.ts
//
// POST { flow: "broker" | "owner", docs: UploadedDoc[] }
// → 201 { status: "PENDING", submittedAt: ISO }
// → 400 already_pending | invalid_flow | missing_required_doc
// → 404 entry not found / not owned by caller
// → 409 already_verified
//
// Broker flow requires kind in ["contract", "id"]; owner requires
// kind in ["title_deed", "id"].
//
// For owner flow: server immediately runs parse-title-deed on the
// uploaded deed, extracts ownerName, computes Levenshtein vs
// User.name → stores identityMatchScore on the VaultEntry.
//
// GET → 200 { status, submittedAt, docs: [{ kind, name, signedUrl }] }
//
// DELETE → 200 { status: "NONE" }
// → 409 cannot_withdraw_verified

const VerificationDoc = z.object({
  kind: z.enum(["contract", "title_deed", "id"]),
  path: z.string().regex(/^[a-zA-Z0-9._\-\/]+$/),
  name: z.string().max(256),
  size: z.number().int().nonnegative().max(10 * 1024 * 1024),
  contentType: z.string().max(128),
});

const VerificationSubmitSchema = z.object({
  flow: z.enum(["broker", "owner"]),
  docs: z.array(VerificationDoc).min(2).max(5),
});
```

```ts
// src/app/api/admin/vault-verification/queue/route.ts
// GET ?status=PENDING&cursor&limit
// → 200 { items: AdminVerificationSummary[], total }
// Admin role check.

// src/app/api/admin/vault-verification/[id]/approve/route.ts
// POST → 200 { verifiedAt }
// → 404 not found
// → 409 not in PENDING state

// src/app/api/admin/vault-verification/[id]/reject/route.ts
// POST { reason: string }
// → 200 { rejectedAt, reason }
```

### 3.4 NEW — Conflict detection routes

```ts
// src/app/api/me/vault/conflicts/route.ts
// GET ?cursor&limit
// → 200 { items: VaultEntrySummary[] }   // caller's entries currently in conflict

// src/app/api/me/vault/conflicts/[plotNumber]/route.ts
// GET ?emirate&district
// → 200 {
//     plotNumber, emirate, district,
//     entries: Array<{
//       addedByNickname: string,         // OTHER users' nicknames
//       priceFils: string | null,
//       area: number | null,
//       landUse: string | null,
//       maxFloors: number | null,
//       createdAt: string,
//     }>
//   }
// → 403 if caller has no entry for this plot (prevents fishing)
//
// Server-side enforces: NEVER include brokerNotes, ownerContact,
// nextFollowUpAt of other users' entries. Only public-facing
// facts + addedBy nickname.
```

### 3.5 Modified existing routes

- `/api/parcels/submit` — same `target` field addition as original spec
- `/api/me/vault/entries` PATCH — emits `VaultPriceHistory` row on `askingPriceFils` change, triggers conflict recompute
- `/api/me/vault/entries/[id]/promote` — gated on `verificationStatus === "VERIFIED"` (returns 403 with `error: "verification_required"` otherwise)

---

## 4. Component-level map

New files under `src/app/`:

```
src/app/vault/
  page.tsx                          — /vault list page
  VaultListView.tsx                 — table + filter UI
  VaultListItem.tsx                 — single row (with inline price edit)
  PriceEditCell.tsx                 — NEW (inline edit + history dropdown)
  AttributionBadge.tsx              — NEW (rendering for §16.1)
  ConflictsTab.tsx                  — NEW (Conflicts tab pane)
  EmptyState.tsx                    — first-visit prompt

src/app/parcels/map/
  AddPlotWizard/                    — NEW: 5-step wizard (replaces simple AddPlotModal additions)
    Step1PlotNumber.tsx             — plot lookup + DDA branch / Affection Plan branch
    Step1AffectionPlanUploader.tsx  — PDF upload + parse review form
    Step2Target.tsx                 — Public / Vault picker
    Step3Details.tsx                — broker data
    Step4Verification.tsx           — Title Deed / Contract upload
    Step5Confirm.tsx                — preview + submit
  VaultSidePanelAdapter.tsx         — wraps SidePanel for VaultEntry data
  ShareModal.tsx                    — share dialog
  PromoteToPublicModal.tsx          — verification-gated promote confirmation
  ConflictBanner.tsx                — NEW (§6.6 banner)
  ConflictDetailModal.tsx           — NEW (§6.6 modal)
  VerificationModal.tsx             — NEW (§14 doc upload + status)

src/app/admin/queue/
  VaultVerificationTab.tsx          — NEW (admin tab for verifications)
```

New library files under `src/lib/`:

```
src/lib/vault-activity.ts           — closed enum of `kind` values + payload caps
src/lib/vault-share.ts              — share create / revoke / recipient lookup
src/lib/vault-permission.ts         — getVaultEntryAccess(userId, entryId)
                                       returns "owner" | "share" | "none"
src/lib/vault-serialize.ts          — BigInt → string + PII redaction
src/lib/vault-conflict.ts           — NEW: recomputeConflictsForPlot + tolerances
src/lib/vault-affection-plan.ts     — NEW: Claude-vision parse wrapper
                                            + validation (UAE bounds, geometry)
src/lib/vault-verification.ts       — NEW: doc storage helpers + name-match
                                            (Levenshtein normalised)
src/lib/vault-price-history.ts      — NEW: write price-history row + activity event
```

Existing helpers reused unchanged: `getApprovedUserId`, `prisma`, `supabase`, `serialize`, `parse-title-deed` (called inline from vault-verification for owner flow).

---

## 5. Day-by-day breakdown

**21 working days** at 8h, one engineer focused. Buffer is the spread between 17 and 21 — slips up to 4 days absorbed without re-planning.

### Days 1–2 — Schema, migration, lib foundations

**Day 1.** Add the 3 enums + 4 models + 6 back-relations to `prisma/schema.prisma`. Run `prisma migrate dev --name vault_mvp_plus` against dev DB. Verify in Prisma Studio. Smoke seed test rows. **Deliverable:** schema merged on `feat/vault-mvp` branch.

**Day 2.** Build the 4 NEW lib modules: `vault-activity.ts` (closed kind enum), `vault-conflict.ts` (recompute logic + tolerances), `vault-affection-plan.ts` (Claude prompt + validation skeleton), `vault-verification.ts` (storage helpers + Levenshtein). Plus `vault-share.ts`, `vault-permission.ts`, `vault-serialize.ts`, `vault-price-history.ts` (from original plan).

### Day 3 — Core entries CRUD

`/api/me/vault/entries` GET + POST + `/api/me/vault/entries/[id]` GET + PATCH + DELETE. PATCH triggers `recomputeConflictsForPlot` if any conflict-relevant field changed, writes `VaultPriceHistory` on price change. Zod schemas inline.

### Day 4 — Map + sharing API

`/api/me/vault/map`, share routes (`/shares` POST/GET, `/shares/[id]/revoke` POST). `/api/vault/shared-with-me` + map.

### Day 5 — Polymorphic GET + conflict routes

`/api/vault/entries/[id]` polymorphic (owner full / share-recipient redacted). `/api/me/vault/conflicts` + `/conflicts/[plotNumber]` (server-enforced PII redaction).

### Day 6 — Affection-plan API

`/api/me/vault/plot-lookup` (DDA check). `/api/me/vault/parse-affection-plan` (Claude vision call, validation, confidence scoring). Build the Supabase `vault-affection-plans` bucket setup + signed-URL helper. Test with 3 real Affection Plan PDFs (founder to provide).

### Day 7 — Verification API + admin queue

`/api/me/vault/entries/[id]/verification` (POST/GET/DELETE). `/api/admin/vault-verification/{queue,approve,reject}`. Owner-flow integration with existing `parse-title-deed` to extract name + compute match score. Supabase `vault-verification-docs` bucket setup.

### Day 8 — Promote endpoint with verification gate

`/api/me/vault/entries/[id]/promote` — gates on `verificationStatus === VERIFIED`. Extracts parcel-create logic from `/api/parcels/submit` into `src/lib/parcel-create.ts` (clean library boundary).

**End of Day 8: backend feature-complete.** UI begins Day 9.

### Day 9 — Upload wizard Step 1 (plot lookup + Affection Plan branch)

`Step1PlotNumber.tsx` — plot input + emirate/district picker. `Step1AffectionPlanUploader.tsx` — PDF upload + parse + editable review form. "What is an Affection Plan?" help modal with sample image.

### Day 10 — Upload wizard Steps 2–5

`Step2Target.tsx`, `Step3Details.tsx` (broker data), `Step4Verification.tsx` (doc upload UI), `Step5Confirm.tsx` (preview + submit).

### Day 11 — Vault map layer (owned + shared)

`loadVaultMine(map)`, `loadVaultShared(map)`. Layer config with stage-coloured fills, dashed/dotted outlines, literal opacities. Tab toggles in layers panel.

### Day 12 — Conflict markers on map + ConflictBanner

`vault-conflict-markers` symbol layer (red corner-bug on conflicting polygons). `ConflictBanner.tsx` rendered in SidePanel when `conflictsWithOthers = true`. `ConflictDetailModal.tsx` with redacted comparison.

### Day 13 — /vault list page

Table view with inline price edit (`PriceEditCell.tsx`), `AttributionBadge.tsx`, verification badge, conflict indicator. Filters (stage, search, source). New "Conflicts (N)" tab pane (`ConflictsTab.tsx`).

### Day 14 — VaultSidePanelAdapter + Price History UI

SidePanel wrapper for VaultEntry. Price history expandable section. Provenance breadcrumb display.

### Day 15 — Share modal + verification modal

`ShareModal.tsx`, `VerificationModal.tsx`. Both reuse existing UI patterns (recipient lookup, doc upload).

### Day 16 — Promote modal + admin verification queue UI

`PromoteToPublicModal.tsx` with verification gate. `VaultVerificationTab.tsx` in `/admin/queue` — list PENDING entries, side-by-side name-match for owner flow, approve/reject buttons.

### Day 17 — Activity feed + notifications integration

Hook in-app notifications for `verification_*`, `share_*`, `conflict_detected`, `viewed_by_recipient`. Small activity feed at bottom of SidePanel showing last 5 events.

### Day 18 — Polish: empty states, loading, errors, a11y, mobile

Loading skeletons. Empty states (no entries, no shares, no conflicts). Error toasts (401 → /, 404 silent, 409 modal-resurface, 500 generic). A11y. Mobile responsive (list collapses to cards; SidePanel full-screen sheet).

### Day 19 — End-to-end smoke + cohort acceptance

CLAUDE.md format smoke checklist:
- [ ] `pnpm build` clean
- [ ] Upload DDA plot to vault (auto path)
- [ ] Upload non-DDA plot via Affection Plan parse
- [ ] Share with cohort user — view-only respected
- [ ] Recipient sees plot on their map + /vault → Shared with me
- [ ] PII (brokerNotes, ownerContact, follow-up) redacted from recipient view
- [ ] Conflict banner appears when 2nd user uploads same plot with different price
- [ ] Conflict detail modal shows ONLY public-facing facts of others
- [ ] Inline price edit writes VaultPriceHistory row
- [ ] Price history expandable shows chronological changes
- [ ] Submit Title Deed for owner flow → name-match computes
- [ ] Admin /admin/queue shows verification PENDING with name-match score
- [ ] Admin approve → user notified, can promote
- [ ] Promote-to-Public creates Parcel (PENDING_REVIEW) + links back
- [ ] Existing AddPlot Public flow untouched (regression)
- [ ] /api/parcels/map old shape returns 200 (regression)
- [ ] PMTiles unchanged (regression)

### Day 20 — Preview deploy + founder UAT

Deploy to Vercel preview. Founder + 1 cohort broker walk-through. Bug list compiled.

### Day 21 — UAT fixes + production push

Address P0/P1 from UAT. Production push with `prisma migrate deploy` in the deployment pipeline. Monitor first 24h. SLA target: admin verification queue triaged daily.

---

## 6. What this revised plan defers

| Item | Phase | Why |
|---|---|---|
| Kanban drag-and-drop UI | 2.2 | High value but high cost |
| Per-permission shares (FEASIBILITY, OFFER) | 2.2 | Enum declared; ships when feasibility runs on vault data |
| Email daily digest | 2.2 | Needs cron; in-app feed is MVP substitute |
| AI smart suggestions, prospect scoring, market alerts | 2.3 | The moat |
| Team accounts (multi-user brokerage vault) | 2.3 | Needs Organization model |
| CSV bulk import | 2.3 (or earlier if needed) | Quality-of-life |
| Link-based sharing (token URLs) | 2.3 | Decision D3 — account-only MVP |
| Encrypted-at-rest `ownerContact` | 2.2 | PDPL polish |
| **Full conflict resolution (DISPUTED state + admin review)** | **2.2** | MVP ships lite version (banner only) |
| **Market intelligence dashboard** (aggregate conflict stats) | **2.2/2.3** | Strong v2 differentiator |
| **Manual Affection Plan entry fallback** | **2.2** | If parse fails outright |
| **Admin re-review queue for low-confidence parses** | **2.2** | When confidence < 0.6 |
| **Multi-hop provenance chains** | **2.2** | When re-sharing imported entries is supported |
| **Price sparkline / market comparison** | **2.2** | Polish |

---

## 7. Constraints — verified

| Constraint | This plan |
|---|---|
| Master Tree v3.0 frozen | Adds A.10; doesn't modify other 9 A modules or any other block |
| ZAAHI Signature 3D | Untouched; new sources/layers only |
| `fill-extrusion-opacity` literals | Two extrusion layers (0.85 mine, 0.55 shared) + 1 symbol layer (conflict markers, no extrusion) |
| Auth flow / `src/app/page.tsx` | Untouched |
| `/api/layers/*` | Untouched |
| `page.tsx` map page edits | Additive only |
| `schema.prisma` | 3 enums + 4 models + back-relations; existing fields untouched |
| `prisma migrate deploy` in prod | Migration scripted, not applied here |
| Cohort role gating | OWNER / BROKER / DEVELOPER; verification flows role-tagged |
| Parcel.ownerId / verifiedOwnerUserId invariant | Untouched |

---

## 8. Risks specific to this revised plan

- **R-PARSE1 — Affection Plan PDF formats vary.** Older Affection Plans may have different layouts (handwritten coords). **Mitigation:** test pack of 5–10 real PDFs from founder during Day 6. If accuracy < 80% on the pack, escalate scope decision (manual fallback in MVP or push to Phase 2.2).
- **R-PARSE2 — Claude vision API cost.** ~$0.02–0.05 per parse. At 100 parses/day = $2–5/day. Acceptable for MVP cohort scale. **Tracking:** add `affection_plan_parse_cost_cents` to billing dashboard (Phase 2.2).
- **R-VERIFY1 — Title Deed name-match accuracy.** Arabic names in transliteration can score < 0.85 for legitimate matches. **Mitigation:** auto-pass threshold tunable (Decision D8). Admin override always available. Phase 2.2 may add Arabic name normalisation library.
- **R-CONFLICT1 — Conflict detection write amplification.** Recompute fires on every entry create/update. If 10 users upload the same plot, each update triggers an O(10) scan + 10 row updates. **Mitigation:** compound index makes the read fast; updates are short transactions; acceptable up to ~100 entries per plot. Beyond that, batch the recompute (Phase 2.2).
- **R-WIZARD1 — Multi-step wizard abandon rate.** 5 steps is a lot. **Mitigation:** persistent draft state (localStorage on the client) — user can resume mid-wizard. MVP adds basic localStorage; Phase 2.2 adds server-side draft entries.
- **R-ADMIN1 — Admin queue overload.** If 50 brokers all submit verification in week 1, the Жан + Dymo queue blows up. **Mitigation:** admin queue is FIFO with SLA badges; auto-pass threshold (D8) reduces owner-flow manual review. Phase 2.2 may add deputy admins.

Plus the same Day-5 import-cycle risk from the original plan — extract parcel-create logic into `lib/parcel-create.ts` on Day 8 here (~2h refactor).

---

## 9. Day-1 readiness checklist

- [ ] Founder picks on D1–D9 signed off
- [ ] `feat/vault-mvp` branch off `main`
- [ ] CI runs Prisma generate + tsc + Next.js build
- [ ] Supabase dev DB accessible for `prisma migrate dev`
- [ ] 1 OWNER + 1 BROKER + 1 DEVELOPER cohort test accounts
- [ ] 3–5 sample Affection Plan PDFs (founder collects from real plots)
- [ ] Claude vision API quota OK for testing (~50 parse calls)
- [ ] Supabase Storage buckets `vault-affection-plans` + `vault-verification-docs` created with private ACL

---

## 10. After MVP+ lands

Phase 2.2 covers: kanban + pipeline depth + per-permission shares + email digest + encryption + full conflict resolution (DISPUTED state, admin review, market dashboard) + manual Affection Plan entry. Estimate: **10–14 days.** Gated on 2–4 weeks MVP cohort feedback.

Phase 2.3 covers AI/intelligence + team accounts + paid tier launch. **3–4 weeks.** Founder decision on AI provider + budget.

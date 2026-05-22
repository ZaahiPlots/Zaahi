# Private Plot Vault — Day 12 Diagnostic (Days 1–12 audit)

**Date:** 2026-05-14
**Branch:** `feat/vault-mvp` @ `9ee4f7f`
**Audit type:** READ-ONLY, no code changes
**Audience:** founder + butler review **before** Day 13 (UAT) and Day 14 (production migration)

The vault spec docs (`spec.md`, `decisions.md`, `implementation-plan.md`) live
on the sibling branch `research/private-plot-vault-spec` and have not been
merged into `feat/vault-mvp`. Section references below cite the spec by §number;
read alongside that branch.

---

## Table of contents

1. [Executive summary](#executive-summary)
2. [§1 Schema inventory](#1-schema-inventory)
3. [§2 API endpoints inventory](#2-api-endpoints-inventory)
4. [§3 Lib modules inventory](#3-lib-modules-inventory)
5. [§4 Frontend inventory](#4-frontend-inventory)
6. [§5 Notification kinds](#5-notification-kinds)
7. [§6 Security surface](#6-security-surface)
8. [§7 Known gaps + risk matrix](#7-known-gaps--risk-matrix)

---

## Executive summary

**What's in:** 14 commits (Days 1-12). DB schema (4 models + 2 enums + 11 indexes + 8 FKs)
migration file generated but **not applied to any DB yet**. 9 lib modules.
13 vault API routes. 9 `/vault` files. 7 vault map components. Map gets
2 new fill-extrusion layers + 1 conflict-marker symbol layer (all default OFF).
Notifications wired for SHARE_RECEIVED, SHARE_REVOKED, CONFLICT_DETECTED.
Activity feed wired for 12 kinds, dual-sink (entry-centric + user-centric).

**Code health:** `pnpm build` clean (exit 0). `tsc --noEmit` clean (exit 0).
Zero `console.log` / `TODO` / `FIXME` / `HACK` markers across new code. All
production code on `main` HEAD `5864859` is **untouched** — every change
lives only on `feat/vault-mvp`.

**Three things the founder must see before Day 13:**

1. **`AddPlotWizard` is not wired anywhere.** All 5 files exist (~33 KB),
   but no parent component imports `<AddPlotWizard>` and `<EmptyState
   kind="no-entries">` is rendered without an `onAddClick` prop, so its
   "Add a plot" CTA stays hidden. **There is currently NO UI path to
   create a vault entry — only a direct API POST works.** UAT scenario
   S1 cannot run as written. Either ship a temporary "Add Vault Entry"
   button or run Pass-B (AddPlotModal Step 0 toggle) before UAT.

2. **Recipient HTTP response leaks third-party `conflictedFields`.**
   `serializeVaultEntryForRecipient` passes `conflictedFields` through
   unredacted (`src/lib/vault-serialize.ts:137`). If A shares an entry
   with B and that entry conflicts with C and D, B's HTTP payload
   contains `{ userId: C, value: ... }` and `{ userId: D, value: ... }`.
   C and D never agreed to be visible to B. The client-side
   `RecipientView` TS type doesn't declare the field, so the rendered
   UI ignores it — but it's on the wire and observable in DevTools.
   Borderline P1: spec §15 is silent on whether conflict surface
   crosses share boundaries.

3. **Two declared-but-never-fired notification kinds.**
   `VAULT_SHARE_VIEWED` and `VAULT_PROMOTED_TO_PUBLIC` are members of
   the `VaultNotificationKind` union (`vault-notifications.ts:14,17`)
   but no `notifyUser()` call references them anywhere in the codebase.
   Either wire them up (sharer-gets-pinged-on-view, recipient-gets-
   pinged-on-promote) or remove the dead union members so spec and
   code agree.

**Recommended next action:** **Fix gap (1) first** — either wire
`AddPlotWizard` into a minimal "+ Add" button on `/vault` (lowest-risk
path) or proceed to Pass-B refactor. Decide (2) and (3) with founder
in the same conversation. Once those three are settled, Day 13 UAT
becomes runnable; pre-flight (option A/B/C from the UAT script) still
needs founder choice.

---

## §1 Schema inventory

### 1.1 New enums (2 expected, 2 found ✓)

| Enum | Values | Defined |
|---|---|---|
| `VaultStage` | `LEAD`, `CONTACTED`, `NEGOTIATING`, `AGREEMENT_SIGNED`, `PROMOTED`, `LOST`, `CLOSED` | `prisma/schema.prisma:724` |
| `VaultSharePermission` | `VIEW`, `FEASIBILITY`, `OFFER` | `prisma/schema.prisma:734` |

Spec §15 expected both. `FEASIBILITY` / `OFFER` declared early so Phase 2.2
can ship gate behaviour without an enum migration; API gate currently
accepts only `VIEW`.

### 1.2 New tables (4 expected, 4 found ✓)

| Table | Lines | Purpose |
|---|---|---|
| `VaultEntry` | `prisma/schema.prisma:756–822` | Broker/dev/owner pipeline row per plot |
| `VaultShare` | `prisma/schema.prisma:827–846` | Per-recipient access grant on a `VaultEntry` |
| `VaultActivity` | `prisma/schema.prisma:856–867` | Append-only entry-centric audit log |
| `VaultPriceHistory` | `prisma/schema.prisma:872–883` | Append-only price-change timeline |

### 1.3 Indexes (11 expected — 7 single/compound + 2 uniques = 9 non-unique + 2 unique = 11 ✓)

From `prisma/migrations/20260513230047_vault_mvp/migration.sql`:

| # | Index | Type | Source |
|---|---|---|---|
| 1 | `VaultEntry_ownerId_idx` | btree | `migration.sql:81` |
| 2 | `VaultEntry_stage_idx` | btree | `migration.sql:84` |
| 3 | `VaultEntry_publicParcelId_idx` | btree | `migration.sql:87` |
| 4 | `VaultEntry_nextFollowUpAt_idx` | btree | `migration.sql:90` |
| 5 | `VaultEntry_emirate_district_plotNumber_idx` | btree (compound) | `migration.sql:93` |
| 6 | `VaultEntry_ownerId_emirate_district_plotNumber_key` | **UNIQUE** | `migration.sql:96` |
| 7 | `VaultShare_recipientUserId_revokedAt_idx` | btree (compound) | `migration.sql:99` |
| 8 | `VaultShare_ownerId_idx` | btree | `migration.sql:102` |
| 9 | `VaultShare_vaultEntryId_recipientUserId_key` | **UNIQUE** | `migration.sql:105` |
| 10 | `VaultActivity_vaultEntryId_createdAt_idx` | btree (compound) | `migration.sql:108` |
| 11 | `VaultPriceHistory_vaultEntryId_createdAt_idx` | btree (compound) | `migration.sql:111` |

Compound `(emirate, district, plotNumber)` on `VaultEntry` powers
conflict-recompute (`vault-conflict.ts`). Compound `(recipientUserId,
revokedAt)` on `VaultShare` powers the "shared with me" list query.

### 1.4 Foreign keys (8 expected, 8 found ✓)

| # | FK | ON DELETE | Source |
|---|---|---|---|
| 1 | `VaultEntry.ownerId → User.id` | `RESTRICT` | `migration.sql:114` |
| 2 | `VaultEntry.addedByUserId → User.id` | `SET NULL` | `migration.sql:117` |
| 3 | `VaultEntry.publicParcelId → Parcel.id` | `SET NULL` | `migration.sql:120` |
| 4 | `VaultShare.vaultEntryId → VaultEntry.id` | `CASCADE` | `migration.sql:123` |
| 5 | `VaultShare.recipientUserId → User.id` | `RESTRICT` | `migration.sql:126` |
| 6 | `VaultActivity.vaultEntryId → VaultEntry.id` | `CASCADE` | `migration.sql:129` |
| 7 | `VaultActivity.actorUserId → User.id` | `SET NULL` | `migration.sql:132` |
| 8 | `VaultPriceHistory.vaultEntryId → VaultEntry.id` | `CASCADE` | `migration.sql:135` |

`onDelete: RESTRICT` on owner / recipient prevents user-row deletes that
would orphan a vault entry. `CASCADE` on `vaultEntryId` means deleting
an entry sweeps its activity / shares / price history (intended).
`SET NULL` on `addedByUserId` / `actorUserId` preserves rows when the
attributing user disappears (e.g. account closure).

### 1.5 Migration file

- Path: `prisma/migrations/20260513230047_vault_mvp/migration.sql`
- Lines: **136**
- Generated via `prisma migrate diff --from-schema ... --to-schema ... --script` (B1 path — no DB writes)
- **NOT yet applied to any database.** Day 14 runs `prisma migrate deploy` on prod DB.

### 1.6 Schema-vs-spec gaps

Spec §15 (Data Model) ↔ schema reality:

| Spec field | Status |
|---|---|
| `VaultEntry.conflictsWithOthers` (boolean) | ✓ implemented |
| `VaultEntry.conflictedFields` (Json) | ✓ implemented, shape `[{field, values: [{userId, value}]}]` |
| `VaultEntry.provenanceChain` (Json) | ✓ implemented, append-only |
| `VaultEntry.ownerContact.notes` redaction surface | ✓ enforced server-side (vault-serialize.ts) |
| `VaultShare.lastViewedAt` | ✓ implemented, updated on every recipient GET |
| `VaultShare.expiresAt` (optional) | ✓ implemented, NULL = never |

No drift between spec §15 and schema. Spec also mentions Phase 2.2
features (encrypted-at-rest `ownerContact`, DISPUTED status, etc.) —
those are correctly **not** in MVP schema.

---

## §2 API endpoints inventory

All routes use `runtime = "nodejs"` and call `getApprovedUserId(req)` —
the production-standard approved-cohort gate from `src/lib/auth.ts`.
401 on unauth, 400 on validation, 404 on access denial (with one
documented exception, see route 8 below).

### 2.1 Routes under `/api/me/vault/*` (caller-as-owner scope)

| # | Path | Methods | Auth | Validation | Spec § |
|---|---|---|---|---|---|
| 1 | `/api/me/vault/entries` | `GET`, `POST` | `getApprovedUserId` | Zod | §5.1, §6.1 |
| 2 | `/api/me/vault/entries/[id]` | `GET`, `PATCH`, `DELETE` | `getApprovedUserId` + owner gate | Zod | §5.1 |
| 3 | `/api/me/vault/entries/[id]/promote` | `POST` | `getApprovedUserId` + owner gate | Zod | §5.3, §6.5 |
| 4 | `/api/me/vault/entries/[id]/shares` | `POST`, `GET` | `getApprovedUserId` + owner gate | Zod | §5.1, §6.4 |
| 5 | `/api/me/vault/map` | `GET` | `getApprovedUserId` | n/a | §5.1, §7 |
| 6 | `/api/me/vault/plot-lookup` | `POST` | `getApprovedUserId` | Zod | §5.2, §6.1 |
| 7 | `/api/me/vault/conflicts` | `GET` | `getApprovedUserId` | n/a | §5.2, §6.7 |
| 8 | `/api/me/vault/conflicts/[plotNumber]` | `GET` | `getApprovedUserId` + anti-fishing gate | Zod | §5.2, §6.7 |
| 9 | `/api/me/vault/shares/[id]/revoke` | `POST` | `getApprovedUserId` + owner gate | Zod | §5.1 |

### 2.2 Routes under `/api/vault/*` (caller-as-recipient or polymorphic)

| # | Path | Methods | Auth | Validation | Spec § |
|---|---|---|---|---|---|
| 10 | `/api/vault/entries/[id]` | `GET` polymorphic | `getApprovedUserId` + access gate (owner / share / none) | n/a | §5.1 |
| 11 | `/api/vault/shared-with-me` | `GET` | `getApprovedUserId` | n/a | §5.1 |
| 12 | `/api/vault/shared-with-me/map` | `GET` | `getApprovedUserId` | n/a | §5.1, §7 |
| 13 | `/api/vault/shared-with-me/[id]/import` | `POST` | `getApprovedUserId` (caller must be share.recipientUserId — enforced inside `importSharedEntry`) | n/a | §5.1, §6.6 |

### 2.3 404-not-403 pattern check

Pattern: "return 404 on access denial, not 403, to avoid leaking
existence to non-participants" (Deal Room precedent).

| Route | Access-denied response | Pattern compliance |
|---|---|---|
| `/api/me/vault/entries/[id]` GET/PATCH/DELETE | `404 not_found` | ✓ `src/app/api/me/vault/entries/[id]/route.ts:107,170,349` |
| `/api/me/vault/entries/[id]/shares` POST/GET | `404 not_found` | ✓ `route.ts:50,96` |
| `/api/me/vault/entries/[id]/promote` POST | `404 not_found` | ✓ `route.ts:122` |
| `/api/me/vault/shares/[id]/revoke` POST | `404 not_found` | ✓ `route.ts:44` |
| `/api/vault/entries/[id]` GET (recipient path) | `404 not_found` | ✓ `route.ts:103` |
| `/api/vault/shared-with-me/[id]/import` POST | `404 share_not_found` / `404 not_share_recipient` | ✓ `route.ts:32,38` |
| **`/api/me/vault/conflicts/[plotNumber]`** GET | **`403 forbidden`** when caller has no entry on plot | ⚠ **breaks pattern** — see below |

The `/api/me/vault/conflicts/[plotNumber]` route uses 403, not 404,
when the caller has no `VaultEntry` for the plot tuple
(`route.ts:73`). The route comment documents this as "anti-fishing —
without this check, anyone could enumerate other brokers' entries by
guessing plot numbers." A 404 would be equally safe and more
consistent. Suggest changing to 404 before UAT — or document the
exception explicitly in spec §6.7.

### 2.4 POST `/api/me/vault/entries/[id]/promote` response shape

```ts
// success
{ vaultEntryId, parcelId, parcelStatus, claimStatus }
// already-promoted
409 { error: "already_promoted", parcelId }
// validation
400 { error: "validation_failed", issues: [...] }
// not owner / not found
404 { error: "not_found" }
```

Bridges to `createParcelFromSubmission` in `src/lib/parcel-create.ts`
(Pass-A extracted lib). `prefilled` block in promote payload skips
DDA enrichment fetch.

### 2.5 GET `/api/vault/entries/[id]` polymorphic response

- **Owner path** (`entry.ownerId === userId`): returns `VaultEntryFull`
  with `access: "owner"`, plus `addedBy`, `shares[]`, `priceHistory[]`.
  Does **not** include `activity[]` — that's only on the `/me/...`
  variant. Consider unifying.
- **Recipient path** (active `VaultShare` row): returns
  `VaultEntryRecipientView` via `serializeVaultEntryForRecipient`,
  with `access: "share"`, `sharedBy`, `permission`, `shareId`. Bumps
  `VaultShare.lastViewedAt` and fires `VIEWED_BY_RECIPIENT` activity
  (debounced 1h per recipient).
- **No access path**: `404 not_found`.

---

## §3 Lib modules inventory

All modules under `src/lib/`. Total **9 new lib files** + extensions
to one existing file (`activity.ts`).

| File | Lines | Exports | Integration points |
|---|---|---|---|
| `vault-activity.ts` | 142 | `VaultActivityKind`, `writeActivity`, `recordVaultEvent` | All vault mutation routes; conflict recompute |
| `vault-permission.ts` | 107 | `VaultAccess`, `getVaultEntryAccess`, `getVaultEntryWithAccess` | Used by polymorphic GET (alternative path — handlers also do inline ownership checks) |
| `vault-serialize.ts` | 161 | `VaultEntryFull`, `VaultEntryRecipientView`, `serializeVaultEntryFull`, `serializeVaultEntryForRecipient` | Polymorphic GET; owner GET; PATCH response |
| `vault-conflict.ts` | 222 | `recomputeConflictsForPlot` | POST entries, PATCH entries, DELETE entries, recordPriceChange, importSharedEntry |
| `vault-share.ts` | 248 | `RecipientLookup`, `createShare`, `resolveRecipient`, `revokeShare` | POST shares, POST revoke |
| `vault-price-history.ts` | 182 | `recordPriceChange`, `getPriceHistory` | PATCH (price), polymorphic GET, owner GET |
| `vault-import.ts` | 197 | `importSharedEntry` | POST shared-with-me import |
| `vault-notifications.ts` | 59 | `VaultNotificationKind`, `notifyUser` | createShare, revokeShare, recomputeConflictsForPlot |
| `parcel-create.ts` | 304 | `createParcelFromSubmission`, `ensureUserSyncedFromBearer` | Promote route (Pass-A); `/api/parcels/submit` still has inline logic (Pass-B not done) |

**Extension to existing file:** `src/lib/activity.ts:45-52` — added
8 new `ActivityKind` union values (`VAULT_ENTRY_CREATED`,
`VAULT_STAGE_CHANGED`, `VAULT_PRICE_CHANGED`, `VAULT_SHARED`,
`VAULT_SHARE_REVOKED`, `VAULT_IMPORTED_FROM_SHARE`,
`VAULT_PROMOTED_TO_PUBLIC`, `VAULT_CONFLICT_DETECTED`).

### 3.1 Dual-sink activity pattern

`recordVaultEvent` (vault-activity.ts:107) writes to **two** sinks:

1. **`VaultActivity`** — entry-centric, drives the side-panel feed
2. **`ActivityLog`** — user-centric, drives dashboard "Recent Activity"

The map at `vault-activity.ts:47` decides which `VaultActivityKind`
gets mirrored to `ActivityLog`. `NOTE_ADDED`, `FOLLOW_UP_LOGGED`,
`VIEWED_BY_RECIPIENT`, `CONFLICT_RESOLVED` are intentionally
**entry-only** (too noisy for the user dashboard).

### 3.2 Pass-A / Pass-B boundary (parcel-create.ts)

`createParcelFromSubmission` is the extracted-from-submit lib used
by the vault promote route. **The existing `/api/parcels/submit`
route still has its own inline copy of this logic** (Pass-A). Pass-B
will rewire submit to call this lib so there's one source of truth.
Pass-B is gated on founder approval (touches the existing production
listing flow).

---

## §4 Frontend inventory

### 4.1 `/vault` route (9 files)

| File | Lines | Purpose |
|---|---|---|
| `src/app/vault/page.tsx` | 65 | Route entry; wraps `<AuthGuard>` |
| `src/app/vault/VaultListView.tsx` | 388 | Container — tabs, filters, pagination, two list panes |
| `src/app/vault/VaultListItem.tsx` | 194 | Single row — owned and shared variants |
| `src/app/vault/PriceEditCell.tsx` | 169 | Inline-edit asking price (Enter/Esc/blur semantics) |
| `src/app/vault/PriceHistoryDropdown.tsx` | 126 | Expandable price-history table |
| `src/app/vault/AttributionBadge.tsx` | 43 | "Added by you" / "From @nickname" pill |
| `src/app/vault/ConflictsTab.tsx` | 83 | Filtered list for `conflictsWithOthers=true` |
| `src/app/vault/EmptyState.tsx` | 91 | First-visit + filtered-empty states |
| `src/app/vault/types.ts` | 66 | Shared TS types (`VaultStage`, `VaultEntrySummary`, etc.) |

### 4.2 Map components (7 files in `src/app/parcels/map/`)

| File | Lines | Purpose |
|---|---|---|
| `VaultSidePanelAdapter.tsx` | 549 | Owner / recipient side panel — polymorphic; renders inner modals |
| `ConflictBanner.tsx` | 66 | Side-panel info banner when `conflictsWithOthers=true` |
| `ConflictDetailModal.tsx` | 256 | Cross-user comparison table — server-redacted |
| `ShareModal.tsx` | 349 | Recipient picker + permission + expiry |
| `PromoteToPublicModal.tsx` | 387 | Broker/owner flow → calls promote endpoint |
| `ImportFromShareButton.tsx` | 85 | "Add to my vault" CTA on shared entries |
| `useEscapeClose.ts` | 25 | Day-12 a11y hook |

### 4.3 `AddPlotWizard/` (5 files — UNWIRED, see §7)

| File | Lines |
|---|---|
| `AddPlotWizard/index.tsx` | 108 |
| `AddPlotWizard/types.ts` | 102 |
| `AddPlotWizard/Step1PlotLookup.tsx` | 290 |
| `AddPlotWizard/Step2Details.tsx` | 230 |
| `AddPlotWizard/Step3Confirm.tsx` | 210 |

**No parent component imports `<AddPlotWizard>`.** See §7 finding 1.

### 4.4 `src/app/parcels/map/page.tsx` — vault-only diff vs `main`

372 added/removed lines in `page.tsx`. Vault-only changes:

**Constants (lines 197-211, +16):**
```ts
const VAULT_MINE_SRC = "vault-mine-buildings";
const VAULT_MINE_3D = "vault-mine-buildings-3d";
const VAULT_SHARED_SRC = "vault-shared-buildings";
const VAULT_SHARED_3D = "vault-shared-buildings-3d";
const VAULT_CONFLICT_MARKERS_LAYER = "vault-conflict-markers";
```

**`LayersState` (line 938, +2):**
```ts
vaultMine: boolean; vaultShared: boolean;
```
Both default `false` (`page.tsx:1534-1535`) — opt-in via the
new "My Vault" category in the Layers panel.

**`LayerCategory` union (line 1269, +1):**
```ts
| "vault";  // Private Plot Vault v2.1
```
Added to `LAYER_CATEGORY_ORDER` (line 1283). Label "My Vault" in
`CATEGORY_LABELS` (line 1301).

**`LAYER_META` (lines 1327-1328, +2):** registers `vaultMine` and
`vaultShared` as `{country: "dubai", category: "vault"}`. They will
appear in the Layers panel under Dubai → My Vault. **Layer entries
do not have per-key human labels — they render with their raw state
keys (`vaultMine`, `vaultShared`).** If the existing panel renders
each layer's key directly, the UX may show those raw strings; if it
has a separate prettifier, the labels are inherited from elsewhere.
Founder should eye-test the panel during UAT.

**Side-panel state (lines 1376-1378, +3):**
```ts
const [selectedVaultEntry, setSelectedVaultEntry] = useState<
  { id: string; mode: "owner" | "share" } | null
>(null);
```

**Map loaders (lines 2734-2900, +166):** `VAULT_STAGE_COLOR` palette
(7 stage → hex map), `loadVaultMine`, `loadVaultShared`. Both:
- Fire `apiFetch` (`Bearer` token via existing helper)
- 401-tolerant (no console noise when signed-out)
- Annotate features with `color` + `height: 30` + `base: 0` so the
  fill-extrusion-color expression can read them
- Use `fill-extrusion-opacity: 0.85` (mine) / `0.55` (shared) — **literal
  numbers** per CLAUDE.md rule (MapLibre rejects data expressions on
  opacity)
- Conflict markers: separate `circle` layer (no extrusion), filtered
  on `["==", ["get", "conflictsWithOthers"], true]`

**Layer order:** `loadVaultMine` and `loadVaultShared` are invoked
**after** `loadZaahiPlots(map)` at `page.tsx:3196` — so vault layers
sit on top of `ZAAHI_BUILDINGS_3D` in the MapLibre stack. PMTiles
layers are added immediately after vault layers; depending on
MapLibre's `beforeId` behaviour they may or may not appear above
vault. Visual inspection during UAT recommended.

**Click + hover handlers (lines 3207-3219, +13):**
```ts
map.on("click", VAULT_MINE_3D, ... setSelectedVaultEntry({id, mode: "owner"}));
map.on("click", VAULT_SHARED_3D, ... setSelectedVaultEntry({id, mode: "share"}));
for (const layerId of [VAULT_MINE_3D, VAULT_SHARED_3D]) {
  map.on("mouseenter", layerId, () => map.getCanvas().style.cursor = "pointer");
  map.on("mouseleave", layerId, () => map.getCanvas().style.cursor = "");
}
```

**Basemap-swap re-attach (lines 3541-3544, +4):** when the basemap
style changes, MapLibre wipes all sources — `loadVaultMine` and
`loadVaultShared` are re-invoked (idempotent on `map.getSource`).

**Toggle visibility useEffect (lines 3585-3599, +15):** flips
visibility on the 3 vault layers when `layers.vaultMine` or
`layers.vaultShared` changes. O(1) — no re-fetch.

**Render (lines 4729-4736, +8):** conditional
`<VaultSidePanelAdapter entryId={...} mode={...} onClose={...} />`
inside the page tree. `zIndex: 22` (panel style line 431) so it
sits above the existing `SidePanel` at `zIndex: 20`. Both can be
open simultaneously — different state slots.

### 4.5 Map layer z-index ladder

| Layer | z-index | Notes |
|---|---|---|
| Existing `SidePanel` | `20` | Public parcel panel |
| `VaultSidePanelAdapter` | `22` | New vault panel |
| Inner modals (Share/Promote/Conflict) | `50` | Render on top of side panel |

No conflict with the existing UI chrome. Both side panels can
coexist if user clicks a public parcel and a vault entry.

### 4.6 Default toggle states

| Layer | Default | Source |
|---|---|---|
| `layers.vaultMine` | **OFF** | `page.tsx:1534` |
| `layers.vaultShared` | **OFF** | `page.tsx:1535` |
| `VAULT_MINE_3D` layout visibility | `"none"` | `page.tsx:2814` |
| `VAULT_SHARED_3D` layout visibility | `"none"` | `page.tsx:2891` |
| `VAULT_CONFLICT_MARKERS_LAYER` layout visibility | `"none"` | `page.tsx:2833` |

All vault overlays default OFF. ✓ Matches spec §7 (opt-in only).

---

## §5 Notification kinds

### 5.1 Activity kinds (entry-centric `VaultActivity.kind`)

Closed union in `src/lib/vault-activity.ts:32-44`:

| # | Kind | Fired at | Mirrored to `ActivityLog`? |
|---|---|---|---|
| 1 | `CREATED` | `entries/route.ts:265` (POST entries) | ✓ as `VAULT_ENTRY_CREATED` |
| 2 | `STAGE_CHANGED` | `entries/[id]/route.ts:263` (PATCH) | ✓ as `VAULT_STAGE_CHANGED` |
| 3 | `PRICE_CHANGED` | `vault-price-history.ts:113` | ✓ as `VAULT_PRICE_CHANGED` |
| 4 | `NOTE_ADDED` | `entries/[id]/route.ts:271` | ✗ entry-only |
| 5 | `FOLLOW_UP_LOGGED` | `entries/[id]/route.ts:273` | ✗ entry-only |
| 6 | `SHARED` | `vault-share.ts:138` | ✓ as `VAULT_SHARED` |
| 7 | `SHARE_REVOKED` | `vault-share.ts:227` | ✓ as `VAULT_SHARE_REVOKED` |
| 8 | `VIEWED_BY_RECIPIENT` | `vault/entries/[id]/route.ts:126` (debounced 1h) | ✗ entry-only |
| 9 | `IMPORTED_FROM_SHARE` | `vault-import.ts:175` | ✓ as `VAULT_IMPORTED_FROM_SHARE` |
| 10 | `PROMOTED_TO_PUBLIC` | `promote/route.ts:177` | ✓ as `VAULT_PROMOTED_TO_PUBLIC` |
| 11 | `CONFLICT_DETECTED` | `vault-conflict.ts:143` | ✓ as `VAULT_CONFLICT_DETECTED` |
| 12 | `CONFLICT_RESOLVED` | `vault-conflict.ts:143` (transition true→false) | ✗ entry-only |

All 12 activity kinds are fired somewhere.

### 5.2 Notification kinds (user-facing `Notification.kind`)

Closed union in `src/lib/vault-notifications.ts:12-17`:

| # | Kind | Fired at | Status |
|---|---|---|---|
| 1 | `VAULT_SHARE_RECEIVED` | `vault-share.ts:147` (createShare → recipient) | ✓ fired |
| 2 | `VAULT_SHARE_VIEWED` | **nowhere** | ✗ **declared, never fired** |
| 3 | `VAULT_SHARE_REVOKED` | `vault-share.ts:232` (revokeShare → recipient) | ✓ fired |
| 4 | `VAULT_CONFLICT_DETECTED` | `vault-conflict.ts:149` (false→true transition → entry owner) | ✓ fired |
| 5 | `VAULT_PROMOTED_TO_PUBLIC` | **nowhere** | ✗ **declared, never fired** |

**Two dormant kinds** — see §7 finding 3.

### 5.3 UAT script discrepancies vs reality

| UAT line | What I wrote | Reality |
|---|---|---|
| S1 expected `VAULT_ENTRY_CREATED` notification | I wrote "verify it's silent" — correct | ✓ confirmed silent (ActivityLog only, no Notification) |
| S10 listed `VAULT_PROMOTED` activity | Actual activity kind is `PROMOTED_TO_PUBLIC` | Wording mismatch — update UAT |
| S4 expected `VAULT_SHARE_CREATED` activity | Actual is `SHARED` (entry kind) / `VAULT_SHARED` (user kind) | Wording mismatch |
| S7 expected `VAULT_CONFLICT_DETECTED` notification | ✓ correct | matches code |
| S8 expected `VAULT_SHARE_REVOKED` notification | ✓ correct | matches code |
| (not in UAT) `VAULT_SHARE_VIEWED` | n/a | should be in §7 — sharer is currently never notified that recipient viewed |

---

## §6 Security surface — CRITICAL

### 6.1 Server-side PII redaction inventory

| Endpoint | Caller relationship | brokerNotes | ownerContact | nextFollowUpAt | conflictedFields |
|---|---|---|---|---|---|
| `/api/me/vault/entries` GET (list) | owner | n/a (not in `select`) | n/a | ✓ included | n/a |
| `/api/me/vault/entries/[id]` GET (detail) | owner | ✓ included | ✓ included (with notes) | ✓ included | ✓ included |
| `/api/me/vault/entries/[id]` PATCH | owner | writes & echoes | writes & echoes | writes & echoes | echoes |
| `/api/me/vault/entries/[id]` DELETE | owner | n/a | n/a | n/a | n/a |
| `/api/me/vault/map` GET | owner | **excluded by `select:` clause** ✓ | **excluded** ✓ | **excluded** ✓ | ✓ included (own data only) |
| `/api/me/vault/conflicts/[plotNumber]` GET | owner of at-least-one entry on plot | **excluded by `select:` clause** ✓ | **excluded** ✓ | **excluded** ✓ | n/a |
| `/api/vault/entries/[id]` GET — owner path | owner | ✓ included | ✓ included (with notes) | ✓ included | ✓ included |
| `/api/vault/entries/[id]` GET — recipient path | share recipient | **stripped by serialize** ✓ | **notes stripped** ✓ (name/phone/email/role survive) | **stripped** ✓ | **⚠ leaked** (see 6.3) |
| `/api/vault/shared-with-me` GET (list) | share recipient | **excluded by `select:` clause** ✓ | **excluded** ✓ | **excluded** ✓ | n/a (not selected) |
| `/api/vault/shared-with-me/map` GET | share recipient | **excluded by `select:` clause** ✓ | **excluded** ✓ | **excluded** ✓ | n/a (not selected) |
| `/api/vault/shared-with-me/[id]/import` POST | share recipient | n/a (write-side) | copied to new entry ✓ | NOT copied ✓ | n/a |

### 6.2 Recipient view — defense-in-depth

The recipient view (`serializeVaultEntryForRecipient`,
`src/lib/vault-serialize.ts:109-143`) is a **rebuild** of the
output object — it picks fields explicitly rather than spreading
and removing. This is the right pattern (typo-resistant). However:

- The **Prisma fetch** at `/api/vault/entries/[id]/route.ts:39-55`
  uses `findUnique` without a `select:` clause, so the full row is
  in server memory. Only the response serializer strips PII. **Not
  a leak — but a `select:` clause would add a second layer.**
  Recommend hardening to `select` even for recipient path. Not
  blocking for UAT.

### 6.3 `conflictedFields` leak to share recipient ⚠

**Location:** `src/lib/vault-serialize.ts:137`

```ts
return {
  ...
  conflictedFields: full.conflictedFields,  // ⚠
  ...
};
```

**The data:** `conflictedFields` is `Array<{ field, values: [{ userId, value }, ...] }>`.
Stored in the `VaultEntry.conflictedFields` Json column. Populated
by `vault-conflict.ts:127` when entries by ≥2 users on the same plot
tuple disagree beyond tolerance (`PRICE_TOLERANCE_REL=0.05`,
`AREA_TOLERANCE_REL=0.02`).

**The leak path:**
1. User A creates a vault entry for plot 6457940 at AED 12M.
2. User C creates one at AED 15M. Conflict detected. Both rows get
   `conflictsWithOthers=true` and `conflictedFields = [{field: "askingPriceFils", values: [{userId: A, value: 12M}, {userId: C, value: 15M}]}]`.
3. A shares the entry with B.
4. B GETs `/api/vault/entries/{A's-entry-id}`. Response payload
   contains `conflictedFields` — including `userId: C` and C's
   asking price.
5. C never agreed to expose their data to B.

**Severity assessment:**
- Not PII like phone/email — userId is internal, price is the
  conflict signal itself. But the *combination* (here's C, here's
  C's price on this plot) is information leakage to a third party.
- The client-side `RecipientView` TS type at
  `VaultSidePanelAdapter.tsx:78-93` does **not** declare
  `conflictedFields`, so the rendered UI ignores it. Browser
  DevTools network tab still shows it.
- Spec §15 talks about "info-only conflict awareness" but doesn't
  explicitly resolve whether conflict surface crosses share
  boundaries.

**P1, not P0.** Recommend founder ruling. Options:
- **Strip `conflictedFields` for recipients** — easy, one-line
  removal from `serializeVaultEntryForRecipient`. Recipient sees
  `conflictsWithOthers=true` but no third-party details.
- **Accept the exposure** — document in spec that conflict surface
  follows visibility of the entry itself.

### 6.4 GeoJSON properties on shared map layer ✓

`src/app/api/vault/shared-with-me/map/route.ts:51-68` builds
features with this property bag:

```ts
{
  id, shareId, plotNumber, emirate, district, stage,
  askingPriceFils, area, landUse, conflictsWithOthers,
  sharedBy: { id, nickname }, permission, source
}
```

No `brokerNotes` / `ownerContact` / `nextFollowUpAt` in the wire
shape — the Prisma `select:` clause never fetches them.
**`conflictedFields` is NOT included on the map layer either** — only
the boolean flag. So the §6.3 leak does **not** apply to the map
layer; only to the detail GET.

### 6.5 Audit trail summary

Every place where a recipient receives data, redaction is enforced
at the **Prisma `select` level** (defense-in-depth) — meaning PII
never enters server memory for those responses:

- `/api/vault/shared-with-me/map/route.ts:32-46` — `select:` excludes brokerNotes / ownerContact / nextFollowUpAt
- `/api/vault/shared-with-me/route.ts:43-57` — same exclusion
- `/api/me/vault/conflicts/[plotNumber]/route.ts:81-89` — same exclusion, plus inline `INTENTIONALLY OMITTED` comment at line 106

The single exception is the **polymorphic detail GET**, which
fetches the full row and relies on the serializer to redact —
documented in §6.2.

### 6.6 Cohort approval gate

All routes call `getApprovedUserId(req)` (from `src/lib/auth.ts`),
which returns `null` for unapproved or signed-out users. Routes
respond `401 unauthorized` in that case. ✓ Compliant with
CLAUDE.md "SECURITY RULES — All NEW API routes MUST use
`getApprovedUserId(req)` by default."

---

## §7 Known gaps + risk matrix

### 7.1 In spec, not implemented (deferred Phase 2.2 — intentional)

| Spec feature | Why deferred | Status |
|---|---|---|
| Encrypted-at-rest `ownerContact` | MVP stores plaintext; encryption arrives with cohort signal | spec §3.1 |
| DISPUTED stage + admin arbitration | Conflict is "info-only" in MVP | spec §15 |
| Aggregate market dashboard from conflict data | Cohort hasn't asked yet | spec §15 |
| Per-permission shares (FEASIBILITY / OFFER) | Enum values declared so 2.2 ships without migration | spec §6.4 |
| Affection Plan PDF parsing for non-DDA plots | Wizard takes manual entry only in MVP | spec §6.1 |
| Email digest notifications | In-app `Notification` rows only | spec §3.3 |
| CSV bulk import | Single-plot upload only | spec §6.1 |
| Kanban view | List view only | spec §6.3 |
| Re-sharing imported entries (3+ hop chains) | `vault-import.ts` supports 2-hop only | spec §6.6 |

### 7.2 In spec, not implemented (UNINTENTIONAL gaps) ⚠

| # | Gap | Severity | Notes |
|---|---|---|---|
| **G1** | **`AddPlotWizard` is NOT wired into any parent component.** | **P0 for UAT** | 5 files exist (~33 KB). No `import { AddPlotWizard }` outside its own folder. `VaultListView` renders `<EmptyState kind="no-entries">` with no `onAddClick` (so the "Add a plot" CTA stays hidden). No top-bar "+ Add" button anywhere. **Users have zero UI path to create a vault entry.** Spec §6.1 expects a wizard launchable from `/parcels/map` and `/vault`. |
| **G2** | `EmptyState` "Add a plot" CTA never renders — `VaultListView` doesn't pass `onAddClick` (`VaultListView.tsx:191`) | P0 for UAT | Symptom of G1 |
| **G3** | Layer panel may show raw keys `vaultMine` / `vaultShared` instead of "My Vault entries" / "Shared with me" — no per-layer label entry was added | P2 cosmetic | Founder eye-test during UAT |
| **G4** | Spec §6.7 (conflict comparison modal) and `ConflictDetailModal.tsx` both promise "View other broker's contact". MVP modal shows only nickname + role (no email/phone). The spec is ambiguous here. | P2 — clarify | Decide whether broker-to-broker contact is part of conflict surface |
| **G5** | Spec §3.3 mentions "VAULT_SHARE_VIEWED — notify the sharer when a recipient views their share". Kind is declared (`vault-notifications.ts:14`) but `notifyUser` is never called with it. | P1 — wire or remove | Recipient `lastViewedAt` is bumped but sharer gets no notification |
| **G6** | `VAULT_PROMOTED_TO_PUBLIC` kind declared (`vault-notifications.ts:17`) but never fired. Spec §6.5 is silent on who should receive this notification. | P1 — decide | If a shared entry gets promoted, recipients may want to know |
| **G7** | `/api/me/vault/conflicts/[plotNumber]` returns **403 forbidden** on anti-fishing block, not 404 (breaks Deal Room pattern) | P2 — choose | 1-line fix to align with convention |
| **G8** | `conflictedFields` flows through to recipient view (§6.3) | P1 — design ruling | Borderline data leak — third-party userIds + values surface to share recipients |

### 7.3 Implemented, NOT in spec (scope creep)

| Feature | Why it crept in |
|---|---|
| `parcel-create.ts` lib (Pass-A extraction) | Required so promote can reuse submit logic without duplicating; Pass-B reconciles |
| `useEscapeClose` hook (Day 12) | a11y polish — not in spec but matches CLAUDE.md UI guide expectations |
| `AddPlotWizard` 3-step state machine | Spec said "wizard"; this is the implementation |
| `VAULT_STAGE_COLOR` palette (7 stage → hex) | Spec §7 said "colour by stage" without specifying values — palette chosen here may need founder approval before UAT |

### 7.4 Pass-B refactor dependencies (gated on founder approval)

| Refactor | Touches existing production code | Owner |
|---|---|---|
| Rewire `/api/parcels/submit/route.ts` to call `createParcelFromSubmission` | Yes — `src/app/api/parcels/submit/route.ts` | founder approval gate |
| Integrate `AddPlotWizard` into `AddPlotModal` with Step 0 toggle | Yes — `src/app/parcels/map/AddPlotModal.tsx` | founder approval gate |

Pass-B is **NOT a UAT prerequisite** by itself, but resolving G1
(wiring `AddPlotWizard` somewhere) IS. The cheapest fix is a
minimal "+ Add to vault" button on `/vault` that opens
`<AddPlotWizard>` in a modal — doesn't touch `AddPlotModal` at all.

### 7.5 Production-readiness checks

| Check | Result |
|---|---|
| `pnpm build` | ✓ exit 0 (background task `b7vn10til` completed) |
| `tsc --noEmit` | ✓ exit 0 (with `set -o pipefail` to avoid the Day-9 tail-mask bug) |
| `console.log` in vault code | ✓ none |
| `console.warn` / `console.error` in vault code | ✓ only as `[vault-*]` failure logs in fire-and-forget paths (per design) |
| `TODO` / `FIXME` / `HACK` in vault code | ✓ none |
| `@ts-ignore` / `@ts-expect-error` in vault code | ✓ none |
| `eslint-disable` in vault code | ✓ none (1 line in `vault-serialize.ts:154` for `_stripped` rest-destructure — typical pattern, OK) |
| `.env.local` modified | ✓ no |
| `prisma/schema.prisma` touched outside vault sections | ✓ no |
| Migration applied to any DB | ✗ pending Day 14 |
| Vercel preview deploy URL | unknown — needs `gh pr view` or push of feat branch |

### 7.6 Risk matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| UAT can't run S1 (Add entry via wizard) | **certain** | P0 — blocks UAT | Wire AddPlotWizard into `/vault` Add button (cheapest path) |
| Recipient sees third-party `conflictedFields` (G8) | certain in conflict scenarios | P1 — borderline leak | Strip in `serializeVaultEntryForRecipient` (1-line fix) |
| Sharer gets no `VAULT_SHARE_VIEWED` notification | certain | P2 — UX surprise | Wire or remove union member |
| Promote flow fires no notification to anyone | certain | P2 — UX surprise | Decide intent, wire or remove |
| Conflict comparison modal endpoint returns 403 instead of 404 | certain | P3 — convention break | Change to 404, update inline comment |
| Layer panel shows raw keys `vaultMine` / `vaultShared` | unknown | P2 — cosmetic | Eye-test during UAT |
| Vault layer z-order vs PMTiles after map-init | unknown | P2 — cosmetic | Eye-test during UAT |
| Day-9 supabaseBrowser fix-up regression | none observed | n/a | Already fixed in `9ea2e68`, tsc clean |
| Prod migration breaks existing data | none (additive only) | P0 if it happens | `prisma migrate deploy` is the standard path; review SQL with founder before running |
| Pass-B refactor breaks `/api/parcels/submit` | deferred | n/a until Pass-B | Separate gate |

---

## Sign-off checklist for Day 13

Before scheduling UAT, founder confirms:

- [ ] **G1 resolved** — either AddPlotWizard wired into a minimal launcher, or Pass-B in scope and complete
- [ ] **G8 ruled** — strip `conflictedFields` for recipients, OR document the exposure in spec §15
- [ ] **G5 / G6 ruled** — wire the two notification kinds or remove them
- [ ] **G7 ruled** — 403 → 404 or document the exception
- [ ] Pre-flight environment choice (A staging / B prod-now / C local) — from UAT script §0
- [ ] Test recipient broker identified + nickname/email pre-approved
- [ ] Test plot number chosen (real DDA `6457940` recommended; spec §6.1)
- [ ] Vault stage colour palette approved (or `VAULT_STAGE_COLOR` palette revised)

Once green, run [UAT script](./uat-day13.md) (if saved separately, else
the one rendered in chat 2026-05-14).

**Day 14 is gated on a green UAT report — no automatic progression.**

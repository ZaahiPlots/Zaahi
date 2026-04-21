# SPEC 03 — Admin Panel (Phase 1 Priority 3)

**Status:** DRAFT v1.0 · 2026-04-21
**Priority:** **3 of 13** (Q-11 owner-modified ranking)
**Target ship:** Month 4 (MVP v1)
**Effort:** 1.5-2 engineer-weeks (range 1-2.5)
**Depends on:** Spec 02 Invoice (commission payout UI surface) · Spec 01 Deal Engine (admin transition detail page)
**Blocks:** None (but unlocks founder self-service for all downstream)
**Source commitments:**
- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` §1.E E-2 "Pragmatic B" (ratified via Q-12 B)
- Master Tree v3 §75 Admin
**Classification:** CONFIDENTIAL — internal engineering spec

---

## §1 Goal & Scope

**One-sentence goal:** Ship a Pragmatic-B admin panel that lets Zhan + Dymo self-service the 5 core entities (User · Parcel · Deal · Ambassador · Commission) + toggle feature flags + edit tier prices without touching SQL or deploying code, so Phase 1 operations are 2-founder-frictionless.

### Context — what already exists

- `src/app/admin/layout.tsx` — admin layout.
- `src/app/admin/ambassadors/page.tsx` — ambassador applications CRUD (approve / reject / detail).
- `src/app/admin/ambassadors/*Modal.tsx` — modal patterns (ApproveConfirm / Reject / ApplicationDetail).
- `/api/admin/*` routes — foundation.
- `getApprovedUserId(req)` + `role = ADMIN` check pattern established.

**What's missing:** generic CRUD framework · feature-flag system · tier-price editor · admin nav to cover all 5 entities.

### In scope (MVP v1)

- **CRUD for 5 entities**:
  - **User** — list / detail / edit (email · role · approved · name · phone · TRN · taxpayerAddress · ambassadorActive).
  - **Parcel** — list / detail / edit (plotNumber · district · emirate · area · currentValuation · status). NO create (per CLAUDE.md seed-script workflow). NO delete (per CLAUDE.md "NEVER delete parcels" rule).
  - **Deal** — list / detail (read-only summary + link to `/admin/deals/[id]` from Spec 01). NO direct Deal mutation here — goes through Spec 01's state-machine PATCH only.
  - **Ambassador** — list all ambassadors (ambassadorActive=true users) / view downline / view commissions. Applications CRUD already exists.
  - **Commission** — list / filter by status / mark PAID / REVERSED (from Spec 02 surface) + view payout invoice.
- **Feature flags**:
  - New `FeatureFlag` Prisma model (`key` · `enabled` · `description` · `updatedAt` · `updatedBy`).
  - Admin UI at `/admin/feature-flags` — toggle grid.
  - Code-level consumer `isFeatureEnabled(key)` helper.
  - Initial seeded flags: `AMBASSADOR_SIGNUP_OPEN` · `ARCHIBALD_PUBLIC_ACCESS` · `TIER_GATING_ENFORCED` · `INVOICE_AUTO_ISSUE` · `BANK_WIDGET_VISIBLE` · `TOKENIZATION_TRACK_VISIBLE`.
- **Tier price editor**:
  - New `TierConfig` Prisma model (`tier` · `priceAed` · `l1Pct` · `l2Pct` · `l3Pct` · `usdtWalletAddress` · `updatedAt` · `updatedBy`).
  - Admin UI at `/admin/tiers` — edit Silver / Gold / Platinum prices + commission rates + USDT wallet.
  - Seeded with current CLAUDE.md Ambassador-Program-Rules defaults.
  - `getTierConfig(tier)` helper replaces hardcoded constants over time.
- **Admin navigation** — top nav with 7 sections (Dashboard · Users · Parcels · Deals · Ambassadors · Feature Flags · Tiers).
- **Admin dashboard** at `/admin` — 1-page metric overview (deals · users · ambassadors · pending commissions · flag status).

### v2 polish (Month 5-6+, OUT of MVP — per R-1 rejection)

- Audit-log browser (S-1 data source exists post-MVP Safety ship, browser Month 5-6).
- User impersonation (rare edge cases only; defer).
- Bulk edit operations (bulk mark-paid commissions; bulk status change users).
- Saved search / filter presets.
- Export to CSV for each entity (beyond Spec 02's invoice CSV).

### Explicit non-goals v1

- NOT granular RBAC — per Preliminary Decision 3, Phase 1 is 2-founder scope. Admin = Admin. No CoS-specific role until Month 8+.
- NOT editing deal state machine from Admin — use `/admin/deals/[id]` transition panel (Spec 01).
- NOT editing commission amounts — immutable per CLAUDE.md + Prisma comment. Only `status` / `payoutMethod` / `payoutRef` / `paidAt` mutable.
- NOT creating parcels via Admin — batch seed-scripts are the CLAUDE.md workflow.
- NOT deleting anything — CLAUDE.md rules forbid delete on Parcel and Commission. User deletion is PDPL-gated (Phase 2).
- NOT multi-admin audit trail beyond `updatedBy` on edits — full S-1 AuditLog is separate.

---

## §2 User Stories

### MUST

**U-1 (Zhan, admin).** As admin, I want a single `/admin` dashboard showing deals-by-milestone + active-users + pending-commissions counts, so my Monday 10:00 stand-up has a numeric starting point.

**U-2 (Zhan, admin).** As admin, I want to flip `AMBASSADOR_SIGNUP_OPEN` from a toggle in `/admin/feature-flags` and have `/join` immediately reflect the change, so I don't need a Vercel deploy to pause signups during the Month 6-9 soft pilot (Q-13 B).

**U-3 (Zhan, admin).** As admin, I want to change the Gold tier price from AED 5 000 to AED 6 000 via `/admin/tiers` and have `/join` signup flow immediately use the new price, so pricing experiments are one-click.

**U-4 (Zhan, admin).** As admin, I want a single User detail page where I can change someone's role from BUYER → BROKER + update their TRN + mark them approved, so onboarding edge cases are < 60 seconds.

**U-5 (Dymo, admin).** As admin, I want to see all active ambassadors + their downline counts + their cumulative commissions PAID in one list, so I know my top referrers without SQL.

### SHOULD

**U-6 (Zhan, admin).** As admin, I want every admin action I take logged with my user ID + timestamp + diff, so a post-mortem 6 months later can reconstruct "who changed what when."

**U-7 (Zhan, admin).** As admin, I want to search / filter users by email · phone · role · ambassadorActive, so finding a specific user is < 5 seconds.

**U-8 (Zhan, admin).** As admin, I want Parcel detail editable for: currentValuation · status · plotGuidelinesUrl (via AffectionPlan) — but NOT delete — so price / status / document updates are UI-driven per CLAUDE.md §"Цена участка — ТОЛЬКО ВРУЧНУЮ".

### COULD

**U-9 (Zhan, admin).** As admin, I want an advanced filter ("deals stale > 14 days and worth > AED 20 M"), so edge cases surface without custom reporting. **Defer v2.**

**U-10 (Zhan, admin).** As admin, I want a saved-search that sends me a Slack / Telegram digest Monday morning. **Defer v2.**

---

## §3 Data Model

### 3.1 New Prisma model — `FeatureFlag`

```prisma
model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique                // ALL_CAPS_SNAKE_CASE
  enabled     Boolean  @default(false)
  description String                            // short human explainer, e.g. "Ambassador self-serve signup on /join"
  rolloutPct  Int?     @db.SmallInt            // 0..100, optional: percentage rollout (hash-based stable assignment). Null = all-or-nothing.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  updatedBy   String?                          // admin user id

  @@index([key])
}
```

Seeded on migration:

| Key | Initial | Description |
|---|:-:|---|
| `AMBASSADOR_SIGNUP_OPEN` | `false` | Controls public `/join` signup; Q-13 B soft pilot Month 6-9 admin flips to `true` for invited warm brokers |
| `ARCHIBALD_PUBLIC_ACCESS` | `false` | Anonymous chat enabled on landing page; Phase 1 owner-only per Q-20 B |
| `TIER_GATING_ENFORCED` | `true` | If false, Gold / Platinum content accessible to any logged-in user |
| `INVOICE_AUTO_ISSUE` | `false` | If true, DRAFT invoices auto-transition to ISSUED at DEAL_COMPLETED; Phase 1 false (Q-22 B manual) |
| `BANK_WIDGET_VISIBLE` | `false` | §22 mortgage widget on parcel detail; Phase 2 only |
| `TOKENIZATION_TRACK_VISIBLE` | `false` | DLD sandbox tokenisation UI; Phase 3 only |
| `PARCEL_SEARCH_ENABLED` | `true` | Map search bar on landing; kill-switch for load shedding |
| `DEAL_ROOM_CHAT_ENABLED` | `true` | Existing DealMessage model; kill-switch if PDPL incident |

### 3.2 New Prisma model — `TierConfig`

```prisma
model TierConfig {
  tier             String   @id                // "SILVER" | "GOLD" | "PLATINUM" | "DEVELOPER"
  priceAed         Int                         // AED whole-number (not fils — tier prices are user-facing round numbers)
  l1Pct            Decimal  @db.Decimal(5, 4) // 0.0500 = 5%
  l2Pct            Decimal  @db.Decimal(5, 4)
  l3Pct            Decimal  @db.Decimal(5, 4)
  usdtWalletAddr   String                      // TRC-20 address; same across tiers but editable
  perks            String                      // short marketing blurb
  maxPaidSlots     Int?                        // null = unlimited; optional cap for Q-13 B soft pilot (e.g. 10 Gold for soft pilot)
  activeSlots      Int      @default(0)       // auto-incremented on signup; used by maxPaidSlots check
  isActive         Boolean  @default(true)     // if false, /join hides this tier
  updatedAt        DateTime @updatedAt
  updatedBy        String?
}
```

Seeded per CLAUDE.md Ambassador Program Rules 2026-04-15:

| tier | priceAed | l1Pct | l2Pct | l3Pct | activeSlots | maxPaidSlots | usdtWalletAddr |
|---|---:|---:|---:|---:|---:|---:|---|
| SILVER | 1000 | 0.0500 | 0.0200 | 0.0100 | 0 | null | TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7 |
| GOLD | 5000 | 0.1000 | 0.0400 | 0.0100 | 0 | 10 (soft pilot cap) | same |
| PLATINUM | 15000 | 0.1500 | 0.0600 | 0.0100 | 0 | null | same |
| DEVELOPER | 50000 | — | — | — | 0 | null | same |

**Future replacement of hardcoded constants.** `src/lib/ambassador-plans.ts` currently hardcodes prices and rates. In v1, keep the hardcoded fallbacks but add a `getTierConfig(tier)` function that reads from `TierConfig` if row exists, else falls back to constants. Migration-safe and non-breaking.

### 3.3 No `User` schema changes

TRN + taxpayerAddress added in Spec 02. CRUD UI surfaces those fields; no new columns.

### 3.4 Migrations

Single migration `<ts>_admin_panel_mvp/migration.sql`:

```sql
-- CreateTable "FeatureFlag"
CREATE TABLE "FeatureFlag" ( ... );
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateTable "TierConfig"
CREATE TABLE "TierConfig" ( ... );

-- Seed flags + tiers
INSERT INTO "FeatureFlag" (...) VALUES (...);  -- 8 rows
INSERT INTO "TierConfig" (...) VALUES (...);    -- 4 rows
```

---

## §4 API Design

### 4.1 Generic CRUD endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/admin/users` | List users (filter + sort + paginate) | Admin |
| GET | `/api/admin/users/[id]` | User detail | Admin |
| PATCH | `/api/admin/users/[id]` | Update user (role / approved / TRN / ambassadorActive / phone / name) | Admin |
| GET | `/api/admin/parcels` | List parcels | Admin |
| GET | `/api/admin/parcels/[id]` | Parcel detail | Admin |
| PATCH | `/api/admin/parcels/[id]` | Update (currentValuation / status / plotGuidelinesUrl) | Admin |
| GET | `/api/admin/ambassadors` | List active ambassadors + downline + commissions cumulative | Admin |
| GET | `/api/admin/ambassadors/[id]` | Single ambassador + tree + commissions list | Admin |

### 4.2 Feature-flag endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/feature-flags` | List all flags |
| PATCH | `/api/admin/feature-flags/[key]` | Toggle flag `{ enabled: boolean, rolloutPct?: 0..100 }` |

### 4.3 Tier-config endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/tiers` | List all tier configs |
| PATCH | `/api/admin/tiers/[tier]` | Edit tier fields (priceAed · l*Pct · maxPaidSlots · usdtWalletAddr · isActive) |

Reuse Spec 02 endpoints for Commission + Invoice.
Reuse Spec 01 endpoints for Deal.

### 4.4 Public consumer endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/config/public` | Public-safe config snapshot: `{ flags: { ARCHIBALD_PUBLIC_ACCESS, TIER_GATING_ENFORCED, ... }, tiers: [...] }` — used by `/join` page + landing |

### 4.5 Zod schemas

```typescript
// src/lib/schemas/admin.ts
export const UpdateUserSchema = z.object({
  role: z.enum(["OWNER", "BUYER", "BROKER", "INVESTOR", "DEVELOPER", "ARCHITECT", "ADMIN"]).optional(),
  approved: z.boolean().optional(),   // writes to supabase user_metadata.approved — not directly to Prisma
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional(),
  trn: z.string().regex(/^\d{15}$/).optional(),
  taxpayerAddress: z.string().max(500).optional(),
  ambassadorActive: z.boolean().optional(),
}).partial();

export const UpdateParcelSchema = z.object({
  currentValuation: z.bigint().positive().optional(),    // fils
  status: z.enum([...9 ParcelStatus values]).optional(),
  plotGuidelinesUrl: z.string().url().optional(),
}).partial();

export const UpdateFeatureFlagSchema = z.object({
  enabled: z.boolean(),
  rolloutPct: z.number().int().min(0).max(100).optional(),
});

export const UpdateTierConfigSchema = z.object({
  priceAed: z.number().int().positive().max(1_000_000).optional(),
  l1Pct: z.number().min(0).max(0.5).optional(),
  l2Pct: z.number().min(0).max(0.5).optional(),
  l3Pct: z.number().min(0).max(0.5).optional(),
  usdtWalletAddr: z.string().regex(/^T[A-Za-z1-9]{33}$/).optional(),   // TRC-20 address prefix T
  maxPaidSlots: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  perks: z.string().max(500).optional(),
}).partial();
```

### 4.6 Rate limits

- Admin read endpoints: 600 req/min/admin.
- Admin write endpoints: 60 req/min/admin (burst 10).
- Feature-flag toggle: 30 req/min/admin (prevent toggle-spam).
- Public config endpoint: 120 req/min/user (landing-page poll).

---

## §5 UI Components

### 5.1 Page routes

- `/admin` — Dashboard (metric overview).
- `/admin/users` — User list + filters.
- `/admin/users/[id]` — User detail + edit.
- `/admin/parcels` — Parcel list.
- `/admin/parcels/[id]` — Parcel detail + edit (valuation, status, plot-guidelines URL).
- `/admin/deals` — Kanban (from Spec 01).
- `/admin/deals/[id]` — Deal admin detail (from Spec 01).
- `/admin/ambassadors` — List active ambassadors (existing `/admin/ambassadors/page.tsx` covers applications; extend to list active ambassadors + downline summary).
- `/admin/ambassadors/[id]` — Single ambassador + downline tree + commissions.
- `/admin/commissions` — List (from Spec 02).
- `/admin/commissions/[id]` — Commission detail (from Spec 02).
- `/admin/invoices` — List (from Spec 02).
- `/admin/invoices/[id]` — Invoice detail (from Spec 02).
- `/admin/feature-flags` — Toggle grid.
- `/admin/tiers` — Tier-config editor.

### 5.2 Component hierarchy

```
/admin/
  page.tsx                    — AdminDashboard
    KpiGrid                   — 8 metric cards (deals by milestone, active users, pending commissions, invoices DRAFT count, feature flag count, tier active slots)
    RecentActivityFeed        — last 20 admin actions (from auditLog when S-1 live; v1 fallback: last 10 PATCH events via DealAuditEvent-style admin log)
    QuickLinks                — cards linking to 7 sections

/admin/layout.tsx (existing) — SidebarLayout
  AdminSidebar                — 7 nav items
  AdminBreadcrumbs
  AdminRoleBadge              — shows Zhan / Dymo / [CoS when hired]
  Main                        — {children}

<EntityList>                   — generic table component
  EntityFilters               — search + role/status/date filters
  EntityTable                 — sortable columns + select-row + pagination (50/page)
  EntityBulkActions           — v1: disabled; v2: mark-paid / delete / export
<EntityDetail>                 — generic detail layout
  EntityHeader
  EntityTabs                  — "Overview" + "Edit" + "Audit" (v2)
  EntityEditForm              — auto-generated from Zod schema + per-field override
  EntitySaveBar               — save / cancel / "has unsaved changes" indicator

/admin/feature-flags/
  page.tsx                    — FeatureFlagsGrid
    FlagRow x N               — key · description · toggle switch · rolloutPct slider (if set) · updatedBy + updatedAt

/admin/tiers/
  page.tsx                    — TiersEditor
    TierCard x 4              — Silver / Gold / Platinum / Developer, editable inline
      TierPriceInput          — AED, validates > 0
      TierCommissionRates     — 3 sliders (L1 / L2 / L3)
      TierWalletAddress       — text input + TRC-20 validator
      TierSlotsCap            — optional number input (null = unlimited)
      TierActiveToggle
```

### 5.3 Design

Per CLAUDE.md UI Style Guide. Admin panel uses a lighter variant (less glassmorphism, more traditional SaaS density) — Admin table rows are denser (40 px / row vs. 56 px landing). Gold accent retained for action buttons.

### 5.4 State management

- Server-state: React Query with 30 s stale time on lists, 5 s on detail.
- Feature-flag toggle: optimistic mutation; rollback on failure with toast.
- Bulk ops: disabled v1 (confirms v2 ship via `FeatureFlag.BULK_OPS_ENABLED` later).

---

## §6 Business Logic

### 6.1 Feature-flag consumer

```typescript
// src/lib/feature-flags.ts — NEW
import { prisma } from "./prisma";

const cache = new Map<string, { enabled: boolean; rolloutPct: number | null; ts: number }>();
const TTL_MS = 30_000;   // 30 s in-memory cache

export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return resolveFlag(cached.enabled, cached.rolloutPct, userId);
  }
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag) return false;   // default closed — safe
  cache.set(key, { enabled: flag.enabled, rolloutPct: flag.rolloutPct, ts: Date.now() });
  return resolveFlag(flag.enabled, flag.rolloutPct, userId);
}

function resolveFlag(enabled: boolean, rolloutPct: number | null, userId?: string): boolean {
  if (!enabled) return false;
  if (rolloutPct == null) return true;
  if (!userId) return rolloutPct >= 100;   // anonymous gets only fully-enabled flags
  // stable hash-based assignment: user bucketed same every call
  const hash = simpleHash(userId + ":" + userId);
  return (hash % 100) < rolloutPct;
}

// Invalidation: hit `/api/admin/feature-flags/[key]` PATCH clears cache entry via inbound message / webhook
// v1 simpler: TTL 30 s absorbs admin toggle within 30 s. Acceptable.
```

### 6.2 Tier-config consumer

```typescript
// src/lib/tier-config.ts — NEW
export async function getTierConfig(tier: "SILVER" | "GOLD" | "PLATINUM" | "DEVELOPER") {
  const cfg = await prisma.tierConfig.findUnique({ where: { tier } });
  if (cfg) return cfg;
  // fallback to constants from ambassador-plans.ts — keeps existing behaviour if DB migration missed
  return FALLBACK_TIER_CONFIGS[tier];
}
```

Consumer sites:
- `/join` page: reads prices + activeSlots to show "X of Y slots remaining" for Gold during soft pilot.
- `POST /api/ambassador/register`: checks `activeSlots < maxPaidSlots` before accepting.
- `src/lib/ambassador.ts`: pulls L1/L2/L3 rates from TierConfig instead of hardcoded map (future migration step; v1 keeps hardcoded + uses TierConfig for display).

### 6.3 `updatedBy` tracking

Every PATCH to User / Parcel / FeatureFlag / TierConfig sets `updatedBy = currentUserId`. Displayed on detail page as "Last edited by Zhan · 2 hours ago".

### 6.4 Approval workflow for User

`User.approved` is in Supabase auth.users.user_metadata, not Prisma. `PATCH /api/admin/users/[id]` with `{ approved: true }` writes to Supabase via Supabase admin client (same pattern as existing `/api/admin/ambassador-applications/[id]` PATCH).

### 6.5 Parcel edit guardrails (per CLAUDE.md)

- Can update `currentValuation` ONLY — per CLAUDE.md "Цена участка — ТОЛЬКО ВРУЧНУЮ" allows founder/owner edit.
- Can update `status` — `ParcelStatus` enum.
- CANNOT delete the row (per CLAUDE.md).
- CANNOT modify `affectionPlans` list (append-only per CLAUDE.md).
- `plotGuidelinesUrl` is on AffectionPlan, not Parcel — PATCH endpoint cascades to most-recent AffectionPlan row.
- Zod schema enforces these constraints.

### 6.6 Edge cases

1. **Flag toggled while request in-flight.** 30 s cache window; old value served for up to 30 s. Acceptable Phase 1 — no "immediate-propagation" SLA.
2. **Tier price changed while signup form loaded on client.** Client fetches latest from `/api/config/public` at form submit; rejects if mismatch. Prevents price-shaving race.
3. **MaxPaidSlots decremented after approval in-flight.** Use Postgres UPDATE ... WHERE activeSlots < maxPaidSlots RETURNING — atomic check + increment; second simultaneous signup returns null → 409.
4. **Admin accidentally disables INVOICE_AUTO_ISSUE while DEAL_COMPLETE in-flight.** Read flag inside same `$transaction`; race acceptable (at-most-once semantics OK).
5. **Admin removes themselves from ADMIN role.** Block at handler: cannot demote self; warn if only 1 admin left. Safety rail.
6. **PII masking in user list.** Email visible to admin (necessary). Phone + TRN masked in list, visible on detail only.

---

## §7 Testing Criteria

### 7.1 Unit tests

- `isFeatureEnabled()` — cache hit/miss · disabled flag → false · rolloutPct 50 → stable 50/50 split (deterministic for same userId).
- `getTierConfig()` — DB hit · fallback to constants on missing row · cache invalidation on PATCH.
- UpdateUserSchema · UpdateParcelSchema · UpdateFeatureFlagSchema · UpdateTierConfigSchema — valid + invalid inputs.
- RBAC check — non-admin caller on `/api/admin/*` returns 403.
- Self-demote block — admin cannot remove own ADMIN role.

### 7.2 Integration tests

- **E2E 1 — Feature flag toggle propagates.** Admin PATCHes `AMBASSADOR_SIGNUP_OPEN` to `true`. Within 30 s, `/api/config/public` returns `true`. `/join` page signup form appears (reads from public config).
- **E2E 2 — Tier price edit.** Admin PATCHes Gold tier to AED 7 000. New signup attempt pays AED 7 000 per `/api/config/public`.
- **E2E 3 — User role change.** Admin promotes user BUYER → BROKER. User's `/dashboard` reflects new role on next load.
- **E2E 4 — Parcel valuation edit.** Admin sets Plot 1 currentValuation → AED 40 M. Parcel detail page reflects new value.
- **E2E 5 — Slots cap.** Gold maxPaidSlots=10, activeSlots=10. 11th signup attempt: 409 "Tier full."

### 7.3 Manual acceptance test checklist

- [ ] `/admin` dashboard loads in < 2 s with real metric counts.
- [ ] 7 nav items work + role badge shows "Zhan · ADMIN" or "Dymo · ADMIN".
- [ ] Every entity list supports search + sort + paginate.
- [ ] Every detail page shows "Last edited by X at T" when field is mutable.
- [ ] Feature-flag toggle changes landing-page behaviour within 30 s.
- [ ] Tier-price edit reflected in `/join` form within 30 s.
- [ ] Non-admin user accessing `/admin/*` redirected to `/dashboard` (not 403-bare — better UX).
- [ ] PII masked on list pages, visible on detail pages.
- [ ] `pnpm build` green; CLAUDE.md SMOKE TEST passes.

---

## §8 Non-Functional Requirements

### 8.1 Performance

- Admin dashboard load < 2 s (p95) at Phase 1 scale.
- Entity list pagination — 50 rows / page with fast filter (indexed where clauses).
- Feature-flag read < 5 ms (in-memory cache).

### 8.2 Security

- Every admin endpoint gates on `role === "ADMIN"` (not just approved).
- Self-demote blocked (§6.6 case 5).
- Rate limit per Enhancement Proposal S-7.
- Zod on every body (S-8).
- Audit log via `logAudit()` S-1 on every PATCH.
- PII fields (email · phone · TRN) redacted in logs per CLAUDE.md rule 5.
- Supabase admin operations use service-role key (env-only, never browser).

### 8.3 Accessibility

- Entity tables keyboard-navigable + sortable columns with `aria-sort`.
- Feature-flag toggles are native `<button role="switch" aria-checked>` (not custom).
- All forms have `<label for>` + input pairs.

### 8.4 Internationalisation

- Admin UI English-only v1 (per Preliminary Decision 3 — 2-founder scope, both English-proficient).
- Seeded data (tier `perks`, flag `description`) translatable via `src/lib/translate.ts` if needed later.

### 8.5 Audit

- Every admin PATCH writes `AuditLog` row (Enhancement Proposal S-1): `{ adminId, entityType, entityId, field, fromValue, toValue, timestamp }`.
- Feature-flag toggles + tier-config edits have higher-severity audit level (flag "ADMIN_CRITICAL").

---

## §9 Effort Estimate

| Phase | Hours | Description |
|---|:-:|---|
| DB migration + seeds | 2-3 | FeatureFlag + TierConfig models + 8 flags + 4 tiers seeded |
| Generic CRUD framework | 6-8 | `<EntityList>` + `<EntityDetail>` + `<EntityEditForm>` components |
| User CRUD | 4-5 | User list + detail + Supabase admin client integration for approved flag |
| Parcel CRUD | 3-4 | List + detail + edit form with guardrails |
| Ambassador list | 3-4 | Active ambassadors + downline + cumulative commissions |
| Feature-flag UI | 3-4 | Toggle grid + rolloutPct slider + optimistic mutation |
| Tier-config UI | 3-4 | 4 tier cards + inline edit + wallet validator |
| Dashboard | 4-5 | Metric KPI cards + recent activity + quick links |
| Admin nav + layout polish | 2-3 | Sidebar · breadcrumbs · role badge |
| Tests | 5-7 | Unit + 5 E2E scenarios |
| Manual polish + smoke | 2-3 | CLAUDE.md SMOKE + accessibility + PII masking |
| **TOTAL** | **37-50 hours** | **= ~1.5-2 engineer-weeks** |

Realistic at Phase 1 Zhan allocation: **2-3 calendar weeks** (~14 hrs/week eng).

**Target start:** Week 9 (Mon Jun 15 2026) — after Spec 01 + Spec 02 ship.
**Target complete:** Week 11 end (Fri Jul 3 2026).

---

## §10 Success Criteria

### Zhan knows it's done when

- `pnpm build` + `pnpm test` green.
- E2E 1-5 pass.
- All 7 admin sections navigate + render real data in staging.
- Feature-flag toggle + tier-price edit demonstrably propagate to public endpoints.
- CLAUDE.md SMOKE TEST checklist passes.

### Dymo verifies it works for daily workflow when

- He can look up any user + any ambassador downline in < 10 seconds.
- He can disable `AMBASSADOR_SIGNUP_OPEN` + re-enable during soft-pilot experiments without asking Zhan.
- Gold tier price changes + wallet address changes are his call without a ticket.

### Founder attestation Month 4 end

- Admin panel absorbs 100 % of "I need to change X in DB" requests from Dymo — no SQL required. Signed attestation in `docs/decisions/`.

---

## §10.A Zhan Quick Start Hints

### First 5 minutes opening this spec

1. Read §1 Context — existing `/admin/layout.tsx` + `/admin/ambassadors/*` is your scaffold; don't rebuild.
2. Skim §3.1 + §3.2 — 2 new Prisma models, 12 seeded rows, straightforward.
3. Look at §5.2 component hierarchy — the `<EntityList>` + `<EntityDetail>` reusable framework is the key productivity bet.
4. Glance at §7.3 manual acceptance — Done bar.
5. Open `src/app/admin/ambassadors/page.tsx` — that's the style you're extending.

### 30-minute smoke test to validate your understanding

- Create Prisma migration `admin_panel_mvp` with just the `FeatureFlag` model. `pnpm prisma migrate dev`. Seed 2 flags via `prisma/seed.ts`.
- Write failing test: `expect(await isFeatureEnabled("AMBASSADOR_SIGNUP_OPEN")).toBe(false)`. Pass it with the simplest helper implementation.
- Build a single-page `/admin/feature-flags/page.tsx` that lists the 2 seeded flags in a table. Ship nothing else. You've proved end-to-end CRUD pattern.

### If stuck, check these files first

- `src/app/admin/layout.tsx` (existing sidebar / auth pattern).
- `src/app/admin/ambassadors/page.tsx` (list page style reference).
- `src/app/admin/ambassadors/ApplicationDetailModal.tsx` (detail/edit pattern).
- `src/app/api/admin/ambassador-applications/route.ts` (existing admin endpoint pattern).
- `src/lib/auth.ts` (auth helper; add role check if missing).
- `src/lib/ambassador-plans.ts` (existing tier constants — you'll wrap these in `getTierConfig`).
- CLAUDE.md UI Style Guide (density rules for admin vs. landing).

### Common pitfalls from research

- **Do NOT** build a custom table component. Use `@tanstack/react-table` or existing `ambassadors/page.tsx` pattern. 2 days saved.
- **Do NOT** add bulk-delete. CLAUDE.md forbids parcel/commission deletion. Bulk-PATCH for "mark paid" defer to v2.
- **Do NOT** allow ADMIN self-demote. One-admin-left state is a bricked panel.
- **Do NOT** allow direct Deal mutation from admin — all deal state changes go through Spec 01 transition API (preserves audit).
- **Do NOT** bypass Zod validation on PATCH routes even for "admin-trusted" input. Admins make typos too.
- **Do NOT** cache feature-flag reads for > 60 s. 30 s is the sweet spot for "fast enough + responsive enough to admin toggles."
- **Do NOT** skip PII masking in admin list views. Audit screenshots might end up in docs.
- **Do NOT** seed TierConfig prices from hardcoded constants at migration time — seed from the same source file so single source of truth holds.

---

**End of SPEC 03 — Admin Panel.**

Next in writing sequence: `04-FEASIBILITY_CALC_V2_SPEC.md`. Execution order per Q-11: Spec 02 → Spec 01 → **this spec** → Spec 04.

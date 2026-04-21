# SPEC 03 — Admin Panel (Phase 1 Priority 3)

**Status:** DRAFT v2.0 · 2026-04-22
**Priority:** **3 of 13** (Q-11 owner-modified ranking)
**Target ship:** MVP v1 Month 4 · Super-Admin §14 Month 4-5 (before Plot 1 first commission Fri 2026-06-19)
**Effort:** MVP v1 1.5-2 eng-weeks · Super-Admin extension 2-2.5 eng-weeks — **total 3.5-4.5 eng-weeks**
**Depends on:** Spec 02 Invoice (commission payout UI surface + bypass path) · Spec 01 Deal Engine (admin transition detail page + force-transition)
**Blocks:** None (but unlocks founder self-service + "каждая встреча = сделка" operational principle)
**Source commitments:**
- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` §1.E E-2 "Pragmatic B" (ratified via Q-12 B) · amended v1.2 with Super-Admin integration
- Master Tree v3 §75 Admin
- `docs/specs/phase-1/FEASIBILITY_STYLE_GUIDE.md` (2026-04-22 · binding visual language)
- Founder directive 2026-04-22: "У нас с Жаном должен быть доступ ко всем функциям чтобы мы могли все вручную заполнить. Каждая встреча с клиентом = закрытая сделка."
**Classification:** CONFIDENTIAL — internal engineering spec

## Version history

- **v1.0** (2026-04-21, commit `5e49b17`): Base admin panel MVP — CRUD for 5 core entities (User · Parcel · Deal · Ambassador · Commission) + feature flags + tier price editor per Q-12 B Pragmatic approach.
- **v2.0** (2026-04-22, this version): Super-Admin mode extension §14 added per founder directive. 12 subsections covering role hierarchy, impersonation, state override, bulk operations, direct data interface, feature bypass, session intervention, "meeting closes deal" flows, iron-clad security guardrails (FATF / PDPL / FTA compliant), UI design, testing, version note. Target ship Month 4-5, before Plot 1 first commission, so founders can close on-the-spot deals without system-rule friction.

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

## §14 SUPER-ADMIN MODE (v2 extension, 2026-04-22)

**Added per founder directive.** Operational principle: **каждая встреча с клиентом = закрытая сделка**. Super-Admin removes every system-rule friction so founders can close deals in real-time client meetings. High power + iron-clad audit.

### §14.1 Role hierarchy

Four-tier hierarchy replaces the v1 two-tier (ADMIN vs non-admin):

```typescript
// prisma/schema.prisma — enum migration required
enum UserRole {
  USER           // default for signup
  OWNER          // plot owner (existing)
  BUYER          // prospect (existing)
  BROKER         // licensed broker (existing)
  INVESTOR       // investor tier (existing)
  DEVELOPER      // developer tier (existing)
  ARCHITECT      // architect tier (existing)
  AMBASSADOR     // paid-tier ambassador (existing, added by ambassador plans)
  ADMIN          // platform admin — Chief of Staff Month 8+, future hires (existing)
  SUPER_ADMIN    // Zhan + Dymo ONLY (new in v2)
}
```

**Migration:** single Prisma migration `<ts>_super_admin_role/migration.sql`:

```sql
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
-- Elevation performed via admin dashboard post-migration, NOT in the migration file
-- (prevents accidental promotion in dev / staging).
```

**Elevation is out-of-band:** initial 2 SUPER_ADMIN users (Zhan + Dymo) are set via direct DB write by Zhan in a one-shot migration seed, logged explicitly. Subsequent elevations (never expected — founder-only role) would require a **both-founder cosign action**.

**Access pattern:**
- Any page under `/super-admin/**` requires `User.role === "SUPER_ADMIN"` server-side check.
- Additional WireGuard-VPN gate enforced at middleware level (see §14.9).
- Helper `getSuperAdminUserId(req)` in `src/lib/auth.ts` extends `getApprovedUserId` with the role check.

### §14.2 Role impersonation ("View as")

**Purpose:** Zhan / Dymo see the platform exactly as any user sees it — debug UX bugs, reproduce reported issues, demo to a client from the client's own perspective.

**Flow:**
1. SUPER_ADMIN opens `/super-admin/impersonate`.
2. Dropdown lists all users (filter by email / role / name).
3. Click "View as Ivan Petrov (BUYER)" → Session cookie annotated with `impersonationOriginId: <super-admin id>`.
4. All pages render as the impersonated user would see them.
5. **Red-bordered banner** fixed at top of every page: `⚠ IMPERSONATING Ivan Petrov · Exit impersonation`.
6. Every action performed while impersonating writes BOTH impersonated user ID **and** original SUPER_ADMIN ID to audit log.

**Guardrails:**
- **Cannot impersonate another SUPER_ADMIN.** Prevents Zhan-as-Dymo silent actions — mutual trust preserved.
- **Cannot impersonate a user with PII-viewing intent without written consent** per PDPL. The spec formally states: *"Impersonation for demo, UX debugging, or troubleshooting reproduction is OK. Impersonation to READ the impersonated user's personal data (deal history, financial records, private messages) requires a written consent record (email or in-app attestation from the user) filed in `docs/compliance/pdpl-consents/`. Without consent, impersonation-for-PII-read is a PDPL Article 18 breach-notification trigger."*
- **Session expires 60 min from impersonation start** (shorter than the standard 2-hour SUPER_ADMIN re-auth). Forces intentional re-activation.
- Every impersonation start + every action + impersonation-end writes `AuditLog` entry with event types `IMPERSONATION_START`, `IMPERSONATION_ACTION`, `IMPERSONATION_END`.
- Cross-notification per §14.9: impersonation > 10 min automatically emails the other founder.

**UI:** Red banner uses `rgba(230, 57, 70, 0.15)` background + `#E63946` 2-px border-bottom (per FEASIBILITY_STYLE_GUIDE palette — RED semantic token).

### §14.3 State override (force any state → any state)

**Purpose:** on-the-spot corrections to deals, parcels, commissions, invoices when reality and system diverge during a client meeting.

**Capabilities:**
- **Force any `DealStatus` → any `DealStatus`** — extends Spec 01 `ADMIN_FORCE_TRANSITION` to SUPER_ADMIN role. Skip document-upload gates if reason provided.
- **Force any `ParcelStatus`** change (VERIFIED → PENDING_REVIEW if data discovered wrong post-verify).
- **Force any `CommissionStatus`** (PENDING ⇄ PAID ⇄ REVERSED) with reason.
- **Force any `InvoiceStatus`** (DRAFT → ISSUED even if TRN env missing — flag via reason "TRN provided off-system"; PAID ⇄ REVERSED).
- **Backdate a record's `createdAt` / event timestamp** (see regulatory boundary below).

**Backdate — explicit regulatory boundary:**

> **Backdate is ONLY for correcting late data entry** (e.g., deal was actually signed Mon Jun 22 but entered Tue Jun 23; system timestamp set to Jun 22 + `backdatedAt: true` flag). **Backdating to shift fiscal-year revenue between FTA CT / VAT periods is prohibited.** FTA CT filings reconcile to system dates with `backdatedAt` flag visible; any backdate crossing fiscal-period boundary triggers a mandatory additional review field "I confirm this is a late-entry correction and NOT a fiscal-period shift" that the SUPER_ADMIN must tick + sign off on. Compliance audit will review cross-period backdates quarterly.

**Cannot backdate into the future** (blocked at validation). **Cannot backdate more than 90 days** without a "cross-90-day correction" explicit confirmation.

**Mandatory fields on every state override:**
- `reason` text ≥ 20 chars (server-validated).
- `currentFounder` (Zhan or Dymo — from session).
- `pointerToEvidence` optional (URL, file reference, client email thread).

Every override writes:
- `DealAuditEvent` (for Deal states) — standard Spec 01 path.
- `AuditLog` (Enhancement Proposal §1.A S-1) with event type `SUPER_ADMIN_OVERRIDE`, actor, target entity, from-value, to-value, reason, evidence pointer.

### §14.4 Bulk operations

**Purpose:** ingest / modify large datasets fast (price updates from Excel, mass broker invites, batch parcel seed from DLD).

**Capabilities:**
- **CSV import** for 4 entities: Parcels · Users · Deals · Commissions. Strict column headers required; Zod validation per row; `dry-run` mode previews changes before commit.
- **Dry-run report** — shows count of "would create" / "would update" / "would fail" + per-row error list. User must click "Apply" after reviewing dry-run.
- **Batch operations:**
  - Mass tier change (upgrade 20 Silver ambassadors to Gold).
  - Mass state transition (move 10 stale Deals to DISPUTE_INITIATED after founder review).
  - Batch invoice generation (generate 30 Platform Service Fee invoices for end-of-quarter reconciliation).
  - Mass email via admin UI with template preview (uses existing `src/lib/email.ts` + Resend integration).
- **Preview every action.** Mass email shows 3 sample-recipient previews before send.

**Guardrails:**
- CSV import max 10 000 rows per run (prevent accidental DB overload).
- Dry-run always required for imports > 50 rows.
- Mass email max 500 recipients per batch + 60 s cooldown between batches (Resend rate-limit compliance).
- No CSV import for `AmbassadorApplication`, `AuditLog`, `DealAuditEvent` (append-only tables — per CLAUDE.md NEVER-DELETE rule).
- Every bulk operation writes a single AuditLog entry with `batchSize` + `batchSummary` + dry-run diff preserved.

### §14.5 Direct data interface

**Purpose:** when neither CRUD UI nor CSV import handles an edge case, SUPER_ADMIN can reach deeper — within strict bounds.

**Capabilities:**
- **Read-only SQL shell** at `/super-admin/sql` — accepts `SELECT` queries only. Server-side regex blocks any non-SELECT keyword (`UPDATE`, `DELETE`, `INSERT`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`). Query timeout 30 s. Results truncated to 1 000 rows.
- **Edit any field on any record via form UI** — generic edit form at `/super-admin/edit/<entity>/<id>`; pulls schema from Prisma, renders form for every editable field (excludes `id`, `createdAt`). Exclusions enforced at handler level.
- **Soft delete** — any record CAN be soft-deleted (marked `deletedAt: <timestamp>` + `deletedBy: <superAdminId>` + `deletedReason: text`) but NOT physically removed from DB (CLAUDE.md NEVER-DELETE rule preserved via soft-delete discipline).
- **Restore deleted records within 30-day window** via `/super-admin/restore` — shows all soft-deleted rows, click restore.

**Regulatory boundary — SELECT-only SQL + PII:**

> **Every SQL query is logged** with query text, execution time, row count, actor. **Columns flagged PII** (email, phone, emiratesId, passportNumber, iban, pan, trn, per CLAUDE.md PII:HIGH convention) are detected at parse time; if a query reads any PII column, the AuditLog entry is tagged `PII_READ: true` per PDPL Article 30 data-processing-register requirement. Quarterly PDPL review examines all PII_READ=true entries for proportionality — SUPER_ADMIN must be able to justify business need.

**Schema additions:**
- `User.deletedAt: DateTime?` / `User.deletedBy: String?` / `User.deletedReason: String?`
- Same 3 nullable columns on: Parcel · Deal · Invoice · Commission · AmbassadorApplication · FeatureFlag · TierConfig (all soft-delete candidates).
- Exception: `AuditLog`, `DealAuditEvent`, `ReferralClick` — pure append-only ledgers, never soft-deleted.

### §14.6 Feature bypass

**Purpose:** skip normally-enforced gates when on-the-spot client situations demand.

**Capabilities:**
- **Skip KYC** — approve a user without standard KYC flow (attestation-based).
- **Manual payment override** — mark Invoice PAID without a linked Commission transaction (e.g., client paid cash at meeting).
- **Force deal NOC without document** — set `Deal.nocReceived = true` without uploading NOC file; adds flag `pendingDocsNote` so the hole is visible in admin detail.
- **Tier override** — temporarily grant a user Gold-tier features for a specific deal without full tier subscription (timed grant, expires N days).
- **Rate-limit bypass** — temporarily disable per-route rate-limits on API calls for a named user (e.g., integration partner doing batch work).

**Regulatory boundary — "Bypass KYC" is NOT a FATF bypass:**

> **"Bypass KYC" means the Founder attests that KYC was performed off-system** (bank wire confirmed identity · physical Emirates ID inspection · video call KYC · paper document filed). The attestation field requires: method (bank / email / paper / video) · date · artefact pointer (email thread reference, bank ref, paper archive location). **Under UAE AML Federal Law 10/2025, the obligation to perform KYC on deals > AED 500 k is absolute** — this capability only shifts the record from system to off-system, it does not waive the legal obligation. Every off-system-KYC attestation is logged to `AuditLog` with tag `KYC_OFF_SYSTEM: true` and reviewed by DPO (from Month 6) during monthly compliance check-in.

**Manual payment override — FTA / VAT implications:**

> Cash payment marked via Super-Admin still triggers VAT reporting and (if applicable) 5 % VAT line on the commission invoice. `paymentMethod: "cash"` + `paymentRef: <founder name + date>` stored. VAT reconciles via FTA quarterly filing regardless.

**Every bypass writes AuditLog entry with tag `SUPER_ADMIN_BYPASS` + bypass-type (KYC / PAYMENT / DOC / TIER / RATELIMIT) + reason ≥ 20 chars.**

### §14.7 Session intervention

**Purpose:** help a live user in-session — during onboarding demo, stuck on a form, or emergency access issue.

**Capabilities:**
- **Join user session (co-browsing)** — SUPER_ADMIN sees what the user sees in real-time. Requires user-approval dialog on user side UNLESS "emergency override" flag is used by SUPER_ADMIN (audit-heavy path).
- **Screen share** — SUPER_ADMIN initiates screen share from their session to the user (one-way view, for walking client through steps during demo).
- **Override security blocks** — e.g., user's geo-IP flagged by rate-limiter, SUPER_ADMIN can unblock for 24 h.
- **Live system message to user** — push notification through in-app banner (not email / SMS — those are §47 Notification Engine territory).

**Emergency override flag (co-browsing without user consent):**

> Used ONLY for "user is locked out, cannot approve the dialog themselves" scenarios. Triggers **immediate email notification to the OTHER SUPER_ADMIN** ("Zhan just emergency-overrode to access Dymo's session"). Logged with tag `EMERGENCY_OVERRIDE` — monthly report highlights these for Board review. Abuse = amendment procedure §9 Major tier (all 3 + Rudi).

**Technical note:** co-browsing requires WebSocket or SSE infrastructure not yet present. v1 of this capability can be a simpler "take over as impersonated user with user's explicit click-through" fallback.

### §14.8 "Meeting closes deal" — 5 concrete flows

Real scenarios Dymo / Zhan will face Months 4-9. Each flow maps to specific Super-Admin capabilities and produces a closed / advanced deal in < 5 minutes.

#### Flow 1 · Client signs MOU on the spot (2 minutes total)

**Situation:** Dymo + HNWI client at Jumeirah Bay viewing. Client decides to buy Plot 6457940 at AED 39.5 M. Wants MOU signed now.

**Steps:**
1. Dymo opens `/super-admin/deals/new` on iPad.
2. Selects Parcel (6457940) from search · auto-populated.
3. Enters Buyer name / email / phone (quick form, TRN optional now).
4. Sets `agreedPriceAed = 39_500_000` · `paymentType = CASH`.
5. Clicks "Generate MOU PDF" — jsPDF renders Form F template in ~1 s (pulls seller name from Parcel.owner, buyer from form).
6. Client signs digitally via iPad signature capture + emails auto to seller for cosign.
7. System state: Deal created directly at `AGREEMENT_SIGNED` (bypassing INITIAL + DEAL_INITIATED + DEPOSIT_SUBMITTED) via §14.3 override with reason `"Client signed on-spot; deposit pending collection."`
8. `Deal.mouSigned = true` flag set.
9. DealAuditEvent logged: `SUPER_ADMIN_OVERRIDE · from=null to=AGREEMENT_SIGNED · reason`.
10. Invoice auto-created at `DRAFT` (Spec 02 hook); founder can issue later when commission collected.

**Total time: ~2 minutes.** Alternative (standard flow): 60-90 minutes via client portal signup + email verification + state-machine-step-through.

#### Flow 2 · Different commission split required (90 seconds)

**Situation:** HNWI client insists on 15 % ambassador commission on buyer-side (vs standard 10 % Gold-tier) because ambassador referred a AED 100 M prior deal. One-off accommodation.

**Steps:**
1. Dymo opens existing Deal at `/super-admin/deals/<id>`.
2. Clicks "Override commission rates" (Super-Admin-only button).
3. Sets `l1Pct = 0.15` on the Ambassador commission row about to be created.
4. Reason: "Client-negotiated premium L1 rate for qualified repeat referrer. Rudi email approval 2026-06-15 in `docs/decisions/2026-06-15.md`."
5. Clicks "Apply override + log."
6. AuditLog entry: `SUPER_ADMIN_OVERRIDE · entity=Commission · field=l1Pct · from=0.10 to=0.15 · reason`.
7. Deal proceeds through standard flow; `awardCommissions()` uses the overridden rate for this specific deal.

**Why this needs Super-Admin:** `Commission.rate` is normally immutable per CLAUDE.md Ambassador Program Rules and defaulted from `TierConfig`. One-off override flagged + logged prevents drift into "everyone gets special rates."

#### Flow 3 · Cash deposit received (60 seconds)

**Situation:** Buyer hands Dymo AED 150 000 cash at meeting as deposit ahead of full wire. Needs to reflect in system immediately so seller sees commitment.

**Steps:**
1. Dymo opens Deal at `/super-admin/deals/<id>`.
2. Clicks "Manual payment."
3. `amountFils = 15_000_000_00` · `type = CASH` · `ref = "2026-06-18 Dymo receipt #01"` · reason: `"Pre-MOU cash deposit received in Jumeirah Bay meeting. Paper receipt filed."`
4. Deal state advances `INITIAL → DEPOSIT_SUBMITTED` via §14.3 with `setFlags: { depositPaid: true }`.
5. Invoice auto-generated for AED 150 k at `AGENCY_COMMISSION` subtotal, marked `PAID` at same time.
6. AuditLog entries: `SUPER_ADMIN_OVERRIDE` (state + flag) + `SUPER_ADMIN_BYPASS · type=PAYMENT · reason`.

**FTA / VAT:** Cash payment flows through normal VAT 5 % line on the invoice. FTA filing sees the cash payment.

#### Flow 4 · Custom letter for client's bank (3 minutes)

**Situation:** Client's Swiss private bank requires a bespoke guarantee-letter format before releasing wire. Standard ZAAHI MOU PDF doesn't include their specific clauses.

**Steps:**
1. Dymo opens `/super-admin/templates`.
2. Clicks "New from Template" · picks MOU template as base.
3. Inline editor (rich text + merge-fields) · adds bank's specific clause paragraph + signature block for both Zhan + Dymo as attestors.
4. Clicks "Preview with Deal data" · placeholders auto-filled from Deal + Parcel + Parties.
5. Generates PDF via jsPDF · reviews · "Email to client + CC bank" with template-subject-line.
6. Saves the one-off template to `/super-admin/templates/custom/<deal-id>` for future similar cases.

**Technical note:** template engine v1 = inline HTML textarea + Handlebars-style merge fields. v2 = Monaco editor + live preview. Keeping v1 minimal for Month 4-5 ship.

#### Flow 5 · Post-meeting data correction (45 seconds)

**Situation:** After viewing, realised Parcel area in DB shows 18 432 sqft but DLD re-issued affection plan showing 18 500 sqft. All future feasibility calcs must use updated number.

**Steps:**
1. Zhan opens `/super-admin/parcels/<id>/edit`.
2. Sees all editable fields · updates `area: 18_500`.
3. Reason: `"DLD affection plan re-issued 2026-06-12; new sqft per Plot Guidelines PDF v3. Old affection-plan row retained per append-only rule."`
4. Clicks "Save + trigger recompute."
5. AuditLog entry: `SUPER_ADMIN_OVERRIDE · entity=Parcel · field=area · from=18432 to=18500 · reason`.
6. Background job: re-run `computeBtS` / `computeBtR` on any active FeasibilityScenarios linked to this parcel; flag scenario owners with in-app notification "Plot area updated; feasibility refreshed."

**Audit trail preserved:** previous `AffectionPlan` row stays (CLAUDE.md append-only rule); Parcel.area change linked via AuditLog.

### §14.9 Security guardrails (iron-clad)

Every Super-Admin action MUST satisfy all of:

#### 14.9.1 Audit log — every action captured

Every SUPER_ADMIN operation writes an `AuditLog` row (Enhancement Proposal §1.A S-1). Fields:
- `timestamp` (UTC + UAE time shown)
- `actorId` (SUPER_ADMIN user ID — Zhan or Dymo · never null · never anonymised)
- `actorImpersonating?` (if acting while impersonating, the impersonated user ID)
- `actionType` (enum: IMPERSONATE · STATE_OVERRIDE · BACKDATE · BULK_IMPORT · SQL_READ · FIELD_EDIT · SOFT_DELETE · RESTORE · BYPASS_KYC · MANUAL_PAYMENT · FORCE_DOC · TIER_GRANT · RATELIMIT_BYPASS · EMERGENCY_OVERRIDE · SESSION_JOIN · TEMPLATE_CREATE · OTHER)
- `entityType` + `entityId` (User / Parcel / Deal / Invoice / Commission / FeatureFlag / TierConfig / AmbassadorApplication / ...)
- `fieldName?` (if field-level edit)
- `fromValue?` + `toValue?` (old and new values, redacted for PII columns — only hash stored for those)
- `reason` (text ≥ 20 chars, mandatory for all high-risk actions; optional for SQL_READ)
- `evidencePointer?` (optional URL / file ref)
- `piiRead?` (boolean, set if SQL query or field-edit read a PII column)
- `complianceTags?` (array — `AML_ATTESTATION`, `FISCAL_PERIOD_CROSS`, `PDPL_ARTICLE_18_REVIEW`)

Append-only. Never updated, never deleted. Protected by DB row-level security (non-SUPER_ADMIN cannot read AuditLog).

#### 14.9.2 Cross-notification (Zhan ↔ Dymo)

Any Super-Admin action by Zhan emails Dymo (and vice versa) within 5 minutes:
- Regular ops: **consolidated daily digest** (8:00 UAE) — reduces noise for normal workflow.
- High-risk actions (`EMERGENCY_OVERRIDE`, `BACKDATE` crossing fiscal period, `BYPASS_KYC`, `FORCE_DOC` on deal > AED 10 M): **immediate email** to the other founder + entry in "Requires your awareness" section of the digest.
- Monthly Super-Admin activity report (first Monday of month) summarises every action taken, both founders sign off.

#### 14.9.3 Cannot disable own SUPER_ADMIN

The /super-admin/edit/User/<own-id> form hides the `role` field + server-side handler rejects self-role-change with 400. Prevents accidental lockout. Changing SUPER_ADMIN status requires BOTH founders acting on the target user (mutual cosign model — if Zhan wants to revoke Dymo's SUPER_ADMIN, Zhan proposes + Dymo must confirm from a separate session).

#### 14.9.4 Audit log append-only (Prisma-enforced)

Existing `AuditLog` model (per Enhancement Proposal S-1) lacks explicit append-only enforcement. This spec adds:
- Prisma guard: no `prisma.auditLog.update` / `prisma.auditLog.delete` allowed in codebase. ESLint rule added (`no-restricted-syntax`).
- Database trigger (`BEFORE UPDATE OR DELETE ON "AuditLog" RAISE EXCEPTION`) as second defence.

#### 14.9.5 Time-limited sessions

- **Super-Admin mode re-auth every 2 hours.** At the 2-hour mark, any Super-Admin action prompts re-login (Supabase refresh token + fresh password OR fresh UAE Pass — once UAE Pass integrated Month 7-8 per Spec 01 SV-6).
- **Active session idle timeout = 60 min.** 60 min of no Super-Admin actions → auto-logout from Super-Admin mode (retains regular admin session).
- **Impersonation sessions cap at 60 min** (§14.2).

#### 14.9.6 WireGuard VPN endpoint allowlist (**replaces raw IP allowlist**)

**WireGuard specs:**
- Self-hosted WireGuard server on UAE-resident VM (Etisalat or Khazna), ~AED 150 / month hosting.
- Founders install WireGuard client on laptops + phones (1-time setup ~15 min per device, official WireGuard apps iOS / macOS / Linux all GPL-2 free).
- Each device issued a unique key-pair (e.g., "zhan-macbook", "zhan-iphone", "dymo-ipad", "dymo-macbook").
- Middleware checks incoming request's source IP against **the WireGuard tunnel's internal IP range** (e.g., `10.7.0.0/24`) rather than raw public IPs.
- Access from any coffee shop / airport / hotel works via VPN — no raw-IP allowlist gymnastics.
- **Device revocable** if stolen: Zhan removes the compromised device's public key from the WireGuard server config, reload; device instantly loses access. No app-level session invalidation needed.
- **Static config backup in 1Password** (shared Zhan+Dymo vault) for disaster recovery. Founder reinstall takes 5 min.

**Docs for Zhan implementation:**
- Server: Ubuntu 24.04 LTS · WireGuard `wg-quick` · `AllowedIPs: 10.7.0.0/24` · UDP port 51820 · `PrivateKey` + peer public keys.
- Client config template in `docs/ops/wireguard-client-template.conf` (private — not committed publicly).
- `next.config.ts` middleware addition: check `req.headers['x-forwarded-for']` → match `10.7.0.0/24`; else 403 for `/super-admin/**`.

**Why VPN not raw IP:**
- Raw IP allowlist breaks when founder is on hotel WiFi, café, airport, cellular — WireGuard tunnels from any network.
- Device-level revocation more secure than IP-level (a compromised laptop is locked out immediately; an IP remains valid for anyone at that location).
- Cost negligible vs operational-friction reduction.

#### 14.9.7 Regulatory-boundary summary (explicit)

Collected here for audit-review clarity:

| Capability | Regulatory frame | Boundary |
|---|---|---|
| Bypass KYC (§14.6) | UAE AML Federal Law 10/2025 · FATF | Off-system attestation · NOT a literal waiver · logged `AML_ATTESTATION` |
| Backdate (§14.3) | FTA CT Federal Decree-Law 47/2022 · VAT Federal Decree-Law 8/2017 | Late-data-entry correction only · NEVER fiscal-period shift · flagged `FISCAL_PERIOD_CROSS` if risky |
| SQL read (§14.5) | PDPL Federal Decree-Law 45/2021 Article 30 (data processing register) | SELECT-only · every PII read tagged `piiRead: true` · quarterly DPO review |
| Impersonation (§14.2) | PDPL Article 18 | Demo / troubleshooting OK · PII-read requires written user consent filed |
| Manual payment (§14.6) | FTA VAT + CT | VAT still applies · invoice reconciles to FTA quarterly filing |
| Force doc on Deal (§14.6) | DLD / RERA | Flag `pendingDocsNote` required · deal cannot transition `DEAL_COMPLETED` without real doc (enforced in Spec 01 guard) |

### §14.10 UI design

Per FEASIBILITY_STYLE_GUIDE (2026-04-22) design tokens + red accent for Super-Admin warning overlay.

**Route structure:**
- `/super-admin` — Super-Admin dashboard (overview of recent actions, quick-links to common flows).
- `/super-admin/impersonate` — impersonation selector.
- `/super-admin/deals/<id>` — deal force-override panel.
- `/super-admin/deals/new` — Flow 1 fast-create form.
- `/super-admin/parcels/<id>/edit` — direct field edit form.
- `/super-admin/users/<id>/edit` — user field edit.
- `/super-admin/sql` — read-only SQL shell.
- `/super-admin/bulk` — CSV import / batch ops hub.
- `/super-admin/templates` — document template editor.
- `/super-admin/restore` — soft-deleted restore list.
- `/super-admin/audit` — AuditLog browser with filters.

**Visual warnings:**
- Fixed top banner `⚠ SUPER ADMIN MODE · All actions logged · Exit to normal admin` — RED (`#E63946` 2-px border-bottom) with `rgba(230, 57, 70, 0.12)` background.
- Impersonation adds a second banner below Super-Admin banner (`IMPERSONATING <name>`) — slightly darker red.
- Destructive action buttons (soft-delete, state override, bypass KYC) use RED accent on hover + **double-confirm dialog** ("Type REASON to proceed" — any non-empty 20+ char text passes; the typing action is a deliberate-mode gate).

**Form design:**
- Reuse `<NumberInput>`, `<Row>`, `<ResultRow>`, `<Section>` from `FeasibilityCalculator.tsx` (per FEASIBILITY_STYLE_GUIDE §4.2).
- Glass card baseline (`var(--glass-bg)` + `var(--glass-blur)`).
- Gold for normal labels · red for Super-Admin warning · green for success confirmations.

**Mobile / iPad:**
- Dashboard is primarily iPad-optimised (Dymo's device for on-the-spot actions at meetings).
- Touch targets min 44 × 44 px (Apple HIG).
- Flow 1 (fast deal create) fits one iPad portrait screen without scroll.

### §14.11 Testing criteria

#### Unit tests

- Role check: non-SUPER_ADMIN 403 on `/super-admin/**`.
- Impersonation guard: SUPER_ADMIN cannot impersonate another SUPER_ADMIN (regression).
- State override: every `DealStatus` → every `DealStatus` is legal path (12 × 12 = 144 transitions verified, only backdate-to-future blocked).
- Backdate: date > now rejected 400; date > 90 days past requires explicit `crossThreshold: true`.
- Audit log: every Super-Admin route handler writes AuditLog (snapshot-based assertion).
- SQL shell: every non-SELECT keyword rejected (UPDATE, DELETE, INSERT, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, EXEC, CALL).
- Soft delete: restore within 30 days flips `deletedAt: null`; day 31+ is tombstone-only, restore blocked.
- Self-role-change: SUPER_ADMIN user cannot PATCH own `role` field; 400 response.
- IP / VPN check: non-10.7.0.0/24 source returns 403 on `/super-admin/**`.

#### Integration (Playwright)

- **E2E SA-1 — Flow 1 full cycle.** Seed HNWI client + Parcel. SUPER_ADMIN logs in via WireGuard. Opens `/super-admin/deals/new` · fills form · generates PDF · state = AGREEMENT_SIGNED · audit written · invoice DRAFT created.
- **E2E SA-2 — Emergency override impersonation.** SUPER_ADMIN A triggers emergency override on User X's session · audit written · SUPER_ADMIN B receives email within 60 s.
- **E2E SA-3 — Backdate boundary.** Backdate deal to 31 days past — requires explicit confirmation; backdate crossing fiscal period (2026-12-30 → 2027-01-03) adds `FISCAL_PERIOD_CROSS` tag + mandatory "not fiscal shift" attestation.
- **E2E SA-4 — SQL shell PII flag.** `SELECT email, phone FROM "User"` → audit row tagged `piiRead: true`. DPO monthly review surfaces this entry.
- **E2E SA-5 — Bulk CSV import.** Upload 100-row parcel CSV · dry-run preview · 5 error rows highlighted · apply button creates 95 rows · single AuditLog with `batchSize: 95`.

#### Manual acceptance

- Founder attestation Month 4-5 pre-Plot-1: "I can close a deal on-spot with this Super-Admin in < 5 minutes end-to-end."

### §14.12 Version note · build order

- **Spec 03 v1** (commit `5e49b17`, 2026-04-21): base admin functionality · 5-entity CRUD · feature flags · tier editor.
- **Spec 03 v2** (this version, 2026-04-22): Super-Admin §14 added per founder directive.
- **Build order:**
  - v1 MVP ships first (Month 4, Weeks 8-9) — establishes baseline admin.
  - v2 Super-Admin layer ships atop (Month 4-5, Weeks 9-10 · 2-2.5 eng-weeks).
  - v2 MUST ship before Plot 1 first commission Fri 2026-06-19 Week 9 (Dymo needs Flow 3 "cash deposit" capability live for meeting flows).
- **Cross-spec dependency completeness (v2):**
  - Spec 01 Deal Engine must support `ADMIN_FORCE_TRANSITION` (already in Spec 01 §3.4).
  - Spec 02 Invoice must support `DRAFT → ISSUED` bypass with `pendingTRN: true` flag — add to Spec 02 v1.1 cascading edits.
  - Spec 04 Feasibility unaffected (separate track).

---

**End of SPEC 03 — Admin Panel (v2.0 with Super-Admin extension).**

Next in writing sequence: `04-FEASIBILITY_CALC_V2_SPEC.md`. Execution order per Q-11: Spec 02 → Spec 01 → **this spec** → Spec 04. Within Spec 03 itself: v1 MVP first (Month 4) → v2 Super-Admin layer (Month 4-5, before Plot 1 first commission Fri 2026-06-19).

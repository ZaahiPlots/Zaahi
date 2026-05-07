# ZAAHI Cohort Pilot — Spec v1.0

| | |
|---|---|
| **Title** | Cohort Pilot — Public Registration + Multi-Claim Plots + PDPL |
| **Version** | v1.0 |
| **Date** | 2026-05-07 |
| **Authors** | Жан (Founder, CEO/CTO), Dymo (Co-founder), Agent (drafting) |
| **Branch** | `research/cohort-pilot-spec` (this spec) → implementation on `feat/cohort-pilot` |
| **Status** | DRAFT — pending founder ratify |
| **Master Tree §** | §01 · §14 · §17 · §18 · §19 · §20 · §31 (future) · §75 · §76 · §85 |

---

## 1. METADATA

This spec defines the v1.0 Cohort Pilot launch — opening ZAAHI's gates to
a closed, hand-curated cohort of up to **100 approved users** (10 per
each of 10 roles) across `OWNER · BROKER · DEVELOPER · BUYER · ARCHITECT
· POA · INTERMEDIARY · RELATIVE · REFERRAL · OTHER`.

The spec covers three primary feature streams:

1. **Public Cohort Registration** — `/register` route, 3-step signup,
   admin queue, soft cap with waitlist.
2. **Add Plot** — three flows (DDA, non-DDA, multi-claim).
3. **Find Plot polish + Check DLD defer.**

Plus dependency work: notification-system fix, Ambassador cleanup,
homepage redesign, `/refer` hide, PDPL audit (signed URLs · nicknames ·
private buckets).

Implementation lives on a new branch `feat/cohort-pilot` cut from `main`
at `e647288` (Sprint 9d — Feasibility v6 LIVE on zaahi.io).

**Out-of-scope for v1.0**: blockchain attribution for `/refer`
(deferred), DLD Gateway API (Trakheesi access blocked), KYC API partners
(Trulioo / Onfido) — manual admin review only, multi-language UI (EN
launch only).

---

## 2. EXECUTIVE SUMMARY

ZAAHI ships its first **public, gated registration** to onboard a
hand-curated cohort of real-estate participants in Dubai. Until now the
platform had only the founder team's accounts; cohort pilot opens the
door selectively.

- **Cap**: 100 users hard ceiling = **10 per 10 roles**.
- **Approver**: Жан OR Dymo — either can approve / reject.
- **Self-funded**: no external KYC vendor, no paid attribution
  partner, no third-party API blockers.
- **PDPL-first design**: KYC documents in private bucket with signed
  URLs (TTL 7 days). Public UI surfaces nicknames only; real names
  visible only to admin.
- **Soft cap with waitlist**: 11+ applicant per role lands on
  WAITLIST status; admin can override on approval with warning modal.
- **Existing approved users (Жан + Dymo) auto-migrated**: seeded with
  `RegistrationApplication{status:'APPROVED', autoMigrated:true}` —
  gate logic universal, no `IF createdAt > X` switches.
- **v6 Feasibility calculator preserved byte-identically**: this spec
  touches new routes, models, and a small subset of existing files; the
  calculator and its math layer remain READ-ONLY.

The first 100 cohort users are the proving ground. Scaling beyond
requires a paid KYC vendor (Trulioo / Onfido) and an attribution partner
for `/refer`.

---

## 3. MASTER TREE MAPPING

| § | Topic | This spec covers |
|---|---|---|
| **§01** | Land Parcel | Add Plot · multi-claim model · Title Deed verification flow |
| **§14** | Identity / Multi-tier | Registration · KYC document flow · super-admin role for queue |
| **§17** | Profiles | `User.nickname` · public-vs-admin name visibility |
| **§18** | Brokers / Agencies | `BROKER` role-specific KYC: Emirates ID + RERA card + agency licence + RERA Form A/B per claim |
| **§19** | Developers | `DEVELOPER` role: Trade licence + DLD developer registration + project-specific docs |
| **§20** | Architects / Designers | `ARCHITECT` role: Emirates ID + architect's licence + proof of work |
| **§31** | Deal Engine | Future hook — when Deal-Engine ships, multi-claim provides attribution candidates. v1.0 does NOT touch deal flow. |
| **§75** | Admin Panel | `/admin/queue` — cohort approvals + Title Deed + role verifications, single page with tabs |
| **§76** | Onboarding Flow | `/register` public 3-step entry point, expected SLA 2-3 business days |
| **§85** | Compliance | PDPL: private `registration-docs` bucket · signed URLs · nicknames · audit log review |

---

## 4. ARCHITECTURE OVERVIEW

### 4.1 Data flow

```
                         ┌─────────────────────────────────────────┐
                         │  Public homepage (src/app/page.tsx)     │
                         │  4 elements: Login · Register · Terms · │
                         │  Disclaimer                             │
                         └────────┬───────────────────┬────────────┘
                                  │ Login             │ Register
                                  │ (existing)        │ (NEW)
                                  ▼                   ▼
                  ┌──────────────────────┐    ┌──────────────────────┐
                  │  Supabase Auth       │    │  /register (3 steps) │
                  │  signInWithPassword  │    │                      │
                  │                      │    │  Step 1: basic info  │
                  │  user_metadata       │    │  Step 2: KYC docs    │
                  │    .approved=true    │    │  Step 3: submit      │
                  └──────────┬───────────┘    └──────────┬───────────┘
                             │ session                   │
                             │                           ▼
                             │           ┌────────────────────────────┐
                             │           │  RegistrationApplication   │
                             │           │  (Prisma)                  │
                             │           │  + Supabase Auth signup    │
                             │           │    (approved=false)        │
                             │           │                            │
                             │           │  status =                  │
                             │           │    PENDING_REVIEW          │
                             │           │      OR                    │
                             │           │    WAITLIST (cap full)     │
                             │           └──────────┬─────────────────┘
                             │                      │
                             │                      ▼
                             │      ┌─────────────────────────────────┐
                             │      │  Notify Жан + Dymo              │
                             │      │  (Resend email + Telegram)      │
                             │      └─────────────────────────────────┘
                             │                      │
                             │                      ▼
                             │      ┌─────────────────────────────────┐
                             │      │  /admin/queue                   │
                             │      │  Tabs: Pending · Waitlist ·     │
                             │      │  Approved · Rejected ·          │
                             │      │  TitleDeed · PlotClaim          │
                             │      │                                 │
                             │      │  Approve action:                │
                             │      │   1. RegApp.status = APPROVED   │
                             │      │   2. supabase.auth.admin        │
                             │      │      .updateUser({              │
                             │      │        user_metadata:           │
                             │      │        {approved: true}})       │
                             │      │   3. Email user "approved"      │
                             │      │   4. In-app Notification        │
                             │      └─────────────────────────────────┘
                             │
                             ▼
              ┌────────────────────────────────────────┐
              │  /parcels/map (existing)               │
              │  AuthGuard checks user_metadata        │
              │    .approved === true                  │
              │                                        │
              │  Add Plot button (header) →            │
              │   AddPlotModal (existing) →            │
              │   Three paths:                         │
              │     A: DDA scraper (sync, ~5-10s)      │
              │     B: non-DDA upload                  │
              │     C: multi-claim (plot exists)       │
              └────────────────────────────────────────┘
```

### 4.2 Tech components touched

**NEW**:
- `src/app/register/page.tsx` (or rename: see §6.1 OPEN QUESTION)
- `src/app/admin/queue/page.tsx` + modal components
- `src/app/api/registration/submit/route.ts`
- `src/app/api/admin/registration/[id]/{approve,reject}/route.ts`
- `src/app/api/admin/plot-claim/[id]/{verify,reject}/route.ts`
- `src/app/api/admin/title-deed/[id]/verify/route.ts`
- `src/lib/registration-doc-requirements.ts` (per-role doc lists)
- `src/lib/cap-counter.ts` (cohort cap math)
- Email templates: `registration-received`, `registration-approved`,
  `registration-rejected`, `registration-waitlist`,
  `title-deed-verified`, `claim-verified`,
  `admin-new-application`
- Supabase Storage bucket `registration-docs` (private)

**MODIFIED**:
- `src/app/page.tsx` — strip Ambassador promo + link, update sign-up role select to 10 roles, rename "Sign Up" → "Register" CTA
- `src/app/parcels/map/AddPlotModal.tsx` — extend Owner flow to all
  10 roles with role-specific doc requirements; surface multi-claim
  branch when parcel exists
- `src/app/parcels/map/page.tsx` — Find Plot polish (empty state +
  "Add Plot" CTA when no result); minor surface only
- `src/app/api/parcels/submit/route.ts` — accept new role enum values,
  create `PlotClaim{status:PENDING}` instead of just owner-on-Parcel
- `src/app/api/parcels/seed-dda/route.ts` — create `PlotClaim` row when
  Parcel created via DDA flow
- `src/app/api/users/sync/route.ts` — drop `resolveReferrer` /
  `wouldCreateCycle` calls (read `zaahi_ref` cookie deletion)
- `src/app/api/deals/[id]/route.ts` — drop `awardCommissions` /
  `reverseCommissions` calls; add TODO for Phase B blockchain
- `prisma/schema.prisma` — see §5

**DELETED** (Ambassador cleanup):
- `src/lib/ambassador.ts`, `src/lib/ambassador-plans.ts`
- `src/app/ambassador/`, `src/app/join/`, `src/app/r/[code]/`
- `src/app/api/ambassador/*` (5 route folders: activate, commissions,
  qr, register, stats, tree)
- `src/app/admin/ambassadors/*` (4 files: page.tsx,
  ApplicationDetailModal.tsx, ApproveConfirmModal.tsx, RejectModal.tsx)

**READ-ONLY (NEVER touch)**:
- `src/app/parcels/map/FeasibilityCalculator.tsx` (v5 — already
  invariant since Sprint 0)
- `src/lib/feasibility.ts` (v5 math)
- `src/components/feasibility/*` (v6 calculator components)
- `src/lib/feasibility-v6/*` (v6 math + escrow + IRR + recommendations)
- `src/components/AuthGuard.tsx` — auth pattern proven by Sprint 1.5
- `src/app/page.tsx` auth flow logic (Supabase signInWithPassword) —
  surgical edits only to hide Ambassador surfaces and add Register CTA
- `src/app/parcels/map/page.tsx` — 3D ZAAHI Signature buildings,
  fill-extrusion-opacity rules, all MapLibre code. Find Plot polish
  is the ONLY allowed touch on this file.
- ZAAHI 3D Signature buildings, podium/body/crown rules, setbacks
- "Parcels never deleted" invariant (CLAUDE.md)
- Master Tree (`MASTER_TREE_final.md`) — never edit
- Investor package (`docs/investor-package/*`)

---

## 5. DATA MODEL

### 5.1 `UserRole` enum extension

Migration: **additive**. Old enum values preserved deprecated to keep
existing rows valid.

```prisma
enum UserRole {
  // Cohort v1.0 official roles (10):
  OWNER
  BROKER
  DEVELOPER
  BUYER
  ARCHITECT
  POA
  INTERMEDIARY
  RELATIVE
  REFERRAL
  OTHER
  ADMIN          // Жан + Dymo only

  // Deprecated (pre-cohort, kept for existing rows):
  INVESTOR       // pre-cohort; auto-migrate to BUYER on next user touch
}
```

Migration name: `cohort_pilot_user_roles_extension`.

### 5.2 `User.nickname` column

```prisma
model User {
  // ... existing fields ...
  nickname  String?  @unique  // public-facing handle. Default = email-prefix on first login.

  // NOTE: existing `name` column stays — that's the real name from
  // KYC. Keep visible to admin only. Never expose in public APIs.
}
```

Default-population strategy: on `/api/users/sync` first call for a
user, if `nickname IS NULL`, set `nickname = email.split('@')[0]` (with
de-dup suffix `-2`, `-3`, … if collision). Idempotent.

Migration adds the column NULLable; backfill happens lazily on next
auth touch.

### 5.3 `RegistrationApplication` model (NEW)

```prisma
model RegistrationApplication {
  id              String    @id @default(cuid())
  // FK to User. The User row is created in Supabase Auth at signup
  // with user_metadata.approved=false. Prisma User row gets created
  // when /api/users/sync runs (post-login). Until then userId is NULL.
  userId          String?   @unique
  user            User?     @relation(fields: [userId], references: [id])

  // Application contents (entered at /register)
  email           String    @unique
  nickname        String                   // unique-checked at submit
  roleApplied     UserRole
  // KYC docs uploaded to Supabase Storage `registration-docs` bucket.
  // Format: array of { kind, signedUrl, originalName, sizeBytes,
  //                    contentType, uploadedAt }
  documentsJson   Json
  // Only populated when roleApplied = REFERRAL.
  // Shape: { directContact: boolean, intermediariesCount: 0 | 1 | 2 | 3 }
  // intermediariesCount: 3 = "3 or more"
  referralPath    Json?

  // Workflow state
  status          RegistrationStatus @default(PENDING_REVIEW)
  approvedById    String?            // admin user id who acted
  approvedAt      DateTime?
  rejectedById    String?
  rejectedAt      DateTime?
  rejectionReason String?

  // Migration flag — true for Жан + Dymo seeded entries; never visible
  // in admin queue (filtered out).
  autoMigrated    Boolean   @default(false)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([roleApplied, status])      // for cap counter queries
  @@index([status, createdAt])         // for admin queue list ordering
  @@index([email])
}

enum RegistrationStatus {
  PENDING_REVIEW    // initial state
  APPROVED
  REJECTED
  WAITLIST          // soft cap reached at submit time
}
```

**Cap counter query** (for `/admin/queue` header + on submit):

```sql
SELECT roleApplied, COUNT(*) AS approved_count
FROM "RegistrationApplication"
WHERE status = 'APPROVED' AND autoMigrated = false
GROUP BY roleApplied;
```

`autoMigrated=false` filter: founder/Dymo seeded entries don't count
toward the 10-per-role cap.

### 5.4 `PlotClaim` model (NEW)

```prisma
model PlotClaim {
  id              String   @id @default(cuid())
  parcelId        String
  parcel          Parcel   @relation(fields: [parcelId], references: [id])
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  roleAtClaim     UserRole              // the role this user claims for THIS plot
  priceAed        BigInt                // user's stated price for this plot, fils
  status          ClaimStatus
  // Documents uploaded for this claim. Same shape as RegistrationApplication.
  documentsJson   Json?

  // Verification (only for verifiable roles)
  verifiedById    String?
  verifiedAt      DateTime?
  rejectionReason String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([parcelId])
  @@index([userId])
  @@index([status])
}

enum ClaimStatus {
  PENDING          // verifiable role awaiting admin review
  VERIFIED         // verifiable role admin-approved
  SELF_DECLARED    // non-verifiable role; ALWAYS displayed with note
  REJECTED         // admin rejected with reason
}
```

**Constraints / invariants**:
- The first claim is created at `Parcel.create` time. `Parcel.ownerId`
  = first claim's `userId`. Subsequent claims add rows; ownerId stays.
- `roleAtClaim` may differ from the user's `RegistrationApplication.roleApplied`
  (e.g., a registered BROKER may join a plot as a RELATIVE).
- Verifiable vs self-declared per Q5 ratification:

| Role | Status on submit | Required docs |
|---|---|---|
| OWNER | `PENDING` | Title Deed |
| BROKER | `PENDING` | RERA Form A/B for this plot |
| DEVELOPER | `PENDING` | DLD developer registration for this project |
| ARCHITECT | `PENDING` | Architect's licence + proof of work |
| POA | `PENDING` | POA document |
| BUYER | `SELF_DECLARED` | none required |
| INTERMEDIARY | `SELF_DECLARED` | none required |
| RELATIVE | `SELF_DECLARED` | none required |
| REFERRAL | `SELF_DECLARED` | none required |
| OTHER | `SELF_DECLARED` | none required |

### 5.5 `Parcel` additions

```prisma
model Parcel {
  // ... existing fields ...
  verifiedOwnerUserId  String?
  verifiedAt           DateTime?
  verifiedById         String?      // admin who verified
  // ... existing relations ...
  claims               PlotClaim[]
}
```

`verifiedOwnerUserId` is set when an OWNER PlotClaim transitions to
VERIFIED. The Parcel can have only ONE verified owner at a time
(invariant enforced in API logic, not DB).

### 5.6 What stays dormant (NOT deleted)

Per founder direction:

- `Commission` table — historical attribution data, blockchain Phase B will read it
- `AmbassadorApplication` table — old applications archived, never new inserts
- `ReferralClick` table — analytics archive
- `User.referralCode`, `User.referredById`, `User.referredAt`,
  `User.ambassadorActive` columns — kept dormant

### 5.7 Migration plan

Single migration: `20260507_cohort_pilot_v1`

1. ALTER TYPE `UserRole` ADD VALUE for each new role (Postgres allows
   adding enum values; idempotent if checked first).
2. ALTER TABLE `User` ADD COLUMN `nickname TEXT UNIQUE`.
3. CREATE TABLE `RegistrationApplication` with indexes.
4. CREATE TYPE `RegistrationStatus`, `ClaimStatus`.
5. CREATE TABLE `PlotClaim` with indexes.
6. ALTER TABLE `Parcel` ADD COLUMNS `verifiedOwnerUserId`,
   `verifiedAt`, `verifiedById`.
7. **Seed step (in migration `data` SQL)**: for every existing
   approved user (Жан + Dymo and any others), insert a
   `RegistrationApplication{status:'APPROVED', autoMigrated:true,
   userId:<their.id>, email:<their.email>, nickname:<derived>,
   roleApplied:'ADMIN', documentsJson:'[]'}`.
8. **Backfill PlotClaim**: for every existing Parcel,
   `INSERT INTO PlotClaim (parcelId, userId, roleAtClaim, priceAed,
   status) SELECT id, ownerId, 'ADMIN', currentValuation, 'VERIFIED'
   FROM Parcel WHERE ownerId IS NOT NULL`.
9. Migration runs via `npx prisma migrate deploy` per CLAUDE.md.

---

## 6. REGISTRATION FLOW (3 steps)

### 6.1 Route name

**OPEN QUESTION**: founder said "выбрать /register или /signup". This
spec commits to `/register`. If founder prefers `/signup`, swap; no
other code changes.

### 6.2 Step 1 — basic info

**Form fields**:
- Email (required, format-validated, dedup-checked against `User.email`
  AND `RegistrationApplication.email`)
- Phone (optional, recommended; format `+?[0-9\s-]{7,20}`)
- Nickname (required, unique-checked against `User.nickname`)
- Role select (required, dropdown of 10 roles with descriptive labels)

**Conditional**: if `role === REFERRAL`, expand a `referralPath`
sub-form:
- Radio group:
  - "Direct contact with the owner"
  - "1 intermediary between me and the owner"
  - "2 intermediaries"
  - "3 or more intermediaries"

Mapped on submit to:
```ts
{
  directContact: <radio === 'direct'>,
  intermediariesCount: 0 | 1 | 2 | 3   // 3 = "3+"
}
```

**Validation**:
- Email format (Zod email)
- Phone format if provided
- Nickname: 2-40 chars, alphanumeric + `_-`, unique
- Role: must be one of 10 (server-side enum check)

Step 1 stores form state client-side (no submit yet).

### 6.3 Step 2 — role-specific docs

Doc requirements per role (mirror `src/lib/registration-doc-requirements.ts`):

| Role | Required documents |
|---|---|
| OWNER | Emirates ID **AND** Title Deed (at least one in system) |
| BROKER | Emirates ID **AND** RERA card **AND** agency licence |
| DEVELOPER | Trade licence **AND** DLD developer registration |
| ARCHITECT | Emirates ID **AND** architect's licence |
| POA | Emirates ID **AND** POA document |
| BUYER | Emirates ID **OR** passport |
| INTERMEDIARY | Emirates ID **OR** passport |
| RELATIVE | Emirates ID **OR** passport |
| REFERRAL | Emirates ID **OR** passport |
| OTHER | Emirates ID **OR** passport |

**Multi-file support per kind**: each doc kind accepts multiple files
(e.g., front + back of Emirates ID). UX: drag-drop zone per kind with
file list + remove button.

**File constraints** (mirror existing `AddPlotModal` pattern):
- Max 10 MB per file
- Allowed MIME: `application/pdf`, `image/jpeg`, `image/png`,
  `image/webp`
- Path in bucket: `<userId-from-Supabase-Auth>/<kind>-<timestamp>.<ext>`

Upload happens to **bucket `registration-docs`** (NEW, private). See
§5.7 Storage section §12.

### 6.4 Step 3 — submit

**Server flow** (`POST /api/registration/submit`):

```
1. Validate Zod schema (email, phone, nickname, role, referralPath if
   role===REFERRAL, documentsJson)
2. Dedup check: email + nickname not in use anywhere
3. Doc requirement check: per-role minimum docs present
4. Cap check (using §5.3 query):
   const approved = countApprovedForRole(roleApplied)
   const status = approved >= 10 ? 'WAITLIST' : 'PENDING_REVIEW'
5. Supabase Auth signup:
   await supabase.auth.admin.createUser({
     email, password: <generated-temp>,
     email_confirm: false,    // user verifies email separately
     user_metadata: { approved: false, nickname }
   })
6. Insert RegistrationApplication{
     userId, email, nickname, roleApplied, documentsJson,
     referralPath, status
   }
7. Email user (Resend):
     - if PENDING_REVIEW: 'registration-received' template
     - if WAITLIST: 'registration-waitlist' template
8. Telegram admin notification (Resend silent on missing key — must
   not block):
     'New <ROLE> application from <nickname> (status: <status>) — open queue'
9. Return { applicationId, status, expectedReviewByDate }
```

**Confirmation page** shown to user post-submit:
- "Заявка получена" / "Application received"
- Status (PENDING_REVIEW or WAITLIST)
- Expected SLA: "2-3 business days" (per founder Q-D.4 mitigation)
- Email check reminder (verify your email link from Supabase)
- Link back to homepage

### 6.5 Email verification

User must verify email (Supabase magic link) before login is possible
even if approved. Two gates: `email_confirmed_at IS NOT NULL` AND
`user_metadata.approved === true`.

---

## 7. ADMIN QUEUE (`/admin/queue`)

### 7.1 Auth gate

Admin queue accessible **only** to users where:
- `user.role === 'ADMIN'` AND
- `user_metadata.approved === true`

Implementation: a new helper `getAdminUserId(req)` in `src/lib/auth.ts`
(extends existing pattern — `getApprovedUserId` already there). Adds
the role check on top.

Currently Жан + Dymo are the only admins. Founder may add a third
later (out-of-scope for v1.0).

### 7.2 Page structure

```
┌────────────────────────────────────────────────────────────────┐
│  /admin/queue                                                  │
├────────────────────────────────────────────────────────────────┤
│  Cap counter header (per-role, color-coded):                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ OWNER 3/10 | BROKER 8/10 | DEVELOPER 0/10 | BUYER 5/10  │  │
│  │ ARCHITECT 1/10 | POA 0/10 | INTERMEDIARY 2/10 |          │  │
│  │ RELATIVE 0/10 | REFERRAL 9/10 (yellow) | OTHER 11/10 (red)│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Tabs:                                                         │
│  [All] [Pending] [Waitlist] [Approved] [Rejected]              │
│  [TitleDeedVerification] [PlotClaimVerification]               │
│                                                                │
│  Filter / sort row:                                            │
│  [Search by nickname / email]   [Sort: newest first ▾]         │
│                                                                │
│  List (rows):                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ <nickname>  [BROKER badge]  Submitted 2026-05-08         │  │
│  │ Status: PENDING_REVIEW                          [Open ▸]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ...                                                           │
└────────────────────────────────────────────────────────────────┘
```

### 7.3 Cap counter colors

| Approved count | Color | Visual |
|---|---|---|
| 0–7 | gray (default) | `--text-secondary` |
| 8–9 | yellow | `--amber` `#E67E22` |
| 10 | red | `--red` `#E63946` |
| 11+ | red + warning icon `⚠` | overcap state |

`autoMigrated=true` rows (Жан + Dymo) are EXCLUDED from cap counts
(see §5.3 query).

### 7.4 Detail modal

Click "Open ▸" on a list row → modal:

```
┌───────────────────────────────────────────┐
│  Application — <nickname> (BROKER)        │
├───────────────────────────────────────────┤
│  Submitted: 2026-05-08 14:23 GST          │
│  Status: PENDING_REVIEW                   │
│                                           │
│  Real name (admin only): Иван Иванов     │
│  Email: ivanov@example.com (verified)    │
│  Phone: +971 50 123 4567                  │
│  Role applied: BROKER                     │
│                                           │
│  Documents (signed URLs, TTL 7d):         │
│  ┌──────────────────────────────────┐     │
│  │ [📄 Emirates ID] open ▸           │     │
│  │ [📄 RERA card] open ▸             │     │
│  │ [📄 Agency licence] open ▸        │     │
│  └──────────────────────────────────┘     │
│                                           │
│  Referral path: N/A                       │
│  (only shown for REFERRAL role)           │
│                                           │
│  [Approve] [Reject + reason] [Cancel]     │
└───────────────────────────────────────────┘
```

**Approve action** (`POST /api/admin/registration/[id]/approve`):
1. If status was WAITLIST → confirm modal "This will exceed cap of
   10 ROLE (currently 11/10). Continue?"
2. `RegistrationApplication.status = 'APPROVED'` + `approvedById` +
   `approvedAt`
3. `supabase.auth.admin.updateUser(userId, { user_metadata:
   { approved: true } })`
4. Email user: `registration-approved` template
5. In-app `Notification.create({ userId, type: 'REGISTRATION_APPROVED',
   ... })`

**Reject action** (`POST /api/admin/registration/[id]/reject`):
- Body: `{ reason: string }` (required, max 500 chars)
- Update status, `rejectedById`, `rejectedAt`, `rejectionReason`
- Email user: `registration-rejected` template
- Optionally: mark Supabase Auth user as banned (`banned_until` far
  future) — DEFER to v1.1, just leave them un-approved for v1.0.

### 7.5 Tabs: TitleDeedVerification & PlotClaimVerification

Same modal pattern, different actions:
- **TitleDeedVerification**: filter `Parcel WHERE
  verifiedOwnerUserId IS NULL AND any PlotClaim WHERE
  roleAtClaim='OWNER' AND status='PENDING'`. Detail modal previews
  Title Deed PDF, "Verify OWNER" sets `Parcel.verifiedOwnerUserId`,
  `claim.status='VERIFIED'`, `verifiedAt`, `verifiedById`. Email user
  "Title Deed verified".
- **PlotClaimVerification**: filter `PlotClaim WHERE status='PENDING'`.
  Per-claim detail modal previews uploaded role docs, "Verify ROLE"
  sets `claim.status='VERIFIED'` etc. Email user "Claim verified".

---

## 8. ADD PLOT FLOW (3 paths)

### 8.1 Entry point

Existing `AddPlotModal.tsx` — header button on `/parcels/map`. Modal
extended in v1.0 with role-aware step tree.

### 8.2 Path A — DDA plot (sync)

User enters: plot number (5-10 digits) + price (AED).

Server (`POST /api/parcels/seed-dda`, existing):
1. DDA scraper chain (token → polygon → PlotInfo HTML → building
   limit). Sync, ~5-10 sec.
2. UPSERT Parcel.
3. UPSERT AffectionPlan (latest version).
4. **NEW**: insert `PlotClaim{parcelId, userId, roleAtClaim:<user's
   default role>, priceAed, status: <PENDING if verifiable else
   SELF_DECLARED>}`.
5. If a PlotClaim already exists for the parcel → `409 Conflict
   { error: 'plot_already_claimed', parcelId }`. UI redirects to
   multi-claim flow (Path C).

UI: loading spinner with "Fetching DDA records..." text (5-10 sec).

### 8.3 Path B — non-DDA plot

User enters:
- Plot number + price + district select (free-text, per existing UX)
- Required uploads per role:
  - **OWNER**: Title Deed PDF + Affection Plan PDF (with stated
    coordinates)
  - **BROKER**: RERA Form A or B for this plot + Affection Plan PDF
  - **DEVELOPER**: developer registration doc + Affection Plan
  - others: Affection Plan + role-specific (if applicable)

Server (`POST /api/parcels/submit`, existing — extended):
1. Validate role-specific docs.
2. Create Parcel with `status='PENDING_VERIFICATION'`.
3. Create AffectionPlan (parsed from upload — existing `parseAffectionPlan`
   logic if PDF; else just store raw URL).
4. Create `PlotClaim{status:'PENDING'}` (verifiable) or `'SELF_DECLARED'`
   (non-verifiable).
5. Email admin: 'admin-new-application' template with parcel context.

Admin queue surface this in `PlotClaimVerification` tab.

### 8.4 Path C — multi-claim (plot exists)

UX: when user enters a plot number that already has a Parcel row, the
modal switches to multi-claim view:

```
┌───────────────────────────────────────────┐
│  Plot 6457940 — Dubai Hills (RESIDENTIAL) │
│                                           │
│  Existing claims:                         │
│  ┌──────────────────────────────────┐     │
│  │ owner-zhan (OWNER, verified)     │     │
│  │ AED 18,500,000 · joined 2026-04-12│     │
│  │ ✓ Verified by admin              │     │
│  └──────────────────────────────────┘     │
│  ┌──────────────────────────────────┐     │
│  │ broker-dymo (BROKER, verified)   │     │
│  │ AED 19,200,000 · joined 2026-04-15│     │
│  │ ✓ Verified by admin              │     │
│  └──────────────────────────────────┘     │
│                                           │
│  ─────────────────────────────────        │
│  Add your claim                           │
│                                           │
│  Your role for this plot: [select ▾]      │
│  Your price (AED):       [_________]      │
│  Documents: (per role requirements)       │
│  [Upload Emirates ID] [Upload RERA card]  │
│                                           │
│  [Add claim]   [Cancel]                   │
└───────────────────────────────────────────┘
```

Server (`POST /api/parcels/[id]/claim`, NEW):
1. Validate caller has `user_metadata.approved`.
2. Validate role-specific docs.
3. Check no existing PlotClaim for `(parcelId, userId)` — one user
   = one claim per plot (invariant).
4. Insert `PlotClaim{status:'PENDING' or 'SELF_DECLARED'}`.
5. Email admin if PENDING.

UI on parcel SidePanel + `/parcels/[id]` shows all claims; verified
claims have a green checkmark badge, self-declared have a gray "i"
badge with hover text "Self-declared, not verified".

---

## 9. FIND PLOT

### 9.1 Existing behaviour audit

`src/app/parcels/map/page.tsx` lines ~4504-4567 contain `find`,
`findOpen`, `findError`, `findBusy` state and `doFind()` function.
Behaviour:
- Input on map header: plot number
- `doFind()` calls (presumably) `/api/parcels/by-plot-number/[N]` or
  similar
- On success: flyTo + open SidePanel
- On miss: `setFindError("Plot not found")`

This works today. v1.0 polishes empty-state UX only.

### 9.2 Polish

When `findError === "Plot not found"`:
- Show a 1-line empty-state: "Plot <N> not found in ZAAHI database."
- Add CTA: "Add this plot →" — opens AddPlotModal pre-populated with
  plot number.

Implementation: small JSX delta inside the existing search popover.

---

## 10. CHECK DLD

DLD Gateway API (Trakheesi) blocked: AED 30k/year fee + RERA approval
required. **Defer until business decision to pay**.

**v1.0 fallback**: keep existing button if it exists. If it currently
opens DLD's public website, leave it — pre-fill plot number in the URL
if possible.

Code comment to add at the click handler:

```ts
// TODO: DLD Gateway API integration when Trakheesi access granted.
// Tracked in research/check-dld-trakheesi-fee.md (TBD).
```

No spec changes beyond this comment.

---

## 11. NOTIFICATION SYSTEM

### 11.1 Required env vars

Set on Vercel Production scope:

```
RESEND_API_KEY              = re_xxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL                  = noreply@zaahi.io
TELEGRAM_BOT_TOKEN          = 1234567890:ABCDEF...
TELEGRAM_ADMIN_CHAT_IDS     = 12345678,87654321  (Жан, Dymo — comma-separated)
```

**ACTION REQUIRED FROM FOUNDER (Phase B prerequisites)**:
1. Resend account: get API key from https://resend.com → API keys.
2. Resend domain verification: add DKIM records for `zaahi.io` (DNS
   in Namecheap).
3. Telegram BotFather: `/newbot` → token. Both Жан + Dymo `/start`
   the bot, get chat IDs from `getUpdates`.
4. Vercel env vars set.

`src/lib/email.ts` and `src/lib/telegram.ts` already silent-skip when
env missing (warn-once). Code changes: **none**. Just env vars.

### 11.2 Multi-recipient Telegram support

`src/lib/telegram.ts` currently reads single `TELEGRAM_ADMIN_CHAT_ID`.
Extend to comma-separated `TELEGRAM_ADMIN_CHAT_IDS` parsed on call.
Backwards-compat: if `TELEGRAM_ADMIN_CHAT_ID` (singular) set, use it;
else parse `TELEGRAM_ADMIN_CHAT_IDS`. Loop over IDs, send to each.

### 11.3 Email templates

Re-use existing `src/lib/email-templates/_layout.ts` brand wrapper.
New / replaced templates:

| Template | Trigger | Recipient | Subject |
|---|---|---|---|
| `registration-received` | `/register` submit, status PENDING_REVIEW | applicant | "Welcome to ZAAHI — your application is in review" |
| `registration-waitlist` | `/register` submit, status WAITLIST | applicant | "ZAAHI cohort is full — you're on the waitlist" |
| `registration-approved` | admin approve action | applicant | "Your ZAAHI account is active" |
| `registration-rejected` | admin reject action | applicant | "Your ZAAHI application — update" |
| `title-deed-verified` | admin verifies Title Deed PlotClaim | claimant | "Your plot ownership is verified" |
| `claim-verified` | admin verifies role PlotClaim | claimant | "Your role on plot <N> is verified" |
| `admin-new-application` | every new RegistrationApplication / PlotClaim | Жан + Dymo | "New <role> application from <nickname>" |

All templates parametric: `{ nickname, role, applicationId, queueLink, ... }`.

### 11.4 Telegram messages

Concise (Telegram 4096 char limit, but 200-300 chars optimal):

```
📨 New BROKER application from broker-ivanov (b3af9d…)

Status: PENDING_REVIEW
Submitted: 2026-05-08 14:23 GST

Open queue → https://www.zaahi.io/admin/queue
```

### 11.5 Smoke test endpoint

Create `src/app/api/_test-notify/route.ts` (TEMPORARY):
- POST → calls `sendEmail` + `sendTelegram` with test payloads
- Auth-gated (`getAdminUserId`)
- Returns `{ email: { ok | skipped | error }, telegram: { ok |
  skipped | error } }`

**Delete this endpoint after smoke**, before cohort launch.

---

## 12. PDPL COMPLIANCE

### 12.1 Bucket structure

| Bucket | Visibility | Path pattern | Used for |
|---|---|---|---|
| `documents` (existing) | Mixed (RLS) | `<userId>/<plotNumber>/<kind>-<ts>.<ext>` | Plot-related: Title Deed, RERA, affection plan |
| `registration-docs` (NEW) | **PRIVATE** | `<userId>/<kind>-<ts>.<ext>` | KYC: Emirates ID, passport, agency licence |

### 12.2 RLS policies

**`documents` bucket**:
- `INSERT`: `auth.uid()::text = (storage.foldername(name))[1]` — user
  uploads to own folder
- `SELECT`: signed URL only for KYC-related kinds; public read for
  parcel documents that are part of LISTED Parcels (existing
  behaviour preserved)

**`registration-docs` bucket** (NEW):
- `INSERT`: `auth.uid()::text = (storage.foldername(name))[1]`
- `SELECT`: **only via signed URL**; no anonymous public access

Bucket creation through Supabase dashboard (NOT a Prisma migration).
Policies set via SQL migration in `supabase/migrations/<ts>_registration_docs.sql`.

### 12.3 Signed URL strategy

KYC docs (in `registration-docs`):
- Generated via `supabase.storage.from('registration-docs').createSignedUrl(path, 60 * 60 * 24 * 7)` (7 days)
- Regenerated on every admin queue detail-modal open (URL not cached
  in Prisma; Prisma stores `path` only)

Plot docs (in `documents`):
- For LISTED parcels, public URL OK (existing behaviour)
- For PENDING_VERIFICATION parcels, signed URL only (admin queue
  preview)

### 12.4 Real-name leak audit checkpoints

Real names (`User.name`) MUST NEVER appear in:
- Public API responses (`/api/parcels/*`, `/api/parcels/by-plot-number/*`)
- Public-facing JSX components (parcel detail page, SidePanel, map
  hover cards)
- `ActivityLog.actorName` field (use `nickname` instead)
- Email sent to OTHER users (recipient sees their own real name in
  greeting OK; sender's real name never leaked)
- Telegram broadcasts to admin: name OK (admin-only)
- Server logs: name should NEVER appear in `console.log` (CLAUDE.md
  rule: NEVER log PII)

Audit step in Phase C Step 11 (PDPL audit) walks every API response
shape + every JSX component on public routes.

### 12.5 Nickname enforcement

Every public `User` JSON serialization must:
- INCLUDE `nickname`
- EXCLUDE `name`, `phone`, `email`

A helper `serializeUserPublic(user): { id, nickname, role, avatarUrl?,
companyName?, reraLicense? }` in `src/lib/serialize.ts` (NEW). Every
API that returns a user uses this.

---

## 13. AMBASSADOR CLEANUP

### 13.1 Strategy

**Do NOT merge `feat/referral-coming-soon`.** That branch was created
before Sprint 0 of Feasibility v6; merging it would conflict with
Sprint 1.5 SidePanel changes and Sprint 9 calculator additions.

**Cherry-pick approach**: on the new `feat/cohort-pilot` branch, do
the deletions manually. Same destination state, clean diff, no merge
artefacts.

### 13.2 Files to delete

```
src/lib/ambassador.ts
src/lib/ambassador-plans.ts
src/app/ambassador/page.tsx
src/app/join/page.tsx
src/app/r/[code]/   (entire folder)
src/app/api/ambassador/activate/
src/app/api/ambassador/commissions/
src/app/api/ambassador/qr/
src/app/api/ambassador/register/
src/app/api/ambassador/stats/
src/app/api/ambassador/tree/
src/app/admin/ambassadors/page.tsx
src/app/admin/ambassadors/ApplicationDetailModal.tsx
src/app/admin/ambassadors/ApproveConfirmModal.tsx
src/app/admin/ambassadors/RejectModal.tsx
```

### 13.3 Call sites to clean up

**`src/app/api/deals/[id]/route.ts`** (PATCH on COMPLETE):
- Currently calls `awardCommissions(...)` and `reverseCommissions(...)`
- Replace with: `// TODO: blockchain attribution — Phase B`
- Keep `Deal.platformFeeFils` freeze logic (founder direct: dormant
  data for Phase B).

**`src/app/api/users/sync/route.ts`**:
- Currently reads `zaahi_ref` cookie + calls `resolveReferrer` /
  `wouldCreateCycle`
- Remove cookie read + the function calls
- User.referralCode / referredById columns stay NULL for cohort users
- (Existing dormant rows from Ambassador era keep their values)

### 13.4 What to keep

- Prisma tables: `Commission`, `AmbassadorApplication`, `ReferralClick`
- Prisma columns on `User`: `referralCode`, `referredById`,
  `referredAt`, `ambassadorActive`
- (No `src/lib/referral.ts` yet on `main`; if it exists later from
  blockchain Phase B, that's a separate ship)

### 13.5 Branch state

`feat/referral-coming-soon` branch left untouched on `origin`. NOT
renamed to `archive/*` in this spec — that's a separate housekeeping
task, low priority. Spec mentions it for context only.

---

## 14. HOMEPAGE REDESIGN (`src/app/page.tsx`)

### 14.1 Final state

**4 main UI elements**:
1. **Login** — existing email/password form, signInWithPassword
2. **Register** — link to `/register` (replaces "Become an Ambassador")
3. **Terms** — footer link `/terms`
4. **Disclaimer** — footer link `/disclaimer`

Footer ALSO has **Privacy** link (3 footer links: Terms · Privacy ·
Disclaimer per founder Q3).

### 14.2 Visual style — UNCHANGED

- Live MapLibre satellite map with backdrop-blur
- Glassmorphism shell (rgba navy bg + 24px blur + gold-tinted border)
- Georgia serif for "ZAAHI" logotype
- Gold accent `#C8A96E`

### 14.3 Surgical edits to `src/app/page.tsx`

**Delete**:
- Lines ~161-209 — Ambassador promo banner ("Become a ZAAHI Ambassador
  — Earn on every land deal" sticky-top)
- Lines ~419-426 — "New to ZAAHI? Become an Ambassador →" link to
  `/join`

**Modify**:
- Sign-up tab logic: rename internal `mode === 'signup'` button label
  to "REGISTER"
- Sign-up role select dropdown: replace 5 hardcoded options
  (Owner/Buyer/Broker/Investor/Developer) with all 10 cohort roles.
  **OPEN QUESTION 14a**: founder's earlier instruction implied the
  full registration form moves to `/register`. Should the inline
  signup tab be removed entirely from homepage in favour of a "Register
  →" CTA that opens `/register`? Recommendation: **YES, move full
  signup to `/register`** — the homepage signup tab can't host 3-step
  KYC flow. Inline tab becomes "REGISTER →" link.

### 14.4 Auth flow logic — UNTOUCHED

`signInWithPassword` call, `useRouter` redirect logic, error handling
— stay byte-identical.

---

## 15. `/refer` HIDE

### 15.1 Current state on `main`

The `/refer` route does NOT exist on `main`. The `ReferralWaitlist`
Prisma model does NOT exist on `main`. Both are only on
`feat/referral-coming-soon` branch (never merged).

### 15.2 Action

**Nothing.** The founder's directive "оставить в репо, скрыть UI и
routes" applies if `/refer` was already deployed — it wasn't. So this
spec does **not** create a `/refer` route, does **not** create
`ReferralWaitlist` model, does **not** add Coming Soon page.

`feat/referral-coming-soon` branch retains the `/refer` artefact for
future extraction when blockchain attribution is ready (Phase B).

### 15.3 Footer link audit

If any production link points to `/refer` (it shouldn't, given /refer
isn't on main), grep + remove. As of the discovery, no `/refer`
references on main.

---

## 16. SEQUENCING (for Phase C, Жан coding)

**Buffer factor 1.5×** applied to discovery estimates.

| # | Step | Hours | Notes |
|--:|---|---:|---|
| 1 | **Notification env vars + smoke** | 1.5 | Resend domain DKIM, Telegram bot, Vercel env vars set, smoke endpoint test, delete smoke endpoint. **Blocker for everything.** |
| 2 | **Branch + Ambassador cleanup** | 4.5 | New branch `feat/cohort-pilot` from `main` (`e647288`). Delete files + clean call sites per §13. Compile clean + smoke. |
| 3 | **Homepage cleanup + 10 roles** | 1.5 | `src/app/page.tsx` Ambassador removal + role select update. "REGISTER" link to `/register`. |
| 4 | **Prisma schema + migration + seed** | 3 | `cohort_pilot_v1` migration: enum extension, User.nickname, RegistrationApplication, PlotClaim, Parcel verifications, seed Жан + Dymo, backfill PlotClaim for existing parcels. Apply on staging DB. |
| 5 | **Storage `registration-docs` bucket + RLS** | 1 | Supabase dashboard create + SQL RLS migration. Document credentials path. |
| 6 | **Public `/register` flow (3 steps)** | 9 | New route + 3-step UX + `/api/registration/submit` + cap counter + Supabase Auth signup + first email/Telegram. |
| 7 | **Admin queue `/admin/queue`** | 6 | Clone `/admin/ambassadors` pattern. Tabs, cap counters, detail modal, approve / reject / verify actions. `getAdminUserId` helper. |
| 8 | **Add Plot existing flow audit** | 3 | Verify `AddPlotModal` survives Ambassador cleanup. Verify DDA scraper (`/api/parcels/seed-dda`) end-to-end. Verify Find Plot. |
| 9 | **Multi-claim Add Plot UI** | 4.5 | Path C in §8.4 — UI surfacing existing claims + add-claim form + `POST /api/parcels/[id]/claim`. |
| 10 | **Title Deed + role verification flow** | 3 | Admin queue tabs for verifications. Verify modal UX. Update `Parcel.verifiedOwnerUserId`, `PlotClaim.status`. Email user. |
| 11 | **PDPL audit + signed URLs migration** | 3 | Switch buckets to private RLS. Replace `getPublicUrl()` calls for KYC with `createSignedUrl()`. Audit ActivityLog, public APIs, JSX. `serializeUserPublic` helper. |
| 12 | **Smoke + deploy** | 1.5 | End-to-end smoke on dev: signup → admin approve → user login → add plot → multi-claim. PDPL spot-check. Build clean, push to main, monitor 30 min. |

**Total: ~42 hours = 8-10 working days at ~5 h/day.**

**Critical path**: Step 1 (notifications) → Step 4 (schema) → Step 6
(/register) → Step 7 (/admin/queue). Steps 8-10 can run in parallel
after Step 4.

**Each step = atomic commit + smoke test** before proceeding. NO push
to `main` until all 12 steps green and founder review of the staging
deploy.

---

## 17. RISKS & MITIGATIONS

### From discovery section D + additions:

| # | Risk | Mitigation |
|--:|---|---|
| R1 | **v6 Calculator regression** — accidental edit to `FeasibilityCalculator.tsx` or v6 components. | Read-only invariant per §4.2. Smoke after each commit (`/parcels/map` → click parcel → expand Feasibility section → spot-check). |
| R2 | **PDPL real-name leaks** in 5 known points (Q-D.2). | Step 11 audit walks every public API + JSX. `serializeUserPublic` helper enforces shape. |
| R3 | **Bus factor on approvals** — only Жан + Dymo. | SLA = "2-3 business days". Telegram out-of-band notification. Auto-email reminder if PENDING > 5 days. |
| R4 | **DDA scraper sync 5-10s UX** — user waits in modal. | Loading spinner with "Fetching DDA records...". Async queue is overkill for cohort scale. |
| R5 | **`feat/referral-coming-soon` orphan branch** — confusing in repo. | Out-of-scope housekeeping, TODO for archival rename. |
| R6 | **Existing Жан/Dymo accounts** broken by gate logic. | Migration step 7 seeds `RegistrationApplication{APPROVED, autoMigrated:true}`. Gate logic universal. |
| R7 | **`/api/deals/[id]` PATCH on COMPLETE breaks** after `awardCommissions` removed. | Replace with noop + TODO comment. No production deals exist yet (verified). |
| R8 | **`/api/users/sync` breaks** after `resolveReferrer` removed. | Clean removal of cookie-read + function calls. Existing user rows unaffected (dormant columns stay). |
| R9 | **Cap soft + WAITLIST behaviour confuses user.** | Clear email copy: "your application is on the waitlist for Cohort 2". Status shown on confirmation page. |
| R10 | **Resend domain DKIM not yet verified** at deploy time. | Block Step 1 smoke until verified. Founder action prerequisite. |
| R11 | **Telegram chat IDs unknown** — Жан + Dymo must `/start` bot first. | Documented in §11.1 ACTION REQUIRED. |
| R12 | **PlotClaim invariants drift** — multi-claim semantics evolve. | Single Parcel can have multiple claims; only ONE `verifiedOwnerUserId`. Enforced in `/api/admin/title-deed/verify` route logic, not at DB level. |
| R13 | **Bug found in `/parcels/new` stub redirect** (Q-D.5). Not a current bug, but if cohort needs an "Add Plot" link from a dashboard, redirect target stale. | TODO comment; route the dashboard CTA to `/parcels/map?action=add` explicitly. |
| R14 | **`SYSTEM_USER_ID` in `seed-dda`** — fixed UUID `00000000-0000-0000-0000-00000000zaah`. If user row missing, route fails. | Verify exists in Supabase Auth + Prisma User; insert if missing as part of Step 4 seed. |

### Bugs discovered (NOT fixed per spec rules):

- `src/app/page.tsx` line ~421-425: hardcoded `/join` reference. Will
  break once `/join` route deleted in Step 2; Step 3 fixes by replacing
  with `/register`.
- `SYSTEM_USER_ID` collision risk above.
- `/parcels/new` stub may need a more useful redirect target.

---

## 18. ACCEPTANCE CRITERIA (founder review checklist after Phase C)

### Homepage
- [ ] 4 main CTAs visible: Login (form), Register (link), Terms,
      Disclaimer (footer)
- [ ] Footer has 3 links: Terms · Privacy · Disclaimer
- [ ] No Ambassador promo banner anywhere
- [ ] Glassmorphism + gold #C8A96E + Georgia serif preserved
- [ ] Live MapLibre satellite map renders behind shell

### Registration flow
- [ ] `/register` accepts all 10 cohort roles
- [ ] Per-role doc requirements enforced
- [ ] REFERRAL role expands `referralPath` sub-form correctly
- [ ] Nickname unique-check works
- [ ] Soft cap enforced: 11+ → status WAITLIST, email shows correct copy
- [ ] Confirmation page shows expected SLA "2-3 business days"

### Notifications
- [ ] Жан + Dymo receive email on every new application
- [ ] Жан + Dymo receive Telegram message with link to `/admin/queue`
- [ ] User receives "received" / "approved" / "rejected" /
      "waitlist" emails per state
- [ ] Email + Telegram silent-skip if env vars missing (no crash)

### Admin queue
- [ ] `/admin/queue` reachable only by Жан + Dymo (admin role)
- [ ] All 7 tabs render: All / Pending / Waitlist / Approved /
      Rejected / TitleDeedVerification / PlotClaimVerification
- [ ] Cap counter shows per-role with correct colors (gray / yellow /
      red / red+warning)
- [ ] `autoMigrated=true` rows excluded from cap count
- [ ] Detail modal shows real name (admin only)
- [ ] Detail modal shows uploaded docs via signed URLs (TTL 7d)
- [ ] Approve action: status update + Supabase Auth update +
      email + in-app Notification
- [ ] Reject action: status + reason + email
- [ ] Approve from WAITLIST: confirm modal "exceeds cap, continue?"

### Add Plot
- [ ] Path A (DDA): plot number → 5-10 sec scrape → Parcel + AffectionPlan
      + first PlotClaim created
- [ ] Path B (non-DDA): role-specific docs accepted, Parcel
      `PENDING_VERIFICATION`, PlotClaim PENDING
- [ ] Path C (multi-claim): existing claims listed with verified
      badges, "Add your claim" form works
- [ ] Verifiable roles → admin verify → "Verified ROLE" badge
- [ ] Self-declared roles → "Self-declared, not verified" pill

### PDPL
- [ ] All KYC URLs signed (no `getPublicUrl` for `registration-docs`)
- [ ] Public APIs return only nicknames (not real names)
- [ ] `registration-docs` bucket private (anonymous SELECT denied)
- [ ] ActivityLog uses nicknames

### Backwards-compat (regression)
- [ ] v6 Feasibility calculator works identically pre-spec
- [ ] ZAAHI Signature 3D buildings render
- [ ] Жан + Dymo can logout/login, retain `approved` status
- [ ] Existing parcels (114) display on `/parcels/map`

---

## OPEN QUESTIONS surfaced during writing

1. **Q14a**: Should the inline signup tab on `/` be removed entirely
   in favour of a "Register →" CTA that opens `/register`? **Spec
   recommendation**: YES (homepage tab can't host 3-step KYC). Confirm
   on Phase C kickoff.

2. **Q6.1**: `/register` vs `/signup` — spec commits to `/register`
   per founder Q1 latitude.

3. **Q11.6**: Resend domain DKIM verification status — past chats
   indicated in-progress. Confirm complete before Step 1.

4. **Q12.6**: For `documents` bucket, how to differentiate "public
   parcel docs" (LISTED parcels) vs "PENDING_VERIFICATION docs"
   (signed URL only)? Recommendation: separate folder prefix
   `<userId>/<plotNumber>/public/<kind>...` vs
   `<userId>/<plotNumber>/private/<kind>...`. RLS policy reads
   second-from-end folder name.

5. **Q5.5**: `verifiedOwnerUserId` may differ from `Parcel.ownerId`
   (the original creator) — when user A creates a Parcel via DDA but
   user B later joins as OWNER and gets verified, who owns the Parcel
   row? **Spec recommendation**: `Parcel.ownerId` stays as creator;
   `verifiedOwnerUserId` is the source-of-truth for ownership.
   Display shows "Verified Owner" prominently; the original creator
   has no special UI status beyond their PlotClaim.

---

**End of spec v1.0.** Ready for founder ratify → Phase B (env var
prerequisites + branch creation) → Phase C (implementation per §16
sequencing).

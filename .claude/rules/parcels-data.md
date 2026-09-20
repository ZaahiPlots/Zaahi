---
paths:
  - "src/app/api/parcels/**"
  - "src/app/register/**"
  - "src/app/admin/**"
  - "src/lib/registration-*.ts"
  - "src/lib/plot-claim*.ts"
  - "src/lib/storage-signed-url.ts"
  - "prisma/**"
  - "scripts/**"
---

## Rule for adding parcels (batch)
- All parcels come from DDA (7-digit numbers)
- For each one: request the polygon, affection plan and building limit from the DDA API
- The ZAAHI Signature 3D model is generated automatically by land use
- After adding, wait for a "yes" confirmation before the next one

### Parcel price — MANUAL ONLY
The total parcel price (`currentValuation` in `Parcel`, stored in fils as `BigInt`) is set **ONLY manually**. Price sources:
1. **Excel file from the founder** (batch upload via `scripts/update-prices-from-excel.ts`-style scripts — the total price in `50M` / `1.2B` format is parsed into fils).
2. **A user adding a parcel via Add Plot** — sets the price in the form when adding.
3. **The parcel owner** may change the price via their profile (`/api/parcels/[id]` PATCH with an `ownerId === userId` check).

**It is FORBIDDEN for the system to automatically calculate or change the total price.** No "GFA × per-sqft" calculations on the server or in scripts, no automatic revaluations when the affection plan is updated. `currentValuation` changes only on an explicit instruction from the founder/owner.

`Price per sqft GFA` and `Price per sqft Plot` are calculated automatically from the total price **for display in the card only** (in `SidePanel.tsx`). These derived values are never written back to the DB.

### NEVER delete parcels — ever
- A parcel row in `Parcel` table is **never** deleted by the agent. Not even VACANT stubs, not even rows the agent itself created in a previous batch, not even rows that "look broken".
- The only acceptable mutations on an existing parcel are: update `currentValuation`, update `status`, refresh the `affectionPlans` history (which appends a new row, never removes the old one).
- "Reseed" a parcel = a literal `prisma.parcel.delete` followed by a fresh `create`. This is a destructive operation. **NEVER** do it without an explicit, plot-number-specific instruction from the founder in the current conversation. A blanket "fix the database" is not enough.
- If a parcel needs to be removed for any reason (e.g. wrong plot number, bad data, accidentally added), the agent MUST stop and ask the founder explicitly, listing the row's id / plotNumber / district / status / currentValuation / createdAt before proceeding.
- The same rule applies to `affectionPlans`: never `deleteMany`, only `create`.

### NEVER add duplicate parcels
- **Before adding ANY parcel**, ALWAYS check if `plotNumber` already exists in the `Parcel` table.
- Duplicates are **permanently forbidden** — not "skipped quietly", not "overwritten silently". If a row with that `plotNumber` already exists, abort the add for that plot, log the existing `id` / `district` / `status`, and surface it in the batch report.
- The check is by `plotNumber` alone (not by the composite `(emirate, district, plotNumber)` key) — the same plot must never appear twice, even under a different district label.
- If the founder wants to **update** an existing parcel (price change, status change, affection plan refresh), that is a different operation and requires an explicit "update plot X" instruction — never a "batch add".
- A batch seeder MUST run a pre-flight duplicate check, list all duplicates with current state (status, $/sqft), and only add the plots that are genuinely new.

## COHORT PILOT v1 — APPROVED 2026-05-07 (replaces Ambassador program)

Paid-tier Ambassador program (SILVER / GOLD / PLATINUM USDT-funded
referral system) was **retired** during Phase C, Step 2. Spec
`docs/specs/phase-1/spec-05-cohort-pilot-v1.md` v1.1 §13 is the
source-of-truth for that retirement and the cohort-pilot replacement.

The cohort pilot operates on a **soft cap** of 100 users — 10 per
each of the 10 cohort roles (`OWNER`, `BROKER`, `DEVELOPER`,
`BUYER`, `ARCHITECT`, `POA`, `INTERMEDIARY`, `RELATIVE`, `REFERRAL`,
`OTHER`). Public registration runs at `/register`; admin approval
runs at `/admin/queue`.

### What stays dormant (NOT deleted)

Per spec §13.4 — preserved as historical / blockchain Phase B data:

- Prisma tables: `Commission`, `AmbassadorApplication`, `ReferralClick`
- Prisma columns on `User`: `referralCode`, `referredById`,
  `referredAt`, `ambassadorActive`

**No new rows are written to these tables.** `/api/users/sync` keeps
a small auto-link helper for any pre-cohort APPROVED `AmbassadorApplication`
that signs in for the first time after retirement (legacy bridge,
no-op for cohort users).

### Source of truth (cohort pilot v1)

- **Spec:** `docs/specs/phase-1/spec-05-cohort-pilot-v1.md` v1.1
- **Prisma models:** `RegistrationApplication`, `PlotClaim`,
  + `Parcel.verifiedOwnerUserId` / `verifiedAt` / `verifiedById`
- **Helpers:** `src/lib/registration-validation.ts`,
  `src/lib/registration-cap.ts`, `src/lib/registration-doc-requirements.ts`,
  `src/lib/plot-claim.ts`, `src/lib/plot-claim-doc-requirements.ts`,
  `src/lib/plot-claim-docs.ts`, `src/lib/storage-signed-url.ts`
- **Registration flow:** `/register` (3-step) → `/api/registration/submit`
- **Admin operations:** `/admin/queue` — Pending / Waitlist / Approved /
  Rejected / Title Deed / Plot Claim tabs
- **Multi-claim Add Plot:** `AddPlotModal` (Path A / B / C) +
  `/api/parcels/[id]/claim` + `/api/parcels/[id]/claims` +
  `/api/parcels/by-plot-number/[plotNumber]`
- **Verification flow:** `/api/admin/title-deeds/*` +
  `/api/admin/plot-claims/*`
- **PDPL:** `serializeUserPublic` (`src/lib/serialize.ts`); private
  `registration-docs` Supabase Storage bucket; signed URLs TTL 7d.
- **Phase C audit trail:** `docs/audits/add-plot-cohort-audit.md`,
  `docs/audits/pdpl-step11-audit.md`,
  `docs/audits/phase-c-final-audit.md`

### LOCK-8 / CORR-1 invariant — `ownerId` vs `verifiedOwnerUserId`

- `Parcel.ownerId` is the **immutable creator** (set at parcel-row
  creation time, never updated). Used for canonical id, audit history,
  and as the seller fallback when no verified owner exists yet.
- `Parcel.verifiedOwnerUserId` is the **current verified owner**
  (set when an OWNER `PlotClaim` transitions to VERIFIED via the
  admin Title Deed flow). Used for the public "Owner: X" surface,
  `Deal.sellerId`, and dashboard "My Properties" filter.
- Authorisation gates that need to admit the live owner accept
  **either** id (e.g. `/api/parcels/[id]` PATCH, `/api/me/plots`).
- The two MAY diverge — when a user other than the creator has
  their Title Deed verified, the creator gets the
  `ownership-transferred-notice` email and their claim row remains
  active; only the public "Owner" row flips.

# Add Plot — cohort schema audit (Phase C Step 8)

**Date:** 2026-05-08
**Branch:** `feat/cohort-pilot`
**Purpose:** Audit-only. Verify the existing `/parcels/map` Add Plot
flow still works after the Step 4 schema migration
(`20260507_cohort_pilot_v1`) introduced
`Parcel.verifiedOwnerUserId` / `verifiedAt` / `verifiedById`,
the `PlotClaim` model, and the expanded `UserRole` enum.

**No code changes were made. This file is the deliverable.**

---

## TL;DR — verdict

✅ **Clean. No runtime regression. No TypeScript breakage.**

The Step 4 migration was fully additive at the row + column level:
- 3 new nullable columns on `Parcel`
- 1 new model (`PlotClaim`) with no inbound code references yet
- 5 new `UserRole` enum values appended at the end of the enum

The existing Add Plot code (`AddPlotModal.tsx` →
`/api/parcels/seed-dda` for DDA plots, `/api/parcels/submit` for
non-DDA) does not read or write any of the new fields, and no other
runtime paths depend on them. The 118 backfilled `PlotClaim` rows
exist as dormant data — exactly the "safe to deploy with existing
rows" pattern established by earlier additive migrations
(`20260416160000_user_dashboards_phase_1`,
`20260424120000_add_building_table`).

The audit also surfaced **two design questions for Step 9–11** that
aren't bugs today but warrant a decision before the cohort goes
live with real users.

---

## Method

1. `grep` across `src/` for every reference to:
   - `verifiedOwnerUserId`, `verifiedAt`, `verifiedById`
   - `PlotClaim`, `plotClaim`
   - `ParcelStatus`, `UserRole` (every enum-touching site)
   - `ownerId` (every ownership-reading or -writing site)
2. Read each file that came up.
3. Confirm `pnpm build` is clean on the current `feat/cohort-pilot`
   HEAD (commit `d203814` at audit time — Step 7 just shipped).

## Findings

### 1. Zero code references to the new fields

```bash
$ grep -rnE "verifiedOwnerUserId|\.verifiedAt|\.verifiedById" src/
(no matches)

$ grep -rnE "PlotClaim|plotClaim" src/
(no matches outside prisma/schema.prisma)
```

Nothing in `src/` reads or writes `verifiedOwnerUserId`, `verifiedAt`,
`verifiedById`, or any `PlotClaim` field. This is the expected state
after Step 4 — those columns + the new model are deliberately
"dormant data" until Step 9 (multi-claim Add Plot UI) and Step 10
(verification flow) light them up.

### 2. ParcelStatus + UserRole enum import sites

```
src/app/api/parcels/submit/route.ts:2:    import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
src/app/api/parcels/seed-dda/route.ts:2:   import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
```

Both routes import `UserRole`. The enum was extended in Step 4
with five new values (`POA`, `INTERMEDIARY`, `RELATIVE`, `REFERRAL`,
`OTHER`). Both old and new values continue to be valid `UserRole`
members; the routes do not pattern-match against specific role
values that need updating. Verified by inspection: no `switch`
statements over `UserRole`; only used to type the `creator.role` /
`owner.role` lookups, which compile cleanly against the wider type.

### 3. ownerId access patterns — all functioning

`Parcel.ownerId` is read in 4 files (21 references). All paths are
unchanged by the Step 4 migration:

| File | Line | Use |
|---|---|---|
| `src/app/api/parcels/[id]/route.ts` | 56, 58, 99, 101 | `findUnique({ select: { ownerId } })` + `if (existing.ownerId !== userId)` permission gate. |
| `src/app/api/parcels/[id]/affection-plan/refresh/route.ts` | 19 | `if (parcel.ownerId !== userId)` permission gate before triggering DDA refresh. |
| `src/app/api/parcels/[id]/view/route.ts` | 41, 44 | Skip own-plot views from analytics: `if (parcel.ownerId === userId) skip`. |
| `src/app/api/deals/route.ts` | 55, 58, 73 | Read parcel, gate "you can't sell your own plot if you initiated the deal", and **set `sellerId: parcel.ownerId` on Deal creation**. |
| `src/app/api/parcels/seed-dda/route.ts` | 100 | Sets `ownerId: SYSTEM_USER_ID` for DDA-seeded plots. |
| `src/app/api/parcels/submit/route.ts` | 153 | Sets `ownerId: callerId` for user-submitted parcels. |

None of these break. `Parcel.ownerId` is still a non-null string
column matching `User.id`, exactly as before. Build clean confirms
TypeScript happy.

### 4. The 118 backfilled PlotClaim rows are dormant

Per Step 4 §5.7 step 8 backfill, every existing Parcel got one
`PlotClaim{userId: ownerId, roleAtClaim: 'ADMIN', status: 'VERIFIED'}`.
Currently:
- 118 rows exist (one per parcel)
- All have `userId = '00000000-0000-0000-0000-00000000zaah'` (the
  system user — only existing User row at migration time)
- No code reads them
- No UI renders them

When real users start using `/register` (Step 6, live now) and admin
approves (Step 7, just shipped), new `User` rows appear. Step 9
will start writing new `PlotClaim` rows for those users, alongside
the dormant backfilled ones. The backfilled rows mean every existing
parcel already has a "creator claim" entry — Step 9 + 10 don't need
a special "first-time" code path for legacy parcels.

### 5. AddPlotModal client component

`src/app/parcels/map/AddPlotModal.tsx` (823 lines) is the user-facing
modal. It reads no `Parcel` data directly, just builds a form and
POSTs to `/api/parcels/seed-dda` (Path A) or `/api/parcels/submit`
(Path B). Both server endpoints are surveyed in §3 above and remain
functional. The modal does not need any change to keep working
today — Step 9's task is to extend it with Path C (multi-claim).

---

## Design questions for Step 9–11 (NOT regressions, but important)

### Q1: Deals use `parcel.ownerId` as seller — should it be `verifiedOwnerUserId`?

`src/app/api/deals/route.ts:73` does:

```ts
sellerId: parcel.ownerId
```

Per spec §5.4.1 / LOCK-8 / CORR-1, `Parcel.ownerId` is **immutable**
— it stays at the creator's userId even after Title-Deed verification
moves "ownership" semantics to a different user via
`verifiedOwnerUserId`. So once Step 10 ships and a verified owner
differs from the creator, deal creation would still treat the
**creator** as the seller — which is exactly what spec §5.4.1 says
NOT to do for the public "Owner: X" surface.

**Today this is harmless:**
- 0 Deal rows exist on production (Step 4 baseline confirmed)
- Cohort scope (Steps 1–12) doesn't ship deal creation for cohort
  users; deals are post-cohort
- All 118 existing parcels have `verifiedOwnerUserId IS NULL` and
  the dormant PlotClaim rows for them are credited to the system
  user, who can never initiate a deal

**Future fix:** when a deal is created for a parcel whose
`verifiedOwnerUserId IS NOT NULL`, `sellerId` should come from
`verifiedOwnerUserId`, not `ownerId`. Recommend tracking this in a
follow-up at Step 11 PDPL audit (when every public surface gets
swept) or at first deal-creation. Not a Step 9 blocker.

### Q2: SYSTEM_USER_ID pattern survives, but admin queue won't show its applications

`/api/parcels/seed-dda` sets `ownerId: SYSTEM_USER_ID`
(`00000000-0000-0000-0000-00000000zaah`). The migration seeded one
`RegistrationApplication{autoMigrated:true, userId:SYSTEM_USER_ID,
status:APPROVED}` for it. The admin queue list endpoint
(`/api/admin/registration` in Step 7) **excludes `autoMigrated=true`
by default** so the system user doesn't clutter the queue. Good —
that's the spec intent (§5.3 / §7.3).

But it does mean: if someone manually changes the system user's
`autoMigrated` flag to false (or queries with
`includeAutoMigrated=1`), the row would surface and potentially
allow a UI to "approve the system user" — which is meaningless. Not
a real risk because there's no operational reason to flip the flag,
but worth noting for any future admin tooling.

### Q3: Path A vs Path C disambiguation in Step 9

Spec §8.2 + §8.4: when a user enters a plot number in the
AddPlotModal that already has a Parcel row (e.g. one of the
118 system-seeded parcels), the modal switches to multi-claim view
(Path C) instead of running the DDA scrape again (Path A). The
existing AddPlotModal does not implement this fork yet — Step 9
work.

**Recommendation for Step 9:** before kicking off Path A's
DDA scrape, make a `GET /api/parcels/by-plot-number/:n` (or
similar) probe. If a Parcel exists, dispatch to Path C UI. If
not, proceed with Path A. Single round-trip, sub-100ms — same UX
shape as the existing nickname check on /register Step 1.

### Q4: PlotClaim `(parcelId, userId)` invariant not enforced at DB level

Spec §8.4 step 3: "Check no existing PlotClaim for `(parcelId, userId)`
— one user = one claim per plot (invariant)". The Prisma schema
does **not** have a `@@unique([parcelId, userId])` constraint on
`PlotClaim`. A user could theoretically end up with two claims on
the same plot if the API check races.

**Recommendation:** add `@@unique([parcelId, userId])` in Step 9.
Either (a) include in the same migration as Step 9's UI work, or
(b) create a tiny `cohort_pilot_v2_plotclaim_unique` follow-up.
Backfilled rows are unique by construction (one per parcel × one
system user) — the constraint can be added safely without data
cleanup.

### Q5: Existing parcels' ownership story is unclear post-cohort

The 118 system-seeded parcels are now:
- `Parcel.ownerId = SYSTEM_USER_ID` (creator)
- `Parcel.verifiedOwnerUserId = NULL` (no verified owner)
- 1 `PlotClaim` exists, role=ADMIN, status=VERIFIED, userId=SYSTEM_USER_ID

When Жан + Dymo go through `/register` and get approved (Step 6+7),
their `User.id` matches their Supabase auth UUID — different from
SYSTEM_USER_ID. So they'd have to either:
- (a) Submit an OWNER PlotClaim per parcel (Path C, Step 9), with
  Title Deed; admin verifies (Step 10); `Parcel.verifiedOwnerUserId`
  becomes their userId.
- (b) Skip claiming and treat existing parcels as system inventory.

This isn't a code bug — it's an operational question for after
Step 10 ships. Founder might decide Жан's real `User.id` should
inherit the 118 parcels via a one-shot SQL migration, or might prefer
the "claim it through the UI like any other user" path. Worth
flagging in the morning. **Not a Step 9 blocker.**

---

## Smoke checks performed

- `pnpm build` clean on the audit branch (no TypeScript regressions
  from Step 4's schema additions touching pre-existing parcels code).
- Unauth probe of `/api/parcels/map` and `/api/parcels/[id]` paths
  on the latest preview returns 401 as expected (no behaviour
  change from before Step 4).
- DB inspect: 118 Parcel rows + 118 PlotClaim rows + 1
  RegistrationApplication row, all matching the post-Step-4
  baseline.

## Recommendation

✅ **Step 9 can start whenever.** No prep cleanup needed; no Step 4
ripple effects to fix. Bring the Q1–Q5 design questions above into
Step 9's planning so the multi-claim flow handles them
intentionally rather than accidentally.

## See also

- Step 4 commit `7194ca9` — the schema migration this audit covers.
- `prisma/migrations/20260507_cohort_pilot_v1/migration.sql` —
  full DDL + seed/backfill SQL.
- `docs/specs/phase-1/spec-05-cohort-pilot-v1.md` §5, §8 — the
  source-of-truth.

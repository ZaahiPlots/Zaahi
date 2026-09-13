# 2026-09-13 — Admin: pause a user's subscription — Phase 1 (recon, no code)

Branch: `feat/admin-pause-subscription` (off `main` @ `5561a9f`, HTTPS fetch).
Prompt: `~/Downloads/PROMPT_admin_pause_subscription.md`. `feat/masterplans-layer` left as is.
Phase 1 = recon + same-day fallback + proposal, then STOP. Phase 2 waits for "go".

## Instructions received

1. "Read ~/Downloads/PROMPT_admin_pause_subscription.md and execute Phase 1 only."
   (First attempt 2026-09-13: file did not exist in either download folder → reported and
   stopped. Second attempt: file present.)

## 1. Access model as it exists

**Identity / approval flag — Supabase Auth, not Prisma.**
- `user_metadata.approved` on `auth.users`. Set `false` at signup
  (`src/app/api/registration/submit/route.ts:289`), flipped `true` by the admin approve route
  through the service-role client (`src/app/api/admin/registration/[id]/approve/route.ts:170-176`,
  client `src/lib/supabase-admin.ts:17-20`, `SUPABASE_SERVICE_ROLE_KEY`).
- Server gate `getApprovedUserId` (`src/lib/auth.ts:47-53`): Bearer → `supabase.auth.getUser(token)`
  (a live GoTrue call on every request, `:51`) → `user_metadata.approved !== true → null` (`:53`)
  → then a Prisma `user.upsert` (`:62-79`). Used by **51** route files. `getSessionUserId`
  (`:30-36`, no approval check) is used by 1 route (`src/app/api/parcels/[id]/view/route.ts`).
  `getAdminUserId` (`:99-114`) = approved + founder email (`:7, :108`) or Prisma `role === ADMIN` (`:114`).
- Middleware `src/middleware.ts:37-50`: Bearer *presence* only, no verification; public
  `/api/auth`, `/api/notify-admin`, `/api/registration` (`:24-28`) and GET/HEAD `/api/layers/*` (`:44`).
- Client guard `src/components/AuthGuard.tsx:24-34`: reads the localStorage session (no network),
  `approved !== true` → `signOut()` + `router.replace('/')`.
- Sign-in `src/app/page.tsx:125-133`: `signInWithPassword` succeeds, then `approved !== true` →
  `signOut()` + "REQUEST SUBMITTED" pending screen. Auto-redirect for approved sessions `:33-42`.

**Prisma `User` (`prisma/schema.prisma` model User): no status / active / tier field.**
Fields: `id` (= auth uid), `email`, `role UserRole`, `name`, `nickname`, `phone`, profile fields,
`lastSeenAt`, `ambassadorActive` (dormant program), relations. `UserRole` = 10 cohort roles +
`PROJECT_MANAGER` + `ADMIN` (Zhan + Dymo only) + deprecated `INVESTOR`.
`RegistrationApplication.status` (`RegistrationStatus` `PENDING_REVIEW | APPROVED | REJECTED |
WAITLIST`, `:643, :660-665`) is *application* state, linked by `userId` (`:626`, nullable until
first login) — not an account switch, and founders/legacy users have no application row.

**Admin surface.** `/admin` landing (`src/app/admin/page.tsx`), gated by `src/app/admin/layout.tsx:30`
probing `/api/admin/me` (`src/app/api/admin/me/route.ts`). `/admin/queue`
(`src/app/admin/queue/page.tsx:38-55`) lists **RegistrationApplication** rows by status (Pending /
Waitlist / Approved / Rejected) + Title Deed + Plot Claim verification. **There is no User list and
no per-user action after approval.** Admin link in the map header: `src/app/parcels/map/page.tsx:8155-8163`.

**How main's last model addition was applied** (`3d31cb9`, `FeedbackSubmission`): a **handwritten,
additive migration** in `prisma/migrations/20260904120000_feedback_submission_throttle/` applied
with `prisma migrate deploy`; `prisma migrate dev` was explicitly NOT run because `DATABASE_URL`
on this box points at production. Phase 2 follows the same route.

## 2. Existing switch — YES: `user_metadata.approved = false`

Supabase Dashboard → Authentication → Users → the user → **User Metadata** → set `"approved": false`
(leave `role`, `nickname` as they are) → Save. Reverse: set `true`.

Effect, from the code above:
- **API**: the very next request → `getUser` returns fresh metadata → `getApprovedUserId` = null →
  **401** on all 51 protected routes and every admin route. Immediate; does not wait for token expiry.
- **Sign-in**: password accepted, then `page.tsx:127-133` signs the user out and shows the
  "REQUEST SUBMITTED … you will receive an email once your account is approved" screen. Wrong
  wording for a paused subscriber, but access is closed.
- **Open sessions**: `AuthGuard` reads the *cached* session; its `user_metadata` is stale until
  supabase-js refreshes the token (default access-token lifetime 1 h). Until then the page shell
  renders but every data call 401s (empty dashboard, map without listings). On the next refresh the
  new user object carries `approved:false` → next navigation → `AuthGuard` signs out.
- Data, Prisma `User` row, listings, vault: untouched. No audit trail; the change is only in the
  Supabase auth log.

Harder same-day cut, if needed: Dashboard → the same user → **Ban user** (`banned_until`). GoTrue
then rejects the existing token on `/auth/v1/user` and on refresh and refuses sign-in ("User is
banned"), so sessions die on the next API call and there is no 1 h shell window. Not exercised on
this project — verify on a test user first. Unban = clear the ban.

## 3. Proposal (Phase 2)

1. Model: no status field on `User` → new column `User.accessStatus AccessStatus @default(ACTIVE)`
   (`ACTIVE | PAUSED`) + `pausedAt`, `pausedById`, `pauseReason`; new append-only
   `UserAccessEvent` (id, userId, actorId, action `PAUSE|RESUME`, reason, createdAt).
   Handwritten additive migration, `prisma migrate deploy`, exactly like `3d31cb9`.
2. Gate, one place: `getApprovedUserId` / `getAdminUserId` read `accessStatus` in the Prisma call
   they already make (`auth.ts:62-79`) and return null when PAUSED → all 51 routes deny on the
   user's next request, no token expiry wait, no per-route edit.
3. Response shape: the helpers can only return null, so routes answer **401** as today. The
   ratified **403 `{ code: "SUBSCRIPTION_PAUSED" }`** needs either a 51-route sweep or a
   middleware DB lookup — flagged below as the one decision for "go".
4. Client: a sibling of AuthGuard's "not allowed" path — after session + approved pass, one call to
   `GET /api/me/access-status` (via `getSessionUserId`, allowed while paused); PAUSED → render
   "subscription paused, contact us" + sign-out, else children. `apiFetch` also routes a 401 for
   a signed-in user through the same check, so an open session is cut on its next call.
5. Sign-in untouched: `page.tsx` still redirects approved users to `/parcels/map`, which is guarded
   → pause screen. `AuthGuard` redirect logic untouched.
6. Admin UI: new `/admin/users` (Prisma `User` list: email, name, role, status, last seen) with
   badge + Pause/Resume + confirm + optional reason + who/when; `GET /api/admin/users`,
   `POST /api/admin/users/[id]/pause|resume` behind `getAdminUserId`; self-pause rejected server-side.
7. Audit: `UserAccessEvent` rows, never updated or deleted. No email/SMS.
8. e2e per prompt §8 on main's Playwright harness (mocked session + route fixtures).

## Gates

None (no code). Docs-only commit on the branch.

## Next

STOP. Wait for "go" + the 401-vs-403 decision, then Phase 2.

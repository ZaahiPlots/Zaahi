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

## Phase 2 — build (go received: `PROMPT_admin_pause_phase2_go.md`)

Rulings applied: 401 stays (no 403 sweep, no middleware DB lookup); `/api/me/access-status` is
the only protected route reachable while paused; migration additive and NOT applied; pause copy
"Your subscription is paused. Contact us at dymo@zaahi.io to resume." + Sign out; founders and
the acting admin not pausable server-side; `src/app/page.tsx` untouched.

### Files
| File | Change |
|---|---|
| `prisma/schema.prisma` | `enum AccessStatus { ACTIVE, PAUSED }`, `enum AccessAction { PAUSE, RESUME }`; `User.accessStatus @default(ACTIVE)`, `pausedAt?`, `pausedById?`, `pauseReason?`, `@@index([accessStatus])`, relation `accessEvents`; new model `UserAccessEvent` (id cuid, userId, actorId, action, reason?, createdAt; indexes `[userId, createdAt]`, `[actorId, createdAt]`; FK → User RESTRICT) |
| `prisma/migrations/20260913100000_user_access_status/migration.sql` | handwritten, additive only (2 CREATE TYPE, ALTER TABLE ADD 4 columns with default/nullable, 1 index, CREATE TABLE + 2 indexes + FK). **Not applied** — `DATABASE_URL` is production; founder runs `prisma migrate deploy`. `prisma generate` + `prisma validate` run locally only. |
| `src/lib/auth.ts` | `isFounderEmail()`; `getApprovedUserId` selects `accessStatus` from the upsert it already makes and returns null when PAUSED (the single gate); `getAdminUserId` reads `accessStatus` first and returns null when PAUSED (founders included); new `getAccessState()` (session + approved + status, no paused-denial) for the probe |
| `src/app/api/me/access-status/route.ts` | `{status:"ACTIVE"}` / `{status:"PAUSED", code:"SUBSCRIPTION_PAUSED", pausedAt}` / 401; `private, no-store` |
| `src/components/PauseGate.tsx` | sibling gate: holds the page until the probe answers, renders the pause screen (glass card as the auth pending panel, Sign out via `supabaseBrowser.auth.signOut()` + `/`), fails open on probe error (server gate still denies), re-probes on `PAUSE_RECHECK_EVENT` |
| `src/components/AuthGuard.tsx` | one line: ready state renders `<PauseGate>{children}</PauseGate>`; redirect logic untouched |
| `src/lib/api-fetch.ts` | dispatches `zaahi:auth-401` on any 401 for a signed-in call (probe excluded) so an open session is cut on its next request |
| `src/lib/user-access.ts` | `setUserAccess()` — guards (self 403, founder 403, not found 404, already/not paused 409, reason ≤ 500) + one transaction: status flip + `UserAccessEvent` append |
| `src/app/api/admin/users/route.ts` | GET list (q, status, limit ≤ 100, cursor; paused first), `pausedByEmail`, `isFounder`, `isSelf`, `selfId`; admin-only |
| `src/app/api/admin/users/[id]/pause/route.ts`, `.../resume/route.ts` | POST, zod body `{reason?}`, `getAdminUserId` → 403, then `setUserAccess` |
| `src/app/admin/users/page.tsx` | list + search + status filter; per row badge, Pause/Resume → inline confirm with reason → POST → row update; self/founder rows disabled with title; paused rows show when / by whom / reason |
| `src/app/admin/page.tsx` | "Users" tool card |
| `tests/e2e/harness.ts` | `installSession()` extracted (same Storage patch, reused by `installHarness`); `/api/me/access-status → ACTIVE` fixture so smoke (d) `unexpected=[]` still holds |
| `tests/e2e/admin-pause.spec.ts` | 7 tests: paused user → pause screen + copy + mailto + Sign out + no dashboard chrome + API 401; sign-out returns to `/`; resume restores the page; admin console confirm-step/reason/badge flip/resume/self+founder locked (fixtures); real handlers: `/api/admin/users` 401/403, pause endpoint 401/403 `{code:"forbidden"}`, probe 401 |

### Gates (final)
| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (first run only tripped on stale `.next/types` from the Phase A branch build; regenerated by the build) |
| `pnpm build` (`prisma generate && next build`) | exit 0 — `/admin/users` static, `/api/admin/users`, `/api/admin/users/[id]/{pause,resume}`, `/api/me/access-status` dynamic |
| `pnpm lint` | exit 0 — 0 errors, 12 warnings, all pre-existing |
| `pnpm test:e2e` (full, 11 spec files) | **45 passed** — 38 existing (incl. smoke a–h3 with the shared session stub + probe fixture) + 7 new. One iteration: en-GB renders "13 Sept 2026", assertion widened to `SEPT?`. |

### Not covered by e2e (needs a real admin session against the DB)
The server-side self-pause and founder-pause refusals in `user-access.ts` — covered by code
review + the non-admin 403 + the disabled-row UI. Founder smoke below exercises them for real.

### Deploy sequence (each step separately approved — NOT run by the agent)
1. `cd ~/zaahi && npx prisma migrate deploy` — against production (`DATABASE_URL` in `.env.local`).
2. `git checkout main && git merge --no-ff feat/admin-pause-subscription` (or PR).
3. `git push https://github.com/ZaahiPlots/Zaahi.git main` (SSH key is still refused).
Order matters: the code reads `User.accessStatus`; deploying code before the migration would
500 every `getApprovedUserId` call (Prisma unknown column) — migrate first.

## Deploy sequence — outcome

1. **Migration**: applied to production by the founder (`prisma migrate deploy`, outside the agent).
2. **Merge** (approved): local `main` was at `e5300af`, fast-forwarded to the fetched `5561a9f`;
   annotated tag `pre-merge-2026-09-13` → `5561a9f` (tag object `918b255`);
   `git merge --no-ff feat/admin-pause-subscription` → **`d3ac718`** (parents `5561a9f`, `babea5e`).
3. **Push** (approved), first attempt: both `git push https://github.com/ZaahiPlots/Zaahi.git main`
   and the tag push → **403** `Permission to ZaahiPlots/Zaahi.git denied to dtsvyk-del`
   (`gh api repos/ZaahiPlots/Zaahi --jq .permissions` → `push: false`, pull only). Stopped and reported.
4. **Unblock** (`PROMPT_push_main_unblock.md`, pre-approved):
   - `gh api user/repository_invitations` → **no pending invitation** (the founder had granted
     access directly).
   - permissions → `{"admin":false,"maintain":false,"pull":true,"push":true,"triage":true}` →
     step 3 (`gh auth refresh`) skipped.
   - `git push … main` → `5561a9f..d3ac718  main -> main` ✔
   - `git push … pre-merge-2026-09-13` → `[new tag]` ✔
   - remote `commits/main` sha = `d3ac718af3b15f60d2dad6c9608f5b2bf70ce749` = local HEAD ✔;
     remote tag ref → `918b255…` = local ✔
   - `gh run list --limit 3`: no `.github/workflows` in the repo; the only runs are GitHub's
     automatic "pages build and deployment" (one in progress for `d3ac718`, the two earlier ones
     on 2026-09-04 failed — pre-existing, unrelated to this feature). Production deploy is Vercel,
     automatic from `main`.
5. This log entry is a docs-only commit on local `main` after the push; **not pushed** (only the
   two pushes above were approved).

Founder smoke (from the Phase 2 report) is now runnable on zaahi.io once the Vercel build for
`d3ac718` is live.

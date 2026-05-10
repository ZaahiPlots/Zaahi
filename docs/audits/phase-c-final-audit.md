# Phase C — final audit (Steps 1-11) before main merge

**Date:** 2026-05-10
**Branch:** `feat/cohort-pilot`
**Commit range:** `01a529b` … `c54fbbc` (15 Phase C commits) +
`fc2a1a6` (Step 11 PDPL sweep) + 1 in-flight (Step 12 SignOutButton).
**Reference:** `docs/specs/phase-1/spec-05-cohort-pilot-v1.md` v1.1.

This is the LAST review before `feat/cohort-pilot` → `main`.

---

## TL;DR — verdict

**3 BLOCKERS** found. **5 SHOULD-FIX** found. **3 NICE-TO-HAVE** logged.

All BLOCKERS are second-order LOCK-8 propagations: Step 11 fixed the
`Deal.sellerId` site (the most visible one), but four other endpoints
that authorize against `Parcel.ownerId` were not updated to also
recognise `verifiedOwnerUserId`. For the 118 system-seeded parcels
this matters the moment a real cohort user has their Title Deed
verified for one of those plots — they suddenly couldn't update
their own listing or even see it in their dashboard.

| Severity | Count | Status |
|---|---|---|
| BLOCKER  | 3 | **Fixed in this commit set** |
| SHOULD-FIX | 5 | **Fixed** (4) + 1 deferred with rationale |
| NICE-TO-HAVE | 3 | Logged below |
| PASS / no finding | 9 of 11 step deliverables | — |

Step deliverables that audited 100% clean: Steps 1, 3, 5, 6, 7, 8, 10,
11, 12-partial. Step 4 (schema) clean. Step 2 (ambassador deletion)
mostly clean — three trailing dead-link / stale-comment items remain.
Step 9 (multi-claim) clean. The BLOCKERS are not localised to a single
step — they're cross-cutting authorization assumptions made before
LOCK-8 / `verifiedOwnerUserId` existed.

---

## Method

1. **Sub-agent sweep** of every Phase C commit + every dir under
   `src/`, `prisma/`, `supabase/`, `docs/`. Single pass — surface
   findings, no fixes.
2. **Hand-driven LOCK-8 propagation hunt.** For each call site that
   reads `Parcel.ownerId` for authorization, check whether the same
   semantics should now also accept `verifiedOwnerUserId`.
3. **Locked-file diff** — `git diff main..HEAD -- src/app/page.tsx
   src/components/AuthGuard.tsx` to verify byte-identical preservation.
4. **Migration list inspection** — confirm only Step 4 + Step 9
   added schema fields.
5. **CLAUDE.md drift scan** — grep for ambassador / referral / commission
   / /admin/ambassadors residue.

---

## Findings — BLOCKER

### B-1 · `/api/parcels/[id]` PATCH gates on `ownerId` only

**Site:** `src/app/api/parcels/[id]/route.ts:58, 101`

```ts
if (existing.ownerId !== userId) {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
```

**Why this is a blocker:** the 118 system-seeded parcels have
`ownerId = SYSTEM_USER_ID` (`00000000-…-zaah`). Once Step 10 verifies
a real cohort user (Жан / Dymo / future) as the OWNER of one of those
plots — exactly the Q5 path the audit said the cohort would walk —
the `verifiedOwnerUserId` becomes their userId, but `ownerId` stays
on the system user (immutable per CORR-1). The PATCH route still
checks `ownerId !== userId`, so the verified owner gets 403 when
they try to update price or status of their own plot. Per CLAUDE.md
"Цена участка — ТОЛЬКО ВРУЧНУЮ" (only manual price changes), the
owner needs to change `currentValuation` from the dashboard.

**Fix:** allow either creator (audit / canonical id) or verified
owner (current owner) to mutate. Both have legitimate reasons —
the verified owner sets price; the creator is occasionally just
the system user that never updates.

```ts
if (existing.ownerId !== userId && existing.verifiedOwnerUserId !== userId) {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
```

Same fix applied to the DELETE handler at line 101 (defensive — per
CLAUDE.md NEVER-DELETE rule it's never invoked, but the consistency
keeps an audit-friendly invariant).

---

### B-2 · `/api/me/plots` filters on `ownerId` only

**Site:** `src/app/api/me/plots/route.ts:33`

```ts
where: { ownerId: userId },
```

**Why this is a blocker:** the dashboard "My Properties" section
calls this endpoint to render the user's plot grid. Verified owners
of any of the 118 backfilled parcels would see an empty list. They
can find their plot through the map's Find launcher, but the
dashboard surface — the canonical "your plots" UI — wouldn't show
it. Combined with B-1, the verified owner is effectively locked out
of their own listing's lifecycle.

**Fix:** `OR: [{ ownerId: userId }, { verifiedOwnerUserId: userId }]`.

---

### B-3 · Map header admin shield links to a deleted route

**Site:** `src/app/parcels/map/page.tsx:4660-4673`

```tsx
{isAdmin && (
  <a href="/admin/ambassadors" title="Admin — Ambassador applications" …>
    …
  </a>
)}
```

**Why this is a blocker:** Step 2 (commit `9c0c845`) deleted
`src/app/admin/ambassadors/`. When Жан / Dymo log in, they see this
gold shield icon at the top of every map session. Clicking it
returns a 404. For admins this is a daily-use surface — they
will hit it the moment they look for the queue.

**Fix:** repoint to `/admin/queue` (the new admin destination from
Step 7) and re-tag the title text.

---

## Findings — SHOULD-FIX

### SF-1 · `/api/parcels/[id]/affection-plan/refresh` gates on `ownerId` only

**Site:** `src/app/api/parcels/[id]/affection-plan/refresh/route.ts:19`

```ts
if (parcel.ownerId !== userId) { … 403 … }
```

Same LOCK-8 propagation as B-1. Verified owner needs to be able to
refresh DDA data (plot guidelines, building limit) for their own
plot. **Fix:** accept either id.

---

### SF-2 · `/api/parcels/[id]/view` skip-own-view check on `ownerId` only

**Site:** `src/app/api/parcels/[id]/view/route.ts:44`

```ts
if (parcel.ownerId === userId) { /* skip own-plot view from analytics */ }
```

If a verified owner browses their own plot, the view should also be
skipped from analytics counts. Otherwise their dashboard inflates
"unique viewers" with their own opens. Less critical than B-1 / B-2
because it only pollutes analytics, not authorization. **Fix:**
expand the skip to `verifiedOwnerUserId === userId` too.

---

### SF-3 · Admin email deep-link `?tab=plotclaim` is silently ignored

**Site:**
- `src/app/api/parcels/[id]/claim/route.ts:291` — sends
  `${origin}/admin/queue?tab=plotclaim` to admins on a new claim.
- `src/app/admin/queue/page.tsx` — never reads `?tab=` from
  `searchParams`. Default tab is `pending`.

When a claim email lands in the admin's inbox and they click
"Open verification queue", they end up on the registration tab and
have to manually click the Plot Claim tab to find the new claim.
Mild but daily friction for admins. **Fix:** seed the initial `tab`
state from `useSearchParams`, supporting both `plotclaim` (legacy
slug from the email template) and the canonical `plot_claim`.

---

### SF-4 · Dashboard ADMIN role copy points to a deleted route

**Site:** `src/app/dashboard/page.tsx:541`

```ts
ADMIN: "Use /admin/ambassadors to manage applications. …"
```

Dashboard banner shown to admins references a deleted route. Pure
text fix — but admins read this every time they log in. **Fix:**
rewrite to mention `/admin/queue`.

---

### SF-5 · `/api/users/sync` doc comment still describes Ambassador activation

**Site:** `src/app/api/users/sync/route.ts:18-22`

The comment block describes a flow (`activateAmbassador`,
`AmbassadorApplication`) that was removed in Step 2. The runtime
behaviour is correct — the comment is just stale. **Fix:** prune
the stale paragraphs; keep only documentation of the live behaviour.

(I also briefly flagged the SCH-3 dashboard `ComingSoonBanner` text
referring to `/ambassador` as a SHOULD-FIX, but on re-read it's
genuinely user-facing copy a non-admin BUYER would see and be
confused by — promoting it to part of this fix set under SF-4.)

---

## Findings — NICE-TO-HAVE

### NTH-1 · CLAUDE.md `AMBASSADOR PROGRAM RULES` section (lines 508-586)

CLAUDE.md is the agent's source-of-truth for the project. Step 2
deleted the entire Ambassador system from code; the section that
documents it should also be removed. Founder explicitly invited
this in the Step 12 task: *"Update CLAUDE.md if needed (Ambassador
rules removal flagged earlier in session — verify removed)"*.

Treated as Part 4 pre-merge cleanup rather than a Step 11/12 fix
because it's documentation-only and doesn't affect runtime
behaviour. Will be applied as a separate commit before main merge.

### NTH-2 · `documentsJson` paths embed userId in admin responses

Already noted in `pdpl-step11-audit.md` (P2-4). Admin-only access
correctly gated; deferred to Step 12 polish.

### NTH-3 · Counterparty contact "reveal" surface

When deals begin flowing, sellers/buyers will sometimes need each
other's email/phone for offline coordination. Already logged as
P2-5 in the PDPL audit. Out of Phase C scope.

---

## Lock verification

Spec §14.4 / LOCK list compliance — confirmed by `git diff` against
`main`:

| Lock | File(s) | Status |
|---|---|---|
| §14.4 auth flow | `src/app/page.tsx` | Bytes match spec — `signInWithPassword({ email, password })` on line 77, approved gate on 79, `router.replace('/parcels/map')` on 100. The Step-3 cleanup removed the signup tab (per spec §14.1) but the live signin path is byte-identical. ✓ |
| AuthGuard core | `src/components/AuthGuard.tsx` | Untouched on Phase C — `git log main..HEAD -- src/components/AuthGuard.tsx` is empty. ✓ |
| v6 calculator | `src/lib/feasibility-v6/`, `src/app/preview/feasibility-v6`, `src/app/parcels/[id]/feasibility` | Untouched on Phase C. ✓ |
| `prisma/schema.prisma` | only Step 4 + Step 9 mutations | Confirmed via `git log main..HEAD -- prisma/schema.prisma` — three commits (`7194ca9`, `7bbfcfc`, `c54fbbc`'s admin-side reads only). ✓ |

**No lock violations found.**

---

## Cross-step regression spot-checks

| Surface | Probe | Result |
|---|---|---|
| `/preview/feasibility-v6` | Build artifact present | ✓ static page generated |
| `/parcels/[id]/feasibility` | Build artifact present | ✓ dynamic route registered |
| `/parcels/map` | Build artifact + 246 kB bundle | ✓ |
| `/api/parcels/map` | Route registered, auth-gated | ✓ |
| `/api/parcels/[id]/affection-plan/refresh` | Route registered | ✓ (but flagged SF-1) |
| `/` auth flow | Bytes match spec | ✓ |
| `/register` 3-step | Build artifact present, `/api/registration/submit` registered | ✓ |
| `/admin/queue` | All 7 tab keys present in `Tabs.tsx` | ✓ (deeplink fix per SF-3) |
| Step 9 Path A/B/C | All three POSTs registered + UI wired | ✓ |
| Step 10 Title Deed + Plot Claim | All 8 admin endpoints registered | ✓ |
| Step 11 PDPL fixes | 4 leaks confirmed closed (per agent + manual diff) | ✓ |

---

## What ships in this commit set

The fix pass following this audit applies:

- **B-1 + B-2 + SF-1 + SF-2 + DELETE defensiveness** — single
  cross-file LOCK-8 expansion (one commit).
- **B-3** — repoint admin shield to `/admin/queue` (chained with
  the LOCK-8 commit since it's the same kind of cross-step drift).
- **SF-3** — `/admin/queue` reads `?tab=` (single small commit).
- **SF-4 + dashboard `/ambassador` ComingSoonBanner copy** — text
  only.
- **SF-5** — stale `/api/users/sync` comment pruned.
- **NTH-1** — CLAUDE.md Ambassador-rules section removed (separate
  Part-4-prep commit so it's reviewable independently of code).

The NICE-TO-HAVE items NTH-2 and NTH-3 are logged here and stay
queued for post-merge polish per the Step 11 audit doc.

---

## Recommendation

✅ **Apply the fix pass, then merge.** All BLOCKERS have a clean
one-line patch. SHOULD-FIX items are minor consistency repairs that
fit cleanly into the same LOCK-8-propagation commit. NICE-TO-HAVE
items don't affect cohort go-live.

`pnpm build` was clean before the audit (with 271 static pages
generated and 0 TS errors); will re-run before commit + merge.

---

## Pre-merge verification — 2026-05-10 evening pass

Founder requested a pre-production verification gate before merging
to `main`. This section captures everything that was verified
programmatically + an exact runbook for the items that need a
human-side smoke (auth-gated flows + email/Telegram receipt).

### Scope of automation

The verification harness has access to:

- ✅ Production Postgres (read-only Prisma queries via `DATABASE_URL`)
- ✅ Local production build (`pnpm start` against the production DB)
- ✅ `curl` / `fetch` against `localhost:3001`

The harness does **NOT** have access to:

- ❌ `SUPABASE_SERVICE_ROLE_KEY` (not in `.env.local`)
- ❌ Жан / Dymo email inbox or Telegram chat
- ❌ Vercel preview URL session cookies

Without the service-role key, this session cannot mint test JWTs, so
every probe that requires a Bearer token is **deferred to the
manual runbook** (last sub-section). All 401 results are middleware-
level rejections, which is the correct behaviour for unauthenticated
probes — they prove the security perimeter holds, not the role gate.

### A — DB integrity (read-only, automated)

`scripts/verify-step12.ts` ran against the production database
twice (before + after the HTTP probe set). Both runs: **18 / 18
PASS**. Same row counts, same indexes, same RLS policies. No
mutation occurred during the probe set.

| # | Check | Result |
|---|---|---|
| C1  | Production row counts (User=1, Parcel=118, RegistrationApplication=1, PlotClaim=118, Deal=0, AffectionPlan=222, Building=1, Notification=0, ActivityLog=0, AmbassadorApplication=0, Commission=0) | ✓ PASS |
| C2  | PlotClaim (parcelId, userId) tuples are unique | ✓ PASS · 0 duplicates |
| C3  | PlotClaim has zero NULLs on parcelId / userId | ✓ PASS |
| C4  | PlotClaim status distribution: VERIFIED=118 (the Step-4 backfill) | ✓ PASS |
| C5  | PlotClaim has all 6 expected indexes (incl. Step-9 unique) | ✓ PASS |
| C6  | Parcel has Step-4 verification columns (`verifiedOwnerUserId`, `verifiedAt`, `verifiedById`) | ✓ PASS |
| C7  | No production parcels have a verified owner yet (cohort hasn't gone live) | ✓ PASS · 0 / 118 |
| C8  | Every Parcel has at least one PlotClaim (Step-4 backfill invariant) | ✓ PASS |
| C9  | UserRole enum has the 5 cohort additions: POA, INTERMEDIARY, RELATIVE, REFERRAL, OTHER | ✓ PASS |
| C10 | System user has the seeded RegistrationApplication (Step 4 §5.7) | ✓ PASS · APPROVED, autoMigrated=true |
| C11 | No live Deals where `sellerId != verifiedOwnerUserId` (Q1 / LOCK-8) | ✓ PASS · 0 deals on prod = trivially satisfied |
| C12 | `registration-docs` RLS policies live (Step 5 + Step 11 path-B fix) — INSERT / SELECT / UPDATE / DELETE | ✓ PASS · 4 policies present |
| C13 | All RLS policies gate on first-folder-equals-`auth.uid()` (qual or with_check per cmd) | ✓ PASS |
| C14 | `registration-docs` bucket private + 10 MiB file cap | ✓ PASS · public=false, file_size_limit=10485760 |
| C15 | `User.nickname` has zero duplicates | ✓ PASS |
| C16 | Step 4 + Step 9 migrations applied; latest 2 are cohort migrations | ✓ PASS |
| C17 | Zero PlotClaim rows reference the public `documents` bucket (Step 11 P1-1 invariant) | ✓ PASS |
| C18 | Ambassador-era tables preserved per spec §13.4 (no fresh writes expected) | ✓ PASS |

### B — HTTP smoke (automated, anonymous probes against production-built local server)

Spun `pnpm start` on `localhost:3001` against the production DB.
22 probes covering middleware gating, method gating, public surfaces,
and AuthGuard pages. **All probes returned the expected status code.**

| # | Probe | Expected | Got |
|---|---|---|---|
| H1  | `GET  /api/parcels/by-plot-number/6457940` (no auth) | 401 (mw) | ✓ 401 |
| H2  | `GET  /api/admin/registration` (no auth) | 401 (mw) | ✓ 401 |
| H3  | `GET  /api/admin/title-deeds` (no auth) | 401 (mw) | ✓ 401 |
| H4  | `GET  /api/admin/plot-claims` (no auth) | 401 (mw) | ✓ 401 |
| H5  | `POST /api/admin/title-deeds/abc/verify` (no auth) | 401 (mw) | ✓ 401 |
| H6  | `POST /api/test-notify` (no auth + flag off) | 401 (mw) | ✓ 401 |
| H7  | `GET  /api/parcels/zzz/claims` (no auth) | 401 (mw) | ✓ 401 |
| H8  | `POST /api/parcels/zzz/claim` (no auth, multipart) | 401 (mw) | ✓ 401 |
| H9  | `POST /api/parcels/seed-dda` (no auth) | 401 (mw) | ✓ 401 |
| H10 | `GET  /api/me/plots` (no auth) | 401 (mw) | ✓ 401 |
| H11 | `GET  /api/deals` (no auth) | 401 (mw) | ✓ 401 |
| H12 | `GET  /api/layers/dda/dubai-hills` (PUBLIC_API allow-list) | 200 + body | ✓ 200, 3.7 MB GeoJSON returned |
| H13 | `GET  /` (landing page) | 200 | ✓ 200 |
| H14 | `GET  /api/registration/check-nickname?n=test-9876-zzzz` (public) | 200 + `{available:true,...}` | ✓ 200, body matches |
| H15 | `GET  /api/registration/check-nickname?n=!` (invalid format) | 200 + `{available:false, code:'invalid_format', ...}` | ✓ 200, body matches |
| H16 | `GET  /register` (public page) | 200 | ✓ 200 |
| H17 | `GET  /api/notify-admin` (POST-only public allow-list) | 405 | ✓ 405 |
| H18 | `POST /api/registration/check-nickname` (wrong method) | 405 | ✓ 405 |
| H19 | `GET  /api/parcels/by-plot-number/abc` (no auth, malformed) | 401 (mw fires before format check) | ✓ 401 |
| H20 | `GET  /admin/queue` (page, AuthGuard pattern) | 200 (AuthGuard does the redirect client-side) | ✓ 200 |
| H21 | `GET  /parcels/map` (page, AuthGuard pattern) | 200 | ✓ 200 |
| H22 | `GET  /dashboard` (page, AuthGuard pattern) | 200 | ✓ 200 |

**Conclusions from B:**
- Middleware (`src/middleware.ts`) is correctly intercepting unauthenticated `/api/*` traffic and returning 401 before any route handler runs. The PUBLIC_API allow-list (`/api/auth`, `/api/notify-admin`, `/api/registration/check-nickname`, `/api/registration/submit`, `/api/layers/*`) admits the right surfaces.
- Method gating works (`POST` to a `GET`-only route → 405).
- Server boots cleanly against the production DB (Ready in 621 ms).
- No production data was mutated (verified by re-running `verify-step12.ts` post-probe).

### C — Build + lint

`pnpm build`: ✓ clean (271 static pages, 0 TS errors). Re-run after
the HTTP probe set — still clean.

ESLint warnings inspected during the build run — no new warnings
introduced by the Step 12 audit fix pass.

### D — Manual founder-side smoke (deferred — needs admin session)

The probes that need a real Supabase Auth Bearer token cannot run
in this session (no service-role key in `.env.local`). They require
a logged-in admin or cohort user. Below is an exact runbook the
founder can execute against the Vercel preview deployment for
`feat/cohort-pilot` (preview URL surfaces in the Vercel dashboard
2-3 min after each push):

```bash
# 1. Sign in as Жан (admin) at <preview>/ → land on /parcels/map
# 2. In the browser DevTools → Application → Local Storage → copy the
#    Supabase access_token from the sb-*-auth-token row.
# 3. Export it for use below:
export TOKEN="…paste here…"
export BASE="https://zaahi-git-feat-cohort-pilot-zaahiplots.vercel.app"
```

#### D-1 · Notification dispatch (spec §11.5 / CORR-4 — ENABLE_TEST_NOTIFY)

```bash
# Requires ENABLE_TEST_NOTIFY=1 set on the preview env on Vercel.
# Default (production / preview) is unset → endpoint returns 404,
# which is the secure default per CORR-4.
curl -s -X POST "$BASE/api/test-notify" -H "Authorization: Bearer $TOKEN" | jq
# Expect: { email: { ok|skipped|error }, telegram: { ok|skipped|error } }
# Confirm: founder Gmail receives test email, founder Telegram chat
# receives test message. Capture Resend message id + Telegram message
# id from the response.
```

#### D-2 · Cohort registration end-to-end

```bash
# Use a throwaway @gmail.com / +alias to keep the prod inbox clean.
# Submit through the UI at <preview>/register — fill all 3 steps
# with a unique nickname. Confirm:
#   - 200 from /api/registration/submit (DevTools → Network)
#   - "Registration received" page renders
#   - Inbox: registration-received email arrives
#   - Founder admin inbox + Telegram: admin-new-application notification
```

#### D-3 · Admin queue end-to-end

```bash
# Sign in as Жан → /admin/queue
#   - Default tab: Pending → list shows the new application
#   - Tab pills show counts (e.g. Title Deed (0) · Plot Claim (0))
# Click into the new application → modal opens with:
#   - Real name (admin-only PII surface ✓)
#   - Email + verification status
#   - Documents (signed URLs, TTL 7d) — click each, opens in new tab
#   - Approve button (disabled until email verified — GAP-1)
# Approve →
#   - Applicant email: registration-approved with reset-password link
#   - Cap counter updates in real time
```

#### D-4 · AddPlotModal — Path C (multi-claim)

```bash
# As a non-admin approved cohort user → /parcels/map → "Add Plot"
# Enter 6457940 (one of the 118 backfilled plots) → Continue
# Expect: MultiClaimView opens, "No public claims yet" empty state
# (system ADMIN claim filtered per LOCK-8 ✓)
# Pick role OWNER → set price → upload Title Deed photo → Add claim
# Expect: green "Claim submitted" card; admin Telegram + email fire
```

#### D-5 · AddPlotModal — Path B (Broker / Owner submit)

```bash
# Add Plot → enter a NEW plot number (not in DB) → Continue
# Expect: role picker opens, plot pre-seeded
# I'm an Owner → upload deed photo → fill identity → submit
# In Supabase dashboard → Storage → confirm files land under
# `registration-docs/<userId>/<plotNumber>/title_deed-<ts>.<ext>`
# (NOT in the `documents` bucket — Step 11 P1-1 fix)
```

#### D-6 · Admin verify Title Deed

```bash
# Жан → /admin/queue → Title Deed tab
# Open the new pending claim → click VERIFY OWNER
# Confirm:
#   - Modal closes, claim disappears from queue
#   - Claimant inbox: "Your plot ownership is verified" email
#   - Telegram fan-out to admins
#   - DB: Parcel.verifiedOwnerUserId set to claimant's userId
#   - Dashboard "My Properties" — claimant sees the plot
#     (B-2 LOCK-8 fix verified)
#   - Claimant can edit price via PATCH /api/parcels/[id]
#     (B-1 LOCK-8 fix verified)
# Try VERIFY OWNER again on the same parcel → 409 "already_verified"
```

#### D-7 · SignOutButton (Step 12 Part 1)

```bash
# In one tab, sign in as anyone. Open a second tab in a private
# window with the same account. In tab 1 → /parcels/map → click the
# door-icon next to the Profile button → confirm dialog → "SIGN
# OUT EVERYWHERE". Within ~1 second:
#   - Tab 1 redirects to /
#   - Tab 2 (private window) loses session on next protected request
#     (AuthGuard catches it on the next page navigation)
# Confirms supabase.auth.signOut({ scope: 'global' }) revokes both
# sessions.
```

#### D-8 · Cleanup after manual smoke

```bash
# After D-2 to D-6, the throwaway test rows stay on prod. Either:
# (a) Manually delete via Supabase dashboard → Auth → Users (delete
#     the test user; Prisma User row + RegistrationApplication will
#     remain, mark them archived if needed); OR
# (b) Run one-off cleanup: log into psql or use the precheck script
#     pattern to identify and DELETE the test rows.
# Keeping them is also OK — they don't pollute the cap counter
# (per-role cap is 10 with the system user excluded).
```

### E — What's verified vs. what's pending

| Verified programmatically (this session) | Status |
|---|---|
| DB integrity, schema invariants, RLS policies, bucket privacy | ✅ 18 / 18 |
| Middleware gate fires for `/api/*` without Bearer | ✅ 11 / 11 |
| Method gating returns 405 on wrong verb | ✅ 2 / 2 |
| Public surfaces serve | ✅ 5 / 5 |
| AuthGuard-pattern pages render shells | ✅ 3 / 3 |
| Build + TS clean, no new lint warnings | ✅ |
| LOCK-8 fix code paths read correctly | ✅ (re-confirmed in audit body) |
| Production state untouched by probes | ✅ (re-running C1 post-probe → identical row counts) |

| Pending — needs founder-side smoke (D-1 .. D-7) | Why |
|---|---|
| Authenticated route response shapes | Needs Bearer token |
| Email + Telegram delivery | Needs inbox / chat access |
| Path A → seed-dda + first claim | Needs cohort session |
| Path B → submit with Title Deed upload | Needs cohort session |
| Path C → multi-claim end-to-end | Needs cohort session |
| Title Deed verify → ownership-transferred-notice | Needs admin + cohort sessions |
| SignOutButton global scope across two devices | Needs two browser sessions |

### Verdict

**No blockers found in the automated verification.** Production data
is intact, the security perimeter holds, the build is clean, and
every code path the audit body identified continues to read
correctly after the fix pass. The eight manual smoke items in §D
test runtime side-effects (email delivery, multi-device session
revocation, file upload + signed-URL retrieval) that don't
introspect from outside the system; founder is the right party to
exercise them and confirm.

If §D-1 through §D-7 land green on the preview, this branch is
ready to merge to `main`.

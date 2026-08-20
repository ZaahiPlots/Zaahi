# ZAAHI — Full-surface audit of uncovered areas

**Date:** 2026-08-20 · **Branch:** `research/full-audit-2026-08-20` · **Baseline:** `main` @ `e5300af`
**Mode:** READ-ONLY. No `src/**` edits, no DB writes, no state change on any account, no push to `main`.

## Method and honesty notes

Code-level review of all 303 API route handlers, every `page.tsx`, the auth helpers, and the
middleware. Three unauthenticated HTTP probes were run against production using **deliberately
invalid identifiers only** (`/parcels/zzz-not-a-real-parcel-id`) — no real record was fetched, no
account was touched, nothing was created, modified or deleted.

Two findings (**A-3**, and the exploitability half of **A-1**) cannot be closed from code alone.
Each says explicitly what test would settle it. I did not run those tests because both require
creating or mutating an account, which the constraints forbid.

## Prior work read first, and deliberately not redone

| Source | Covers | Not re-litigated here |
|---|---|---|
| `~/agent-responses/zaahi-diagnostic-2026-08-10.md` | infra, deps, CVEs, build, env, DNS | Next.js CVEs, Prisma drift, SPF/DMARC, `/api/modules` |
| `docs/research/bug-master-2026-08-10.md` (33 open) | consolidated bug list | BUG-001…033 except where this audit **extends** one |
| `docs/research/dead-controls-2026-08-10.md` | static control inventory | the ~440 statically-wired controls |
| `~/Downloads/zaahi-audit.md` (Dymo, 2026-08-18, 67 findings) | live browser QA of `/parcels/map` | drawer, map clicks, contrast, vault UX |

Everything below is labelled **NEW**, **NEW ROOT CAUSE** (known symptom, cause established here for
the first time), or **EXTENDS \<id\>**.

---

## Counts by severity

| Severity | Count |
|---|---:|
| **Critical** | **1** |
| **High** | **4** |
| Medium | 6 |
| Low | 6 |
| Passes (verified correct, no action) | 3 |
| **Total findings** | **17** |

---

# A · Authorization

## The headline result is good, with four exceptions

Every one of the 48 `getApprovedUserId` routes that takes an `:id` was read individually. The
ownership discipline is **consistently correct**:

- `me/*` routes use the ideal scoped-`where` pattern — `deleteMany({ where: { id, userId } })`
  (`me/saved-searches/[id]/route.ts:17`, `me/notifications/[id]/read/route.ts:19`,
  `me/favorites/[parcelId]/route.ts:60`). An attacker-supplied id simply matches zero rows.
- Vault routes gate explicitly and return **404, not 403**, so they leak no existence
  (`me/vault/entries/[id]/route.ts:141, 233, 412`; `me/vault/shares/[id]/revoke/route.ts:44`;
  `me/vault/entries/[id]/shares/route.ts:50, 96`).
- Deals authorise by participant role, not by session alone
  (`deals/[id]/route.ts:56`, `deals/[id]/messages/route.ts:9-15`).
- `me/vault/conflicts/[plotNumber]/route.ts:73` requires the caller to own an entry on that plot
  **before** returning anything about other users', and then returns nickname only.
- `parcels/[id]/affection-plan/refresh/route.ts:21` and `parcels/[id]/view/route.ts:46` both accept
  either `ownerId` or `verifiedOwnerUserId`, exactly per the LOCK-8 / CORR-1 invariant.

**No IDOR was found in the `/api/vault/*`, `/api/deals/*` or `/api/me/*` families.** The four
exceptions below are all in `/api/parcels/*` and in the **page** layer, which no prior audit examined.

---

### A-1 · CRITICAL · NEW — `/parcels/[id]` serves parcel data, including price, to anyone with no session at all

**Where:** `src/app/parcels/[id]/page.tsx:13-27`

```ts
export const dynamic = "force-dynamic";                      // :8
export default async function ParcelPage({ params }) {       // :13  server component
  const parcel = await prisma.parcel.findUnique({            // :15  NO auth call
    where: { id },
    include: { affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1 } },
  });
  if (!parcel) notFound();                                   // :22
```

There is no `getApprovedUserId`, no `AuthGuard`, and no `VAULT_PRIVATE` gate. The whole file
contains exactly three references to data access and none to auth:

```
$ grep -nE "prisma|getApprovedUserId|getSessionUserId|AuthGuard" src/app/parcels/[id]/page.tsx
3:  import { prisma } from "@/lib/prisma";
13: export default async function ParcelPage(...)
15:  const parcel = await prisma.parcel.findUnique({
```

Middleware cannot save it — it is scoped to the API surface only:

```
src/middleware.ts:36   if (!pathname.startsWith('/api/')) return NextResponse.next();
src/middleware.ts:56   matcher: ['/api/:path*'],
```

**What renders to an anonymous visitor:** plot number, district, emirate (`:34-35`),
**`currentValuation` — the asking price** (`:37`), and the full latest affection plan: geometry,
building-limit geometry, setbacks, land-use mix, max floors, FAR (`:17-27`, `:44-46`).

**Proof it executes unauthenticated (safe probe, invalid id, no real data):**

```
$ curl -s -o /dev/null -w '%{http_code}' https://www.zaahi.io/parcels/zzz-not-a-real-parcel-id
404
$ curl -s -o /dev/null -w '%{http_code}' https://www.zaahi.io/api/parcels/map
401
```

The 404 is produced by `notFound()` at `:22`, which is reached **only after**
`prisma.parcel.findUnique` has run. So the handler executed and queried the database for a caller
with no session. A valid id renders the record.

**Why this is worse than BUG-032.** BUG-032 recorded that `/admin`, `/dashboard` and `/vault`
return 200 unauthenticated but verified "no data leaks — data fetches 401", because those are
client components. `/parcels/[id]` is a **server component**: the data is fetched server-side and
is in the HTML before any client guard exists. BUG-032 did not cover this route.

**Also note the contradiction with its own sibling.** The API route for the same resource *does*
carry the private-parcel gate:

```
src/app/api/parcels/[id]/route.ts:43-51
  if (parcel.status === ParcelStatus.VAULT_PRIVATE) {
    const adminId = await getAdminUserId(req);
    ... where: { ownerId: userId, publicParcelId: id }
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
```

The page has none of it. A `VAULT_PRIVATE` parcel — a user's private pipeline plot — is served to
the anonymous internet if its id is known.

**Residual uncertainty, stated plainly:** I did not fetch a real parcel id, so I have not observed
private data being returned. The code path is unambiguous; confirming it requires one authorised
request against an id the founder owns.

**Fix direction:** call `getApprovedUserId` in the server component and mirror the `VAULT_PRIVATE`
branch from `api/parcels/[id]/route.ts:43-51`, or make the page a client component that fetches
through the already-correct API route.

---

### A-2 · HIGH · NEW (EXTENDS BUG-026) — any approved user can overwrite another user's parcel price and destroy its affection-plan history

**Where:** `src/app/api/parcels/seed-dda/route.ts:26, 101-127, 133-160, 161`

The route is gated at `getApprovedUserId` (`:26`) — **any approved user, not an admin**. BUG-026
recorded this as a throttling concern ("unbounded upserts plus outbound fetches"). It is more than
that.

The pre-flight 409 fires **only when the caller already holds a claim** on the plot, and the code
says so deliberately:

```
:101  if (callerId !== SYSTEM_USER_ID) {
:102    const existingParcel = await prisma.parcel.findFirst({ where: { plotNumber } });
:107      const callerExistingClaim = await prisma.plotClaim.findFirst({
:108        where: { parcelId: existingParcel.id, userId: callerId, ... }
:117      if (callerExistingClaim) { return ... 409 }
```
> `:95-100` — *"We deliberately do NOT 409 for any **other** claim (system ADMIN backfill, other
> users)"*

So a caller with **no** claim on an existing plot falls straight through to:

```
:133  const parcel = await prisma.parcel.upsert({
:135    where: { emirate_district_plotNumber: { emirate: 'Dubai', district, plotNumber } },
:150    update: {                                   // ← EXISTING ROW, ANY OWNER
:155      status: priceAed > 0 ? ParcelStatus.LISTED : ParcelStatus.VACANT,
:156      currentValuation: priceAed > 0 ? priceFils : null,
:161  await prisma.affectionPlan.deleteMany({ where: { parcelId: parcel.id } });
```

`priceAed` is taken from the request body (`:29`). Three written invariants break at once:

1. **CLAUDE.md § "Цена участка — ТОЛЬКО ВРУЧНУЮ"** — *"Автоматически рассчитывать или менять общую
   цену системой ЗАПРЕЩЕНО"*. Here an arbitrary approved user sets `currentValuation` on a parcel
   they do not own.
2. **CLAUDE.md § NEVER delete parcels** — *"The same rule applies to `affectionPlans`: never
   `deleteMany`, only `create`."* Line `:161` is a literal `deleteMany`, wiping the plan history the
   rule exists to preserve.
3. **Privacy.** `:155` sets `status` to `LISTED` or `VACANT` from the body's price. Posting the plot
   number of someone's `VAULT_PRIVATE` parcel flips it out of private state and onto the public map.

`grep -c "rateLimit"` in this file → **0**, so all of the above is unthrottled.

**Fix direction:** require admin for the update branch, or scope the upsert to create-only and
`create` a new `AffectionPlan` row instead of `deleteMany` + `create`.

---

### A-3 · HIGH · NEW — the approval gate is stored in a field the user can write

**Where:** `src/lib/auth.ts:47` and `:105`; written at
`src/app/api/admin/registration/[id]/approve/route.ts:25`

The entire security model in CLAUDE.md rests on `user_metadata.approved`:

```
src/lib/auth.ts:47    if (data.user.user_metadata?.approved !== true) return null;   // getApprovedUserId
src/lib/auth.ts:105   if (data.user.user_metadata?.approved !== true) return null;   // getAdminUserId
```

```
$ grep -rn "app_metadata" src/
(no matches)
```

In Supabase Auth, `user_metadata` is `raw_user_meta_data` — the namespace a signed-in user may
write themselves via `auth.updateUser({ data: … })` with their own access token. `app_metadata` is
the service-role-only namespace, and it is used nowhere in this codebase. If that behaviour holds
as documented, a signed-up but unapproved user can set `approved: true` on themselves and pass every
`getApprovedUserId` check in all 48 gated routes.

**The author already applied the correct mitigation one function lower down** — `getAdminUserId`
refuses to trust the token for role:

> `src/lib/auth.ts:97-98` — *"Looks up the User row in Prisma rather than trusting user_metadata —
> role lives in the database, not in the JWT."*

`role` got the treatment; `approved` did not. So **admin escalation is not reachable this way**
(role is re-read from the DB at `:107-111`) — the exposure is limited to pending→approved, which is
still the gate the whole cohort-pilot model depends on.

**This is the one finding I could not settle**, because confirming it means mutating an account.
**Safe test:** on a throwaway Supabase account that is *not* approved, call
`supabaseBrowser.auth.updateUser({ data: { approved: true } })`, then call `GET /api/me` with the
resulting token. 200 = confirmed. Delete the account afterwards.

**Fix direction:** move the flag to `app_metadata` (admin-writable only), or re-read approval from a
Prisma column the way role already is.

---

### A-4 · HIGH (latent Critical) · NEW — `/parcels/[id]/feasibility` repeats A-1, with `AuthGuard` giving false assurance

**Where:** `src/app/parcels/[id]/feasibility/page.tsx:25-46`

```ts
export default async function ParcelFeasibilityPage({ params }) {   // :25  server component
  if (!IS_FEASIBILITY_V6_ENABLED) notFound();                       // :30
  const parcel = await prisma.parcel.findUnique({ ... });           // :34  NO auth call
  ...
  return (<AuthGuard>                                               // :46
```

`AuthGuard` is a **client** component (`src/components/AuthGuard.tsx:1` — `'use client'`). By the
time it decides anything in the browser, the parcel has already been fetched server-side and
serialised into the RSC payload. Wrapping a server-fetched result in a client guard hides it
visually; it does not withhold it.

The file's own header comment asserts the opposite, which is why this pattern is likely to spread:

> `:11` — *"4. Wrap in `<AuthGuard>` (client component) **per CLAUDE.md security rules**."*

**Currently masked, not fixed.** `src/lib/feasibility-v6/featureFlag.ts:25` defaults the flag off,
so `:30` returns 404 before the query runs. The leak arms itself the moment the flag flips at the
documented "Sprint 11 cutover".

**Fix direction:** same as A-1, and correct the comment at `:11` so the pattern is not copied.

---

### A-5 · MEDIUM · NEW — `/api/parcels/[id]/pdf` has no private-parcel gate

**Where:** `src/app/api/parcels/[id]/pdf/route.ts:14-18` (whole file is 27 lines)

```ts
const parcel = await prisma.parcel.findUnique({ where: { id }, select: { plotNumber: true } });
if (!parcel) return NextResponse.json({ error: 'not_found' }, { status: 404 });
const buf = await fetchPlotDetailsPdf(parcel.plotNumber);
```

Any approved user, given any parcel id, gets the DDA Plot Details PDF — including for another
user's `VAULT_PRIVATE` parcel. The sibling GET at `api/parcels/[id]/route.ts:43-51` has the gate;
this route does not.

**Calibrated severity:** the PDF content is public-domain DDA data anyone can pull with the plot
number, so the leak is *existence + plot number of a private parcel*, not its commercial terms.
Medium, not Critical. It becomes Critical the day anything private is added to this response.

### A-6 · MEDIUM · NEW — `/api/parcels/[id]/plot-guidelines` — identical gap

**Where:** `src/app/api/parcels/[id]/plot-guidelines/route.ts:31-44`. Same shape, same reasoning.
The header comment at `:22-23` states the route is gated *"so an [anonymous caller cannot reach
it]"* — it reasons about authentication and never about ownership.

### A-7 · MEDIUM · NEW — `/api/parcels/[id]/claims` exposes other claimants' asking price on any parcel

**Where:** `src/app/api/parcels/[id]/claims/route.ts:38-83`

Any approved user, for any parcel id, receives every non-rejected claim's **`priceAed`** (`:57`),
status, timestamps, and the claimant's `nickname`, `role`, `avatarUrl`, `companyName`,
`reraLicense` (`:64-69`, via `serializeUserPublic`). There is no `VAULT_PRIVATE` gate and no
requirement that the caller hold a claim of their own — unlike the conflicts route
(`me/vault/conflicts/[plotNumber]/route.ts:73`), which does require it.

Real names, emails and phones are correctly stripped — the file documents this at `:9-10` and
`serializeUserPublic` enforces it. The exposure is commercial, not PDPL: a competing broker's
asking price and company, keyed to a plot.

**This may be intended** for the multi-claim Path C board. Flagging as a product decision:
should the claims board be visible to all approved users, and should it apply to private parcels?

### A-8 · LOW · NEW — deals disclose existence via 403 vs 404

`deals/[id]/route.ts:54-57` returns **404** when no deal exists and **403** when one exists but the
caller is not a party. The pair distinguishes "no such deal" from "someone else's deal".
`deals/[id]/messages/route.ts:25, 51` do the same. The vault routes get this right (always 404) —
worth making uniform.

### A-9 · LOW · NEW — a GET request mutates state

`src/app/api/vault/entries/[id]/route.ts:117` performs `prisma.vaultShare.update(...)` inside the
`GET` handler (recording first view). A GET with a side effect is replayable by prefetchers, link
previewers and crawlers.

### A-10 · LOW · NEW (adjacent BUG-026) — unthrottled outbound proxy

`parcels/[id]/pdf/route.ts:20` and `plot-guidelines/route.ts:47` each perform an outbound fetch to
DDA per request with no rate limit, making ZAAHI usable as an anonymising scraping proxy for DDA by
any approved user. Same class as BUG-026.

---

# B · Auth flows

There is no `/api/auth` route — sign-in, sign-up, reset and refresh are delegated to Supabase from
the browser (`src/lib/supabase-browser.ts`), so their rate limiting and token expiry are Supabase's
to enforce, and are **not** findings against this codebase. What is in scope:

### B-1 · MEDIUM · NEW — `/api/registration/check-nickname` is an unauthenticated, unthrottled enumeration oracle

**Where:** `src/app/api/registration/check-nickname/route.ts:23-59`; allow-listed at
`src/middleware.ts:27`

Public by design (the `/register` step-1 live check). It returns a definitive
`{ available: false, code: "taken" }` for any nickname belonging to a `User` (`:40-46`) **or** to a
non-rejected `RegistrationApplication` (`:49-57`). With no rate limit anywhere in the file, the full
membership list — including people who have merely *applied* and not yet been approved — is
enumerable at request rate. Each call also costs two DB round-trips, the first using
`mode: "insensitive"` against a unique-indexed column, which will not use that index.

### B-2 · MEDIUM · NEW — `/api/registration/submit` leaks application status and has no submission throttle

**Where:** `src/app/api/registration/submit/route.ts:178-202`

Distinct anonymous responses per email state: already-in-review (`:195`), previously-rejected
(`:202`), nickname-taken (`:217`), or accepted. An anonymous caller learns whether a given email has
applied and what happened to it.

More consequential: no rate limit. Per the file's own step list (`:14-29`), each accepted submission
calls `supabase.auth.admin.createUser` — annotated **"POINT OF NO RETURN"** (`:19`) — then
`generateLink`, creates a `RegistrationApplication`, and sends email to the applicant **and to the
admins**, plus Telegram. A script can therefore create unbounded Supabase auth users, flood
`/admin/queue`, and email-bomb the founders. Audit 5.10 saw the benign version of this already
(a junk applicant, `dsdsdsdsddsds`, in the live queue).

### B-3 · LOW · NEW — sessions never expire on idle

`src/lib/supabase-browser.ts:12` — `{ persistSession: true, autoRefreshToken: true }`. The token
lives in `localStorage` and refreshes indefinitely; there is no idle timeout and no re-auth for
sensitive surfaces. Combined with Dymo's 3.3 (the "Private Vault" has no lock), an unattended
machine is an open vault. The localStorage choice is deliberate and documented — middleware cannot
read cookies — so this is about **expiry**, not storage.

### B-4 · LOW · NEW — dead entry in the middleware allow-list

`src/middleware.ts:25` allow-lists `/api/auth`, described at `:16` as *"reserved for future
server-side auth callbacks"*. No such route exists. A pre-authorised path prefix with no handler is
a trap for whoever creates that directory next.

---

# C · Admin surface

### C-1 · PASS — admin API routes are gated server-side, correctly

All 17 routes under `/api/admin/**` call `getAdminUserId`; none settles for `getApprovedUserId`.
Six more admin-gated routes live outside that tree (`parcels/[id]/route.ts` DELETE-path,
`parcels/submit`, `parcels/pending`, `parcels/[id]/review`, `parcels/[id]/archive`,
`test-notify`). `getAdminUserId` (`src/lib/auth.ts:100-115`) re-reads `role` from Prisma rather than
the JWT and additionally allows two founder emails. **The answer to "are admin routes gated
server-side or only hidden in the UI" is: genuinely gated server-side.**

### C-2 · LOW · partially known (BUG-032) — admin pages are guarded client-side only

`src/app/admin/layout.tsx:28-40` probes `/api/admin/me` on mount and redirects on failure. It is a
client guard, so `/admin`, `/admin/queue` and `/admin/dda-refresh` return 200 HTML to anyone — the
BUG-032 pattern. **No data leaks**: all three are client components whose fetches are admin-gated.
The layout does mean the pages themselves need no `AuthGuard`, which is why they show none.

Related and NEW but harmless: `/deals`, `/deals/[id]`, `/settings`, `/parcels/new` carry no
`AuthGuard`, contrary to CLAUDE.md's *"All protected pages MUST be wrapped in `<AuthGuard>`"*.
`/deals`, `/settings` and `/parcels/new` are 10-line `redirect()` stubs (`deals/page.tsx:9`), and
`/deals/[id]` is a client component whose data 401s. No exposure — a rule violation to tidy, not a
hole. The two pages that genuinely needed the rule are A-1 and A-4, and neither has it.

### C-3 · PASS — parcel deletion is closed at the HTTP boundary

`api/parcels/[id]/route.ts:138-147` returns **405** with an explanatory body. The comment at
`:130-133` records that a previous handler claimed to be inert while actually calling
`prisma.parcel.delete()`. Destructive prisma calls across all 303 routes are now only:
`me/saved-searches` (self-scoped), `me/favorites` (self-scoped), `me/vault/entries/[id]`
(ownership-checked), and `seed-dda:161` — which is **A-2**.

---

# D · Non-map features

### D-1 · HIGH · NEW ROOT CAUSE for Dymo 5.1 — the district resolver only knows districts ZAAHI owns plots in

**Where:** `src/app/api/archie/resolve-district/route.ts:105, 119, 134`

Both lookup passes query `prisma.parcel.findMany` — the ~197-row listings table — and 404 at `:134`
when nothing matches. Dubai Marina has no ZAAHI parcel, so "fly the map to Dubai Marina" can never
resolve. The app already ships 206 DDA district layers and PMTiles covering ~99K Dubai plots; the
resolver consults none of them. This is the cause of the 404 Dymo observed but could not diagnose.

### D-2 · MEDIUM · NEW ROOT CAUSE for Dymo 5.1 (second half) — the 8 retries and the silence

**Where:** `src/app/parcels/map/ArchibaldChat.tsx:79, 262, 330-340`

`const MAX_TOOL_TURNS = 8;` (`:79`) bounds the agent loop at `:262` — exactly the eight round trips
counted in the audit. The 404 is returned to the model as a tool result and the model retries until
the bound is hit. When the `while` condition finally fails, control leaves the loop **without
appending an assistant message** — every `break` path appends one, exhaustion does not. That is why
the conversation ends on the user's own message with no reply.

### D-3 · INFO — Feasibility v6 is dark in production

`src/lib/feasibility-v6/featureFlag.ts:25` — `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED === 'true'`,
default off. Users are on v5 in the map SidePanel. Worth knowing when triaging BUG-010 (the ROI
regression): the calculator the founder reported against and the one at
`/parcels/[id]/feasibility` are different code.

Site Plan PDF (`src/lib/generate-site-plan-pdf.ts`) and the dashboard stubs were inventoried and
produced nothing beyond `dead-controls-2026-08-10` (S1–S10, eight `ComingSoonBanner` declarations).

---

# E · Mobile

I cannot render pages, so this is a static signal and a to-test list, not a verdict.

**Routes declaring zero responsive breakpoints** (no `sm:`/`md:`/`lg:`/`@media`/`matchMedia`):

```
/page.tsx (455 lines — the sign-in / sign-up screen)   /admin/queue/page.tsx (372)
/reset-password/page.tsx (282)                          /admin/dda-refresh/page.tsx (413)
/parcels/check-plot/page.tsx (280)                      /deals/[id]/page.tsx (562)
/refer/page.tsx (149)                                   /register/page.tsx (62 + step components)
/vault/page.tsx (64)                                    /preview/feasibility-v6/page.tsx (31)
+ 6 redirect stubs (10-11 lines each, no layout)
```

**Mitigating, and the reason I am not calling these broken:** the substantive ones use fluid
`maxWidth` containers with no `<table>`, no fixed `gridTemplateColumns`, and no `nowrap`
(`/page.tsx` 2 × maxWidth; `/admin/queue` 3; `/deals/[id]` 2; `/parcels/check-plot` 1). They will
most likely reflow acceptably. The known-bad case remains `/parcels/map` — 5 fixed-pixel chrome
values against a single breakpoint reference across 7,948 lines, already covered as Dymo 4.4.

**Genuinely uncovered and worth one browser pass each:** `/` (every user's first screen, and no
prior audit has looked at it below 900px), `/register` (the entire cohort funnel), and
`/admin/queue` (a daily operator tool). NIGHT_REPORT items #75–#84 covered the legal pages and the
dashboard sidebar; those are fixed (F-09, F-10) and are not re-raised here.

---

# What would close the open questions

| # | Question | Test |
|---|---|---|
| A-3 | Can a user self-approve? | Throwaway unapproved account → `auth.updateUser({ data: { approved: true } })` → `GET /api/me`. 200 = confirmed. |
| A-1 | Does a real id render private data? | One authenticated request for a parcel the founder owns. |
| A-7 | Is the claims board meant to be public? | Product decision. |
| E | Do the zero-breakpoint routes break? | One browser pass at 375px on `/`, `/register`, `/admin/queue`. |

## Recommended order

1. **A-1** — live unauthenticated data exposure, on production now.
2. **A-3** — settle it; if confirmed it defeats the whole approval model, and the fix is small.
3. **A-2** — cross-user destructive write that breaks three written invariants.
4. **A-4** — fix with A-1 while the flag still masks it, and correct the misleading comment.
5. **A-5 / A-6 / A-7**, then **B-1 / B-2** (rate limits + uniform responses), then the Lows.

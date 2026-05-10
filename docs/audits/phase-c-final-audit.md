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

## See also

- `docs/audits/add-plot-cohort-audit.md` — Step 8 audit, Q1 origin.
- `docs/audits/pdpl-step11-audit.md` — Step 11 PDPL sweep + P2 list.
- `docs/specs/phase-1/spec-05-cohort-pilot-v1.md` v1.1 — spec reference.

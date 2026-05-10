# PDPL audit + sweep — Phase C Step 11

**Date:** 2026-05-10
**Branch:** `feat/cohort-pilot`
**Scope:** Spec-05 §12 (PDPL) + audit Q1 (Step 8) + Step 9/10 follow-ups.
**Reference:** UAE PDPL — Federal Decree-Law No. 45/2021 on the Protection
of Personal Data, lawful processing minimisation principles (Art. 5).

---

## TL;DR — verdict

✅ Cohort surface is largely PDPL-clean already. **Three P1 leaks** remain
from earlier steps; **one P0 invariant** (Q1 / LOCK-8) is satisfied today
only by the absence of production data. Both classes are fixed in this
commit set. **Two P2 items** are logged for future work.

Pre-flight against production (read-only, `scripts/pathb-docs-precheck.ts`):

| Check | Production state |
|---|---|
| Submission AffectionPlan rows (Path B) | **0** |
| `AffectionPlan.raw.documents[]` items | **0** |
| `PlotClaim` rows with `documentsJson` | **0** |
| `PlotClaim` items with `.url` shape (public-bucket) | **0** |
| `PlotClaim` items with `.path` shape (private-bucket) | **0** |
| `Parcel.verifiedOwnerUserId` set | **0 / 118** |
| `Deal` rows | **0** |
| `Deal` rows where `sellerId != verifiedOwnerUserId` | **0** |

So **all Step 11 fixes are forward-only code changes.** Nothing to migrate
in storage; nothing to back-fill in the database; no founder approval gate
on data movement.

---

## Method

1. Two parallel sub-agents swept all non-admin surfaces:
   - **API audit:** every route under `src/app/api/` gated by
     `getApprovedUserId` (skipping `getAdminUserId` routes — admin
     surfaces are explicitly allowed to render real names per LOCK-8).
   - **UI audit:** every page + component under `src/app/`
     (excluding `src/app/admin/`) plus `src/components/`.
2. Manual review of:
   - `src/app/api/deals/route.ts` (Q1 site)
   - `src/app/parcels/map/AddPlotModal.tsx` (Path B upload helper)
   - `src/app/api/parcels/submit/route.ts` (Path B server)
   - `src/lib/serialize.ts` (`serializeUserPublic` shape)
3. Pre-check script run against production DB (read-only).

---

## Findings

### P0 — production-breaking risk (now or imminent)

**P0-1 · Audit Q1 — `Deal.sellerId` ignores `verifiedOwnerUserId` (LOCK-8 / CORR-1).**

**Site:** `src/app/api/deals/route.ts:73`

```ts
sellerId: parcel.ownerId,
```

**What's wrong:** spec §5.4.1 row 2 mandates that the public "Owner: X"
surface — including the seller assignment on a Deal — must come from
`verifiedOwnerUserId` (the verified owner) and **must NOT** come from
`ownerId` (the immutable creator) once the two diverge. The same site's
"cannot offer on own parcel" guard (line 57) only checks `ownerId`,
which means after Step 10 ships and a verified owner exists who
isn't the creator, that verified owner *could submit an offer on
their own plot*.

**Severity:** P0 conceptually. Latent today (0 deals on production,
0 verified owners) but becomes a live data-correctness bug the
moment Step 10 verifies its first non-creator OWNER claim.

**Fix:** **shipped this commit set.**

```ts
const sellerId = parcel.verifiedOwnerUserId ?? parcel.ownerId;
// guard now checks BOTH ids
if (parcel.ownerId === userId || parcel.verifiedOwnerUserId === userId) {
  return /* cannot_offer_on_own_parcel */;
}
```

---

### P1 — fix-now PDPL hygiene

**P1-1 · Path B uploads still write to public `documents` bucket.**

**Sites:**
- `src/app/parcels/map/AddPlotModal.tsx:42-90` (uploadDoc helper —
  `getPublicUrl()` against the `documents` bucket).
- `src/app/api/parcels/submit/route.ts:174-198` (Zod accepts `url:` field
  + persists into `AffectionPlan.raw.documents` and
  `PlotClaim.documentsJson`).

**What's wrong:** `documents` is a publicly-readable bucket. Any Title
Deed / RERA Form / Emirates ID uploaded through the AddPlotModal
Broker / Owner submit flow becomes accessible via direct URL to anyone
with the link — including search engines if a URL ever leaks. Spec
§12.1 + §12.2 require KYC-grade documents to live in the private
`registration-docs` bucket, accessed through 7-day signed URLs only.

**Severity:** P1. Production hasn't seen any Path B uploads yet
(pre-check confirms), so no leaked Title Deeds exist on prod today.
But the moment the cohort starts using the AddPlotModal Owner flow
through `/parcels/map`, every Title Deed they upload would land in
the public bucket.

**Fix:** **shipped this commit set.** AddPlotModal `uploadDoc` now
writes to `registration-docs` (private). Returns `{ kind, path, ... }`
instead of `{ kind, url, ... }`. `/api/parcels/submit` Zod schema
accepts the new `path` shape; `PlotClaim.documentsJson` is persisted
in the same shape Path C uses, so Step 10's `signClaimDocuments()`
helper produces a uniform 7-day signed URL for both paths.
Backward-compat: `signClaimDocuments` already handled both shapes
(Step 10), so any pre-existing Path B docs in non-prod environments
keep rendering through the admin UI without manual migration.

---

**P1-2 · `/api/deals/[id]` over-shares email + phone with deal counterparties.**

**Site:** `src/app/api/deals/[id]/route.ts:22-24`

```ts
seller: { select: { id: true, name: true, email: true } },
buyer:  { select: { id: true, name: true, email: true } },
broker: { select: { id: true, name: true, email: true } },
```

**What's wrong:** PDPL data-minimisation principle (Art. 5) — share
only what's necessary. Real names are arguably necessary for legal
context inside an in-flight deal, but raw email + phone are not —
the deal flow has its own messaging / NOC / DLD steps for
counterparty contact. Right now any party to a deal can scrape every
other party's email + name via this endpoint.

**Severity:** P1. Latent (0 deals on prod) but the endpoint is shipped
code that would activate the moment a deal is created.

**Fix:** **shipped this commit set.** Endpoint now selects
`{ id, nickname, name, role, avatarUrl, companyName, reraLicense }`
on each party — name kept (legal context inside the deal), email +
phone dropped. If a deal-stage UX needs counterparty email later,
that's a separate explicit "reveal contact" surface with audit logging
(P2 follow-up).

---

**P1-3 · `/api/deals/[id]/messages` returns real `name` for chat bubbles.**

**Site:** `src/app/api/deals/[id]/messages/route.ts:36, 67`

```ts
user: { select: { id: true, name: true } },
```

**What's wrong:** chat-bubble identity is a rendering label, not a legal
field. `nickname` is sufficient — it identifies the speaker uniquely
within the cohort and matches every other public surface
(`/api/parcels/[id]/claims`, admin queue PlotClaim rows, etc.).
Showing `name` in chat normalises the leak across casual deal-room
interactions.

**Severity:** P1. Latent today (0 deal messages on prod).

**Fix:** **shipped this commit set.** Switched to
`user: { select: { id: true, nickname: true } }`; the deal page UI
falls back to nickname or the truncated user-id when nickname is null.

---

### P2 — tech debt logged for future sessions

**P2-1 · `/api/me` echoes the caller's full PII (`name`, `email`, `phone`).**

**Site:** `src/app/api/me/route.ts:39, 84`

This is **intentional** — the dashboard profile form needs to hydrate
the form fields with the user's own data. PDPL data-subject-access is
satisfied. Logging it here so a future reviewer doesn't flag it as a
regression. **No fix needed.**

---

**P2-2 · Path B → Path C refactor inside `AddPlotModal`.**

The Step 9 lock prevents a deeper refactor of the Broker / Owner
submit flow; Step 11 changes only the `uploadDoc` helper's
destination bucket + return shape. A future cleanup could collapse
all three paths (A / B / C) into one multipart-upload server flow
that mirrors `/api/registration/submit`. Not in this commit set.

---

**P2-3 · `/api/users/sync` returns the full upserted User row.**

**Site:** `src/app/api/users/sync/route.ts:131`

Caller is the user themselves immediately after signup; same data-
subject-access rationale as P2-1. The response is consumed by the
client to set up the local session profile. Acceptable. Logging here
in case a future endpoint shape change inadvertently exposes this
elsewhere.

---

**P2-4 · `documentsJson` raw paths surfaced inside admin route responses.**

Admin endpoints return `path` strings inside `documentsJson` (e.g.
`<userId>/plot-claims/<parcelId>/title_deed-…`). The path embeds the
claimant's userId. Admin-only access is correctly gated, but the
path-as-data-leak surface widens if any future admin tool dumps this
JSON to a less-privileged context. Watch for this in Step 12 polish.

---

## Server-log audit

`grep -rn "console\." src/app/api/...` across Step 9 + 10 routes:
all `console.error` / `console.warn` lines emit either an error
message string, a parcel id, or a userId. **No real names, emails,
phones, or document contents end up in logs.** Spec §12.4 line 6
satisfied.

---

## Server-side bucket policy

Out of scope for code (lives in Supabase dashboard / SQL migration
under `supabase/migrations/`). Confirmed Step 5 already created
`registration-docs` with the documented RLS:

- `INSERT`: `auth.uid()::text = (storage.foldername(name))[1]`
- `SELECT`: signed URL only

The Path B migration writes Path B uploads under
`<userId>/<plotNumber>/<kind>-<ts>-<safe>.<ext>` — userId is the first
folder, so the existing INSERT policy admits the writes without
needing any policy update.

---

## What's *not* changed (locked / out of scope)

Per the Step 11 task instructions, the following surfaces stay byte-
identical:

- `src/app/page.tsx` — auth flow
- `<AuthGuard>` core
- v6 calculator
- Step 6 `/register` UI
- Step 9 `AddPlotModal` Path C flow (user-visible UX)
- Step 10 admin verification UI
- Existing `PlotClaim` / `RegistrationApplication` data
- Canonical docs

The `AddPlotModal.tsx` change touches only the `uploadDoc` helper
function (the bucket destination + return shape) and the
`UploadedDoc` interface — the Broker / Owner / multi-claim user-
visible flow is byte-identical.

---

## Summary table

| # | Severity | Surface | Status |
|---|---|---|---|
| Q1 (LOCK-8) | P0 | `Deal.sellerId` reads `ownerId` | **Fixed** |
| P1-1 | P1 | Path B uploads → public bucket | **Fixed** |
| P1-2 | P1 | `/api/deals/[id]` exposes email/phone | **Fixed** |
| P1-3 | P1 | `/api/deals/[id]/messages` exposes `name` | **Fixed** |
| P2-1 | P2 | `/api/me` self-PII echo | Logged |
| P2-2 | P2 | AddPlotModal full refactor | Logged |
| P2-3 | P2 | `/api/users/sync` self-PII echo | Logged |
| P2-4 | P2 | `documentsJson` paths in admin responses | Logged |

**P0 fixed: 1.** **P1 fixed: 3.** **P2 logged: 4.**

---

## See also

- `docs/audits/add-plot-cohort-audit.md` — Step 8 audit, Q1 origin.
- Step 9 commit `68c490f` — multi-claim Add Plot, where Path B / C
  bucket split was first noted.
- Step 10 commit `c54fbbc` — admin verification, where
  `signClaimDocuments` was added to bridge both bucket shapes.
- `scripts/pathb-docs-precheck.ts` — read-only pre-check script for
  the migration; pattern reusable for future similar audits.

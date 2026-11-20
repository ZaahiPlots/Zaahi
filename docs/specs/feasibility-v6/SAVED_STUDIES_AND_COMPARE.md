# Feasibility v6.1 — Saved studies and compare

Built 2026-11-20 on branch `feat/feasibility-v6-accuracy`.
Status: **code complete, migration NOT applied, nothing below has run against a database.** See [What is not verified](#what-is-not-verified).

Founder brief: *"A user never loses a calculation: studies save automatically, versions are immutable, reopen exactly as saved, flag when defaults or the plot's price or affection plan changed since, attach to the vault entry, and share through VaultShare. A user can put 2–5 studies side by side with assumption differences visible and export the comparison as one PDF."*

---

## 1. Data model

Two new tables. No column on any existing table was added or changed; `User`, `Parcel` and `VaultEntry` gained Prisma back-relation fields only.

### `FeasibilityStudy` — one named working document for one plot

| Field | Notes |
|---|---|
| `id` | cuid |
| `ownerId` → `User` | `ON DELETE RESTRICT` |
| `parcelId?` → `Parcel` | `ON DELETE SET NULL`. Null for vault-only and preview plots |
| `vaultEntryId?` → `VaultEntry` | `ON DELETE SET NULL` — deleting a vault entry detaches its studies, it does not delete them |
| `plotNumber`, `district`, `emirate` | Denormalised plot identity, so a study needs no `Parcel` row |
| `name` | |
| `draftInputs Json?`, `draftUpdatedAt` | The autosaved working copy (`StudyInputs`). Owner-only |
| `latestVersion Int @default(0)` | Highest version number issued |
| `archivedAt` | Soft delete. Nothing hard-deletes a study |
| `createdAt`, `updatedAt` | |

Indexes: `(ownerId, updatedAt)`, `(parcelId)`, `(vaultEntryId)`, `(ownerId, plotNumber)`.

### `FeasibilityStudyVersion` — one immutable snapshot

`id`, `studyId` → study (`CASCADE`), `version`, `name`, `notes?` (text), `mode`, `engines` (display label), `inputs`, `outputs`, `defaultsSnapshot`, `plotSnapshot` (all JSON), `modelVersion`, `defaultsVersion`, `createdByUserId`, `createdAt`. `@@unique([studyId, version])`.

**Money.** `outputs` holds AED figures exactly as `computeOutputs()` produces them. It is a display snapshot, not a money column: nothing is summed, charged or settled from it, so the "store amounts in fils" rule (which is about ledger columns) does not apply. No fils column was introduced.

### Migration

`prisma/migrations/20261120120000_feasibility_studies/migration.sql` — hand-written, additive only.

- Compared statement-for-statement with `prisma migrate diff --from-schema <HEAD schema> --to-schema prisma/schema.prisma --script` (schema-to-schema, no database). The only lines the migration has that the diff does not are the two `ENABLE ROW LEVEL SECURITY` statements, which Prisma does not model.
- Because the diff is schema-to-schema, the pre-existing live-database drift recorded in `BACKLOG.md` is not swept in.
- **RLS.** No earlier migration in `prisma/migrations/` contains an RLS statement, so there was no in-repo pattern to copy. The migration enables RLS on both tables with **no policies**: the Supabase Data API roles (`anon`, `authenticated`, whose key ships in the browser) are denied everything; the server reads and writes through Prisma as the table owner, which RLS does not apply to. Authorisation is in the API routes.

**To apply (founder action):** `npx prisma migrate deploy`. Until then every study route answers `503 {"error":"studies_unavailable"}`, the Studies bar shows one inline notice and stops calling, and the calculator works as before.

---

## 2. Immutability rule

A version row is **inserted once and never touched again**.

- The only write to `FeasibilityStudyVersion` anywhere in `src/` is the `create` in `POST /api/me/feasibility-studies/[id]/versions`. There is no `update`, `upsert` or `delete` on that model, no raw SQL against either table, no `PATCH`/`PUT`/`DELETE` handler on the versions route, and no `DELETE` on any study route. `scripts/feasibility-studies.test.ts` scans the source and fails if any of that changes.
- A correction is a new version. Archiving a study hides it; it removes nothing.
- This is an application-level rule. There is no database trigger enforcing it, and the `CASCADE` from study to versions exists for referential completeness only (no code deletes a study).

**The stored result is the server's.** The version route validates `inputs` with `parseStudyInputs`, recomputes `outputs` with `computeOutputs(inputs)`, and takes `snapshotDefaultsFor(inputs)` itself. Any `outputs`, `version` or `modelVersion` in the request body is dropped by the schema. The one thing accepted from the client is `plotSnapshot`, because the plot may have no `Parcel` row to read it from; it is schema-validated and only ever compared for display.

**Version numbers.** Inside one transaction the study row is updated with `latestVersion: { increment: 1 }` (taking the row lock, so concurrent saves queue) and the version is inserted with the returned number. `@@unique([studyId, version])` is the backstop: a duplicate number fails the insert, the transaction rolls back, the route answers `409 version_conflict` and the client retries once.

---

## 3. Autosave

Engine: `src/lib/feasibility-v6/studyAutosave.ts` (`AutosaveSession`) — no React, API/clock/storage injected, exercised against a fake server in the test script. UI: `src/components/feasibility/StudiesBar.tsx`.

- **Nothing is created by opening the calculator.** The study row is created by the first save after the inputs actually change. The inputs the calculator opened with (or re-seeded to without a user edit) are never treated as a change.
- **Debounce 1.5 s** after the last change; a burst of typing is one request.
- **Saves are serialised.** A change made while the create is still in flight waits for it and becomes a `PATCH` — never a second study.
- **A failed save loses nothing.** The inputs stay in the calculator (they were never the bar's to lose) and are written to `localStorage` under `zaahi.feasibility.draft.<emirate>.<plotNumber>`. The status line shows *Not saved* with Retry; the next change also retries. On the next visit a banner offers *Restore / Discard*. A backup left by an earlier visit is not cleared by a later successful save — only by the user.
- **Tables not deployed** (`503 studies_unavailable`): one notice, no further requests that session, and the browser copy is kept current instead.
- **Leaving the plot** sends whatever is still waiting, to the study of the plot it was typed on. This is best-effort on a full page unload (the request is started, not awaited).
- **Opening a draft or a version** first flushes the current work, then makes that study the autosave target. A save already queued keeps the study it was queued for, so it cannot land in the study opened after it. Opening a *shared* version sets no target: the reader's edits start a study of their own.
- Drafts are validated with the same `studyInputsSchema` as versions. A draft with an out-of-range value is refused (`400`) and kept in the browser until it is valid.

Known behaviour, by design: a study has **one** draft. Opening version 2 of a study and then editing overwrites that study's previous draft. Versions are what is permanent.

---

## 4. Reopen and staleness

A version reopens with exactly the inputs it was saved with (they are loaded as-is through `onLoad`). When it is opened, the bar compares its snapshots with today (`stalenessOf` → `defaultsChanged`, `plotChanged`, `modelChanged` from `study.ts`) and, if anything moved, shows a banner listing each change:

- engine / project **defaults** that differ from the saved `defaultsSnapshot`;
- **plot facts** that differ from the saved `plotSnapshot` — price on record, plot area, FAR, max GFA, land use, use mix (i.e. price or affection-plan changes);
- a different **model version**.

*Recompute on today's defaults* calls `applyNewDefaults` (only fields still equal to their old default move; the user's own figures are kept), loads the result into the calculator and saves it as the draft. The saved version is not altered. The button is offered only when defaults changed; plot and model changes are listed for the user to act on.

On the compare page the defaults and model checks always run. The plot check runs only for studies linked to a public `Parcel` (the page fetches `/api/parcels/[id]`, which applies its own visibility gate, and adapts it with `adaptSidePanelToInput`). For vault-only or preview plots the column says *Defaults up to date* rather than *Up to date*.

---

## 5. Vault attach and sharing

**Attach.** A study created from a vault entry's side panel is attached to that entry when the caller owns it. Other studies of the same plot can be attached / detached from the Studies bar (offered only on the owner's own entry) — `PATCH { vaultEntryId }`. Attached studies appear:

- in the `/vault` row (`studyCount`, shown as "· N studies" under the district);
- in the expanded row and in the map side panel footer (name, latest version, last change).

The vault routes fetch these with separate, never-throwing queries, so the vault keeps working while the study tables do not exist (count 0, empty list). While `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED` is off the vault routes run no study query at all; with the flag on and the tables missing they back off for 60 s after the first failure.

**Sharing rule** (`resolveStudyAccess`, `src/lib/feasibility-v6/studyRules.ts`):

| Caller | Access |
|---|---|
| The study's owner | `owner` — full read/write |
| Holds a `VaultShare` on the study's `vaultEntryId` that is **not revoked**, **not expired**, has permission **`FEASIBILITY` or `OFFER`**, and was granted by the study's owner; and the study is not archived | `shared` — read-only |
| Anyone else, including a `VIEW` share | `none` → `404` (never `403`) |

A shared reader sees saved versions (including their name and notes) and never the draft (`draftInputs` is null, `hasDraft` false). They cannot rename, archive, attach or add versions.

**Granting it.** The share route previously issued `VIEW` only. `POST /api/me/vault/entries/[id]/shares` now accepts `permission: "VIEW" | "FEASIBILITY"` (default `VIEW`, so existing callers are unchanged). `ShareModal` has a working two-way selector in place of the disabled "View + Feasibility (soon)" radio. `OFFER` is still not grantable from the API; it is honoured by the access rule if it ever is.

---

## 6. Compare

`/feasibility/compare?v=<versionId>,…` — 2 to 5 distinct version ids (`parseCompareIds`).

- **Results** table driven by `COMPARE_METRICS`; the better value per row (`bestIndex`) is highlighted and labelled "Best".
- **Assumptions** table from `assumptionRows`; differing rows are tinted, edged and labelled "Differs", with a *Show only differences* toggle and a count.
- **Stale flag** per column, and a banner listing what changed for each stale column.
- **Export PDF** — one landscape A4 document built on `pdfKit` (`src/lib/feasibility-v6/comparePdf.ts`): cover line with the date, a "versions compared" table with the per-column status, the results table (best cell green and marked `*`), the assumptions table (differing rows bold, amber, suffixed "(differs)"), what changed since saved, and the disclaimer. Marks are text as well as colour so a black-and-white print keeps them.

Every figure on the page and in the PDF is the version's **saved** output. Nothing is recalculated.

`/feasibility/studies` — the caller's studies, paginated (20 per page, "Load more"), grouped by plot; tick 2–5 versions → Compare; rename; archive / restore; "show archived".

Both pages are wrapped in `AuthGuard` and return `notFound()` when `IS_FEASIBILITY_V6_ENABLED` is false.

---

## 7. API contract

All routes: `runtime = "nodejs"`, gated by `getApprovedUserId`, zod-validated, `401 unauthorized` without an approved session, `503 studies_unavailable` when the tables are missing, `404 not_found` for a study/version the caller may not read. Nothing is logged except an error class/code.

### `GET /api/me/feasibility-studies`

Query: `plotNumber`, `parcelId`, `vaultEntryId` (alternatives — OR), `archived=only|include` (default: active only), `cursor`, `limit` (default 20, max 50).

```jsonc
{
  "items": [StudySummary],        // the caller's own, newest first
  "shared": [StudySummary],       // read-only, via vaultEntryId; first page only
  "vaultEntryOwned": true,        // null without a vaultEntryId filter
  "nextCursor": "…" | null
}
```

`StudySummary`: `id, name, plotNumber, district, emirate, parcelId, vaultEntryId, latestVersion, hasDraft, draftUpdatedAt, archivedAt, createdAt, updatedAt, access, latest, recentVersions[≤10]`.
`VersionSummary`: `id, studyId, version, name, mode, engines, modelVersion, defaultsVersion, createdAt, headline{status, profitAed, roiPct, irrPct, verdictLabel, verdictTone}`.

### `POST /api/me/feasibility-studies` → `201 { study: StudySummary }`

Body `{ name?, parcelId?, vaultEntryId?, plot: { plotNumber, district, emirate }, draftInputs }`. A `parcelId` with no `Parcel` row (e.g. `mock-001`) and a `vaultEntryId` the caller does not own are both stored as `null` — not an error.

### `GET /api/me/feasibility-studies/[id]` → `{ study: StudyDetail }`

`StudyDetail` = summary fields + `draftInputs` (owner only) + `versions[≤100]` in full (`notes, inputs, outputs, defaultsSnapshot, plotSnapshot`) + `versionsTruncated`. Owner or shared reader.

### `PATCH /api/me/feasibility-studies/[id]` → `{ study: { id, name, vaultEntryId, latestVersion, draftUpdatedAt, archivedAt, updatedAt } }`

Owner only. Body (strict; at least one key): `{ name?, draftInputs?, archived?, vaultEntryId? }`. Attaching to an entry the caller does not own → `404 vault_entry_not_found`.

### `POST /api/me/feasibility-studies/[id]/versions` → `201 { version: StudyVersion }`

Owner only. Body `{ name, notes?, inputs, plotSnapshot }`. Errors: `400 validation_failed | invalid_inputs`, `422 compute_failed`, `409 version_conflict | version_limit` (1000 per study).

### `GET /api/me/feasibility-studies/compare?v=a,b,c` → `{ items: [{ access, study{id,name,plotNumber,district,emirate,parcelId,vaultEntryId}, version: StudyVersion }] }`

In the order asked. `400 too_few | too_many | invalid_id`. If **any** id is unknown or unreadable the whole request is `404`.

### Changed existing routes

- `POST /api/me/vault/entries/[id]/shares` — `permission` now `VIEW | FEASIBILITY`.
- `GET /api/me/vault/entries` — each item gains `studyCount`.
- `GET /api/me/vault/entries/[id]` and `GET /api/vault/entries/[id]` — gain `studies: [{ id, name, latestVersion, latestVersionId, updatedAt }]` (for a recipient: only with a `FEASIBILITY`/`OFFER` share, only studies with a saved version).

Client: `src/lib/feasibility-v6/studiesClient.ts` (typed wrappers over `apiFetch`; every call resolves to `{ ok, … }` and never throws).

---

## 8. What is not verified

The migration is not applied and `DATABASE_URL` points at production, so **no route has executed a query.** The UI was exercised in a browser only against an in-memory stand-in for the API (see "Verified").

Not verified:

- every Prisma query in the six handlers and in `src/lib/feasibility-studies.ts` (shapes type-check against the generated client; behaviour is untested);
- the version transaction under real concurrency, and that a duplicate surfaces as `P2002`;
- that a missing table surfaces as `P2021`/`P2022` (or a message containing the table name) through the `pg` driver adapter — this is what the `503 studies_unavailable` path, and therefore the graceful degradation, depends on. If the adapter reports it differently the routes answer `500` and the bar shows *Not saved* with Retry instead of the quiet notice; the calculator still works either way;
- that enabling RLS without policies leaves Prisma's role able to read/write (true if it connects as the table owner, which is how the other tables work, but not checked);
- `/feasibility/studies`, the changed vault UI (row count, side-panel list, share selector) and the comparison PDF download in a real browser; layout at 320 px;
- the `studyCount` / `studies` additions on the vault routes against real data;
- end-to-end sharing: grant `FEASIBILITY`, read as the recipient, revoke, expire.

Verified (`npx tsx scripts/feasibility-studies.test.ts`, 227 checks; `npx tsc --noEmit` clean; ESLint clean on the new files; `npx prisma validate`):

- the access rule, compare-id parsing and request schemas (including that a client cannot set outputs, version numbers, owner or versions);
- the autosave engine against a fake server — lazy create, debounce, serialisation, failure/backup/retry, unavailable, revert cases, study switching, dispose;
- that the server-side recompute is a pure function of the inputs;
- staleness detection and metric formatting;
- that the comparison PDF builds for 2 and 5 studies, is landscape, and carries the "best" and "differs" marks as text (one sample was also rendered and read by eye);
- static guards: one insert and no other write on version rows, every handler gated, no `DELETE`, migration touches only its own tables;
- each new client component server-renders its initial state without throwing.
- in Chromium against the production build, with the studies API replaced by an in-memory mock that recomputes outputs with the real `computeOutputs` (1440 px): opening the calculator creates nothing; the first edit creates one study and autosaves the draft; "Save version" twice produces versions 1 and 2 on the same study with server-side figures; `/feasibility/compare?v=…` renders both columns, marks the better value per row, and lists the land cost among the assumptions. This checks the client and the wire shapes, not the Prisma layer.

Changes made after that run: `bestIndex` returns no winner when the best value is tied; the comparison's assumption list starts with land cost, land payment terms and plot area / FAR; the calculator hands the bar its undebounced inputs so "Save version" freezes what is on screen.

## 9. Files

- Schema / migration: `prisma/schema.prisma`, `prisma/migrations/20261120120000_feasibility_studies/migration.sql`
- Rules (pure): `src/lib/feasibility-v6/studyRules.ts`, `src/lib/feasibility-v6/studyAutosave.ts`
- Server: `src/lib/feasibility-studies.ts`, `src/app/api/me/feasibility-studies/**`
- Client: `src/lib/feasibility-v6/studiesClient.ts`, `src/lib/feasibility-v6/comparePdf.ts`
- UI: `src/components/feasibility/{StudiesBar,studiesUi,VaultStudiesList}.tsx`, `src/app/feasibility/{studies,compare}/**`
- Tests: `scripts/feasibility-studies.test.ts`

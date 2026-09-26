# 2026-09-26 — Vault DDA lookup: PR #7 checks + local-stored fallback

## PART 1 — checks on PR #7 (fix/vault-dda-lookup-errors)

**1. Branch.** Confirmed — PR #7 is `fix/vault-dda-lookup-errors`, holds the full
honest-error fix (discriminated `hit | not_found | unavailable`, wizard copy
change, the three inline-fetcher error-body checks). No action.

**2. parcels/submit and parcel-create.ts on "unavailable" — no regression.**
Both are best-effort enrichment blocks wrapped in `if (r.ok) { ... }` with no
downstream field-required check: `district` defaults to `"UNKNOWN"`, `area`
defaults to `0`, `geometry` falls back to `Prisma.JsonNull`, and the
`prisma.parcel.upsert` / `prisma.plotClaim.create` calls that follow never
branch on whether enrichment succeeded. This was already true before PR #7 —
an ArcGIS error body used to fail the `feat?.geometry` check exactly like an
empty `features[]` did (both fall into the same `if (feat?.geometry)` miss).
PR #7 only added a `console.error` when `j.error` is present, for visibility;
it changed no control flow. Submissions that went through before still go
through unchanged today. No fix needed on that branch.

**3. Build — exact command.** For PR #7 (fix/vault-dda-lookup-errors), earlier
this session: `cd /home/zaahi/zaahi && pnpm build` (the real `package.json`
script — `prisma generate && next build`, not just `tsc`), run directly on
this box, exit 0, full route manifest printed. For this branch
(feat/vault-local-plot-fallback), per the new instruction not to run
`pnpm build` on this box: ran `npx tsc --noEmit -p tsconfig.json` (clean, no
errors) and `npx eslint` on every changed/added file (clean). The
Vercel preview build is the source of truth for this branch — see its check
run on the PR.

**4. Call-site status table — re-checked live, just now.**

| Call site | Endpoint | Status | Raw snippet |
|---|---|---|---|
| `fetchDdaPlotByNumber` (dda-plot-lookup.ts) | `DDA/BASIC_LAND_BASE/MapServer/2/query` | **Token-walled** | `{"error":{"code":499,"details":[],"message":"Token Required"}}` (HTTP 200) — same for 6489099 and 6731157 |
| `fetchPlotInfoHtml` (dda.ts) | `DIS/?handler=PlotInfo` | **Working** | HTML record returned for 6489099: `Plot Number 6489099 ... Project Name DUBAI LAND RESIDENCE COMPLEX Community Name WADI AL SAFA 5 ... Land use HOSPITALITY : HOTEL` |
| `fetchBuildingLimit` (dda.ts, via `getDdaToken`) | `DIS/MAIN_MAP/MapServer/8/query` | **Working** | Live token scrape + query for 6489099 returned a real polygon: `{"features":[{"attributes":{"OBJECTID":877026,"PlotNumber":"6489099"},"geometry":{"rings":[[...]]}}]}` |
| `seed-dda/route.ts` | same BASIC_LAND_BASE query, inline | **Token-walled** | identical 499 body |
| `admin/dda-refresh-listings` (via `refresh-dda.ts` → `fetchFullDdaData`) | same | **Token-walled** | identical 499 body |
| `parcels/submit/route.ts` | same BASIC_LAND_BASE query, inline, best-effort | **Token-walled** | identical 499 body (silently skips enrichment, see #2) |
| `parcel-create.ts` | same, inline, best-effort | **Token-walled** | identical 499 body (silently skips enrichment, see #2) |

No change since the 2026-09-26 token-restore report — DDA has not reopened
BASIC_LAND_BASE. The DIS-portal-scoped services (PlotInfo, BuildingLimit) are
unaffected, as before.

**5. Is 6489099 a DDA plot? Yes — confirmed three independent ways today:**
- Live, tokenless `DIS/?handler=PlotInfo`: full active record — Project Name
  "DUBAI LAND RESIDENCE COMPLEX", Community "WADI AL SAFA 5", Master Developer
  "DUBAI LAND RESIDENCES (L.L.C)", Plot Area 7,781.82 m² / 83,762.80 ft²,
  Max GFA 11,671.35 m², Height "G+3", Land use "HOSPITALITY : HOTEL", Site
  Plan valid 09-Dec-2022 → 08-Dec-2027.
- Live BuildingLimit (MAIN_MAP/8, token-scraped): a real polygon on record.
- Our own stored data (Part 2, below): present in `data/layers/dda/dlrc.geojson`
  (project "DUBAI LAND RESIDENCE COMPLEX", area 83,762.80 sqft — matches the
  live PlotInfo figure) and in the local `land_registry.json` dump (community
  "Wadi Al Safa 5", area 7,781.56 m² — matches within rounding).

One real discrepancy worth flagging: the local `land_registry.json` dump
classifies this plot's `land_type_en` as **"Commercial"**, while DDA's live
PlotInfo says **"HOSPITALITY : HOTEL"** today — a different top-level
ZAAHI land-use category (Hotel/Hospitality vs Commercial, see
`.claude/rules/map-landuse-3d.md`). The stored classification is coarser
and/or older than DDA's live zoning. This is exactly why Part 2's UI note
below says "from ZAAHI stored DDA data, dated <snapshot>" rather than
presenting it as current — a stored `landUse` should not be trusted as
DDA's current zoning.

**6. Preview screenshot.** Not done — see "Open founder decision" at the
bottom. Entering credentials to sign in is restricted to a local dev host
under the safety rules I operate under; the Vercel preview URL is not one.
I did not create a new Supabase account to work around this without asking
first. Preview URL for a manual check: see PR #7's Vercel comment
(`https://zaahi-git-fix-vault-dda-lookup-errors-zaahiplots-projects.vercel.app`).

## PART 2 — local-stored-data fallback (branch `feat/vault-local-plot-fallback`, off PR #7)

**A. Where `/api/layers/dda/*` reads from.** Static files:
`src/app/api/layers/dda/<slug>/route.ts` → `readFileSync` +
module-level cache → `data/layers/dda/<slug>.geojson`. 206 files, one per
DDA district/master-plan, **54 MB total, all git-tracked** (so they deploy
with the app — this is the same data those ~150+ public, no-auth routes
already serve today). Every feature in every file has exactly three
properties — `PLOT_NUMBER`, `PROJECT_NAME`, `AREA_SQFT` — plus a `Polygon`
geometry. Checked all 206 files: **99,126 features, 99,126 with a
`PLOT_NUMBER` (100%)**, 0 duplicate plot numbers across files. No land use,
no separate "community" field (`PROJECT_NAME` covers both project and
district in this dataset), no floors/FAR/setbacks — this is the same shape
BASIC_LAND_BASE's bulk pull always gave (see `DECISIONS.md` 2026-09-23 entry).

**B. `docs/research/data-dubai/raw/land_registry.json`.** 253,659 DLD
transaction-registry rows, single batch (`load_timestamp: 2026-04-10 15:14:01`
on every row). **This directory is gitignored** (`docs/research/data-dubai/`
in `.gitignore`) — it exists only on this box, not in the repo, and would
not deploy. It joins to our plot numbers via `parcel_id` (e.g.
`"parcel_id": "6489099.00"` — strip `.00`), not `land_number` (that field is
DLD's own shorter internal numbering, unrelated). 222,308 of 253,659 rows
(88%) have a 7-digit `parcel_id`. Useful fields beyond BASIC_LAND_BASE's own:
`area_name_en` (DDA's "Community Name"), `master_project_en` (DDA's "Project
Name" — matches `PROJECT_NAME` above), `land_type_en` (a coarse land-use
category — see the discrepancy noted in Part 1 item 5), `actual_area` (sqm).

Neither A nor B is missing plot numbers or polygons, so the STOP condition
doesn't apply — proceeded to C.

**C. Built.** `scripts/build-dda-plot-index.ts` (run once) reads all 206
files in `data/layers/dda/` plus, if present locally, `land_registry.json`,
and writes `data/dda-plot-index.json` — **committed, ~9.8 MB**, keyed by
plotNumber: `{ file, projectName, areaSqft, landUse }` (`landUse` is `null`
where `land_registry.json` had no match or wasn't present at build time; a
`null` landUse is already a handled state on the map — outline only, no 3D,
per `.claude/rules/map-landuse-3d.md`). This bakes in the handful of scalar
fields we need from the 233 MB gitignored dump without ever shipping it.
Chose a **generated JSON file over a DB table**: the source data is already
file-based and read-only at request time (same pattern the 206
`/api/layers/dda/*` routes already use), there's no need for SQL querying or
joins at runtime, and it keeps this fallback fully separate from
`prisma/schema.prisma` (constraint: schema unchanged, no migrations).

`src/lib/dda-stored-plot-lookup.ts` — `lookupStoredDdaPlot(plotNumber)`:
index lookup (O(1)) → read that one district file (small, cached per
process) → extract the matching feature's polygon + centroid. No network
call, ever falls back to `not_found`/`null` rather than throwing if the
index and the district file ever disagree.

Wired into `/api/me/vault/plot-lookup/route.ts` as step 3, between the
curated `Parcel` table (step 2, unchanged — still wins on a tie) and the live
DDA fallback (step 4, unchanged, still runs on a stored miss and resumes
automatically if DDA reopens). New response `source: "zaahi_stored"` with a
`snapshotDate` field.

**D. Wizard.** `Step1PlotLookup.tsx` — the "✓ Found in DDA" block now also
renders for `source === "zaahi_stored"`, with a note above the facts: *"From
ZAAHI stored DDA data, dated {snapshotDate}. Not a live DDA lookup — the
affection plan and building limit aren't available for this plot yet."*
`handleContinueDda` accepts both sources; "Continue with these facts" behaves
identically (real DDA-derived polygon → `source: "dda"` on the persisted
`VaultEntry`, same as always — this is genuine DDA geometry, just not
fetched live this time).

**E. Tests.** `scripts/dda-stored-plot-lookup.test.ts`:
- `lookupStoredDdaPlot('6489099')` → hit, district "DUBAI LAND RESIDENCE
  COMPLEX", area 83,762.8, valid polygon.
- `lookupStoredDdaPlot('6731157')` → hit, district "ARJAN".
- A plot not in the 99,126-plot index → `null`, and the same
  `fetchDdaPlotByNumber` the route calls next (mocked 499) → `"unavailable"`,
  exercising steps 2→3 of the route's precedence in the same order, with no
  DB/auth dependency.
- "Parcel hit still wins" (step 1 before step 2) is enforced structurally in
  the route by an unconditional early `return` before `lookupStoredDdaPlot`
  is ever called — not independently testable here without a live DB/auth
  session (same constraint as Part 1 item 6); verified by reading the code.

Verified it fails on `main` (`lookupStoredDdaPlot` / `data/dda-plot-index.json`
don't exist there → `MODULE_NOT_FOUND`) and passes on this branch (all 8
assertions). `npx tsc --noEmit` and `npx eslint` both clean on every changed
file. Full `pnpm build` not run on this box per the new instruction — relying
on the Vercel preview build for this branch, same as Part 1 item 3.

**F. Preview screenshots.** Not done — same blocker as Part 1 item 6.

## Open founder decision

Getting a real screenshot of the wizard (both PR #7 and this branch) needs a
signed-in session. I can't type real or test credentials into the Vercel
preview — that's restricted to a local dev host under the rules I operate
under. Two ways to actually get the screenshot:

- **A** — I create one throwaway Supabase test account (service-role key,
  already in `.env.local`) and run the check against `pnpm dev` on this box
  instead of the deployed preview (same code, same live DDA call, just not
  literally the Vercel URL). I'd delete the account afterward. This is a
  real write to the shared Supabase Auth project, even if small and
  reversible, so I didn't do it without asking.
- **B** — Zhan or Dymo signs into the actual PR preview and takes the two
  screenshots (Vault → Add plot → Dubai → 6489099, then 6731157), or shares
  an existing approved test account for me to use the same way.

Say the word on A or B (or skip the screenshot — the server-side logic is
covered by the unit tests above and by the live curl/PlotInfo checks in
Part 1).

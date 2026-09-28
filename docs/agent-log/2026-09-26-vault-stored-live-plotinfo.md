# 2026-09-26 — Vault stored hits: enrich with live PlotInfo/BuildingLimit

Branch `feat/vault-stored-live-plotinfo` off main `5ab3919`. `feat/plot-developer-registry`
untouched (checked out cleanly, nothing stashed).

## Problem

A "zaahi_stored" plot-lookup hit (99,126 plots harvested before the
2026-09 `BASIC_LAND_BASE` token wall) served land use from the April-2026
`data.dubai` snapshot, which can be stale. Confirmed live on 6489099:
stored = `COMMERCIAL`, DDA PlotInfo today = `HOSPITALITY : HOTEL`.
`fetchPlotInfoHtml`/`parseAffectionPlan` and `fetchBuildingLimit` are a
different DDA subsystem (DIS/AGSToken flow) from the walled
`BASIC_LAND_BASE` — confirmed still working tokenless.

## What changed

- **`src/lib/dda-stored-plot-lookup.ts`** — new `enrichStoredHit(plotNumber, stored, deps?)`.
  Runs `fetchPlotInfoHtml`+`parseAffectionPlan` and `fetchBuildingLimit` in
  parallel, each wrapped in its own try/catch + an 8s `withTimeout`, same
  best-effort pattern as `fetchFullDdaData` (a failure/timeout → `null`,
  never blocks the stored result — neither fetch shares a failure path with
  the other). `deps` is injectable so tests exercise the merge with no
  network call and no DIS token flow.
- **`src/app/api/me/vault/plot-lookup/route.ts`** — the `zaahi_stored`
  branch now calls `enrichStoredHit` and returns `plan`/`buildingLimit` in
  the same shape the live-DDA branch already returns, plus `fieldSources`.
- **Wizard (`Step1PlotLookup.tsx`, `types.ts`)** — note text and
  `PlotLookupResponse.ddaData.fieldSources` type. No change needed in
  `handleContinueDda` or `Step3Confirm`'s POST body — both already forward
  `dda.plan`/`dda.buildingLimit` through regardless of `source`, so they
  pick up the new fields for free.
- **`src/app/api/me/vault/entries/route.ts`** — **not touched.** See
  "Step 5" below for why nothing there needed to change.

## Merge rule

Polygon and area always stay from the stored snapshot (`lookupStoredDdaPlot`
never runs a network call for those). For land use, floors, FAR, height,
setbacks and the building-limit polygon: live PlotInfo/BuildingLimit value
when the fetch succeeds, otherwise the stored value — the stored index only
ever had one of those six (land use), so "otherwise stored" for the other
five just means `null`, same as it would if the plot had never been in DDA
at all.

`landUse` is the first `landUseMix` category from the live plan (uppercased),
falling back to the stored string. `fieldSources` reports `"live_dda"` /
`"stored"` per field so a caller can tell a freshly-verified value from a
carried-over one.

**Parsing quirk found and worked around (not a change to `dda.ts`, out of
this task's edit scope):** on 6489099's PlotInfo HTML, `parseAffectionPlan`'s
primary `<li><b>CATEGORY</b>` match finds nothing and falls back to a raw
"Land use … General Notes" text span, which on this page's layout leaks a
trailing Setbacks table into the category string: `"HOSPITALITY : HOTEL
Setbacks Side Building Podium Side 1 7.5 N/A …"`. `deriveLandUse`'s
`contains`-style regex is unaffected (matches on "hospitality"/"hotel"
regardless), but the raw string would have shown up as-is in the wizard's
"Land use" line. Fixed by truncating at the leaked `Setbacks Side Building`
marker inside `enrichStoredHit`'s `firstLandUseCategory` helper only — the
persisted `plan.landUseMix` (what `writeAffectionPlan` stores) is left
untouched, matching exactly what a live-DDA hit on the same plot would
persist. Root cause is `dda.ts`'s fallback regex; worth a follow-up task.

## Step 5 — AffectionPlan persistence parity

Traced the full path instead of changing it, since it already works once
`plan` is non-null:

- `Step1PlotLookup.handleContinueDda` forwards `dda.plan ?? null` /
  `dda.buildingLimit ?? null` for **both** `source === "dda"` and
  `source === "zaahi_stored"` — same code path, unconditional on source.
- `Step3Confirm` POSTs `plan`/`buildingLimit` straight through to
  `/api/me/vault/entries`.
- `ensureVaultPrivateParcel` in the entries route: `if (plan) { writeAffectionPlan(...) }`
  fires whenever `plan` is truthy, regardless of `ddaSnapshot`. Before this
  task, a stored hit's `plan` was always `null` client-side (the route never
  returned one), so every stored-hit save fell to the `vault-manual`
  synthesis branch (landUse only, no floors/far/setbacks). After this
  change, a stored hit where PlotInfo succeeds now has `plan` populated the
  same way a live-DDA hit does, so it takes the exact same
  `writeAffectionPlan(parcelId, plotNumber, plan, buildingLimit)` call — full
  parity, not just "it doesn't crash."
- When PlotInfo still fails on a stored hit, behaviour is unchanged from
  before this task (falls to the `vault-manual` synthesis using the stored
  land use) — no regression, and no fix needed since the failure case was
  never claimed to need parity, only the success case.

## 6489099 — before / after

| | Land use | Floors | FAR | Legend category (`deriveLandUse`) |
|---|---|---|---|---|
| **Before** (stored only) | `COMMERCIAL` | — (never surfaced) | — | `COMMERCIAL` |
| **After** (enriched, live 2026-09-26) | `HOSPITALITY : HOTEL` | `4` (height 16m) | `null` — PlotInfo has no GFA figure for this plot, so `fieldSources.far = "stored"` even though the stored index never had FAR either | `HOTEL` |

Building limit: present (a real polygon), `fieldSources.buildingLimit = "live_dda"`.
Setbacks: 4 sides parsed, `fieldSources.setbacks = "live_dda"`.

## Tests

`npx tsx scripts/vault-stored-live-plotinfo.test.ts` — 20/20 assertions
pass on this branch. `enrichStoredHit` doesn't exist on `main`
(`git show main:src/lib/dda-stored-plot-lookup.ts | grep enrichStoredHit`
→ 0 matches), so the import fails there — fails on main, passes here, per
the task's requirement.

- stored hit + PlotInfo ok → live land use (`HOSPITALITY`) wins over the
  stale stored one (`COMMERCIAL`); all five plan-derived `fieldSources` are
  `live_dda`.
- stored hit + PlotInfo throws → no exception out of `enrichStoredHit`,
  `landUse` falls back to the stored value, `plan` is `null`,
  `fieldSources.landUse`/`floors` are `stored`; the independent
  BuildingLimit fetch is unaffected.
- stored hit + BuildingLimit null (and, separately, throwing) → result is
  still returned, `plan` still populated, `buildingLimit` is `null`,
  `fieldSources.buildingLimit = "stored"`.

Also re-ran the two pre-existing DDA test scripts (no regressions):
`scripts/dda-stored-plot-lookup.test.ts` and
`scripts/dda-plot-lookup-error-handling.test.ts` — both all-pass.

`npx tsc --noEmit` — clean. `npx eslint` on every changed/added file —
clean (the new test script gets the same "ignored, scripts/ dir" warning
the existing `.test.ts` scripts under `scripts/` get, not an error).
`pnpm build` not run on this box per instruction — Vercel preview build on
the PR is the source of truth.

## PR

https://github.com/ZaahiPlots/Zaahi/pull/9 (not merged — founder tests locally first)

## Local URL for founder check

Neither port 3000 nor 3111 on this box is this repo — 3000 is
`~/Projects/afterward` and 3111 turned out to be an unrelated app ("Pam
Pam's Island"), confirmed by curling their `<title>` before pointing the
founder anywhere. Started this checkout's `pnpm dev` on **port 3200**
instead (verified: `<title>ZAAHI — Real Estate OS</title>`, `/parcels/map`
→ 200). Vault wizard: `http://localhost:3200/parcels/map` → open the map →
"+ Add to Vault" on any plot, or use the wizard's plot-number field
directly with `6489099` / `DUBAI` / any district string to reproduce the
before/after in the walkthrough above.

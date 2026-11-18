# 2026-11-18 — vault land-use classification + setback leak

Branch `fix/vault-landuse-classify` (off `origin/main`; PR #12 length fix already merged). Not pushed.

## A — wrong colour (Residential instead of Mixed Use)
- **Root cause:** `deriveLandUse` (`src/app/parcels/map/land-use.ts`, former `categorize` step 1) ran one first-match regex over a whole multi-category string. In `COMMERCIAL : OFFICES, RETAIL / HOSPITALITY : HOTEL, HOTEL APARTMENT / RESIDENTIAL : APARTMENT, VILLA` the first regex tested (`residential|…|apartment`) hits → RESIDENTIAL; the set never reaches 2 categories. The vault map path feeds it a single-string category (`synthesizeAffectionPlanFromDdaSnapshot`, `src/lib/dda-plot-lookup.ts:124`, or the PlotInfo parse).
- **DDA layer rule (exists):** `parseDdaLandUse` in `scripts/prepare-tiles.ts` splits `MAIN_LANDUSE` on `-`, collects distinct categories, ≥2 → `MIXED_USE`. Plot 3720253 raw `MAIN_LANDUSE` = `COMMERCIAL - HOSPITALITY - RESIDENTIAL` → Mixed Use (verified in `data/layers/dda-plots/dubai-holding-plots-at-al-safouh-first.geojson`).
- **Fix:** `deriveLandUse` now splits category/sub on `/` and ` - `, classifies each segment by its head (text before `:`), ≥2 distinct → `MIXED_USE`. Same rule as the DDA layer, vault + map listings share the one function. `page.tsx` vault-entry fallback now runs `props.landUse` through `deriveLandUse` before the old underscore-normalise (which produced an unknown key → gold). Legend/colours/3D untouched.
- **Known remaining duplicate (pre-existing, not touched):** `prepare-tiles.ts` keeps its own `parseDdaLandUse` (build script, tile rebuild needed to change). Not merged to avoid a tile rebuild.
- **Did c2bd1db expose it?** Partly. The classifier bug is independent of length and was always there for any multi-category string (e.g. shorter `COMMERCIAL : OFFICES / RESIDENTIAL : APARTMENT`). But the 3720253-style string is >64 chars; before c2bd1db the vault routes rejected it (400), so such entries could not be saved — the cap raise let them reach the classifier. Assumed from the commit message / test; not re-verified against production.

## B — setback text in landUse
- **Root cause:** `src/lib/dda.ts:203` fallback `Land use\s+(.+?)\s+General Notes` captures across the Setbacks table when it sits between the two labels, so `landUseMix[0].category` holds `… Setbacks Side Building Podium Side 1 SEE NOTES …`. Only `dda-stored-plot-lookup.ts` trimmed it; the Parcel-cached lookup branch and the save routes did not.
- **Fix:** one helper `stripSetbackTail` (`src/lib/vault-land-use.ts`), used in `dda.ts` fallback, `dda-stored-plot-lookup.ts`, `plot-lookup/route.ts` (Parcel branch), `landUseStoredSchema` (vault entries create/update/promote) and `parcels/submit`. Setback numbers are not dropped: `affectionPlan.setbacks` is parsed separately (`sbRe`) and untouched.
- **Polluted existing rows: count PENDING.** The only DATABASE_URL on this box is a remote Supabase pooler (prod/staging not distinguishable); per constraints I did not connect. Read-only counts to run:
  ```sql
  SELECT count(*) FROM "VaultEntry" WHERE "landUse" ~* '\s+Setbacks\s+Side\s+Building';
  SELECT count(*) FROM "AffectionPlan" WHERE "landUseMix"::text ~* 'Setbacks\s+Side\s+Building';
  ```
  (table/column names assumed from Prisma model names; verify before running.)
- **Proposed cleanup (NOT run):** in a transaction, `UPDATE "VaultEntry" SET "landUse" = btrim(regexp_replace("landUse", '\s+Setbacks\s+Side\s+Building.*$', '', 'i')) WHERE "landUse" ~* …;` plus the same for `AffectionPlan.landUseMix[*].category` via a small script using `stripSetbackTail`. Take a backup/`SELECT` of affected ids first.

## Tests (`tests/e2e/vault-landuse-classify.spec.ts`, 4 tests)
- Before fix: 4/4 fail (A returns `RESIDENTIAL`; B helper missing).
- After fix: 4/4 pass.
- Gates: `tsc --noEmit` clean; `eslint src/` 0 errors (13 warnings, pre-existing); `pnpm build` exit 0; full e2e 69 passed, 2 failed = known `admin-pause.spec.ts:96`, `sun-slider-removed.spec.ts:14`.
- Not verified: visual check of the 3D colour on zaahi.io / local map (assumed from unit tests + code path).

## Commits
See `git log fix/vault-landuse-classify`.

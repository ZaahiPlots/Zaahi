# 2026-11-18 — vault landUse 64-char cap

Branch `fix/vault-landuse-length` (off main, not pushed). Fix commit: `c2bd1db`; this log is committed separately after it.

## Where the cap was
Zod `z.string().trim().max(64)` on `landUse`, four copies:
- `src/app/api/me/vault/entries/route.ts:88` (create — the Step 3 "Confirm" 400)
- `src/app/api/me/vault/entries/[id]/route.ts:45` (PATCH, nullable)
- `src/app/api/me/vault/entries/[id]/promote/route.ts:55`
- `src/app/api/parcels/submit/route.ts:57` (had `.min(1)`, kept)
No client-side schema caps it (rg of `src/app/vault` found none).

## Change
New `src/lib/vault-land-use.ts` (`LAND_USE_MAX_LENGTH = 512`, `landUseSchema`); all four routes use it. 9-category legend, auth, AuthGuard untouched.

## DB column: no change needed
`VaultEntry.landUse` is `String?` (prisma/schema.prisma:834) = Postgres `TEXT` (migration `20260513230047_vault_mvp`). No `@db.VarChar` anywhere in the schema. Promote/submit write it into `landUseMix` JSON, also uncapped. No schema or migration touched.

## Test
`tests/e2e/vault-landuse-length.spec.ts` (schema-level, no browser/DB; run with `ZAAHI_E2E_BASE_URL` set to skip webServer):
- "75-char DDA land-use string is accepted untruncated" — BEFORE (cap 64): FAIL; AFTER (512): PASS.
- "absurdly long land-use is still rejected" (513 chars) — pass both.
Caveat: tests the shared schema, not an HTTP POST through the route (routes need auth+DB). Route wiring verified by tsc/build only.

## Gates
- tsc --noEmit: clean (after build; before it, stale `.next/types` errors only)
- pnpm build: OK
- eslint src/: 0 errors, 14 pre-existing warnings
- Full e2e: 65 passed, 2 failed — `admin-pause.spec.ts:96` (sign-out lands on /parcels/map not /login) and `sun-slider-removed.spec.ts:14` (light azimuth 122.97 vs <120). Neither touches landUse; **assumed pre-existing/unrelated, NOT verified on main** (pending).

## Other DDA-fed fields at risk (not fixed)
Create schema (`entries/route.ts`): `district` max 120, `maxHeightCode` max 24, `source` max 40, `plotNumber` regex 5–10 digits, `affectionPlanPath` 1024. DDA district names fit 120; `maxHeightCode` 24 could clip unusual codes — unverified against DDA data (pending). Project/developer name fields are not in the vault create schema. `ddaSnapshot`/`plan`/`buildingLimit` are `z.unknown()` (uncapped).

## Not verified
Real wizard flow for plot 3260962 end-to-end (needs auth + live DDA) — pending.

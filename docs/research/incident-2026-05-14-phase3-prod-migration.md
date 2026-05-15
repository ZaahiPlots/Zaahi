# Incident — Phase 3 vault migration applied to prod by mistake

**Date:** 2026-05-14
**Branch:** `research/incident-phase3` (off `feat/vault-mvp` @ `a7be377`)
**Severity:** Constraint violation, NO data corruption, NO user-visible impact
**Reporter:** Agent (Claude Opus 4.7)
**Verifier:** Zhan (to confirm via prod psql, 2026-05-15)

---

## TL;DR

While executing Phase 3 of the Day 13 UAT staging spinup, I invoked
`pnpm exec prisma migrate deploy` with a per-command
`DATABASE_URL=$(cat /tmp/...)` prefix pointing at the new staging
Supabase project (`ulmqgoehfqqmxkxvwfua`). The repo's
`prisma.config.ts` overrides this convention — it explicitly loads
`.env.local` via dotenv AND uses `process.env.DIRECT_URL` (not
`DATABASE_URL`) as the Prisma datasource. My `DATABASE_URL` was
ignored. `DIRECT_URL` was undefined in my shell, so dotenv filled it
from `.env.local` (the prod connection string). **The vault migration
ran against production**, not staging.

The migration is purely additive (4 tables, 2 enums, 11 indexes, 8 FKs
— all on new tables only). No existing prod tables, rows, or app
behaviour were modified. Production `www.zaahi.io` is unchanged. This
is effectively **Day 14 step 1 executed 24h early without UAT**.

**Recommendation: Option A — leave the schema in prod**, proceed with
proper staging spinup tomorrow for UAT, and Day 14's prod `migrate
deploy` becomes a no-op when `feat/vault-mvp` merges to `main`.

---

## Timeline

All times approximate, single session on 2026-05-14:

| Step | Detail |
|---|---|
| T0 | Phase 3 protocol agreed: temp-file pattern with `chmod 600 /tmp/zaahi-staging-db.url`, single `DATABASE_URL` for pooler endpoint :6543, sed redaction filter on all output |
| T0+1m | Zhan wrote staging URL to `/tmp/zaahi-staging-db.url` (172 bytes) and replied `file ready, 172 bytes` |
| T0+2m | Agent ran pre-flight: cwd `/home/zaahi/zaahi`, migration file present, URL file present, `.env.local` exists but `.env` does not — concluded "no collision risk" based on stock Prisma's auto-load convention (loads `.env`, ignores `.env.local`) |
| T0+3m | Agent ran `DATABASE_URL=$(cat /tmp/zaahi-staging-db.url) pnpm exec prisma migrate deploy 2>&1 \| sed -E '...' \| tail -40` |
| T0+3m+5s | Prisma output: `injected env (3) from .env.local` ← **dotenvx loaded `.env.local`** |
| T0+3m+5s | Prisma output: `Loaded Prisma config from prisma.config.ts` |
| T0+3m+5s | Prisma output: `Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-eu-central-1.pooler.supabase.com:5432"` ← **port 5432, not the 6543 in the URL Zhan wrote**; host is the prod direct-connection endpoint |
| T0+3m+~20s | Prisma output: `18 migrations found in prisma/migrations` and `Applying migration \`20260513230047_vault_mvp\`` ← **only ONE migration applied, of 18 found** |
| T0+3m+~25s | Prisma output: `All migrations have been successfully applied.` |
| T0+3m+30s | Agent stopped, did NOT run the planned psql verification, opened `prisma.config.ts`, identified root cause |
| T0+4m | Agent reported incident to Zhan with damage assessment and three remediation options |

---

## Root cause

`/home/zaahi/zaahi/prisma.config.ts` (10 lines, exists since pre-vault-mvp work):

```ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL!,
  },
});
```

Two interlocking surprises:

1. **`.env.local` is explicitly loaded** via `dotenv.config({ path: '.env.local' })`. Stock Prisma auto-loads only `.env`. This codebase opts in to `.env.local` via the config file. I assumed standard behaviour and did not read the config.

2. **The datasource uses `DIRECT_URL`, not `DATABASE_URL`.** The schema file's `datasource db { provider = "postgresql" }` block contains no explicit `url` or `directUrl` fields; the value comes from `prisma.config.ts`'s `defineConfig`. My per-command prefix `DATABASE_URL=$(cat ...)` was set on a variable Prisma does not read.

Sequence inside the Node.js process spawned by `pnpm exec prisma migrate deploy`:

1. Node started with my env: `DATABASE_URL=<staging URL>`, `DIRECT_URL=` (unset)
2. Prisma CLI loaded `prisma.config.ts`
3. Line 2 `config({ path: '.env.local' })` populated `process.env` from `.env.local`. **Standard `dotenv` does NOT override existing env vars by default** (override = false). My `DATABASE_URL` survived; but `DIRECT_URL` was unset, so dotenv set it from `.env.local`'s `DIRECT_URL=<prod direct connection string>`
4. `defineConfig` returned a datasource with `url: process.env.DIRECT_URL!` = the prod direct URL on port 5432
5. Prisma connected to prod, found 17 prior migrations applied (matching prod's true state), found the 18th (`20260513230047_vault_mvp`) un-applied, applied it
6. Migration succeeded against prod

---

## Why it wasn't caught

| Actor | Mental model | What was missed |
|---|---|---|
| Agent (me) | "Prisma reads `DATABASE_URL`. Only `.env` is auto-loaded. `.env.local` is a Next.js convention Prisma ignores." | I read `prisma/schema.prisma` lines 11-13 (`datasource db { provider = "postgresql" }`) and concluded "no url field → Prisma reads `DATABASE_URL` via stock convention." I did NOT check `prisma.config.ts`. The latter file is non-default for Prisma and signals "this project does NOT use stock conventions." |
| Founder review | "Walkthrough looks reasonable, agent followed the standard pattern" | Reviewed the spinup walkthrough at the protocol level, did not re-verify the Prisma datasource resolution chain |
| Diagnostic audit (`diagnostic-day12.md`) | Scope was schema + APIs + frontend + security surface | Did not enumerate `prisma.config.ts` as a config file with side effects. Should have surfaced "DIRECT_URL is the actual datasource env var" as a §1.5 finding |
| `staging-spinup.md` walkthrough (§3) | Wrote `DATABASE_URL=` everywhere | Did not re-read `prisma.config.ts` while authoring. Walkthrough lifted the convention from generic Prisma+Supabase tutorials |

Both reviewers (agent + founder) operated on the same wrong mental
model. The walkthrough document codified the wrong mental model. The
pre-flight checks (cwd, migration file present, URL file present, no
`.env` to collide) covered every guardrail except the one that
mattered.

---

## Damage assessment

### Verified facts (from Prisma CLI output)

- 1 migration applied: `20260513230047_vault_mvp`
- Datasource host: `aws-1-eu-central-1.pooler.supabase.com:5432`
  (port 5432 is the prod direct-connection port for the same region)
- Existing applied-migration count on the DB hit: 17 (= prod's true
  state before this migration; staging would have shown 0)
- Final status: `All migrations have been successfully applied.`

### Pending founder verification (2026-05-15)

Zhan to run from his shell with the prod `DIRECT_URL` already
exported there, **NOT** via agent:

```bash
psql "$DIRECT_URL" -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;"
```

**Expected top row:**
```
        migration_name        |         finished_at
------------------------------+----------------------------
 20260513230047_vault_mvp     | 2026-05-14 <time UTC>
```

Counts to verify (pure SQL, pgbouncer-safe — same queries as Phase 3.3):
```sql
SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename ILIKE 'vault%';
-- expect 4

SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename ILIKE 'vault%';
-- expect 11

SELECT count(*) FROM pg_type WHERE typname ILIKE 'vault%' AND typtype='e';
-- expect 2

SELECT count(*) FROM pg_constraint WHERE contype='f' AND conrelid IN (
  SELECT oid FROM pg_class WHERE relname ILIKE 'vault%'
);
-- expect 8
```

**Verified 2026-05-15** — agent ran the queries above against prod with
founder approval (read-only `SELECT`s only). Raw psql output:

```
               migration_name                |          finished_at
---------------------------------------------+-------------------------------
 20260513230047_vault_mvp                    | 2026-05-13 22:55:57.043438+00
 20260510120000_plotclaim_parcel_user_unique | 2026-05-10 16:15:44.064983+00
 20260507_cohort_pilot_v1                    | 2026-05-07 18:34:10.521759+00
(3 rows)

 tables
--------
      4
(1 row)

 indexes
---------
      15
(1 row)

 enums
-------
     2
(1 row)

 fks
-----
   8
(1 row)
```

The migration's `finished_at` is in UTC; `2026-05-13 22:55:57+00` =
`2026-05-14 02:55:57 Asia/Dubai`, matching the incident window.

**Index count is 15 (not 11)** because the diagnostic above enumerated
only secondary indexes from `@@index`/`@@unique` directives, omitting
the 4 implicit primary-key indexes Postgres auto-creates (one per
table). A follow-up `SELECT tablename, indexname FROM pg_indexes`
confirmed the 4 surplus rows are exactly `VaultActivity_pkey`,
`VaultEntry_pkey`, `VaultPriceHistory_pkey`, `VaultShare_pkey`. The
remaining 11 rows match the doc's enumeration (VaultEntry 5 `@@index`
+ 1 `@@unique`, VaultShare 2 `@@index` + 1 `@@unique`, VaultActivity 1,
VaultPriceHistory 1 → 11). Net damage assessment: **unchanged**.

**Option A confirmed.** Proceeding with corrected Phase 3 protocol
against staging.

### What was added to prod

Per `prisma/migrations/20260513230047_vault_mvp/migration.sql`:

- 4 new tables: `VaultEntry`, `VaultShare`, `VaultActivity`, `VaultPriceHistory`
- 2 new enums: `VaultStage` (7 values), `VaultSharePermission` (3 values)
- 11 new indexes (5 on `VaultEntry` + 1 unique, 2 on `VaultShare` + 1 unique, 1 on `VaultActivity`, 1 on `VaultPriceHistory`)
- 8 new FK constraints — all source-side on the new vault tables:
  - `VaultEntry.ownerId` → `User.id` (RESTRICT)
  - `VaultEntry.addedByUserId` → `User.id` (SET NULL)
  - `VaultEntry.publicParcelId` → `Parcel.id` (SET NULL)
  - `VaultShare.vaultEntryId` → `VaultEntry.id` (CASCADE)
  - `VaultShare.recipientUserId` → `User.id` (RESTRICT)
  - `VaultActivity.vaultEntryId` → `VaultEntry.id` (CASCADE)
  - `VaultActivity.actorUserId` → `User.id` (SET NULL)
  - `VaultPriceHistory.vaultEntryId` → `VaultEntry.id` (CASCADE)

All 4 new tables are empty. The 8 FKs target `User` / `Parcel` /
`VaultEntry` but do **not** modify the structure of `User` or
`Parcel` — only the source side carries the constraint.

---

## What was NOT damaged

- **All pre-existing tables** (`User`, `Parcel`, `Deal`, `DealMessage`,
  `Document`, `AffectionPlan`, `PlotClaim`, `RegistrationApplication`,
  `SavedParcel`, `ParcelView`, `Notification`, `ActivityLog`,
  `SavedSearch`, `Commission`, `AmbassadorApplication`, `ReferralClick`)
  — schema and data untouched.
- **All rows in all pre-existing tables** — no UPDATE / DELETE /
  INSERT ran. The migration is pure DDL.
- **Application behaviour on `www.zaahi.io`** — `main` branch code
  does not reference any vault model. No code path queries the new
  tables. No deploy was triggered. Vercel prod build artifact unchanged.
- **API tokens, secrets, env vars** — no env mutations, no rotations,
  no credential exposure (agent did not see any auth material at any
  point; sed-redaction filter was applied to all command output).
- **Staging Supabase project** (`ulmqgoehfqqmxkxvwfua`) — still empty
  and healthy, will be used tomorrow with corrected protocol.
- **Vercel preview deploys** — no preview deploy was triggered; this
  was a CLI-only operation against the DB.
- **Local working state** — `feat/vault-mvp` HEAD `a7be377` is the
  branch tip both locally and on origin; no commits were made during
  the incident itself (this incident report is the only commit since).
- **`/tmp/zaahi-staging-db.url`** — temp file is preserved (600
  perms, 172 bytes, untouched). Reusable tomorrow.

---

## Three remediation options

### Option A — Leave the vault schema in prod (RECOMMENDED)

**What:** Accept that Day 14 step 1 has happened 24h early. The 4
vault tables sit empty in prod until `feat/vault-mvp` merges to
`main` (currently planned for Day 14 anyway). The merge's downstream
`prisma migrate deploy` on prod becomes a no-op — Prisma will detect
`20260513230047_vault_mvp` is already applied and skip it.

**Pros:**
- Zero new operations against prod
- Reversible IF needed (DROP TABLE works on empty tables)
- Time pressure absorbed — Day 14 step 1 is now "done early" rather than "blocked"

**Cons:**
- Constraint violation stands (prod was touched without explicit
  Day-14 ack)
- Process trust hit: founder relied on agent + walkthrough to keep
  prod off-limits; both failed in different ways

### Option B — Roll back via raw SQL

**What:** Founder runs DROP TABLE / DROP TYPE against prod to remove
the 4 tables, 2 enums, 11 indexes, 8 FKs. Also delete the
`20260513230047_vault_mvp` row from `_prisma_migrations` to let the
future Day 14 deploy re-apply cleanly.

```sql
BEGIN;
DROP TABLE "VaultPriceHistory" CASCADE;
DROP TABLE "VaultActivity" CASCADE;
DROP TABLE "VaultShare" CASCADE;
DROP TABLE "VaultEntry" CASCADE;
DROP TYPE "VaultSharePermission";
DROP TYPE "VaultStage";
DELETE FROM _prisma_migrations WHERE migration_name = '20260513230047_vault_mvp';
COMMIT;
```

(The CASCADE on tables sweeps the FKs; indexes drop with their tables.
The enums must drop AFTER the tables that reference them. Order
matters.)

**Pros:**
- Prod returns to bit-identical pre-incident state
- Process discipline preserved

**Cons:**
- DROP TABLE is itself a destructive prod operation — higher blast
  radius than the additive CREATE that happened (a botched DROP
  can take adjacent tables with it through CASCADE)
- The "fix" is a bigger risk than the bug
- Requires direct prod psql access with DDL rights, which is
  per-incident
- If something goes wrong during the drops, prod is in a worse state
  than now

### Option C — Treat as planned Day 14 acceleration

**What:** Declare Day 14 step 1 complete. Compress the timeline:
finish UAT against staging tomorrow, then merge `feat/vault-mvp` to
`main` and ship Day 14 end-to-end the day after — same calendar, less
buffer.

**Pros:**
- No new prod operations
- Forces UAT to be tight rather than leisurely

**Cons:**
- UAT contaminates prod-adjacent state if any UAT data leaks
  (it won't, because UAT runs against staging — but mentally the
  separation is weaker)
- Pressure to merge early may cut UAT corners

---

## Recommended path: Option A

**Reasoning:**

1. **DROP TABLE in prod is the larger risk.** The additive CREATE
   that just happened is contained and reversible. DROPing the same
   schema is destructive: a typo in the FK-resolution order or a
   forgotten CASCADE could touch adjacent tables. Option B trades a
   "process violation" for a "real risk on prod" — bad trade.
2. **The schema-on-prod state is harmless until app code references
   it.** App code lives on `feat/vault-mvp`; merging that to `main`
   is the explicit Day-14 gate. Until merge, the vault tables sit
   idle and invisible.
3. **Day 14 step 1 was always going to apply this migration to
   prod.** It just happened with the wrong actor (agent vs founder)
   and wrong timing (Day 13 vs Day 14). The state itself is what
   Day 14 would have produced.
4. **The walkthrough + agent + founder all agree on what Day 14
   should look like.** The incident accelerated a planned step. It
   did NOT change the destination state.

Adopt Option A. Update the spinup walkthrough to reflect "Day 14 step
1 already applied to prod" before Day 14 actually arrives.

---

## Phase 3 corrected protocol (for tomorrow)

The fix is small: use `DIRECT_URL` (not `DATABASE_URL`) as the
per-command env prefix when running `prisma migrate deploy` against
staging.

Standard `dotenv.config({ path: '.env.local' })` does NOT override
pre-existing env vars (`override` defaults to `false`). So if I set
`DIRECT_URL` in my shell before invoking Prisma, the subsequent
`.env.local` load will see `DIRECT_URL` already populated and skip
it. My staging value wins.

### Corrected Step 3.2

```bash
DIRECT_URL=$(cat /tmp/zaahi-staging-db.url) pnpm exec prisma migrate deploy 2>&1 \
  | sed -E 's|postgresql://[^@[:space:]]+@|postgresql://[REDACTED]@|g' \
  | tail -40
```

### Defensive belt-and-suspenders option

If the founder wants paranoid certainty that no `.env.local` value
can interfere, temporarily move it out of the way:

```bash
mv .env.local .env.local.holding-during-staging-migrate
DIRECT_URL=$(cat /tmp/zaahi-staging-db.url) pnpm exec prisma migrate deploy 2>&1 \
  | sed -E 's|postgresql://[^@[:space:]]+@|postgresql://[REDACTED]@|g' \
  | tail -40
mv .env.local.holding-during-staging-migrate .env.local
```

This guarantees no dotenv load can populate any var I haven't
explicitly set, regardless of the override semantics. **Default to
this pattern for any future staging migration.**

### Pre-flight verification (before running migrate)

Run `prisma migrate status` first — read-only, shows the target
DB's current state without applying anything:

```bash
DIRECT_URL=$(cat /tmp/zaahi-staging-db.url) pnpm exec prisma migrate status 2>&1 \
  | sed -E 's|postgresql://[^@[:space:]]+@|postgresql://[REDACTED]@|g'
```

**Expected output on a fresh staging DB:** "18 migrations have not yet
been applied" (or similar wording). The host line should show the
**staging** ref (`ulmqgoehfqqmxkxvwfua`) — which is in the URL portion
my sed filter does NOT redact (the project ref is the username
prefix, and I redact `postgres:password@` → `[REDACTED]@`, keeping
the host fragment intact).

Actually — re-reading the sed regex: `postgresql://[^@[:space:]]+@`
matches everything between `postgresql://` and the FIRST `@`. The
project ref `postgres.ulmqgoehfqqmxkxvwfua` appears in that segment
(it's part of the username). So my redaction also hides the project
ref. **Adjustment for tomorrow: relax the sed to keep the username
visible but redact only the password portion.** Pattern:

```sed
sed -E 's|(postgresql://[^:@[:space:]]+):[^@[:space:]]+@|\1:[REDACTED]@|g'
```

This keeps `postgres.ulmqgoehfqqmxkxvwfua` visible, redacts only the
password. Then I can eyeball the ref and confirm staging vs prod
before deploy.

---

## Prevention rule for future migrations

**Never trust convention when touching a database from an automated
context.** Before any `prisma migrate deploy` (or `db push`, or any
schema-mutating command):

1. **Read `prisma.config.ts` and `prisma/schema.prisma` datasource
   block.** Identify the actual env var(s) Prisma will read. Do not
   assume `DATABASE_URL`.
2. **Read all `.env*` files that the config explicitly loads.** Any
   that contain prod credentials are landmines.
3. **Run `prisma migrate status` first** — never `migrate deploy`
   cold. Status output reveals the connected host before any change
   lands.
4. **Match host vs ref in the output.** The connection line in
   Prisma's output prints the host. Cross-check against the project
   ref of the intended target.
5. **Move `.env.local` out of the way for staging migrations**, as
   defensive default — even when not strictly needed.
6. **Run sed redaction with username preserved** so the ref is
   visible in output. Refs aren't credentials.

Codifying as a new memory entry: `feedback_prisma_migrate_verify_target.md`
(to be added 2026-05-15 after founder ack).

---

## Open items for 2026-05-15

- [ ] Founder runs prod verification SQL, pastes results into
  "Damage assessment → Pending founder verification" block above
- [ ] Founder picks Option A / B / C (default: A unless something
  changes overnight)
- [ ] If A: update `staging-spinup.md` §4 to note "Day 14 step 1
  already applied — prod will be a no-op when feat branch merges"
- [ ] If A: proceed with corrected Phase 3 protocol against staging
  (`DIRECT_URL=` prefix, `.env.local` rename, `migrate status` first)
- [ ] Add memory entry `feedback_prisma_migrate_verify_target.md`
- [ ] Update `diagnostic-day12.md` §1.5 to mention `prisma.config.ts`
  as a non-default config file using `DIRECT_URL`

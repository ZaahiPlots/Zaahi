-- ZAAHI Private Plot Vault — staging seed (Day 13 UAT)
--
-- Apply AFTER `prisma migrate deploy` has run against staging.
-- Apply via:
--   psql "$STAGING_DIRECT_URL" -f docs/specs/phase-2/private-plot-vault/staging-seed.sql
--
-- Prerequisites (manual, before this SQL runs):
--   1. Two Supabase auth users exist in the staging project:
--        a) founder test account  → Supabase will assign a UUID
--        b) cohort-broker test account → Supabase will assign a UUID
--      Create via staging Supabase dashboard → Authentication → Users → "Add user"
--      Email + password for each. Note the UUIDs.
--   2. Both auth users have `user_metadata.approved = true`
--      Set via the same Users panel → click row → "Raw user meta data" tab.
--
-- Substitute the two UUIDs in the FOUNDER_AUTH_ID / BROKER_AUTH_ID variables
-- below before running. Everything else is constant.

BEGIN;

-- ── Variables ─────────────────────────────────────────────────────
-- ⚠ REPLACE these two literals with the real UUIDs from Supabase auth.
-- Do NOT commit real UUIDs to git — they're staging only but still personal.
\set FOUNDER_AUTH_ID '\'00000000-0000-0000-0000-000000000001\''
\set BROKER_AUTH_ID  '\'00000000-0000-0000-0000-000000000002\''

-- ── User rows (mirror of Supabase auth.users) ────────────────────
-- Prisma's User.id matches auth.users.id by convention (see schema.prisma:100).
-- /api/users/sync would create these on first sign-in, but we pre-create
-- them so UAT can run without a sign-in round-trip.
--
-- role: ADMIN role exists in UserRole enum and unlocks /admin/* routes
--       — needed if S9 (promote) verification is exercised against the
--       admin queue. For pure vault flow, OWNER + BROKER are enough.

INSERT INTO "User" (id, email, role, name, nickname, "createdAt")
VALUES
  (:FOUNDER_AUTH_ID, 'zhan-staging@zaahi.io', 'ADMIN',  'Zhan Founder (staging)',   'zhan-staging',  NOW()),
  (:BROKER_AUTH_ID,  'broker-staging@zaahi.io', 'BROKER', 'Test Broker (staging)',    'test-broker',   NOW())
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = EXCLUDED.role,
      name = EXCLUDED.name,
      nickname = EXCLUDED.nickname;

-- ── Sample Parcel for promote-to-public test (UAT S9) ────────────
-- Plot 6457940 in Al Barari is referenced in CLAUDE.md + UAT script as
-- the canonical test plot. We seed it as VACANT/no-owner to mirror the
-- "Owner: none" state production would have for a plot not yet claimed
-- by anyone. The promote endpoint will UPDATE this parcel (or create
-- one if it doesn't exist via `upsert` on the unique key
-- (emirate, district, plotNumber)).
--
-- Geometry is omitted — DDA enrichment in parcel-create.ts will fill
-- it from the live DDA API at promote-time, OR the vault entry's
-- snapshot will supply prefilled facts.

INSERT INTO "Parcel" (id, "plotNumber", "ownerId", area, emirate, district, status, "createdAt", "updatedAt")
VALUES (
  'staging-seed-6457940-' || substring(gen_random_uuid()::text, 1, 8),
  '6457940',
  :FOUNDER_AUTH_ID,  -- ownerId is FK NOT NULL; the founder placeholder is fine for staging
  15800,             -- ~15800 sqft, rough Al Barari plot size
  'Dubai',
  'Al Barari',
  'VACANT',
  NOW(),
  NOW()
)
ON CONFLICT (emirate, district, "plotNumber") DO NOTHING;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────
-- Run AFTER the BEGIN/COMMIT to sanity-check the seed landed:
--
--   SELECT id, email, role, nickname FROM "User" WHERE id IN (:FOUNDER_AUTH_ID, :BROKER_AUTH_ID);
--   SELECT id, "plotNumber", district, status, "ownerId" FROM "Parcel" WHERE "plotNumber" = '6457940';
--   SELECT COUNT(*) AS vault_entries FROM "VaultEntry";          -- expect 0 (UAT creates them)
--   SELECT COUNT(*) AS vault_shares  FROM "VaultShare";          -- expect 0
--   SELECT COUNT(*) AS vault_activity FROM "VaultActivity";      -- expect 0
--
-- Then verify vault schema is in place:
--
--   \dt "Vault*"        -- expect VaultEntry, VaultShare, VaultActivity, VaultPriceHistory
--   \d "VaultEntry"     -- expect 11 indexes on vault tables total (see migration.sql)

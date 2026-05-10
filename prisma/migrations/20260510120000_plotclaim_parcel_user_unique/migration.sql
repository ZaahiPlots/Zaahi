-- ─────────────────────────────────────────────────────────────────
-- 20260510120000_plotclaim_parcel_user_unique — spec-05 §8.4 step 3
--
-- Adds the (parcelId, userId) uniqueness invariant promised by spec §8.4
-- ("one user = one claim per plot") at the DB level. The audit on
-- 2026-05-08 (docs/audits/add-plot-cohort-audit.md Q4) flagged this gap:
-- Step 4 created the PlotClaim model with the right indexes but no
-- composite-unique constraint, so a racing double-submit could end up
-- with two rows for the same (parcelId, userId) tuple. Step 9 ships
-- POST /api/parcels/[id]/claim and now relies on PG to enforce the
-- invariant — the route catches Prisma P2002 to translate the race into
-- a clean 409.
--
-- Pre-flight verification (run 2026-05-10 against production):
--   * 118 PlotClaim rows total — matches Step 4 baseline.
--   * 0 existing duplicate (parcelId, userId) tuples — backfilled rows
--     are unique by construction (one per parcel × the system user).
--   * 0 NULL values on either column.
--   * Existing indexes: pkey, parcelId, userId, status, parcelId+role+status.
--
-- Risk: minimal. Building a unique index on a 136 kB / 118-row table
-- holds AccessExclusiveLock briefly (sub-100ms expected). No code path
-- writes PlotClaim today, so no concurrent-write contention.
--
-- Reversibility: ALTER TABLE "PlotClaim" DROP CONSTRAINT
-- "PlotClaim_parcelId_userId_key";
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE "PlotClaim"
  ADD CONSTRAINT "PlotClaim_parcelId_userId_key" UNIQUE ("parcelId", "userId");

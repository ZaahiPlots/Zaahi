-- Parcel.jvDetails — JSON-encoded JV term sheet — 2026-05-06.
-- Founder approval: received in-session 2026-05-06 (research branch
-- research/add-jv-listing-6488627-2026-05-06).
-- Additive, nullable (existing rows backfill to NULL — backwards-compatible
-- with the 3261270 listing seeded in the prior commit). Idempotent
-- (IF NOT EXISTS) so re-running is safe.

ALTER TABLE "Parcel" ADD COLUMN IF NOT EXISTS "jvDetails" TEXT;

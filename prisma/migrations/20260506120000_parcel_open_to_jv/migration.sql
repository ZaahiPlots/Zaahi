-- Parcel.openToJV — Joint-Venture signal flag — 2026-05-06.
-- Founder approval: received in-session 2026-05-06 (research branch
-- research/add-jv-listing-3261270-2026-05-06).
-- Additive, NOT NULL with safe default; backfills to false for all existing
-- rows. Idempotent (IF NOT EXISTS) so re-running is safe.

ALTER TABLE "Parcel" ADD COLUMN IF NOT EXISTS "openToJV" BOOLEAN NOT NULL DEFAULT false;

-- USER_DASHBOARDS_RESEARCH.md Phase 1 schema change — 2026-04-16.
-- Founder approval: received in-session 2026-04-16.
-- All changes additive, nullable; safe to deploy with existing rows.
-- Uses IF NOT EXISTS everywhere so the migration is idempotent and safe
-- to re-run.

-- ── User: 11 new profile/behavior fields ─────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reraLicense" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "brnNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- ── SavedParcel: user's shortlist (BUYER / OWNER / anyone) ───────────
CREATE TABLE IF NOT EXISTS "SavedParcel" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "parcelId"  TEXT NOT NULL REFERENCES "Parcel"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SavedParcel_userId_parcelId_key"
  ON "SavedParcel"("userId", "parcelId");
CREATE INDEX IF NOT EXISTS "SavedParcel_userId_idx" ON "SavedParcel"("userId");
CREATE INDEX IF NOT EXISTS "SavedParcel_parcelId_idx" ON "SavedParcel"("parcelId");

-- ── ParcelView: append-only view log (drives OWNER analytics) ────────
CREATE TABLE IF NOT EXISTS "ParcelView" (
  "id"        TEXT PRIMARY KEY,
  "parcelId"  TEXT NOT NULL REFERENCES "Parcel"("id") ON DELETE CASCADE,
  "userId"    TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "ipHash"    TEXT,
  "userAgent" TEXT,
  "viewedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ParcelView_parcelId_viewedAt_idx"
  ON "ParcelView"("parcelId", "viewedAt");
CREATE INDEX IF NOT EXISTS "ParcelView_userId_viewedAt_idx"
  ON "ParcelView"("userId", "viewedAt");

-- ── Notification: in-app inbox ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "kind"      TEXT NOT NULL,
  "payload"   JSONB NOT NULL,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"
  ON "Notification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");

-- ── ActivityLog: "Recent Activity" stream ────────────────────────────
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "kind"      TEXT NOT NULL,
  "ref"       TEXT,
  "payload"   JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx"
  ON "ActivityLog"("userId", "createdAt");

-- ── SavedSearch: BUYER saved filters (max 10 per user, enforced in API) ─
CREATE TABLE IF NOT EXISTS "SavedSearch" (
  "id"              TEXT PRIMARY KEY,
  "userId"          TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"            TEXT NOT NULL,
  "filters"         JSONB NOT NULL,
  "locationBounds"  JSONB,
  "lastNotifiedAt"  TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "SavedSearch_userId_idx" ON "SavedSearch"("userId");

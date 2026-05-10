-- ─────────────────────────────────────────────────────────────────
-- 20260507_cohort_pilot_v1 — spec-05 §5
--
-- Cohort Pilot v1 schema migration:
--   * UserRole enum: +POA +INTERMEDIARY +RELATIVE +REFERRAL +OTHER
--     (ADMIN, INVESTOR retained; INVESTOR is deprecated per §5.1)
--   * User.nickname (TEXT NULL UNIQUE) — public-facing handle
--   * Parcel.verifiedOwnerUserId/verifiedAt/verifiedById — verification
--     state, separate from immutable Parcel.ownerId per LOCK-8 / CORR-1
--   * RegistrationApplication (NEW) — public /register submissions
--   * PlotClaim (NEW) — per-parcel claims, multi-claim per spec §5.4
--   * Enums: RegistrationStatus, ClaimStatus
--
-- Seed steps (per §5.7):
--   * Step 7: RegistrationApplication{autoMigrated:true, status:APPROVED}
--     for every existing User with role='ADMIN'. Variant (a) per founder
--     2026-05-07: only seeds the system user. Жан + Dymo land here later
--     via the §5.2 defensive-fallback in /api/users/sync.
--   * Step 8: PlotClaim{roleAtClaim:'ADMIN', status:'VERIFIED'} for every
--     existing Parcel with non-empty ownerId. priceAed sources from
--     Parcel.currentValuation (fils despite the field name).
--
-- Risk: additive only. No drops, no renames, no NOT NULL constraints
-- on existing rows. Backfill bounded (1 + 118 inserts on prod).
-- Reversibility: drop new tables/types/columns; new enum values can be
-- dropped in PG 14+ (Supabase PG 15+) via ALTER TYPE DROP VALUE since
-- nothing in this migration uses them.
--
-- Transaction safety (PG 12+): ALTER TYPE ADD VALUE is permitted inside
-- a transaction. The seed/backfill below uses only existing enum values
-- ('ADMIN', NULL), never the new ones, so single-tx execution is safe.
-- ─────────────────────────────────────────────────────────────────


-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'WAITLIST');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'VERIFIED', 'SELF_DECLARED', 'REJECTED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'POA';
ALTER TYPE "UserRole" ADD VALUE 'INTERMEDIARY';
ALTER TYPE "UserRole" ADD VALUE 'RELATIVE';
ALTER TYPE "UserRole" ADD VALUE 'REFERRAL';
ALTER TYPE "UserRole" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nickname" TEXT;

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "verifiedOwnerUserId" TEXT;

-- CreateTable
CREATE TABLE "RegistrationApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "roleApplied" "UserRole",
    "documentsJson" JSONB NOT NULL,
    "referralPath" JSONB,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "autoMigrated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlotClaim" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleAtClaim" "UserRole" NOT NULL,
    "priceAed" BIGINT NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "documentsJson" JSONB,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlotClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationApplication_userId_key" ON "RegistrationApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationApplication_email_key" ON "RegistrationApplication"("email");

-- CreateIndex
CREATE INDEX "RegistrationApplication_roleApplied_status_idx" ON "RegistrationApplication"("roleApplied", "status");

-- CreateIndex
CREATE INDEX "RegistrationApplication_status_createdAt_idx" ON "RegistrationApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RegistrationApplication_email_idx" ON "RegistrationApplication"("email");

-- CreateIndex
CREATE INDEX "PlotClaim_parcelId_idx" ON "PlotClaim"("parcelId");

-- CreateIndex
CREATE INDEX "PlotClaim_userId_idx" ON "PlotClaim"("userId");

-- CreateIndex
CREATE INDEX "PlotClaim_status_idx" ON "PlotClaim"("status");

-- CreateIndex
CREATE INDEX "PlotClaim_parcelId_roleAtClaim_status_idx" ON "PlotClaim"("parcelId", "roleAtClaim", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- AddForeignKey
ALTER TABLE "RegistrationApplication" ADD CONSTRAINT "RegistrationApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotClaim" ADD CONSTRAINT "PlotClaim_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotClaim" ADD CONSTRAINT "PlotClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────
-- Seed (spec §5.7 step 7) — RegistrationApplication for ADMIN users
-- ─────────────────────────────────────────────────────────────────
INSERT INTO "RegistrationApplication" (
    "id", "userId", "email", "nickname", "roleApplied",
    "documentsJson", "status", "autoMigrated", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    u."id",
    u."email",
    -- Derive nickname from email local-part if User.nickname is NULL
    -- (it always is at migration time — column was just added).
    -- Lowercased for consistency with the §5.2 defensive fallback.
    COALESCE(u."nickname", LOWER(SPLIT_PART(u."email", '@', 1))),
    NULL,                       -- roleApplied: ADMIN is system-only
    '[]'::jsonb,
    'APPROVED',
    true,
    NOW(),
    NOW()
FROM "User" u
WHERE u."role" = 'ADMIN';


-- ─────────────────────────────────────────────────────────────────
-- Backfill (spec §5.7 step 8) — PlotClaim for every existing Parcel
-- ─────────────────────────────────────────────────────────────────
INSERT INTO "PlotClaim" (
    "id", "parcelId", "userId", "roleAtClaim", "priceAed",
    "status", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    p."id",
    p."ownerId",
    'ADMIN',
    COALESCE(p."currentValuation", 0::bigint),
    'VERIFIED',
    NOW(),
    NOW()
FROM "Parcel" p
WHERE p."ownerId" IS NOT NULL AND p."ownerId" <> '';

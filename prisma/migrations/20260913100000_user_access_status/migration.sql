-- Admin "pause subscription" (2026-09-13).
--
-- ADDITIVE ONLY. Two new enum types, four nullable-or-defaulted columns on
-- "User", one new table with its indexes and one FK. No existing column,
-- constraint or row is changed, so old code keeps working against the
-- migrated schema and this is safe for `prisma migrate deploy`.
--
-- Written by hand, like 20260904120000_feedback_submission_throttle:
-- DATABASE_URL on the dev box points at the PRODUCTION Supabase instance,
-- and `prisma migrate dev` may reset the database it connects to. A
-- handwritten file is also unaffected by the pre-existing FK/default drift
-- recorded in /BACKLOG.md that a generated diff would sweep in.
--
-- NOT applied by the agent. The founder runs `npx prisma migrate deploy`
-- separately after the gates.

-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('PAUSE', 'RESUME');

-- AlterTable: every existing row becomes ACTIVE through the default.
ALTER TABLE "User"
    ADD COLUMN "accessStatus" "AccessStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "pausedAt" TIMESTAMP(3),
    ADD COLUMN "pausedById" TEXT,
    ADD COLUMN "pauseReason" TEXT;

-- CreateIndex: admin list filter ("show paused").
CREATE INDEX "User_accessStatus_idx" ON "User"("accessStatus");

-- CreateTable: append-only audit trail (pause / resume).
CREATE TABLE "UserAccessEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AccessAction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: history per user, and per acting admin.
CREATE INDEX "UserAccessEvent_userId_createdAt_idx"
    ON "UserAccessEvent"("userId", "createdAt");
CREATE INDEX "UserAccessEvent_actorId_createdAt_idx"
    ON "UserAccessEvent"("actorId", "createdAt");

-- AddForeignKey: RESTRICT — users are never deleted (CLAUDE.md), and an
-- audit row must never be orphaned or cascaded away.
ALTER TABLE "UserAccessEvent"
    ADD CONSTRAINT "UserAccessEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

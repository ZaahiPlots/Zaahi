-- AmbassadorApplication: add unique email, checklistData, updatedAt; drop redundant email index.
-- Table is empty (no ambassadors yet) so the unique constraint cannot violate.
-- updatedAt seeds via NOW() for any preexisting rows; trigger-free, Prisma writes it on every update.

-- DropIndex (replaced by unique constraint)
DROP INDEX IF EXISTS "AmbassadorApplication_email_idx";

-- AddColumn checklistData (nullable JSON; old rows won't have one)
ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "checklistData" JSONB;

-- AddColumn updatedAt (NOT NULL, default NOW(); existing rows backfilled)
ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex (unique on email — duplicate emails forbidden going forward)
CREATE UNIQUE INDEX IF NOT EXISTS "AmbassadorApplication_email_key" ON "AmbassadorApplication"("email");

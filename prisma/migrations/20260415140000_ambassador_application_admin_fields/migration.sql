-- AmbassadorApplication: admin-review fields. All nullable, additive, backward-compatible.
-- Added 2026-04-15 alongside /admin/ambassadors panel and email/telegram notifications.
-- referralCode is @unique but mostly NULL initially (Postgres allows multiple NULLs).

ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "rejectedBy" TEXT;
ALTER TABLE "AmbassadorApplication" ADD COLUMN IF NOT EXISTS "linkedUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AmbassadorApplication_referralCode_key"
  ON "AmbassadorApplication"("referralCode");

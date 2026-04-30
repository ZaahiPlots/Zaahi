-- Phase A — Coming Soon landing for the new single-tier referral program.
-- Stores public email signups from /refer. PII is the opt-in email only;
-- ipHash is a salted SHA-256 truncated to 32 chars for rate-limit / anti-spam.
-- Existing AmbassadorApplication / Commission / ReferralClick tables are NOT
-- touched (per founder direction 2026-04-30 — preserve historical data).

-- CreateTable
CREATE TABLE "ReferralWaitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralWaitlist_email_key" ON "ReferralWaitlist"("email");

-- CreateIndex
CREATE INDEX "ReferralWaitlist_ipHash_createdAt_idx" ON "ReferralWaitlist"("ipHash", "createdAt");

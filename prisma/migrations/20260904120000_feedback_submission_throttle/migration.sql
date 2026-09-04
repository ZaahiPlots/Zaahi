-- CreateTable: FeedbackSubmission
--
-- Shared throttle state for /api/archie/feedback (docs/BACKLOG.md §8).
-- The rate limit, the 24h text dedup and the per-message idempotency key used
-- to live in module-scope Maps, which reset on every Vercel cold start and are
-- not shared between concurrent lambdas — so none of the three guards actually
-- held across instances.
--
-- ADDITIVE ONLY. Creates one new table and its indexes. No existing table,
-- column, constraint or row is touched, so this is safe to apply with
-- `prisma migrate deploy` against production.
--
-- Written by hand rather than generated with `prisma migrate dev`: DATABASE_URL
-- on the dev box points at the PRODUCTION Supabase instance, and migrate dev
-- may reset the database it connects to. It is also unaffected by the
-- pre-existing FK/default drift recorded in /BACKLOG.md, which a generated
-- diff against the live schema would otherwise sweep in.

CREATE TABLE "FeedbackSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    -- Nullable on purpose: an older client that does not send the key is still
    -- accepted, and Postgres permits many NULLs under a UNIQUE constraint,
    -- which is exactly the behaviour wanted here.
    "submissionId" TEXT,
    -- SHA-256 of the normalised text. Hashed, not raw: this table is throttle
    -- state, not a second copy of user content.
    "textHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackSubmission_pkey" PRIMARY KEY ("id")
);

-- Collapses a repeat of the same conversational turn atomically: the INSERT
-- races cleanly instead of a check-then-insert that two lambdas can both win.
CREATE UNIQUE INDEX "FeedbackSubmission_userId_submissionId_key"
    ON "FeedbackSubmission"("userId", "submissionId");

-- Rate-limit counting, and the TTL sweep.
CREATE INDEX "FeedbackSubmission_userId_createdAt_idx"
    ON "FeedbackSubmission"("userId", "createdAt");

-- 24h text dedup.
CREATE INDEX "FeedbackSubmission_userId_textHash_createdAt_idx"
    ON "FeedbackSubmission"("userId", "textHash", "createdAt");

-- Global TTL sweep.
CREATE INDEX "FeedbackSubmission_createdAt_idx"
    ON "FeedbackSubmission"("createdAt");

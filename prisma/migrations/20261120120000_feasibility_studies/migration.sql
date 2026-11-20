-- Feasibility v6.1 — saved studies + immutable versions (2026-11-20).
--
-- Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md.
--
-- ADDITIVE ONLY. Two new tables, their indexes and four foreign keys. No
-- existing table, column, constraint or row is touched: the FKs live on the
-- NEW tables and only reference "User" / "Parcel" / "VaultEntry" by primary
-- key. Old code keeps working against the migrated schema, so this is safe
-- to apply with `prisma migrate deploy` against production.
--
-- Written by hand, like 20260904120000_feedback_submission_throttle and
-- 20260913100000_user_access_status: DATABASE_URL on the dev box points at
-- the PRODUCTION Supabase instance, and `prisma migrate dev` may reset the
-- database it connects to. The DDL below was checked statement-for-statement
-- against
--   prisma migrate diff --from-schema <HEAD schema> --to-schema prisma/schema.prisma --script
-- (schema-to-schema, no database), so it is exactly what Prisma expects and
-- it is unaffected by the pre-existing FK/default drift recorded in
-- /BACKLOG.md that a diff against the live database would sweep in.
--
-- NOT applied by the agent. The founder runs `npx prisma migrate deploy`.
-- Until then the routes answer 503 `studies_unavailable` and the calculator
-- carries on without saving.

-- CreateTable: one named working document per plot — a mutable autosaved
-- draft plus a counter for the versions issued so far.
CREATE TABLE "FeasibilityStudy" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    -- Optional links. Vault entries and preview plots have no Parcel row, so
    -- plot identity is carried in the three denormalised columns below.
    "parcelId" TEXT,
    "vaultEntryId" TEXT,
    "plotNumber" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "emirate" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    -- The calculator's inputs as last autosaved. Owner-only: never served to
    -- a share recipient.
    "draftInputs" JSONB,
    "draftUpdatedAt" TIMESTAMP(3),
    -- Highest version number issued; bumped in the same transaction as the
    -- version insert.
    "latestVersion" INTEGER NOT NULL DEFAULT 0,
    -- Soft delete. The app never hard-deletes a study.
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeasibilityStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: one saved version. Append-only by application rule — no route
-- issues UPDATE or DELETE against this table.
CREATE TABLE "FeasibilityStudyVersion" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "mode" TEXT NOT NULL,
    "engines" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    -- Recomputed on the server from "inputs" at save time; never client-supplied.
    "outputs" JSONB NOT NULL,
    "defaultsSnapshot" JSONB NOT NULL,
    "plotSnapshot" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "defaultsVersion" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeasibilityStudyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: "my studies", newest first.
CREATE INDEX "FeasibilityStudy_ownerId_updatedAt_idx"
    ON "FeasibilityStudy"("ownerId", "updatedAt");

-- CreateIndex: FK support for the SET NULL on parcel delete.
CREATE INDEX "FeasibilityStudy_parcelId_idx"
    ON "FeasibilityStudy"("parcelId");

-- CreateIndex: per-entry study count in the vault, and the shared-reader lookup.
CREATE INDEX "FeasibilityStudy_vaultEntryId_idx"
    ON "FeasibilityStudy"("vaultEntryId");

-- CreateIndex: the calculator's "studies for this plot".
CREATE INDEX "FeasibilityStudy_ownerId_plotNumber_idx"
    ON "FeasibilityStudy"("ownerId", "plotNumber");

-- CreateIndex: the race guard for version numbering. Two concurrent saves
-- cannot both be issued the same number — the second INSERT fails cleanly.
CREATE UNIQUE INDEX "FeasibilityStudyVersion_studyId_version_key"
    ON "FeasibilityStudyVersion"("studyId", "version");

-- AddForeignKey: RESTRICT — users are never deleted (CLAUDE.md).
ALTER TABLE "FeasibilityStudy"
    ADD CONSTRAINT "FeasibilityStudy_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SET NULL — a study outlives the parcel link.
ALTER TABLE "FeasibilityStudy"
    ADD CONSTRAINT "FeasibilityStudy_parcelId_fkey"
    FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: SET NULL — deleting a vault entry detaches its studies, it
-- does not delete them ("a user never loses a calculation").
ALTER TABLE "FeasibilityStudy"
    ADD CONSTRAINT "FeasibilityStudy_vaultEntryId_fkey"
    FOREIGN KEY ("vaultEntryId") REFERENCES "VaultEntry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: CASCADE exists for referential completeness only; the app
-- archives studies and never deletes one.
ALTER TABLE "FeasibilityStudyVersion"
    ADD CONSTRAINT "FeasibilityStudyVersion_studyId_fkey"
    FOREIGN KEY ("studyId") REFERENCES "FeasibilityStudy"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security.
--
-- No earlier migration in this directory contains an RLS statement (table
-- RLS has so far been managed outside Prisma), so there was no in-repo
-- pattern to copy. These two tables hold private user work, and Supabase
-- exposes the `public` schema through the Data API to the `anon` /
-- `authenticated` roles, whose key ships in the browser bundle. Enabling RLS
-- with NO policy denies those roles everything, which is the intent: the
-- only reader/writer is the server through Prisma, which connects as the
-- table owner and is therefore not subject to RLS (RLS is not FORCEd).
-- Authorisation lives in the API routes (getApprovedUserId + owner / active
-- VaultShare check).
--
-- Prisma does not model RLS, so these two statements do not appear in
-- `prisma migrate diff` and cause no drift.
ALTER TABLE "FeasibilityStudy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeasibilityStudyVersion" ENABLE ROW LEVEL SECURITY;

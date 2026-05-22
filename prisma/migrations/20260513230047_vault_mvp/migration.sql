-- CreateEnum
CREATE TYPE "VaultStage" AS ENUM ('LEAD', 'CONTACTED', 'NEGOTIATING', 'AGREEMENT_SIGNED', 'PROMOTED', 'LOST', 'CLOSED');

-- CreateEnum
CREATE TYPE "VaultSharePermission" AS ENUM ('VIEW', 'FEASIBILITY', 'OFFER');

-- CreateTable
CREATE TABLE "VaultEntry" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addedByUserId" TEXT,
    "importedFromShareId" TEXT,
    "provenanceChain" JSONB,
    "emirate" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "plotNumber" TEXT NOT NULL,
    "publicParcelId" TEXT,
    "area" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geometry" JSONB,
    "landUse" TEXT,
    "askingPriceFils" BIGINT,
    "ownerContact" JSONB,
    "brokerNotes" TEXT,
    "stage" "VaultStage" NOT NULL DEFAULT 'LEAD',
    "source" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "promotedParcelId" TEXT,
    "conflictsWithOthers" BOOLEAN NOT NULL DEFAULT false,
    "conflictedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultShare" (
    "id" TEXT NOT NULL,
    "vaultEntryId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "permission" "VaultSharePermission" NOT NULL DEFAULT 'VIEW',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3),

    CONSTRAINT "VaultShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultActivity" (
    "id" TEXT NOT NULL,
    "vaultEntryId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultPriceHistory" (
    "id" TEXT NOT NULL,
    "vaultEntryId" TEXT NOT NULL,
    "priceFils" BIGINT NOT NULL,
    "setByUserId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VaultEntry_ownerId_idx" ON "VaultEntry"("ownerId");

-- CreateIndex
CREATE INDEX "VaultEntry_stage_idx" ON "VaultEntry"("stage");

-- CreateIndex
CREATE INDEX "VaultEntry_publicParcelId_idx" ON "VaultEntry"("publicParcelId");

-- CreateIndex
CREATE INDEX "VaultEntry_nextFollowUpAt_idx" ON "VaultEntry"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "VaultEntry_emirate_district_plotNumber_idx" ON "VaultEntry"("emirate", "district", "plotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VaultEntry_ownerId_emirate_district_plotNumber_key" ON "VaultEntry"("ownerId", "emirate", "district", "plotNumber");

-- CreateIndex
CREATE INDEX "VaultShare_recipientUserId_revokedAt_idx" ON "VaultShare"("recipientUserId", "revokedAt");

-- CreateIndex
CREATE INDEX "VaultShare_ownerId_idx" ON "VaultShare"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultShare_vaultEntryId_recipientUserId_key" ON "VaultShare"("vaultEntryId", "recipientUserId");

-- CreateIndex
CREATE INDEX "VaultActivity_vaultEntryId_createdAt_idx" ON "VaultActivity"("vaultEntryId", "createdAt");

-- CreateIndex
CREATE INDEX "VaultPriceHistory_vaultEntryId_createdAt_idx" ON "VaultPriceHistory"("vaultEntryId", "createdAt");

-- AddForeignKey
ALTER TABLE "VaultEntry" ADD CONSTRAINT "VaultEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultEntry" ADD CONSTRAINT "VaultEntry_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultEntry" ADD CONSTRAINT "VaultEntry_publicParcelId_fkey" FOREIGN KEY ("publicParcelId") REFERENCES "Parcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultShare" ADD CONSTRAINT "VaultShare_vaultEntryId_fkey" FOREIGN KEY ("vaultEntryId") REFERENCES "VaultEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultShare" ADD CONSTRAINT "VaultShare_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultActivity" ADD CONSTRAINT "VaultActivity_vaultEntryId_fkey" FOREIGN KEY ("vaultEntryId") REFERENCES "VaultEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultActivity" ADD CONSTRAINT "VaultActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultPriceHistory" ADD CONSTRAINT "VaultPriceHistory_vaultEntryId_fkey" FOREIGN KEY ("vaultEntryId") REFERENCES "VaultEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;


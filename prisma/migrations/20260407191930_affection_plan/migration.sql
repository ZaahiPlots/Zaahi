-- CreateTable
CREATE TABLE "AffectionPlan" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "plotNumber" TEXT NOT NULL,
    "oldNumber" TEXT,
    "projectName" TEXT,
    "community" TEXT,
    "masterDeveloper" TEXT,
    "plotAreaSqm" DOUBLE PRECISION,
    "plotAreaSqft" DOUBLE PRECISION,
    "maxGfaSqm" DOUBLE PRECISION,
    "maxGfaSqft" DOUBLE PRECISION,
    "maxHeightCode" TEXT,
    "maxFloors" INTEGER,
    "maxHeightMeters" DOUBLE PRECISION,
    "far" DOUBLE PRECISION,
    "setbacks" JSONB,
    "landUseMix" JSONB,
    "sitePlanIssue" TIMESTAMP(3),
    "sitePlanExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "buildingLimitGeometry" JSONB,
    "raw" JSONB,

    CONSTRAINT "AffectionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffectionPlan_parcelId_idx" ON "AffectionPlan"("parcelId");

-- CreateIndex
CREATE INDEX "AffectionPlan_fetchedAt_idx" ON "AffectionPlan"("fetchedAt");

-- AddForeignKey
ALTER TABLE "AffectionPlan" ADD CONSTRAINT "AffectionPlan_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "BuildingStatus" AS ENUM ('COMPLETED', 'UNDER_CONSTRUCTION', 'PLANNED');

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BuildingStatus" NOT NULL,
    "community" TEXT NOT NULL,
    "masterPlan" TEXT,
    "plotNumber" TEXT,
    "emirate" TEXT NOT NULL DEFAULT 'Dubai',
    "centroidLat" DOUBLE PRECISION NOT NULL,
    "centroidLng" DOUBLE PRECISION NOT NULL,
    "footprintPolygon" JSONB,
    "developer" TEXT,
    "architect" TEXT,
    "completionYear" INTEGER,
    "expectedCompletion" INTEGER,
    "constructionStarted" INTEGER,
    "floors" INTEGER,
    "heightM" DOUBLE PRECISION,
    "totalUnits" INTEGER,
    "buildingType" TEXT,
    "description" TEXT,
    "amenities" JSONB,
    "photos" JSONB,
    "modelPath" TEXT,
    "rotationDeg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scaleFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "modelProvider" TEXT,
    "propsearchUrl" TEXT,
    "sources" JSONB,
    "confidenceLevel" TEXT NOT NULL DEFAULT 'medium',
    "workflowStatus" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkedParcelId" TEXT,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Building_community_idx" ON "Building"("community");

-- CreateIndex
CREATE INDEX "Building_status_idx" ON "Building"("status");

-- CreateIndex
CREATE INDEX "Building_workflowStatus_idx" ON "Building"("workflowStatus");

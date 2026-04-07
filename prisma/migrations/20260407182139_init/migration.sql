-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'BUYER', 'BROKER', 'INVESTOR', 'DEVELOPER', 'ARCHITECT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('VACANT', 'LISTED', 'IN_DEAL', 'SOLD', 'DISPUTED', 'FROZEN');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('INITIAL', 'DEAL_INITIATED', 'DEPOSIT_SUBMITTED', 'AGREEMENT_SIGNED', 'DOCUMENTS_COLLECTED', 'GOVERNMENT_VERIFIED', 'NOC_REQUESTED', 'TRANSFER_FEE_PAID', 'DLD_SUBMITTED', 'DEAL_COMPLETED', 'DISPUTE_INITIATED', 'DEAL_CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TITLE_DEED', 'PASSPORT', 'EMIRATES_ID', 'NOC', 'SPA', 'OQOOD', 'EJARI', 'POWER_OF_ATTORNEY', 'VALUATION_REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "plotNumber" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "emirate" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geometry" JSONB,
    "status" "ParcelStatus" NOT NULL DEFAULT 'VACANT',
    "currentValuation" BIGINT,
    "isTokenized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'INITIAL',
    "priceInFils" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "parcelId" TEXT,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Parcel_ownerId_idx" ON "Parcel"("ownerId");

-- CreateIndex
CREATE INDEX "Parcel_emirate_idx" ON "Parcel"("emirate");

-- CreateIndex
CREATE INDEX "Parcel_district_idx" ON "Parcel"("district");

-- CreateIndex
CREATE INDEX "Parcel_status_idx" ON "Parcel"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_emirate_district_plotNumber_key" ON "Parcel"("emirate", "district", "plotNumber");

-- CreateIndex
CREATE INDEX "Deal_parcelId_idx" ON "Deal"("parcelId");

-- CreateIndex
CREATE INDEX "Deal_sellerId_idx" ON "Deal"("sellerId");

-- CreateIndex
CREATE INDEX "Deal_buyerId_idx" ON "Deal"("buyerId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Document_dealId_idx" ON "Document"("dealId");

-- CreateIndex
CREATE INDEX "Document_parcelId_idx" ON "Document"("parcelId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

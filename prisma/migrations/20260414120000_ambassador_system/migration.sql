-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'REVERSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT,
ADD COLUMN     "referredAt" TIMESTAMP(3),
ADD COLUMN     "ambassadorActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "platformFeeFils" BIGINT;

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "ambassadorId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "amountFils" BIGINT NOT NULL,
    "basisFils" BIGINT NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "payoutMethod" TEXT,
    "payoutRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralClick" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "convertedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- CreateIndex
CREATE INDEX "Commission_ambassadorId_status_idx" ON "Commission"("ambassadorId", "status");

-- CreateIndex
CREATE INDEX "Commission_dealId_idx" ON "Commission"("dealId");

-- CreateIndex
CREATE INDEX "Commission_level_idx" ON "Commission"("level");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX "ReferralClick_referralCode_idx" ON "ReferralClick"("referralCode");

-- CreateIndex
CREATE INDEX "ReferralClick_createdAt_idx" ON "ReferralClick"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

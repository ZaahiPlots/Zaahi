-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "agreedPriceInFils" BIGINT,
ADD COLUMN     "brokerId" TEXT,
ADD COLUMN     "closingDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "conditions" TEXT,
ADD COLUMN     "depositPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dldApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dldReference" TEXT,
ADD COLUMN     "initialMessage" TEXT,
ADD COLUMN     "mortgageAmount" BIGINT,
ADD COLUMN     "mortgageBank" TEXT,
ADD COLUMN     "mouSigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nocReceived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offerPriceInFils" BIGINT,
ADD COLUMN     "paymentType" TEXT,
ADD COLUMN     "rating" INTEGER;

-- CreateTable
CREATE TABLE "DealMessage" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealAuditEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "txHash" TEXT,
    "documentHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealMessage_dealId_idx" ON "DealMessage"("dealId");

-- CreateIndex
CREATE INDEX "DealMessage_createdAt_idx" ON "DealMessage"("createdAt");

-- CreateIndex
CREATE INDEX "DealAuditEvent_dealId_idx" ON "DealAuditEvent"("dealId");

-- CreateIndex
CREATE INDEX "DealAuditEvent_txHash_idx" ON "DealAuditEvent"("txHash");

-- CreateIndex
CREATE INDEX "DealAuditEvent_eventType_idx" ON "DealAuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "Deal_brokerId_idx" ON "Deal"("brokerId");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMessage" ADD CONSTRAINT "DealMessage_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMessage" ADD CONSTRAINT "DealMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealAuditEvent" ADD CONSTRAINT "DealAuditEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

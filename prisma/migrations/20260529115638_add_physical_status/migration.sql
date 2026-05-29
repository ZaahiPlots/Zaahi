-- CreateEnum
CREATE TYPE "PhysicalStatus" AS ENUM ('EMPTY', 'UNDER_CONSTRUCTION', 'COMPLETED', 'SUSPENDED', 'FUTURE_DEVELOPMENT', 'PRE_CONSTRUCTION');

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "physicalStatus" "PhysicalStatus";

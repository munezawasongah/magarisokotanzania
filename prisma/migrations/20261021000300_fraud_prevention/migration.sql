-- Fraud prevention: risk scoring, blocklist, device tracking, photo hashes

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('PHONE', 'EMAIL', 'DEVICE', 'CHASSIS', 'IMAGE_HASH', 'KEYWORD');

-- CreateEnum
CREATE TYPE "FlagEntity" AS ENUM ('LISTING', 'USER', 'INQUIRY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isShadowBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bannedAt" TIMESTAMP(3),
ADD COLUMN "banReason" TEXT,
ADD COLUMN "walletVerifiedAt" TIMESTAMP(3),
ADD COLUMN "walletMsisdn" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN "riskReasons" JSONB,
ADD COLUMN "riskCheckedAt" TIMESTAMP(3),
ADD COLUMN "fraudReviewedAt" TIMESTAMP(3),
ADD COLUMN "fraudReviewedBy" TEXT;

-- AlterTable
ALTER TABLE "ListingImage" ADD COLUMN "phash" BIGINT;

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isHeld" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blocklist" (
    "id" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "sourceUserId" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blocklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudFlag" (
    "id" TEXT NOT NULL,
    "entity" "FlagEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "signal" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "detail" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_riskLevel_status_idx" ON "Listing"("riskLevel", "status");

-- CreateIndex
CREATE INDEX "Listing_contactPhone_idx" ON "Listing"("contactPhone");

-- CreateIndex
CREATE INDEX "Listing_chassisNumber_idx" ON "Listing"("chassisNumber");

-- CreateIndex
CREATE INDEX "ListingImage_phash_idx" ON "ListingImage"("phash");

-- CreateIndex
CREATE INDEX "UserDevice_deviceHash_idx" ON "UserDevice"("deviceHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_userId_deviceHash_key" ON "UserDevice"("userId", "deviceHash");

-- CreateIndex
CREATE INDEX "Blocklist_sourceUserId_idx" ON "Blocklist"("sourceUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Blocklist_type_value_key" ON "Blocklist"("type", "value");

-- CreateIndex
CREATE INDEX "FraudFlag_entity_entityId_idx" ON "FraudFlag"("entity", "entityId");

-- CreateIndex
CREATE INDEX "FraudFlag_userId_idx" ON "FraudFlag"("userId");

-- CreateIndex
CREATE INDEX "FraudFlag_resolved_createdAt_idx" ON "FraudFlag"("resolved", "createdAt");

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blocklist" ADD CONSTRAINT "Blocklist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

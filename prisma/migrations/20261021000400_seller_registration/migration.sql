-- Paid seller registration, mini-sites for private sellers, listing location,
-- and "no listing without a price" enforced in the database.

-- AlterEnum
ALTER TYPE "BusinessType" ADD VALUE 'PRIVATE_SELLER' BEFORE 'DEALERSHIP';

-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'REGISTRATION_FEE';

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('AWAITING_PAYMENT', 'PAYMENT_SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RegistrationAccountType" AS ENUM ('SELLER', 'DEALER', 'IMPORTER', 'PARTS_VENDOR', 'SERVICE_PROVIDER');

-- Services without a price cannot stay on the platform
DELETE FROM "ServiceOffering" WHERE "priceFromTzs" IS NULL OR "priceFromTzs" <= 0;

-- AlterTable
ALTER TABLE "ServiceOffering" ALTER COLUMN "priceFromTzs" SET NOT NULL;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "locationAddress" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "SellerRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "RegistrationAccountType" NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "shopDetails" JSONB NOT NULL,
    "feeTzs" BIGINT NOT NULL,
    "paymentId" TEXT,
    "manualReference" TEXT,
    "manualMsisdn" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerRegistration_userId_key" ON "SellerRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerRegistration_paymentId_key" ON "SellerRegistration"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerRegistration_businessId_key" ON "SellerRegistration"("businessId");

-- CreateIndex
CREATE INDEX "SellerRegistration_status_submittedAt_idx" ON "SellerRegistration"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "SellerRegistration" ADD CONSTRAINT "SellerRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- No listing, part or service can exist without a positive price
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_price_required" CHECK ("priceTzs" > 0);
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_price_required" CHECK ("priceTzs" > 0);
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_price_required" CHECK ("priceFromTzs" > 0);

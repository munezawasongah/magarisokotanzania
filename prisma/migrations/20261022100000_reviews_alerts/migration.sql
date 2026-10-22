-- Reviews, price-drop alerts, listing expiry reminders, inspection booking details.

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- Favorite: price the buyer last saw (for price-drop alerts)
ALTER TABLE "Favorite" ADD COLUMN "alertPriceTzs" BIGINT;
UPDATE "Favorite" f SET "alertPriceTzs" = l."priceTzs" FROM "Listing" l WHERE f."listingId" = l."id";

-- Listing: "expires soon" reminder
ALTER TABLE "Listing" ADD COLUMN "expiryNotifiedAt" TIMESTAMP(3);

-- InspectionRequest: buyer's preferred date and message
ALTER TABLE "InspectionRequest" ADD COLUMN "preferredDate" TIMESTAMP(3),
ADD COLUMN "buyerMessage" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "InspectionRequest_providerId_status_idx" ON "InspectionRequest"("providerId", "status");
CREATE INDEX "InspectionRequest_buyerId_idx" ON "InspectionRequest"("buyerId");

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "sellerReply" TEXT,
    "sellerReplyAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX "Review_businessId_authorId_key" ON "Review"("businessId", "authorId");
CREATE INDEX "Review_businessId_status_createdAt_idx" ON "Review"("businessId", "status", "createdAt");
ALTER TABLE "Review" ADD CONSTRAINT "Review_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

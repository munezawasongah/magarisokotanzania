-- Private sellers' first listings are free; when listing fees are switched on, later listings
-- are created unpaid (DRAFT) and go live once the listing fee is paid.
ALTER TABLE "Listing" ADD COLUMN "isFreeListing" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Listing_sellerId_isFreeListing_idx" ON "Listing"("sellerId", "isFreeListing");

-- Seller tags shown on the car page and filterable
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "tradeInAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "financingAvailable" BOOLEAN NOT NULL DEFAULT false;

-- Market price statistics (median by model and model year) read active listings by these columns
CREATE INDEX IF NOT EXISTS "Listing_status_modelId_year_idx" ON "Listing" ("status", "modelId", "year");

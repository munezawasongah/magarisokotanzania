-- Full-text search for vehicles and spare parts.
-- `search` is a STORED generated tsvector built from the app-maintained
-- `searchText` (make, model, trim, body, fuel, region…) plus title/description.
-- The 'simple' config is used on purpose: it does not stem, so it works for
-- English AND Swahili terms and for model codes like "1NZ-FE" or "GX-470".

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Listing" DROP COLUMN IF EXISTS "search";
ALTER TABLE "Listing" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("searchText", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("description", '')), 'C')
) STORED;
CREATE INDEX "Listing_search_idx" ON "Listing" USING GIN ("search");
CREATE INDEX "Listing_title_trgm_idx" ON "Listing" USING GIN ("title" gin_trgm_ops);

ALTER TABLE "SparePart" DROP COLUMN IF EXISTS "search";
ALTER TABLE "SparePart" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("partNumber", '') || ' ' || coalesce("oemNumber", '') || ' ' || coalesce("brand", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("searchText", '')), 'B') ||
  setweight(to_tsvector('simple', coalesce("description", '')), 'C')
) STORED;
CREATE INDEX "SparePart_search_idx" ON "SparePart" USING GIN ("search");
CREATE INDEX "SparePart_title_trgm_idx" ON "SparePart" USING GIN ("title" gin_trgm_ops);

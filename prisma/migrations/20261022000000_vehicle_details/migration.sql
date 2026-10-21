-- Car yards as a seller type, and compulsory mileage on every vehicle listing.

-- AlterEnum
ALTER TYPE "BusinessType" ADD VALUE 'CAR_YARD' AFTER 'DEALERSHIP';

-- AlterEnum
ALTER TYPE "SellerType" ADD VALUE 'YARD' AFTER 'DEALER';

-- AlterEnum
ALTER TYPE "RegistrationAccountType" ADD VALUE 'YARD' AFTER 'DEALER';

-- Mileage is required (brand-new vehicles carry 0 km)
UPDATE "Listing" SET "mileageKm" = 0 WHERE "mileageKm" IS NULL;
ALTER TABLE "Listing" ALTER COLUMN "mileageKm" SET NOT NULL;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_mileage_valid" CHECK ("mileageKm" >= 0);

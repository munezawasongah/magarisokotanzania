-- AlterTable: record Terms of Use / Privacy Policy acceptance (PDPA consent evidence)
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;

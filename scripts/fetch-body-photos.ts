/**
 * Gives every body-type tile a real, freely licensed photo from Wikimedia Commons
 * (credits shown at /photo-credits). Runs on every deploy as part of `npm run db:setup`
 * and only fills body types that have no photo, so admin uploads are never replaced.
 *
 *   npx tsx scripts/fetch-body-photos.ts            # fill missing photos
 *   npx tsx scripts/fetch-body-photos.ts --force    # replace every body-type photo
 *   npx tsx scripts/fetch-body-photos.ts SUV PICKUP # only these body types
 *
 * Never fails the deploy: if Wikimedia can't be reached, the tiles keep their current photos.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { fillBodyTypePhotos, type CommonsPhoto } from "../src/lib/commons-photos";

const dbUrl = (process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/garisoko").replace("@localhost:", "@127.0.0.1:");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

async function main() {
  const args = process.argv.slice(2);
  const [photosRow, creditsRow] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "bodyTypePhotos" } }),
    prisma.siteSetting.findUnique({ where: { key: "bodyTypePhotoCredits" } }),
  ]);
  const { photos, credits, found } = await fillBodyTypePhotos(
    (photosRow?.value as Record<string, string>) ?? {},
    (creditsRow?.value as Record<string, CommonsPhoto>) ?? {},
    { force: args.includes("--force"), only: args.filter((a) => !a.startsWith("--")).map((a) => a.toUpperCase()), log: console.log },
  );
  if (found) {
    await prisma.siteSetting.upsert({ where: { key: "bodyTypePhotos" }, create: { key: "bodyTypePhotos", value: photos }, update: { value: photos } });
    await prisma.siteSetting.upsert({
      where: { key: "bodyTypePhotoCredits" },
      create: { key: "bodyTypePhotoCredits", value: credits as unknown as Prisma.InputJsonValue },
      update: { value: credits as unknown as Prisma.InputJsonValue },
    });
  }
  console.log(`\n${found} body-type photo(s) added. Credits: /photo-credits. Change any photo in Admin → Body type photos.`);
}

main()
  .catch((e) => console.error("Body-type photos skipped:", (e as Error).message))
  .finally(() => prisma.$disconnect());

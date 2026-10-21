import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Cached reference data — makes/models/regions change rarely. */
export const getMakesWithModels = unstable_cache(
  async () =>
    prisma.make.findMany({
      orderBy: [{ isPopular: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, isPopular: true, models: { select: { id: true, name: true, slug: true, defaultBodyType: true }, orderBy: { name: "asc" } } },
    }),
  ["makes-with-models"],
  { revalidate: 3600, tags: ["taxonomy"] },
);

export const getRegionsWithDistricts = unstable_cache(
  async () =>
    prisma.region.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nameSw: true, slug: true, zone: true, isZanzibar: true, districts: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } } },
    }),
  ["regions-with-districts"],
  { revalidate: 86400, tags: ["taxonomy"] },
);

export type MakeOption = Awaited<ReturnType<typeof getMakesWithModels>>[number];
export type RegionOption = Awaited<ReturnType<typeof getRegionsWithDistricts>>[number];

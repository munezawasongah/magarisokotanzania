import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Live counts for the footer's "browse by make / body type" links and the
 * home page price-band chips. Cached for 5 minutes so every page view doesn't query.
 */
export const getBrowseCounts = unstable_cache(
  async (bands: Array<{ min?: number; max?: number }>) => {
    const [byMake, byBody, bandCounts] = await Promise.all([
      prisma.listing.groupBy({ by: ["makeId"], where: { status: "ACTIVE" }, _count: { _all: true }, orderBy: { _count: { makeId: "desc" } }, take: 12 }),
      prisma.listing.groupBy({ by: ["bodyType"], where: { status: "ACTIVE" }, _count: { _all: true }, orderBy: { _count: { bodyType: "desc" } } }),
      Promise.all(bands.map((b) => prisma.listing.count({
        where: { status: "ACTIVE", priceTzs: { ...(b.min ? { gte: BigInt(b.min) } : {}), ...(b.max ? { lte: BigInt(b.max) } : {}) } },
      }))),
    ]);
    const makes = byMake.length ? await prisma.make.findMany({ where: { id: { in: byMake.map((m) => m.makeId) } }, select: { id: true, name: true, slug: true } }) : [];
    return {
      makes: byMake.map((m) => ({ ...makes.find((x) => x.id === m.makeId)!, count: m._count._all })).filter((m) => m.slug),
      bodies: byBody.map((b) => ({ body: b.bodyType as string, count: b._count._all })),
      bands: bandCounts,
    };
  },
  ["browse-counts"],
  { revalidate: 300, tags: ["browse-counts"] },
);

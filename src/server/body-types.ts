import "server-only";
import { prisma } from "@/lib/prisma";
import { getBodyTypePhotos } from "@/lib/settings";
import type { BodyType } from "@/generated/prisma/enums";

export const BODY_PLACEHOLDER: Partial<Record<BodyType, string>> = {
  SEDAN: "/placeholders/sedan.svg", HATCHBACK: "/placeholders/hatchback.svg", WAGON: "/placeholders/sedan.svg",
  SUV: "/placeholders/suv.svg", PICKUP: "/placeholders/pickup.svg", VAN: "/placeholders/van.svg", MINIVAN: "/placeholders/van.svg",
  MINIBUS: "/placeholders/van.svg", BUS: "/placeholders/truck.svg", TRUCK: "/placeholders/truck.svg",
  MOTORCYCLE: "/placeholders/motorcycle.svg", THREE_WHEELER: "/placeholders/motorcycle.svg",
};

export type BodyTile = { body: BodyType; url: string; source: "admin" | "listing" | "placeholder"; count: number };

/**
 * Photo for each body-type tile, best first:
 *   1. the photo an admin chose in Admin → Body type photos
 *   2. the cover photo of the newest live car of that body type on the platform
 *   3. the drawn placeholder (only when neither exists)
 */
export async function getBodyTypeTiles(bodies: BodyType[]): Promise<BodyTile[]> {
  const [chosen, counts, covers] = await Promise.all([
    getBodyTypePhotos(),
    prisma.listing.groupBy({ by: ["bodyType"], where: { status: "ACTIVE", bodyType: { in: bodies } }, _count: { _all: true } }),
    Promise.all(
      bodies.map((body) =>
        prisma.listingImage.findFirst({
          where: { listing: { status: "ACTIVE", bodyType: body } },
          orderBy: [{ listing: { publishedAt: "desc" } }, { sortOrder: "asc" }],
          select: { url: true },
        }),
      ),
    ),
  ]);
  return bodies.map((body, i) => {
    const count = counts.find((c) => c.bodyType === body)?._count._all ?? 0;
    if (chosen[body]) return { body, url: chosen[body]!, source: "admin", count };
    if (covers[i]?.url) return { body, url: covers[i]!.url, source: "listing", count };
    return { body, url: BODY_PLACEHOLDER[body] ?? "/placeholders/sedan.svg", source: "placeholder", count };
  });
}

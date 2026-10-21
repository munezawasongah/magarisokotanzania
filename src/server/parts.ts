import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { PartCreateInput, PartFilters } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";
import type { SessionUser } from "@/lib/session";
import { toPrefixTsQuery, ListingError } from "./listings";
import { CAN_LIST_PARTS, requireShop } from "./registration";

export const partCardSelect = {
  id: true, slug: true, title: true, category: true, condition: true, authenticity: true, brand: true, partNumber: true, oemNumber: true,
  priceTzs: true, stockQty: true, warrantyDays: true, images: true, isFeatured: true, createdAt: true,
  region: { select: { name: true, slug: true } },
  business: { select: { name: true, slug: true, verification: true, phone: true, whatsapp: true } },
  seller: { select: { phone: true, whatsapp: true } },
  fitments: { select: { yearFrom: true, yearTo: true, engineCode: true, make: { select: { name: true } }, model: { select: { name: true } } }, take: 4 },
} satisfies Prisma.SparePartSelect;
export type PartCardRow = Prisma.SparePartGetPayload<{ select: typeof partCardSelect }>;

export async function searchParts(f: PartFilters) {
  const and: Prisma.SparePartWhereInput[] = [{ status: "ACTIVE" }];
  if (f.category?.length) and.push({ category: { in: f.category } });
  if (f.condition?.length) and.push({ condition: { in: f.condition } });
  if (f.authenticity?.length) and.push({ authenticity: { in: f.authenticity } });
  if (f.region) and.push({ region: { slug: f.region } });
  if (f.priceMax) and.push({ priceTzs: { lte: BigInt(f.priceMax) } });
  if (f.vendor) and.push({ business: { slug: f.vendor } });

  // Fitment: a part matches when it fits the make, and either the exact model or
  // all models (modelId null), and the year is inside the fitment range (open ends allowed).
  if (f.make) {
    const fit: Prisma.PartFitmentWhereInput = { make: { slug: f.make } };
    if (f.model) fit.OR = [{ model: { slug: f.model } }, { modelId: null }];
    if (f.year) {
      fit.AND = [
        { OR: [{ yearFrom: null }, { yearFrom: { lte: f.year } }] },
        { OR: [{ yearTo: null }, { yearTo: { gte: f.year } }] },
      ];
    }
    and.push({ fitments: { some: fit } });
  }

  let rankedIds: string[] | null = null;
  if (f.q) {
    const tsq = toPrefixTsQuery(f.q);
    const like = "%" + f.q.replace(/[%_\\]/g, "\\$&") + "%";
    const rows = tsq
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "SparePart"
          WHERE status = 'ACTIVE' AND (search @@ to_tsquery('simple', ${tsq}) OR title ILIKE ${like}
            OR "partNumber" ILIKE ${like} OR "oemNumber" ILIKE ${like})
          ORDER BY ts_rank(search, to_tsquery('simple', ${tsq})) DESC LIMIT 2000`
      : [];
    rankedIds = rows.map((r) => r.id);
    and.push({ id: { in: rankedIds } });
  }

  const where: Prisma.SparePartWhereInput = { AND: and };
  const skip = (f.page - 1) * f.perPage;
  const order: Prisma.SparePartOrderByWithRelationInput[] =
    f.sort === "price_asc" ? [{ priceTzs: "asc" }] : f.sort === "price_desc" ? [{ priceTzs: "desc" }] : [{ isFeatured: "desc" }, { createdAt: "desc" }];

  if (rankedIds && f.sort === "relevance") {
    const matching = await prisma.sparePart.findMany({ where, select: { id: true } });
    const set = new Set(matching.map((m) => m.id));
    const ordered = rankedIds.filter((id) => set.has(id));
    const pageIds = ordered.slice(skip, skip + f.perPage);
    const found = await prisma.sparePart.findMany({ where: { id: { in: pageIds } }, select: partCardSelect });
    const byId = new Map(found.map((p) => [p.id, p]));
    return { items: pageIds.map((id) => byId.get(id)!).filter(Boolean), total: ordered.length, page: f.page, perPage: f.perPage, pages: Math.max(1, Math.ceil(ordered.length / f.perPage)) };
  }

  const [items, total] = await Promise.all([
    prisma.sparePart.findMany({ where, select: partCardSelect, orderBy: order, skip, take: f.perPage }),
    prisma.sparePart.count({ where }),
  ]);
  return { items, total, page: f.page, perPage: f.perPage, pages: Math.max(1, Math.ceil(total / f.perPage)) };
}

export async function getPartBySlug(slug: string) {
  return prisma.sparePart.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      region: true, district: true,
      business: { select: { id: true, name: true, slug: true, verification: true, phone: true, whatsapp: true, address: true } },
      seller: { select: { id: true, name: true, phone: true, whatsapp: true } },
      fitments: { include: { make: true, model: true }, orderBy: [{ makeId: "asc" }, { yearFrom: "asc" }] },
    },
  });
}

export async function createPart(user: SessionUser, input: PartCreateInput) {
  const shop = await requireShop(user, CAN_LIST_PARTS);
  const makes = await prisma.make.findMany({ where: { id: { in: input.fitments.map((f) => f.makeId) } }, include: { models: true } });
  const makeMap = new Map(makes.map((m) => [m.id, m]));
  for (const f of input.fitments) {
    const mk = makeMap.get(f.makeId);
    if (!mk) throw new ListingError("Unknown make in fitment");
    if (f.modelId && !mk.models.some((m) => m.id === f.modelId)) throw new ListingError("Fitment model does not belong to make");
  }
  const fitText = input.fitments
    .map((f) => {
      const mk = makeMap.get(f.makeId)!;
      return [mk.name, mk.models.find((m) => m.id === f.modelId)?.name, f.engineCode].filter(Boolean).join(" ");
    })
    .join(" ");

  return prisma.sparePart.create({
    data: {
      slug: uniqueSlug(input.title),
      title: input.title,
      description: input.description,
      category: input.category,
      condition: input.condition,
      authenticity: input.authenticity,
      brand: input.brand,
      partNumber: input.partNumber,
      oemNumber: input.oemNumber,
      priceTzs: BigInt(input.priceTzs),
      stockQty: input.stockQty,
      warrantyDays: input.warrantyDays,
      sellerId: user.id,
      businessId: shop?.id,
      regionId: input.regionId,
      districtId: input.districtId,
      images: input.images,
      searchText: `${input.category.toLowerCase().replace(/_/g, " ")} ${fitText}`.toLowerCase(),
      fitments: { create: input.fitments },
    },
    select: { id: true, slug: true },
  });
}

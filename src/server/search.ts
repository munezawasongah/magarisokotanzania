import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { listingFilterSchema, partFilterSchema } from "@/lib/validation";
import { ServiceCategory } from "@/generated/prisma/enums";
import { searchListings } from "./listings";
import { searchParts } from "./parts";

const SERVICE_TYPES = ["SERVICE_PROVIDER", "INSPECTION_CENTER", "FINANCE_INSURANCE"] as const;

/** Words → the ServiceCategory values they mean (EN + SW), so "fundi", "towing" or "bima" find services. */
const CATEGORY_WORDS: Array<[RegExp, string[]]> = [
  [/\b(mechanic|garage|repair|fundi|gereji|matengenezo)\w*/i, ["GENERAL_REPAIR"]],
  [/\b(diagnos|computer|scan)\w*/i, ["DIAGNOSTICS"]],
  [/\b(inspect|ukaguzi|valuation)\w*/i, ["PRE_PURCHASE_INSPECTION"]],
  [/\b(tow|recovery|breakdown|kuvuta)\w*/i, ["TOWING"]],
  [/\b(clearing|forwarding|customs|bandari|forodha)\w*/i, ["CLEARING_FORWARDING"]],
  [/\b(insur|bima)\w*/i, ["INSURANCE"]],
  [/\b(financ|loan|mkopo)\w*/i, ["FINANCING"]],
  [/\b(paint|body\s?work|panel|rangi)\w*/i, ["BODYWORK_PAINT"]],
  [/\b(tyre|tire|wheel|alignment|balancing|matairi)\w*/i, ["TYRES_ALIGNMENT"]],
  [/\b(electric|wiring|umeme)\w*/i, ["AUTO_ELECTRIC"]],
  [/\b(ac|aircon|air\s?con|air\s?conditioning)\b/i, ["AIR_CONDITIONING"]],
  [/\b(wash|detail|kuosha)\w*/i, ["DETAILING"]],
];

function categoriesFor(q: string): ServiceCategory[] {
  const valid = new Set(Object.values(ServiceCategory) as string[]);
  return CATEGORY_WORDS.filter(([re]) => re.test(q)).flatMap(([, c]) => c).filter((c) => valid.has(c)) as ServiceCategory[];
}

export async function searchServices(q: string | undefined, region: string | undefined, take = 24) {
  const and: Prisma.ServiceOfferingWhereInput[] = [
    { business: { isActive: true, type: { in: [...SERVICE_TYPES, "DEALERSHIP", "CAR_YARD", "IMPORTER", "PARTS_VENDOR"] } } },
    { priceFromTzs: { gt: 0 } },
  ];
  if (region) and.push({ business: { region: { slug: region } } });
  if (q) {
    const cats = categoriesFor(q);
    const words = q.split(/\s+/).filter((w) => w.length >= 2).slice(0, 6);
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        ...words.map((w) => ({ title: { contains: w, mode: "insensitive" as const } })),
        { business: { name: { contains: q, mode: "insensitive" } } },
        { makes: { hasSome: words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) } },
        ...(cats.length ? [{ category: { in: cats } }] : []),
      ],
    });
  }
  const where: Prisma.ServiceOfferingWhereInput = { AND: and };
  const [items, total] = await Promise.all([
    prisma.serviceOffering.findMany({
      where,
      include: { business: { select: { id: true, name: true, slug: true, phone: true, whatsapp: true, address: true, verification: true, logoUrl: true, region: { select: { name: true } }, district: { select: { name: true } } } } },
      orderBy: [{ business: { verification: "asc" } }, { priceFromTzs: "asc" }],
      take,
    }),
    prisma.serviceOffering.count({ where }),
  ]);
  return { items, total };
}

export async function searchShops(q: string | undefined, region: string | undefined, take = 12) {
  const where: Prisma.BusinessWhereInput = {
    isActive: true,
    ...(region ? { region: { slug: region } } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { tagline: { contains: q, mode: "insensitive" } }, { address: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.business.findMany({
      where,
      select: { id: true, name: true, slug: true, type: true, tagline: true, phone: true, whatsapp: true, address: true, logoUrl: true, verification: true, ratingAvg: true, ratingCount: true, region: { select: { name: true } }, _count: { select: { listings: { where: { status: "ACTIVE" } }, parts: { where: { status: "ACTIVE" } }, services: true } } },
      orderBy: [{ verification: "asc" }, { ratingAvg: "desc" }, { createdAt: "desc" }],
      take,
    }),
    prisma.business.count({ where }),
  ]);
  return { items, total };
}

/**
 * One search box for everything: cars, spare parts, services (each with its
 * price and the seller's contacts) and the shops themselves.
 */
export async function searchEverything(input: { q?: string; region?: string; scope?: "all" | "cars" | "parts" | "services" | "shops"; page?: number }) {
  const q = input.q?.trim() || undefined;
  const region = input.region || undefined;
  const scope = input.scope ?? "all";
  const page = input.page ?? 1;
  const per = scope === "all" ? 8 : 24;
  const want = (s: string) => scope === "all" || scope === s;
  const [cars, parts, services, shops] = await Promise.all([
    want("cars") ? searchListings(listingFilterSchema.parse({ q, region, sort: q ? "featured" : "newest", perPage: per, page: scope === "cars" ? page : 1 }), { facets: false }) : null,
    want("parts") ? searchParts(partFilterSchema.parse({ q, region, perPage: per, page: scope === "parts" ? page : 1 })) : null,
    want("services") ? searchServices(q, region, scope === "services" ? 60 : per) : null,
    want("shops") ? searchShops(q, region, scope === "shops" ? 60 : 6) : null,
  ]);
  return { q, region, scope, cars, parts, services, shops };
}

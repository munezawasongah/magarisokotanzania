import "server-only";
import { notifyPriceDrops, notifySavedSearches, sendExpiryWarnings } from "./alerts";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { ListingEventType, SellerType } from "@/generated/prisma/enums";
import type { ListingCreateInput, ListingFilters } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";
import { estimateLandedCost } from "@/lib/import-cost";
import { getImportTaxRules } from "@/lib/settings";
import { getUsdTzsRate } from "@/lib/fx";
import { rateLimit } from "@/lib/rate-limit";
import { SITE } from "@/config/site";
import type { SessionUser } from "@/lib/session";
import { getDeviceContext, recordDevice } from "@/lib/device";
import { hashListingImages, isTrustedSeller, normalizeChassis, scoreListing, type RiskResult } from "./fraud/engine";
import { PRICE_CUT_HOLD_PCT } from "@/config/fraud";
import { CAN_LIST_VEHICLES, requireShop } from "./registration";

/* ═════════════════════════════ card projection ═════════════════════════════ */

export const listingCardSelect = {
  id: true, slug: true, title: true, priceTzs: true, priceNegotiable: true, year: true, mileageKm: true,
  transmission: true, fuelType: true, bodyType: true, condition: true, steering: true, drivetrain: true, engineCc: true,
  isFeatured: true, featuredUntil: true, isSponsored: true, isImportOnOrder: true, landedCostTzs: true, sellerType: true,
  contactPhone: true, contactWhatsapp: true, publishedAt: true, createdAt: true, status: true, viewCount: true, leadCount: true,
  make: { select: { name: true, slug: true } },
  model: { select: { name: true, slug: true } },
  region: { select: { name: true, slug: true } },
  district: { select: { name: true } },
  business: { select: { name: true, slug: true, verification: true, logoUrl: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
  _count: { select: { images: true } },
} satisfies Prisma.ListingSelect;

export type ListingCardRow = Prisma.ListingGetPayload<{ select: typeof listingCardSelect }>;

/* ═════════════════════════════ promotions expiry ═══════════════════════════ */

let lastExpiry = 0;
/** Clears lapsed featured/sponsored flags and expires old listings. Throttled to once per 5 min per instance. */
export async function runListingMaintenance(force = false) {
  if (!force && Date.now() - lastExpiry < 5 * 60 * 1000) return;
  lastExpiry = Date.now();
  const now = new Date();
  // Three independent, idempotent updates: no transaction needed, and a hiccup here
  // must never stop a buyer from seeing search results (it simply runs again later).
  try {
    await Promise.all([
      prisma.listing.updateMany({ where: { isFeatured: true, featuredUntil: { lt: now } }, data: { isFeatured: false } }),
      prisma.listing.updateMany({ where: { isSponsored: true, sponsoredUntil: { lt: now } }, data: { isSponsored: false } }),
      prisma.listing.updateMany({ where: { status: "ACTIVE", expiresAt: { lt: now } }, data: { status: "EXPIRED" } }),
    ]);
    void sendExpiryWarnings().catch((e) => console.error("[maintenance] expiry warnings:", e));
  } catch (e) {
    lastExpiry = 0; // retry on the next request
    console.error("[maintenance] listing expiry skipped:", e instanceof Error ? e.message : e);
    if (force) throw e;
  }
}

/* ═════════════════════════════ full-text search ════════════════════════════ */

/** "harrier 2.0 premium" → "harrier:* & 2.0:* & premium:*" (prefix match, injection-safe tokens). */
export function toPrefixTsQuery(q: string): string | null {
  const tokens = q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}.\- ]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter((t) => t.length > 0)
    .slice(0, 8);
  return tokens.length ? tokens.map((t) => `${t}:*`).join(" & ") : null;
}

async function rankedListingIds(q: string): Promise<string[]> {
  const tsq = toPrefixTsQuery(q);
  if (!tsq) return [];
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Listing"
    WHERE status = 'ACTIVE'
      AND (search @@ to_tsquery('simple', ${tsq}) OR title ILIKE ${"%" + q.replace(/[%_\\]/g, "\\$&") + "%"})
    ORDER BY ts_rank(search, to_tsquery('simple', ${tsq})) DESC, "isFeatured" DESC
    LIMIT 2000`;
  return rows.map((r) => r.id);
}

/* ═════════════════════════════ filter → where ══════════════════════════════ */

export function buildListingWhere(f: Partial<ListingFilters>): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [{ status: "ACTIVE" }];
  if (f.make) and.push({ make: { slug: f.make } });
  if (f.model) and.push({ model: { slug: f.model } });
  if (f.yearMin || f.yearMax) and.push({ year: { gte: f.yearMin || undefined, lte: f.yearMax || undefined } });
  if (f.priceMin || f.priceMax)
    and.push({ priceTzs: { gte: f.priceMin ? BigInt(f.priceMin) : undefined, lte: f.priceMax ? BigInt(f.priceMax) : undefined } });
  if (f.mileageMin != null || f.mileageMax) and.push({ mileageKm: { gte: f.mileageMin ?? undefined, lte: f.mileageMax || undefined } });
  if (f.body?.length) and.push({ bodyType: { in: f.body } });
  if (f.transmission?.length) and.push({ transmission: { in: f.transmission } });
  if (f.fuel?.length) and.push({ fuelType: { in: f.fuel } });
  if (f.condition?.length) and.push({ condition: { in: f.condition } });
  if (f.steering?.length) and.push({ steering: { in: f.steering } });
  if (f.drivetrain?.length) and.push({ drivetrain: { in: f.drivetrain } });
  if (f.fourWd) and.push({ drivetrain: { in: ["FOUR_WD", "AWD"] } });
  if (f.sellerType?.length) and.push({ sellerType: { in: f.sellerType } });
  if (f.region) and.push({ region: { slug: f.region } });
  if (f.district?.length) and.push({ districtId: { in: f.district } });
  if (f.importOnly) and.push({ isImportOnOrder: true });
  if (f.minClearance) and.push({ groundClearanceMm: { gte: f.minClearance } });
  if (f.business) and.push({ business: { slug: f.business } });
  return { AND: and };
}

function orderBy(sort: ListingFilters["sort"]): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case "newest": return [{ publishedAt: "desc" }];
    case "price_asc": return [{ priceTzs: "asc" }];
    case "price_desc": return [{ priceTzs: "desc" }];
    case "year_desc": return [{ year: "desc" }, { publishedAt: "desc" }];
    case "mileage_asc": return [{ mileageKm: "asc" }, { publishedAt: "desc" }];
    default: return [{ isFeatured: "desc" }, { publishedAt: "desc" }];
  }
}

export type SearchFacets = {
  makes: Array<{ slug: string; name: string; count: number }>;
  bodyTypes: Array<{ value: string; count: number }>;
  fuelTypes: Array<{ value: string; count: number }>;
  transmissions: Array<{ value: string; count: number }>;
  regions: Array<{ slug: string; name: string; count: number }>;
};

/** Main vehicle search: filters + keyword + sort + pagination + facet counts. */
export async function searchListings(f: ListingFilters, opts: { facets?: boolean } = { facets: true }) {
  await runListingMaintenance();
  const where = buildListingWhere(f);
  const skip = (f.page - 1) * f.perPage;

  let rows: ListingCardRow[];
  let total: number;

  if (f.q) {
    const ranked = await rankedListingIds(f.q);
    (where.AND as Prisma.ListingWhereInput[]).push({ id: { in: ranked } });
    if (f.sort === "featured") {
      // keep relevance order (featured boosts handled in SQL tie-break)
      const matching = await prisma.listing.findMany({ where, select: { id: true } });
      const set = new Set(matching.map((m) => m.id));
      const ordered = ranked.filter((id) => set.has(id));
      total = ordered.length;
      const pageIds = ordered.slice(skip, skip + f.perPage);
      const found = await prisma.listing.findMany({ where: { id: { in: pageIds } }, select: listingCardSelect });
      const byId = new Map(found.map((r) => [r.id, r]));
      rows = pageIds.map((id) => byId.get(id)!).filter(Boolean);
    } else {
      [rows, total] = await Promise.all([
        prisma.listing.findMany({ where, select: listingCardSelect, orderBy: orderBy(f.sort), skip, take: f.perPage }),
        prisma.listing.count({ where }),
      ]);
    }
  } else {
    [rows, total] = await Promise.all([
      prisma.listing.findMany({ where, select: listingCardSelect, orderBy: orderBy(f.sort), skip, take: f.perPage }),
      prisma.listing.count({ where }),
    ]);
  }

  const facets = opts.facets ? await listingFacets(where) : null;
  return { items: rows, total, page: f.page, perPage: f.perPage, pages: Math.max(1, Math.ceil(total / f.perPage)), facets };
}

async function listingFacets(where: Prisma.ListingWhereInput): Promise<SearchFacets> {
  const [byMake, byBody, byFuel, byTrans, byRegion] = await Promise.all([
    prisma.listing.groupBy({ by: ["makeId"], where, _count: { _all: true }, orderBy: { _count: { makeId: "desc" } }, take: 40 }),
    prisma.listing.groupBy({ by: ["bodyType"], where, _count: { _all: true } }),
    prisma.listing.groupBy({ by: ["fuelType"], where, _count: { _all: true } }),
    prisma.listing.groupBy({ by: ["transmission"], where, _count: { _all: true } }),
    prisma.listing.groupBy({ by: ["regionId"], where, _count: { _all: true }, orderBy: { _count: { regionId: "desc" } } }),
  ]);
  const [makes, regions] = await Promise.all([
    prisma.make.findMany({ where: { id: { in: byMake.map((m) => m.makeId) } }, select: { id: true, slug: true, name: true } }),
    prisma.region.findMany({ where: { id: { in: byRegion.map((r) => r.regionId) } }, select: { id: true, slug: true, name: true } }),
  ]);
  const mk = new Map(makes.map((m) => [m.id, m]));
  const rg = new Map(regions.map((r) => [r.id, r]));
  return {
    makes: byMake.map((m) => ({ slug: mk.get(m.makeId)!.slug, name: mk.get(m.makeId)!.name, count: m._count._all })),
    bodyTypes: byBody.map((b) => ({ value: b.bodyType, count: b._count._all })).sort((a, b) => b.count - a.count),
    fuelTypes: byFuel.map((b) => ({ value: b.fuelType, count: b._count._all })).sort((a, b) => b.count - a.count),
    transmissions: byTrans.map((b) => ({ value: b.transmission, count: b._count._all })).sort((a, b) => b.count - a.count),
    regions: byRegion.map((r) => ({ slug: rg.get(r.regionId)!.slug, name: rg.get(r.regionId)!.name, count: r._count._all })),
  };
}

/* ═════════════════════════════ detail ══════════════════════════════════════ */

export async function getListingBySlug(slug: string, viewer?: SessionUser | null) {
  const listing = await prisma.listing.findUnique({
    where: { slug },
    include: {
      make: true, model: true, region: true, district: true,
      images: { orderBy: { sortOrder: "asc" } },
      business: { select: { id: true, name: true, slug: true, type: true, verification: true, logoUrl: true, phone: true, whatsapp: true, address: true, ratingAvg: true, ratingCount: true, createdAt: true } },
      seller: { select: { id: true, name: true, createdAt: true, phoneVerified: true, walletVerifiedAt: true } },
    },
  });
  if (!listing) return null;
  const isOwner = viewer?.id === listing.sellerId;
  const isStaff = !!viewer?.roles.some((r) => r === "ADMIN" || r === "MODERATOR");
  if (listing.status !== "ACTIVE" && listing.status !== "SOLD" && !isOwner && !isStaff) return null;
  const { chassisNumber, ...publicListing } = listing;
  return { ...publicListing, chassisNumber: isOwner || isStaff ? chassisNumber : null, isOwner };
}

export async function getSimilarListings(l: { id: string; modelId: number; makeId: number; bodyType: string; priceTzs: bigint }, take = 8) {
  const lo = (l.priceTzs * 7n) / 10n;
  const hi = (l.priceTzs * 13n) / 10n;
  const sameModel = await prisma.listing.findMany({
    where: { status: "ACTIVE", id: { not: l.id }, modelId: l.modelId },
    select: listingCardSelect, orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], take,
  });
  if (sameModel.length >= take) return sameModel;
  const more = await prisma.listing.findMany({
    where: {
      status: "ACTIVE", id: { notIn: [l.id, ...sameModel.map((s) => s.id)] },
      bodyType: l.bodyType as never, priceTzs: { gte: lo, lte: hi },
    },
    select: listingCardSelect, orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], take: take - sameModel.length,
  });
  return [...sameModel, ...more];
}

export async function getFeaturedListings(take = 8) {
  await runListingMaintenance();
  return prisma.listing.findMany({
    where: { status: "ACTIVE", OR: [{ isFeatured: true }, { isSponsored: true }] },
    select: listingCardSelect, orderBy: [{ isSponsored: "desc" }, { publishedAt: "desc" }], take,
  });
}

export async function getLatestListings(take = 8) {
  return prisma.listing.findMany({ where: { status: "ACTIVE" }, select: listingCardSelect, orderBy: { publishedAt: "desc" }, take });
}

/* ═════════════════════════════ create / update ═════════════════════════════ */

export { ListingError } from "./errors";
import { ListingError } from "./errors";

function buildSearchText(p: { make: string; model: string; trim?: string | null; year: number; bodyType: string; fuelType: string; transmission: string; region: string; district?: string | null; drivetrain?: string | null; features?: string[] }) {
  return [p.make, p.model, p.trim, p.year, p.bodyType, p.fuelType, p.transmission, p.drivetrain === "FOUR_WD" ? "4wd 4x4" : p.drivetrain, p.region, p.district, ...(p.features ?? [])]
    .filter(Boolean).join(" ").toLowerCase().replace(/_/g, " ");
}

export type CreateListingResult = { id: string; slug: string; status: string; requiresPayment: boolean; feeTzs?: number; riskLevel?: RiskResult["level"] };

export async function createListing(user: SessionUser, input: ListingCreateInput): Promise<CreateListingResult> {
  const [model, district, region, dbUser] = await Promise.all([
    prisma.vehicleModel.findUnique({ where: { id: input.modelId }, include: { make: true } }),
    input.districtId ? prisma.district.findUnique({ where: { id: input.districtId } }) : null,
    prisma.region.findUnique({ where: { id: input.regionId } }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
  ]);
  if (!model || model.makeId !== input.makeId) throw new ListingError("Model does not belong to the selected make");
  if (!region) throw new ListingError("Unknown region");
  if (input.districtId && (!district || district.regionId !== input.regionId)) throw new ListingError("District does not belong to the region");

  // ── seller context: every seller lists through their approved mini-site ──
  const shop = await requireShop(user, CAN_LIST_VEHICLES);
  const business = shop;
  const sellerType: SellerType = shop?.type === "DEALERSHIP" ? "DEALER" : shop?.type === "CAR_YARD" ? "YARD" : shop?.type === "IMPORTER" ? "IMPORTER" : "INDIVIDUAL";
  if (input.isImportOnOrder && (sellerType === "INDIVIDUAL" || sellerType === "YARD")) throw new ListingError("Import-on-order listings are for dealers and importers", 403);

  const contactPhone = input.contactPhone ?? business?.phone ?? dbUser.phone;
  if (!contactPhone) throw new ListingError("Add a contact phone number");
  const contactWhatsapp = input.contactWhatsapp ?? business?.whatsapp ?? dbUser.whatsapp ?? contactPhone;

  // ── plan limits ──
  const requiresPayment = false;
  if (business) {
    const sub = await prisma.subscription.findFirst({
      where: { businessId: business.id, status: { in: ["ACTIVE", "TRIALING"] }, currentPeriodEnd: { gt: new Date() } },
      include: { plan: true },
    });
    const limit = sub?.plan.maxActiveListings ?? SITE.baseActiveListings;
    if (limit !== -1) {
      const active = await prisma.listing.count({ where: { businessId: business.id, status: { in: ["ACTIVE", "PENDING_REVIEW"] } } });
      if (active >= limit) throw new ListingError(`Your account allows ${limit} active listings. Upgrade your plan or mark sold cars to add more.`, 402);
    }
  }

  // ── import landed cost ──
  let landedCostTzs: bigint | null = null;
  let landedCostBreakdown: Prisma.InputJsonValue | undefined;
  if (input.isImportOnOrder && input.fobUsd) {
    const [rate, rules] = await Promise.all([getUsdTzsRate(), getImportTaxRules()]);
    const est = estimateLandedCost({
      fobUsd: input.fobUsd, freightUsd: input.freightUsd, insuranceUsd: input.insuranceUsd, year: input.year,
      engineCc: input.engineCc, isElectric: input.fuelType === "ELECTRIC", usdTzsRate: rate, rules,
    });
    landedCostTzs = BigInt(est.landedCostTzs);
    landedCostBreakdown = est as unknown as Prisma.InputJsonValue;
  }

  const autoTitle = [input.year, model.make.name, model.name, input.trim].filter(Boolean).join(" ");
  const title = input.title?.trim() || autoTitle;
  // Always start held; the fraud engine decides below whether it can go live instantly.
  const status = "PENDING_REVIEW";
  const now = new Date();
  const device = await getDeviceContext();
  await recordDevice(user.id, device);

  const created = await prisma.listing.create({
    data: {
      slug: uniqueSlug(input.year, model.make.name, model.name, region.name),
      title,
      description: input.description,
      status,
      sellerId: user.id,
      businessId: business?.id,
      sellerType,
      contactPhone,
      contactWhatsapp,
      makeId: input.makeId,
      modelId: input.modelId,
      trim: input.trim,
      year: input.year,
      condition: input.condition,
      bodyType: input.bodyType,
      transmission: input.transmission,
      fuelType: input.fuelType,
      steering: input.steering,
      drivetrain: input.drivetrain,
      engineCc: input.engineCc,
      mileageKm: input.mileageKm,
      colorExterior: input.colorExterior,
      colorInterior: input.colorInterior,
      doors: input.doors,
      seats: input.seats,
      groundClearanceMm: input.groundClearanceMm,
      registrationSeries: input.registrationSeries,
      chassisNumber: normalizeChassis(input.chassisNumber),
      features: input.features,
      priceTzs: BigInt(input.priceTzs),
      priceNegotiable: input.priceNegotiable,
      showUsdPrice: input.showUsdPrice,
      isImportOnOrder: input.isImportOnOrder,
      originCountry: input.originCountry,
      fobUsd: input.fobUsd,
      freightUsd: input.freightUsd,
      insuranceUsd: input.insuranceUsd,
      landedCostTzs,
      landedCostBreakdown,
      etaDays: input.etaDays,
      regionId: input.regionId,
      districtId: input.districtId,
      locationAddress: input.locationAddress ?? business?.address ?? undefined,
      latitude: input.latitude ?? business?.latitude ?? undefined,
      longitude: input.longitude ?? business?.longitude ?? undefined,
      searchText: buildSearchText({
        make: model.make.name, model: model.name, trim: input.trim, year: input.year, bodyType: input.bodyType,
        fuelType: input.fuelType, transmission: input.transmission, region: region.name, district: district?.name,
        drivetrain: input.drivetrain, features: input.features,
      }),
      publishedAt: null,
      expiresAt: new Date(now.getTime() + SITE.listingLifetimeDays * 86400_000),
      images: { create: input.images.map((img, i) => ({ ...img, alt: `${title} photo ${i + 1}`, sortOrder: i })) },
    },
    select: { id: true, slug: true, status: true },
  });


  // ── fraud screening: photo fingerprints, then the full risk score ──
  await hashListingImages(created.id);
  const risk = await scoreListing(created.id);
  let finalStatus: string = created.status;
  if (risk.level === "LOW" && (business?.verification === "VERIFIED" || (await isTrustedSeller(user.id)))) {
    await prisma.listing.update({ where: { id: created.id }, data: { status: "ACTIVE", publishedAt: now } });
    finalStatus = "ACTIVE";
    void notifySavedSearches(created.id);
  }
  return { ...created, status: finalStatus, requiresPayment, riskLevel: risk.level };
}

/**
 * Owner (or staff) edits: price, description, mileage, features, contact numbers,
 * mark sold/archived/relist. Every owner edit is re-screened; a live listing whose
 * risk rises to MEDIUM or HIGH (e.g. big price cut or new phone number after
 * approval) is taken down for review.
 */
export async function updateListing(user: SessionUser, id: string, patch: { description?: string; priceTzs?: number; priceNegotiable?: boolean; mileageKm?: number; features?: string[]; contactPhone?: string; contactWhatsapp?: string; status?: "ACTIVE" | "SOLD" | "ARCHIVED"; renew?: boolean }) {
  const l = await prisma.listing.findUnique({ where: { id } });
  if (!l) throw new ListingError("Not found", 404);
  const staff = user.roles.includes("ADMIN") || user.roles.includes("MODERATOR");
  if (l.sellerId !== user.id && !staff) throw new ListingError("Forbidden", 403);
  if (patch.status === "ACTIVE" && !["SOLD", "ARCHIVED", "EXPIRED", "ACTIVE"].includes(l.status)) throw new ListingError("Listing must be approved first", 409);
  if (patch.status === "ACTIVE" && l.status === "ARCHIVED" && l.rejectionReason === "Removed: fraud") throw new ListingError("This listing was removed by our safety team", 403);
  if (patch.renew) {
    if (!["ACTIVE", "EXPIRED"].includes(l.status)) throw new ListingError("Only live or expired listings can be renewed", 409);
    if (l.status === "EXPIRED") patch = { ...patch, status: "ACTIVE" };
  }
  const now = new Date();
  const renewTo = patch.renew || (patch.status === "ACTIVE" && l.status === "EXPIRED") ? new Date(now.getTime() + SITE.listingLifetimeDays * 86400_000) : undefined;
  const updated = await prisma.listing.update({
    where: { id },
    data: {
      description: patch.description,
      priceTzs: patch.priceTzs !== undefined ? BigInt(patch.priceTzs) : undefined,
      priceNegotiable: patch.priceNegotiable,
      mileageKm: patch.mileageKm,
      features: patch.features,
      contactPhone: patch.contactPhone,
      contactWhatsapp: patch.contactWhatsapp,
      status: patch.status,
      soldAt: patch.status === "SOLD" ? now : undefined,
      expiresAt: renewTo,
      expiryNotifiedAt: renewTo ? null : undefined,
    },
    select: { id: true, slug: true, status: true },
  });

  if (staff && l.sellerId !== user.id) return updated;
  const contentChanged = patch.description !== undefined || patch.priceTzs !== undefined || patch.contactPhone !== undefined || patch.contactWhatsapp !== undefined || patch.status === "ACTIVE";
  if (!contentChanged) return updated;
  const oldPrice = Number(l.priceTzs);
  const priceDropPct = patch.priceTzs !== undefined && oldPrice > 0 ? Math.max(0, ((oldPrice - patch.priceTzs) / oldPrice) * 100) : 0;
  const risk = await scoreListing(id, {
    edit: {
      priceDropPct,
      contactChanged: (patch.contactPhone !== undefined && patch.contactPhone !== l.contactPhone) || (patch.contactWhatsapp !== undefined && patch.contactWhatsapp !== l.contactWhatsapp),
    },
  });
  if (updated.status === "ACTIVE" && (risk.level !== "LOW" || priceDropPct >= PRICE_CUT_HOLD_PCT)) {
    await prisma.listing.update({ where: { id }, data: { status: "PENDING_REVIEW" } });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "listing.edit_hold", entityType: "Listing", entityId: id, meta: { score: risk.score } } });
    return { ...updated, status: "PENDING_REVIEW" as const };
  }
  if (updated.status === "ACTIVE") {
    if (patch.priceTzs !== undefined && patch.priceTzs < oldPrice) void notifyPriceDrops(id);
    if (l.status !== "ACTIVE") void notifySavedSearches(id);
  }
  return updated;
}

export async function deleteListing(user: SessionUser, id: string) {
  const l = await prisma.listing.findUnique({ where: { id }, select: { sellerId: true } });
  if (!l) throw new ListingError("Not found", 404);
  if (l.sellerId !== user.id && !user.roles.includes("ADMIN")) throw new ListingError("Forbidden", 403);
  await prisma.listing.update({ where: { id }, data: { status: "ARCHIVED" } });
}

/* ═════════════════════════════ engagement tracking ═════════════════════════ */

const counterField: Partial<Record<ListingEventType, "viewCount" | "whatsappClicks" | "callClicks" | "leadCount">> = {
  VIEW: "viewCount", WHATSAPP_CLICK: "whatsappClicks", CALL_CLICK: "callClicks", INQUIRY: "leadCount",
};

export async function recordListingEvent(listingId: string, type: ListingEventType, sessionHash?: string) {
  // de-duplicate the same event from the same visitor for 6 hours
  if (sessionHash && !rateLimit(`ev:${listingId}:${type}:${sessionHash}`, 1, 6 * 3600_000)) return false;
  const field = counterField[type];
  await prisma.$transaction([
    prisma.listingEvent.create({ data: { listingId, type, sessionHash } }),
    ...(field ? [prisma.listing.update({ where: { id: listingId }, data: { [field]: { increment: 1 } } })] : []),
    ...(type === "WHATSAPP_CLICK" || type === "CALL_CLICK" ? [prisma.listing.update({ where: { id: listingId }, data: { leadCount: { increment: 1 } } })] : []),
  ]);
  return true;
}

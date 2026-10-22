import "server-only";
import { prisma } from "@/lib/prisma";
import { notify, notifyUser } from "@/lib/notify";
import { formatTzs } from "@/lib/money";
import { formatTzPhone } from "@/lib/phone";
import { absoluteUrl } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";
import { ListingError } from "./errors";

const INSPECTION = "PRE_PURCHASE_INSPECTION" as const;

/** Registered garages / inspection centres that offer pre-purchase inspections, nearest region first. */
export async function inspectionProvidersFor(listing: { regionId: number; businessId: string | null }) {
  const rows = await prisma.business.findMany({
    where: { isActive: true, services: { some: { category: INSPECTION } }, ...(listing.businessId ? { id: { not: listing.businessId } } : {}) },
    select: {
      id: true, name: true, slug: true, regionId: true, ratingAvg: true, ratingCount: true, verification: true, address: true,
      region: { select: { name: true } },
      services: { where: { category: INSPECTION }, select: { title: true, priceFromTzs: true, mobileService: true }, orderBy: { priceFromTzs: "asc" }, take: 1 },
    },
    take: 60,
  });
  return rows
    .map((b) => ({ ...b, sameRegion: b.regionId === listing.regionId, service: b.services[0] }))
    .sort((a, b) => Number(b.sameRegion) - Number(a.sameRegion) || Number(b.service.mobileService) - Number(a.service.mobileService) || b.ratingAvg - a.ratingAvg || Number(a.service.priceFromTzs - b.service.priceFromTzs))
    .slice(0, 12);
}

export async function requestInspection(user: SessionUser, input: { listingId: string; providerId: string; preferredDate?: Date; message?: string }) {
  const [listing, provider, buyer] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: input.listingId },
      select: { id: true, title: true, slug: true, status: true, sellerId: true, businessId: true, regionId: true, locationAddress: true, contactPhone: true, region: { select: { name: true } }, district: { select: { name: true } } },
    }),
    prisma.business.findFirst({
      where: { id: input.providerId, isActive: true, services: { some: { category: INSPECTION } } },
      select: { id: true, name: true, phone: true, email: true, members: { where: { role: "OWNER" }, select: { userId: true } }, services: { where: { category: INSPECTION }, orderBy: { priceFromTzs: "asc" }, take: 1, select: { priceFromTzs: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, phone: true, email: true, isShadowBanned: true } }),
  ]);
  if (!listing || listing.status !== "ACTIVE") throw new ListingError("This car is no longer available", 404);
  if (listing.sellerId === user.id) throw new ListingError("You cannot book an inspection of your own car", 403);
  if (!provider) throw new ListingError("Choose an inspection centre from the list", 422);
  if (!buyer.phone) throw new ListingError("Add a phone number to your account so the garage can call you", 422);
  if (input.preferredDate && input.preferredDate.getTime() < Date.now() - 86400_000) throw new ListingError("Choose a date from today onwards", 422);
  const open = await prisma.inspectionRequest.findFirst({ where: { listingId: listing.id, buyerId: user.id, status: { in: ["REQUESTED", "SCHEDULED"] } } });
  if (open) throw new ListingError("You already have an open inspection request for this car", 409);

  const req = await prisma.inspectionRequest.create({
    data: {
      listingId: listing.id, buyerId: user.id, providerId: provider.id, preferredDate: input.preferredDate, buyerMessage: input.message?.slice(0, 1000),
      feeTzs: provider.services[0]?.priceFromTzs,
    },
  });
  if (buyer.isShadowBanned) return req; // looks sent, goes nowhere

  const where = [listing.locationAddress, listing.district?.name, listing.region.name].filter(Boolean).join(", ");
  const when = input.preferredDate ? input.preferredDate.toLocaleDateString("en-GB") : "any day";
  const carLink = absoluteUrl(`/cars/${listing.slug}`);
  const ownerId = provider.members[0]?.userId;
  const providerMsg = {
    sms: `MagariSOKO Tanzania: Inspection request from ${buyer.name} (${formatTzPhone(buyer.phone)}) for ${listing.title.slice(0, 40)} at ${where.slice(0, 60)}, ${when}. Open your dashboard to confirm.`,
    email: {
      subject: `New inspection request: ${listing.title}`,
      lines: [
        `${buyer.name} (${formatTzPhone(buyer.phone)}) wants a pre-purchase inspection of ${listing.title}.`,
        `Where the car is: ${where}. Preferred date: ${when}.`,
        ...(input.message ? [`Message: "${input.message.slice(0, 500)}"`] : []),
        `Seller's number for arranging access: ${formatTzPhone(listing.contactPhone)}.`,
      ],
      action: { label: "Confirm the inspection", url: absoluteUrl("/dashboard/inspections") },
    },
  };
  if (ownerId) void notifyUser(ownerId, providerMsg);
  else void notify({ phone: provider.phone, email: provider.email }, providerMsg);
  void notifyUser(listing.sellerId, {
    sms: `MagariSOKO Tanzania: A buyer booked ${provider.name.slice(0, 30)} to inspect your ${listing.title.slice(0, 35)}. They will call you to arrange access.`,
    email: { subject: "A buyer booked an inspection of your car", lines: [`${provider.name} will inspect ${listing.title} for a buyer (preferred date: ${when}).`, "They will call you to arrange access. A buyer who pays for an inspection is a serious buyer."] },
  });
  void notifyUser(user.id, {
    email: {
      subject: "Your inspection request was sent",
      lines: [`${provider.name} will call you to confirm the time for inspecting ${listing.title}.`, provider.services[0] ? `Their inspection fee starts from ${formatTzs(provider.services[0].priceFromTzs)}; agree the final price with them.` : "Agree the fee with them before the inspection."],
      action: { label: "View the car", url: carLink },
    },
  });
  return req;
}

const select = {
  id: true, status: true, preferredDate: true, scheduledAt: true, feeTzs: true, reportUrl: true, notes: true, buyerMessage: true, createdAt: true,
  listing: { select: { title: true, slug: true, contactPhone: true, locationAddress: true, region: { select: { name: true } } } },
  buyer: { select: { name: true, phone: true } },
  provider: { select: { name: true, slug: true, phone: true } },
} as const;

export async function inspectionsForUser(userId: string) {
  const shops = await prisma.businessMember.findMany({ where: { userId }, select: { businessId: true } });
  const [asProvider, asBuyer] = await Promise.all([
    shops.length ? prisma.inspectionRequest.findMany({ where: { providerId: { in: shops.map((s) => s.businessId) } }, select, orderBy: { createdAt: "desc" }, take: 200 }) : [],
    prisma.inspectionRequest.findMany({ where: { buyerId: userId }, select, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return { asProvider, asBuyer, isProvider: shops.length > 0 };
}

export type InspectionAction = { action: "schedule"; scheduledAt: Date } | { action: "complete"; report: string } | { action: "cancel"; reason?: string };

/** Garage: schedule / complete / cancel. Buyer: cancel. Everyone involved is told. */
export async function updateInspection(user: SessionUser, id: string, a: InspectionAction) {
  const r = await prisma.inspectionRequest.findUnique({ where: { id }, include: { listing: { select: { title: true, slug: true, sellerId: true } }, provider: { select: { name: true } } } });
  if (!r) throw new ListingError("Not found", 404);
  const isProvider = !!r.providerId && !!(await prisma.businessMember.findFirst({ where: { businessId: r.providerId, userId: user.id } }));
  const isBuyer = r.buyerId === user.id;
  if (!isProvider && !(isBuyer && a.action === "cancel")) throw new ListingError("Forbidden", 403);
  if (r.status === "COMPLETED" || r.status === "CANCELLED") throw new ListingError("This request is already closed", 409);

  const provider = r.provider?.name ?? "The garage";
  if (a.action === "schedule") {
    const updated = await prisma.inspectionRequest.update({ where: { id }, data: { status: "SCHEDULED", scheduledAt: a.scheduledAt } });
    const when = a.scheduledAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    void notifyUser(r.buyerId, { sms: `MagariSOKO Tanzania: ${provider.slice(0, 30)} confirmed the inspection of ${r.listing.title.slice(0, 35)} for ${when}.`, email: { subject: "Inspection confirmed", lines: [`${provider} will inspect ${r.listing.title} on ${when}.`] } });
    void notifyUser(r.listing.sellerId, { sms: `MagariSOKO Tanzania: Inspection of your ${r.listing.title.slice(0, 35)} confirmed for ${when}. Please make the car available.` });
    return updated;
  }
  if (a.action === "complete") {
    const isUrl = /^https?:\/\//i.test(a.report.trim());
    const updated = await prisma.inspectionRequest.update({ where: { id }, data: { status: "COMPLETED", reportUrl: isUrl ? a.report.trim() : null, notes: isUrl ? null : a.report.trim().slice(0, 4000) } });
    void notifyUser(r.buyerId, {
      sms: `MagariSOKO Tanzania: Your inspection report for ${r.listing.title.slice(0, 40)} is ready. See your dashboard.`,
      email: { subject: "Your inspection report is ready", lines: [`${provider} finished inspecting ${r.listing.title}.`, isUrl ? "Open the full report with the button below." : a.report.slice(0, 1500)], action: { label: isUrl ? "Open the report" : "See it in your dashboard", url: isUrl ? a.report.trim() : absoluteUrl("/dashboard/inspections") } },
    });
    return updated;
  }
  const updated = await prisma.inspectionRequest.update({ where: { id }, data: { status: "CANCELLED", notes: a.reason?.slice(0, 500) ?? r.notes } });
  if (isBuyer) {
    const owner = r.providerId ? await prisma.businessMember.findFirst({ where: { businessId: r.providerId, role: "OWNER" }, select: { userId: true } }) : null;
    if (owner) void notifyUser(owner.userId, { sms: `MagariSOKO Tanzania: The buyer cancelled the inspection of ${r.listing.title.slice(0, 40)}.` });
  } else {
    void notifyUser(r.buyerId, { sms: `MagariSOKO Tanzania: ${provider.slice(0, 30)} cancelled the inspection of ${r.listing.title.slice(0, 35)}${a.reason ? `: ${a.reason.slice(0, 60)}` : ""}.` });
  }
  return updated;
}

/** Banks, SACCOs, asset-finance and insurance businesses registered on the platform. */
export async function financeProviders(regionId?: number) {
  const rows = await prisma.business.findMany({
    where: { isActive: true, services: { some: { category: { in: ["FINANCING", "INSURANCE"] } } } },
    select: {
      id: true, name: true, slug: true, phone: true, whatsapp: true, regionId: true, verification: true, ratingAvg: true, ratingCount: true,
      services: { where: { category: { in: ["FINANCING", "INSURANCE"] } }, select: { category: true, title: true, priceFromTzs: true }, take: 3 },
    },
    take: 40,
  });
  return rows
    .sort((a, b) => Number(b.services.some((s) => s.category === "FINANCING")) - Number(a.services.some((s) => s.category === "FINANCING")) || Number(b.regionId === regionId) - Number(a.regionId === regionId) || b.ratingAvg - a.ratingAvg)
    .slice(0, 6);
}

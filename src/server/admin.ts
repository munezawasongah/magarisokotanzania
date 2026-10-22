import "server-only";
import { notifyUser } from "@/lib/notify";
import { absoluteUrl } from "@/lib/utils";
import { notifyPriceDrops, notifySavedSearches } from "./alerts";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { SITE } from "@/config/site";
import { ListingError } from "./listings";
import { clearListingFlags, linkedAccounts } from "./fraud/engine";

function assertStaff(user: SessionUser) {
  if (!user.roles.includes("ADMIN") && !user.roles.includes("MODERATOR")) throw new ListingError("Forbidden", 403);
}

export async function moderateListing(user: SessionUser, listingId: string, decision: "APPROVE" | "REJECT", reason?: string) {
  assertStaff(user);
  const l = await prisma.listing.findUnique({ where: { id: listingId }, include: { seller: { select: { phone: true, isShadowBanned: true, status: true } } } });
  if (!l) throw new ListingError("Not found", 404);
  if (decision === "APPROVE" && (l.seller.isShadowBanned || l.seller.status !== "ACTIVE")) {
    throw new ListingError("The seller is banned or on fraud hold. Lift the ban in the Fraud screen first.", 409);
  }
  if (decision === "APPROVE" && !(l.priceTzs > 0n)) throw new ListingError("A listing cannot be published without a price.", 409);
  const now = new Date();
  const updated = await prisma.listing.update({
    where: { id: listingId },
    data:
      decision === "APPROVE"
        ? { status: "ACTIVE", publishedAt: l.publishedAt ?? now, rejectionReason: null, expiresAt: new Date(now.getTime() + SITE.listingLifetimeDays * 86400_000) }
        : { status: "REJECTED", rejectionReason: reason || "Does not meet listing guidelines" },
  });
  await prisma.auditLog.create({ data: { actorId: user.id, action: `listing.${decision.toLowerCase()}`, entityType: "Listing", entityId: listingId, meta: { reason } } });
  if (decision === "APPROVE") await clearListingFlags(user.id, listingId);
  void notifyUser(l.sellerId, decision === "APPROVE"
    ? {
        sms: `MagariSOKO Tanzania: Your listing "${l.title.slice(0, 50)}" is now live. Tangazo lako liko hewani!`,
        email: { subject: "Your listing is live", lines: [`"${l.title}" has been approved and is now visible to buyers across Tanzania.`, `It stays live for ${SITE.listingLifetimeDays} days. We will remind you before it expires.`], action: { label: "View your listing", url: absoluteUrl(`/cars/${l.slug}`) } },
      }
    : {
        sms: `MagariSOKO Tanzania: Your listing "${l.title.slice(0, 50)}" was not approved: ${reason ?? "see dashboard"}.`,
        email: { subject: "Your listing was not approved", lines: [`"${l.title}" was not approved.`, `Reason: ${reason ?? "it does not meet our listing guidelines"}.`, "You can correct it and submit again from your dashboard."], action: { label: "Open my listings", url: absoluteUrl("/dashboard/listings") } },
      });
  if (decision === "APPROVE") {
    void notifySavedSearches(listingId);
    void notifyPriceDrops(listingId);
  }
  return updated;
}

export async function verifyBusiness(user: SessionUser, businessId: string, decision: "VERIFIED" | "REJECTED", note?: string) {
  assertStaff(user);
  const b = await prisma.business.update({
    where: { id: businessId },
    data: { verification: decision, verifiedAt: decision === "VERIFIED" ? new Date() : null, verificationNote: note },
  });
  await prisma.auditLog.create({ data: { actorId: user.id, action: `business.${decision.toLowerCase()}`, entityType: "Business", entityId: businessId, meta: { note } } });
  return b;
}

export async function getModerationQueue() {
  return prisma.listing.findMany({
    // shadow-banned sellers' listings are handled only in the Fraud screen
    where: { status: "PENDING_REVIEW", seller: { isShadowBanned: false, status: "ACTIVE" } },
    include: {
      make: true, model: true, region: true,
      images: { orderBy: { sortOrder: "asc" }, take: 4 },
      seller: { select: { name: true, phone: true, createdAt: true, walletVerifiedAt: true, _count: { select: { listings: true } } } },
      business: { select: { name: true, verification: true } },
      _count: { select: { reports: true } },
    },
    orderBy: [{ riskScore: "desc" }, { createdAt: "asc" }],
    take: 100,
  });
}

export async function getAdminStats() {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [users, active, pending, businesses, pendingBiz, revenue, reports] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.business.count(),
    prisma.business.count({ where: { verification: "PENDING" } }),
    prisma.payment.aggregate({ where: { status: "SUCCESS", paidAt: { gte: since } }, _sum: { amountTzs: true }, _count: true }),
    prisma.listingReport.count({ where: { resolved: false } }),
  ]);
  const byPurpose = await prisma.payment.groupBy({ by: ["purpose"], where: { status: "SUCCESS", paidAt: { gte: since } }, _sum: { amountTzs: true } });
  return {
    users, active, pending, businesses, pendingBiz, reports,
    revenue30: Number(revenue._sum.amountTzs ?? 0n), payments30: revenue._count,
    revenueByPurpose: byPurpose.map((r) => ({ purpose: r.purpose, tzs: Number(r._sum.amountTzs ?? 0n) })),
  };
}

/* ═════════════════════════════ fraud screen ════════════════════════════════ */

/** Listings that need a fraud decision: MEDIUM/HIGH risk that are held, or live and never reviewed. */
export async function getFraudQueue() {
  const listings = await prisma.listing.findMany({
    where: {
      riskLevel: { in: ["MEDIUM", "HIGH"] },
      status: { notIn: ["ARCHIVED", "REJECTED"] },
      OR: [{ status: "PENDING_REVIEW" }, { fraudReviewedAt: null }],
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 3, select: { url: true } },
      seller: { select: { id: true, name: true, phone: true, email: true, createdAt: true, walletVerifiedAt: true, isShadowBanned: true, status: true, riskScore: true, _count: { select: { listings: true, devices: true } } } },
      business: { select: { name: true, verification: true } },
      _count: { select: { reports: true } },
    },
    orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  const sellers = [...new Set(listings.map((l) => l.seller.id))];
  const links = Object.fromEntries(await Promise.all(sellers.map(async (id) => [id, await linkedAccounts(id)] as const)));
  return { listings, links };
}

export async function getHeldInquiries() {
  return prisma.inquiry.findMany({
    where: { OR: [{ isHeld: true }, { riskScore: { gte: 30 } }] },
    include: { listing: { select: { title: true, slug: true } }, part: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getBannedUsers() {
  return prisma.user.findMany({
    where: { OR: [{ status: "SUSPENDED" }, { isShadowBanned: true }] },
    select: { id: true, name: true, phone: true, email: true, status: true, isShadowBanned: true, bannedAt: true, banReason: true, _count: { select: { listings: true } } },
    orderBy: { bannedAt: "desc" },
    take: 200,
  });
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { absoluteUrl } from "@/lib/utils";
import { CONTACT_PATTERNS } from "@/config/fraud";
import type { SessionUser } from "@/lib/session";
import { ListingError } from "./errors";

export type ReviewEligibility = { ok: true } | { ok: false; reason: "login" | "own" | "no_contact" | "blocked" };

/**
 * A buyer may review a seller only after contacting them through the platform:
 * an inquiry about the shop / one of its cars / parts, or an inspection booked with it.
 * Owners and staff of the business can never review it.
 */
export async function reviewEligibility(userId: string | null | undefined, businessId: string): Promise<ReviewEligibility> {
  if (!userId) return { ok: false, reason: "login" };
  const [member, user] = await Promise.all([
    prisma.businessMember.findFirst({ where: { businessId, userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { status: true } }),
  ]);
  if (member) return { ok: false, reason: "own" };
  if (!user || user.status !== "ACTIVE") return { ok: false, reason: "blocked" };
  const [inquiry, inspection] = await Promise.all([
    prisma.inquiry.findFirst({
      where: { buyerId: userId, isHeld: false, OR: [{ businessId }, { listing: { businessId } }, { part: { businessId } }] },
      select: { id: true },
    }),
    prisma.inspectionRequest.findFirst({ where: { buyerId: userId, providerId: businessId }, select: { id: true } }),
  ]);
  return inquiry || inspection ? { ok: true } : { ok: false, reason: "no_contact" };
}

async function recompute(businessId: string) {
  const agg = await prisma.review.aggregate({ where: { businessId, status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } });
  await prisma.business.update({
    where: { id: businessId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all },
  });
}

/** Phone numbers, links and account numbers are removed from reviews (no advertising or contact-swapping). */
function clean(body: string) {
  let out = body.trim().replace(/\s+\n/g, "\n");
  for (const p of CONTACT_PATTERNS) out = out.replace(new RegExp(p.re.source, p.re.flags.includes("g") ? p.re.flags : p.re.flags + "g"), "[removed]");
  return out.slice(0, 2000);
}

export async function upsertReview(user: SessionUser, input: { businessId: string; rating: number; body: string }) {
  const elig = await reviewEligibility(user.id, input.businessId);
  if (!elig.ok) {
    throw new ListingError(
      elig.reason === "own" ? "You cannot review your own business." : elig.reason === "no_contact" ? "Only buyers who contacted this seller through MagariSOKO Tanzania can review them." : "You cannot post reviews.",
      403,
    );
  }
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { isShadowBanned: true } });
  const existing = await prisma.review.findUnique({ where: { businessId_authorId: { businessId: input.businessId, authorId: user.id } } });
  const body = clean(input.body);
  // Shadow-banned accounts see their review as posted, but nobody else does.
  const status = dbUser.isShadowBanned ? "HIDDEN" : existing?.status === "HIDDEN" ? "HIDDEN" : "PUBLISHED";
  const review = existing
    ? await prisma.review.update({ where: { id: existing.id }, data: { rating: input.rating, body } })
    : await prisma.review.create({ data: { businessId: input.businessId, authorId: user.id, rating: input.rating, body, status } });
  await recompute(input.businessId);
  if (!existing && status === "PUBLISHED") {
    const [owner, biz] = await Promise.all([
      prisma.businessMember.findFirst({ where: { businessId: input.businessId, role: "OWNER" }, select: { userId: true } }),
      prisma.business.findUnique({ where: { id: input.businessId }, select: { slug: true, name: true } }),
    ]);
    if (owner && biz) {
      void notifyUser(owner.userId, {
        sms: `MagariSOKO Tanzania: New ${input.rating}-star review for ${biz.name.slice(0, 40)}. Reply from your mini-site.`,
        email: { subject: `New ${input.rating}-star review`, lines: [`A buyer rated ${biz.name} ${input.rating} out of 5:`, `"${body.slice(0, 500)}"`, "You can reply publicly on your mini-site."], action: { label: "See the review", url: absoluteUrl(`/shop/${biz.slug}#reviews`) } },
      });
    }
  }
  return review;
}

/** Public reply by the business owner / manager. */
export async function replyToReview(user: SessionUser, reviewId: string, reply: string) {
  const r = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!r) throw new ListingError("Not found", 404);
  const member = await prisma.businessMember.findFirst({ where: { businessId: r.businessId, userId: user.id, role: { in: ["OWNER", "MANAGER"] } } });
  if (!member) throw new ListingError("Only the business owner can reply", 403);
  const text = clean(reply);
  const updated = await prisma.review.update({ where: { id: reviewId }, data: { sellerReply: text || null, sellerReplyAt: text ? new Date() : null } });
  if (text) {
    const biz = await prisma.business.findUnique({ where: { id: r.businessId }, select: { slug: true, name: true } });
    if (biz) void notifyUser(r.authorId, { email: { subject: `${biz.name} replied to your review`, lines: [`"${text.slice(0, 500)}"`], action: { label: "See the reply", url: absoluteUrl(`/shop/${biz.slug}#reviews`) } } });
  }
  return updated;
}

/** Moderators hide abusive / fake reviews (and can restore them). */
export async function moderateReview(user: SessionUser, reviewId: string, status: "PUBLISHED" | "HIDDEN", reason?: string) {
  if (!user.roles.includes("ADMIN") && !user.roles.includes("MODERATOR")) throw new ListingError("Forbidden", 403);
  const r = await prisma.review.update({ where: { id: reviewId }, data: { status, hiddenReason: status === "HIDDEN" ? reason ?? "Breaks review rules" : null } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: `review.${status.toLowerCase()}`, entityType: "Review", entityId: reviewId, meta: { reason } } });
  await recompute(r.businessId);
  return r;
}

/** "Juma M." — first name and initial only, for privacy. */
export function displayName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0].toUpperCase()}.` : first;
}

export async function getBusinessReviews(businessId: string, viewerId?: string | null) {
  const rows = await prisma.review.findMany({
    where: { businessId, OR: [{ status: "PUBLISHED" }, ...(viewerId ? [{ authorId: viewerId }] : [])] },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: rows.filter((r) => r.status === "PUBLISHED" && r.rating === star).length }));
  return { rows: rows.map((r) => ({ ...r, authorName: displayName(r.author.name) })), dist };
}

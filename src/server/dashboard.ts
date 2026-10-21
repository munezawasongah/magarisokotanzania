import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { listingCardSelect } from "./listings";

/** Businesses the user belongs to (for "list as" selectors and dashboards). */
export async function getUserBusinesses(userId: string) {
  return prisma.business.findMany({
    where: { members: { some: { userId } }, isActive: true },
    select: {
      id: true, name: true, slug: true, type: true, verification: true,
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING"] }, currentPeriodEnd: { gt: new Date() } },
        include: { plan: true }, take: 1, orderBy: { currentPeriodEnd: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Scope = everything the user sells personally + all businesses they belong to. */
async function ownedListingWhere(userId: string): Promise<Prisma.ListingWhereInput> {
  const biz = await prisma.businessMember.findMany({ where: { userId }, select: { businessId: true } });
  return { OR: [{ sellerId: userId }, { businessId: { in: biz.map((b) => b.businessId) } }] };
}

export async function getSellerOverview(userId: string) {
  const where = await ownedListingWhere(userId);
  const since = new Date(Date.now() - 30 * 86400_000);
  const ids = (await prisma.listing.findMany({ where, select: { id: true } })).map((l) => l.id);

  const [byStatus, eventTotals, daily, newLeads, top] = await Promise.all([
    prisma.listing.groupBy({ by: ["status"], where, _count: { _all: true } }),
    ids.length
      ? prisma.listingEvent.groupBy({ by: ["type"], where: { listingId: { in: ids }, createdAt: { gte: since } }, _count: { _all: true } })
      : Promise.resolve([] as Array<{ type: string; _count: { _all: number } }>),
    ids.length
      ? prisma.$queryRaw<Array<{ day: Date; views: bigint; leads: bigint }>>`
          SELECT date_trunc('day', "createdAt") AS day,
                 COUNT(*) FILTER (WHERE type = 'VIEW') AS views,
                 COUNT(*) FILTER (WHERE type IN ('WHATSAPP_CLICK','CALL_CLICK','INQUIRY')) AS leads
          FROM "ListingEvent"
          WHERE "listingId" IN (${Prisma.join(ids)}) AND "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 1`
      : Promise.resolve([]),
    prisma.inquiry.count({ where: { recipientId: userId, status: "NEW" } }),
    prisma.listing.findMany({ where: { ...where, status: "ACTIVE" }, select: listingCardSelect, orderBy: { viewCount: "desc" }, take: 5 }),
  ]);

  const ev = Object.fromEntries(eventTotals.map((e) => [e.type, e._count._all])) as Record<string, number>;
  const st = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;

  // fill missing days so the chart has a continuous 30-day axis
  const map = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000).toISOString().slice(0, 10);
    const row = map.get(d);
    return { day: d, views: Number(row?.views ?? 0), leads: Number(row?.leads ?? 0) };
  });

  return {
    statusCounts: st,
    views30: ev.VIEW ?? 0,
    whatsapp30: ev.WHATSAPP_CLICK ?? 0,
    calls30: ev.CALL_CLICK ?? 0,
    inquiries30: ev.INQUIRY ?? 0,
    leads30: (ev.WHATSAPP_CLICK ?? 0) + (ev.CALL_CLICK ?? 0) + (ev.INQUIRY ?? 0),
    newLeads,
    series,
    top,
  };
}

export async function getSellerInventory(userId: string) {
  const where = await ownedListingWhere(userId);
  return prisma.listing.findMany({
    where: { ...where, status: { not: "ARCHIVED" } },
    select: { ...listingCardSelect, rejectionReason: true, whatsappClicks: true, callClicks: true, expiresAt: true, sponsoredUntil: true },
    orderBy: { createdAt: "desc" },
  });
}

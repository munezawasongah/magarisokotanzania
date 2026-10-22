import "server-only";
import { prisma } from "@/lib/prisma";
import { notify, notifyUser } from "@/lib/notify";
import { formatTzs } from "@/lib/money";
import { absoluteUrl } from "@/lib/utils";
import { listingFilterSchema, parseSearchParams } from "@/lib/validation";
import { buildListingWhere, toPrefixTsQuery } from "./listings";
import { ListingError } from "./errors";
import type { SessionUser } from "@/lib/session";

/* ═════════════════════════════ saved searches ═════════════════════════════ */

/** Max alerts per saved search per day, so a busy search never floods anyone's phone. */
const ALERT_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const MAX_SAVED_SEARCHES = 20;

/** Only real filter keys are kept; page / sort / perPage are dropped. */
export function normaliseSearchQuery(query: string): string {
  const sp = new URLSearchParams(query.replace(/^\?/, ""));
  const f = parseSearchParams(listingFilterSchema, sp);
  const keep = new URLSearchParams();
  for (const [k, v] of sp.entries()) {
    if (["page", "perPage", "sort"].includes(k) || !v) continue;
    if (k in f) keep.set(k, v);
  }
  keep.sort();
  return keep.toString();
}

export async function saveSearch(user: SessionUser, input: { name: string; query: string; alerts: boolean }) {
  const query = normaliseSearchQuery(input.query);
  if (!query) throw new ListingError("Choose at least one filter (for example a make, price or region) before saving a search.");
  const existing = await prisma.savedSearch.findFirst({ where: { userId: user.id, query } });
  if (existing) return prisma.savedSearch.update({ where: { id: existing.id }, data: { name: input.name, alertSms: input.alerts } });
  if ((await prisma.savedSearch.count({ where: { userId: user.id } })) >= MAX_SAVED_SEARCHES) {
    throw new ListingError(`You can keep up to ${MAX_SAVED_SEARCHES} saved searches. Delete one first.`);
  }
  return prisma.savedSearch.create({ data: { userId: user.id, name: input.name.slice(0, 80), query, alertSms: input.alerts } });
}

export async function updateSavedSearch(user: SessionUser, id: string, data: { alerts?: boolean; name?: string }) {
  const s = await prisma.savedSearch.findUnique({ where: { id } });
  if (!s || s.userId !== user.id) throw new ListingError("Not found", 404);
  return prisma.savedSearch.update({ where: { id }, data: { alertSms: data.alerts, name: data.name?.slice(0, 80) } });
}

export async function deleteSavedSearch(user: SessionUser, id: string) {
  const s = await prisma.savedSearch.findUnique({ where: { id } });
  if (!s || s.userId !== user.id) throw new ListingError("Not found", 404);
  await prisma.savedSearch.delete({ where: { id } });
}

/** Called whenever a car goes live: alert everyone whose saved search it matches. */
export async function notifySavedSearches(listingId: string) {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true, title: true, slug: true, priceTzs: true, sellerId: true, region: { select: { name: true } } },
    });
    if (!listing || listing.status !== "ACTIVE") return 0;
    const searches = await prisma.savedSearch.findMany({
      where: { alertSms: true, userId: { not: listing.sellerId }, user: { status: "ACTIVE", isShadowBanned: false } },
      select: { id: true, userId: true, name: true, query: true, lastAlertAt: true },
    });
    let sent = 0;
    for (const s of searches) {
      if (s.lastAlertAt && Date.now() - s.lastAlertAt.getTime() < ALERT_COOLDOWN_MS) continue;
      const f = parseSearchParams(listingFilterSchema, new URLSearchParams(s.query));
      const where = buildListingWhere(f);
      (where.AND as object[]).push({ id: listing.id });
      if ((await prisma.listing.count({ where })) === 0) continue;
      if (f.q) {
        // keyword searches use the same full-text index as the search page
        const tsq = toPrefixTsQuery(f.q);
        if (!tsq) continue;
        const hit = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok FROM "Listing" WHERE id = ${listing.id} AND search @@ to_tsquery('simple', ${tsq})`;
        if (!hit.length) continue;
      }
      // atomic claim: if two triggers run at once, only one of them sends the alert
      const claimed = await prisma.savedSearch.updateMany({
        where: { id: s.id, OR: [{ lastAlertAt: null }, { lastAlertAt: { lt: new Date(Date.now() - ALERT_COOLDOWN_MS) } }] },
        data: { lastAlertAt: new Date() },
      });
      if (claimed.count === 0) continue;
      const link = absoluteUrl(`/cars/${listing.slug}`);
      void notifyUser(s.userId, {
        sms: `MagariSOKO Tanzania: New match for "${s.name.slice(0, 40)}": ${listing.title.slice(0, 50)}, ${formatTzs(listing.priceTzs)}, ${listing.region.name}. ${link}`,
        email: {
          subject: `New car for your search "${s.name}"`,
          lines: [`${listing.title} — ${formatTzs(listing.priceTzs)} — ${listing.region.name}.`, "It was just published and matches your saved search."],
          action: { label: "View the car", url: link },
        },
      });
      sent++;
    }
    return sent;
  } catch (e) {
    console.error("[alerts] saved searches:", e);
    return 0;
  }
}

/* ═════════════════════════════ price drops ════════════════════════════════ */

/** Minimum cut that triggers an alert: 2% or TSh 200,000, whichever is smaller. */
const meaningfulDrop = (from: bigint, to: bigint) => to < from && ((from - to) * 100n >= from * 2n || from - to >= 200_000n);

/** Tell buyers who saved this car that its price went down. Call after a price edit or re-approval. */
export async function notifyPriceDrops(listingId: string) {
  try {
    const l = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true, title: true, slug: true, priceTzs: true, sellerId: true } });
    if (!l || l.status !== "ACTIVE") return 0;
    const favs = await prisma.favorite.findMany({ where: { listingId: l.id, alertPriceTzs: { gt: l.priceTzs }, userId: { not: l.sellerId } }, select: { id: true, userId: true, alertPriceTzs: true } });
    let sent = 0;
    for (const f of favs) {
      if (!f.alertPriceTzs || !meaningfulDrop(f.alertPriceTzs, l.priceTzs)) continue;
      // compare-and-set so concurrent triggers can't alert twice for the same drop
      const claimed = await prisma.favorite.updateMany({ where: { id: f.id, alertPriceTzs: f.alertPriceTzs }, data: { alertPriceTzs: l.priceTzs } });
      if (claimed.count === 0) continue;
      const link = absoluteUrl(`/cars/${l.slug}`);
      void notifyUser(f.userId, {
        sms: `MagariSOKO Tanzania: Price drop! ${l.title.slice(0, 50)} is now ${formatTzs(l.priceTzs)} (was ${formatTzs(f.alertPriceTzs)}). ${link}`,
        email: {
          subject: `Price drop: ${l.title}`,
          lines: [`A car you saved is now cheaper: ${formatTzs(l.priceTzs)} (was ${formatTzs(f.alertPriceTzs)}).`],
          action: { label: "View the car", url: link },
        },
      });
      sent++;
    }
    return sent;
  } catch (e) {
    console.error("[alerts] price drops:", e);
    return 0;
  }
}

/* ═════════════════════════════ expiry reminders ═══════════════════════════ */

export const EXPIRY_NOTICE_DAYS = 3;

/** SMS/email sellers whose live listings expire within 3 days (once per listing period). */
export async function sendExpiryWarnings() {
  const soon = new Date(Date.now() + EXPIRY_NOTICE_DAYS * 86400_000);
  const due = await prisma.listing.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: soon, gt: new Date() }, expiryNotifiedAt: null },
    select: { id: true, title: true, expiresAt: true, seller: { select: { phone: true, email: true, status: true } } },
    take: 500,
  });
  for (const l of due) {
    const claimed = await prisma.listing.updateMany({ where: { id: l.id, expiryNotifiedAt: null }, data: { expiryNotifiedAt: new Date() } });
    if (claimed.count === 0 || l.seller.status !== "ACTIVE") continue;
    const days = Math.max(1, Math.ceil(((l.expiresAt?.getTime() ?? Date.now()) - Date.now()) / 86400_000));
    const link = absoluteUrl(`/dashboard/listings?renew=${l.id}`);
    void notify(l.seller, {
      sms: `MagariSOKO Tanzania: "${l.title.slice(0, 45)}" expires in ${days} day${days > 1 ? "s" : ""}. Renew free for 60 more days: ${link}`,
      email: {
        subject: `Your listing expires in ${days} day${days > 1 ? "s" : ""}`,
        lines: [`"${l.title}" will stop showing to buyers on ${l.expiresAt?.toLocaleDateString("en-GB")}.`, "Renewing is free and keeps it live for another 60 days. If the car is sold, mark it as sold instead."],
        action: { label: "Renew my listing", url: link },
      },
    });
  }
  return due.length;
}

/** "Toyota Harrier · up to TSh 50M · Dar es Salaam" — a readable name for a saved search. */
export async function describeSearch(query: string): Promise<string> {
  const { getMakesWithModels, getRegionsWithDistricts } = await import("./taxonomy");
  const f = parseSearchParams(listingFilterSchema, new URLSearchParams(query));
  const [makes, regions] = await Promise.all([getMakesWithModels(), getRegionsWithDistricts()]);
  const make = makes.find((m) => m.slug === f.make);
  const model = make?.models.find((m) => m.slug === f.model);
  const region = regions.find((r) => r.slug === f.region);
  const m = (n: number) => (n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}M` : n.toLocaleString("en-US"));
  const parts = [
    [make?.name, model?.name].filter(Boolean).join(" ") || (f.q ? `"${f.q}"` : "Cars"),
    f.condition?.length ? f.condition.map((c) => ({ NEW: "brand new", FOREIGN_USED: "foreign used", LOCALLY_USED: "locally used" })[c]).join("/") : null,
    f.yearMin || f.yearMax ? `${f.yearMin ?? ""}–${f.yearMax ?? ""}` : null,
    f.priceMax ? `up to TSh ${m(f.priceMax)}` : f.priceMin ? `from TSh ${m(f.priceMin)}` : null,
    f.mileageMax ? `≤ ${m(f.mileageMax)} km` : null,
    f.fuel?.length ? f.fuel.join("/").toLowerCase() : null,
    f.transmission?.length ? f.transmission.join("/").toLowerCase() : null,
    region?.name ?? null,
  ].filter(Boolean);
  return parts.join(" · ").slice(0, 80);
}

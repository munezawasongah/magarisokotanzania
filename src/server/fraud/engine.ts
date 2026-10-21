import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { BlockType, RiskLevel } from "@/generated/prisma/enums";
import {
  AUTO_HOLD_REPORTERS, CHASSIS_PATTERNS, CONTACT_PATTERNS, INQUIRY_SCAM_PHRASES, PHOTO_MAX_HAMMING, POINTS,
  PRICE_MIN_SAMPLES, RISK_THRESHOLDS, SCAM_PHRASES, TRUSTED_SELLER,
} from "@/config/fraud";
import { hamming, hashImageUrl } from "./image-hash";

export type Signal = { code: string; points: number; label: string; detail?: Record<string, unknown> };
export type RiskResult = { score: number; level: RiskLevel; signals: Signal[]; blocked: boolean };

export function levelFor(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.HIGH) return "HIGH";
  if (score >= RISK_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

/** Display form: upper-case, single hyphen between frame code and serial ("zsu60 1234567" → "ZSU60-1234567"). */
export const normalizeChassis = (c: string | null | undefined) => {
  const v = (c ?? "").toUpperCase().trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  return v || null;
};
/** Comparison key: letters and digits only, so "ZSU60-1234567" = "zsu60 1234567" = "ZSU601234567". */
export const chassisKey = (c: string | null | undefined) => {
  const v = (c ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v || null;
};

function finish(signals: Signal[]): RiskResult {
  const score = Math.max(0, signals.reduce((a, s) => a + s.points, 0));
  const blocked = signals.some((s) => (s.code.startsWith("BLOCKLIST_") && s.code !== "BLOCKLIST_KEYWORD") || s.code === "SELLER_SHADOW_BANNED");
  return { score, level: blocked ? "HIGH" : levelFor(score), signals, blocked };
}

/* ═════════════════════════════ blocklist ═══════════════════════════════════ */

async function blockedValues(type: BlockType, values: Array<string | null | undefined>): Promise<string[]> {
  const list = [...new Set(values.filter((v): v is string => !!v))];
  if (!list.length) return [];
  const rows = await prisma.blocklist.findMany({
    where: { type, value: { in: list }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { value: true },
  });
  return rows.map((r) => r.value);
}

export async function isBlocked(type: BlockType, value: string | null | undefined) {
  return (await blockedValues(type, [value])).length > 0;
}

async function keywordHits(text: string): Promise<string[]> {
  const rows = await prisma.blocklist.findMany({
    where: { type: "KEYWORD", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { value: true },
  });
  const t = text.toLowerCase();
  return rows.map((r) => r.value).filter((k) => k && t.includes(k.toLowerCase()));
}

async function blockedImageHashes(hashes: bigint[]): Promise<bigint[]> {
  if (!hashes.length) return [];
  const rows = await prisma.blocklist.findMany({ where: { type: "IMAGE_HASH" }, select: { value: true } });
  const banned = rows.map((r) => { try { return BigInt(r.value); } catch { return null; } }).filter((x): x is bigint => x !== null);
  return hashes.filter((h) => banned.some((b) => hamming(h, b) <= PHOTO_MAX_HAMMING));
}

/* ═════════════════════════════ text scanning ═══════════════════════════════ */

export function scanScamWording(text: string, isImport: boolean): Signal[] {
  const hits: Array<{ label: string; weight: number }> = [];
  for (const p of SCAM_PHRASES) {
    if (p.re.test(text)) {
      const w = isImport && p.importWeight !== undefined ? p.importWeight : p.weight;
      if (w > 0 && !hits.some((h) => h.label === p.label)) hits.push({ label: p.label, weight: w });
    }
  }
  const out: Signal[] = [];
  if (hits.length) {
    out.push({
      code: "SCAM_WORDING",
      points: Math.min(POINTS.SCAM_WORDING_CAP, hits.reduce((a, h) => a + h.weight, 0)),
      label: `Scam wording: ${hits.map((h) => h.label).join(", ")}`,
      detail: { phrases: hits.map((h) => h.label) },
    });
  }
  const contacts = CONTACT_PATTERNS.filter((c) => {
    const m = text.match(new RegExp(c.re.source, c.re.flags.includes("g") ? c.re.flags : c.re.flags + "g"));
    if (!m) return false;
    if (c.label.startsWith("phone/account")) return !CONTACT_PATTERNS[0].re.test(text) && m.some((x) => x.replace(/\D/g, "").length >= 10);
    return true;
  });
  if (contacts.length) {
    out.push({ code: "CONTACT_IN_TEXT", points: POINTS.CONTACT_IN_TEXT, label: `Off-platform contact: ${[...new Set(contacts.map((c) => c.label))].join(", ")}` });
  }
  return out;
}

/* ═════════════════════════════ market price ════════════════════════════════ */

export async function marketMedian(l: { id: string; modelId: number; year: number; isImportOnOrder: boolean }) {
  const q = async (span: number) =>
    prisma.$queryRaw<Array<{ median: number | null; n: number }>>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceTzs")::float8 AS median, count(*)::int AS n
      FROM "Listing"
      WHERE "modelId" = ${l.modelId} AND "year" BETWEEN ${l.year - span} AND ${l.year + span}
        AND status IN ('ACTIVE', 'SOLD') AND id <> ${l.id} AND "riskLevel" <> 'HIGH'
        AND "isImportOnOrder" = ${l.isImportOnOrder}`;
  const [near] = await q(1);
  if (near && near.n >= PRICE_MIN_SAMPLES && near.median) return { median: near.median, n: near.n, span: 1 };
  const [wide] = await q(3);
  if (wide && wide.n >= PRICE_MIN_SAMPLES + 2 && wide.median) return { median: wide.median, n: wide.n, span: 3 };
  return null;
}

/* ═════════════════════════════ seller trust ════════════════════════════════ */

export async function isTrustedSeller(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, walletVerifiedAt: true, isShadowBanned: true, status: true } });
  if (!u || u.isShadowBanned || u.status !== "ACTIVE" || !u.walletVerifiedAt) return false;
  if (Date.now() - u.createdAt.getTime() < TRUSTED_SELLER.minAccountDays * 86400_000) return false;
  const [approved, openFlags] = await Promise.all([
    prisma.listing.count({ where: { sellerId: userId, publishedAt: { not: null }, riskLevel: { not: "HIGH" } } }),
    prisma.fraudFlag.count({ where: { userId, resolved: false, points: { gt: 0 } } }),
  ]);
  return approved >= TRUSTED_SELLER.minApprovedListings && openFlags === 0;
}

/* ═════════════════════════════ listing scoring ═════════════════════════════ */

export type EditContext = { priceDropPct?: number; contactChanged?: boolean };

/** Hash any listing photos that don't have a hash yet (stored on ListingImage.phash). */
export async function hashListingImages(listingId: string) {
  const imgs = await prisma.listingImage.findMany({ where: { listingId, phash: null }, select: { id: true, url: true } });
  await Promise.all(
    imgs.map(async (img) => {
      const h = await hashImageUrl(img.url);
      if (h !== null) await prisma.listingImage.update({ where: { id: img.id }, data: { phash: h } });
    }),
  );
}

/**
 * Scores a listing against every signal, stores the score, level and reasons
 * on the listing, and replaces its open FraudFlags. Does not change status —
 * callers decide whether to hold or publish.
 */
export async function scoreListing(listingId: string, opts: { edit?: EditContext } = {}): Promise<RiskResult> {
  const l = await prisma.listing.findUniqueOrThrow({
    where: { id: listingId },
    include: {
      images: { select: { phash: true } },
      seller: { select: { id: true, phone: true, whatsapp: true, email: true, walletMsisdn: true, walletVerifiedAt: true, createdAt: true, isShadowBanned: true, status: true } },
      business: { select: { id: true, verification: true, phone: true, whatsapp: true } },
    },
  });
  const signals: Signal[] = [];
  const s = l.seller;
  const price = Number(l.priceTzs);
  const phones = [l.contactPhone, l.contactWhatsapp, s.phone, s.whatsapp, s.walletMsisdn];
  const chassis = normalizeChassis(l.chassisNumber);
  const cKey = chassisKey(l.chassisNumber);
  const hashes = l.images.map((i) => i.phash).filter((h): h is bigint => h !== null);

  // ── blocklist & bans ──
  if (s.isShadowBanned || s.status !== "ACTIVE") signals.push({ code: "SELLER_SHADOW_BANNED", points: POINTS.SELLER_SHADOW_BANNED, label: "Seller account is banned or under fraud hold" });
  const [bPhones, bEmail, bChassis, bImages, bWords, devices] = await Promise.all([
    blockedValues("PHONE", phones),
    blockedValues("EMAIL", [s.email?.toLowerCase()]),
    blockedValues("CHASSIS", [cKey]),
    blockedImageHashes(hashes),
    keywordHits(`${l.title}\n${l.description}`),
    prisma.userDevice.findMany({ where: { userId: s.id }, select: { deviceHash: true } }),
  ]);
  const bDevices = await blockedValues("DEVICE", devices.map((d) => d.deviceHash));
  if (bPhones.length) signals.push({ code: "BLOCKLIST_PHONE", points: POINTS.BLOCKLIST_IDENTITY, label: `Banned phone number: ${bPhones.join(", ")}` });
  if (bEmail.length) signals.push({ code: "BLOCKLIST_EMAIL", points: POINTS.BLOCKLIST_IDENTITY, label: "Banned email address" });
  if (bChassis.length) signals.push({ code: "BLOCKLIST_CHASSIS", points: POINTS.BLOCKLIST_IDENTITY, label: `Banned chassis number ${chassis}` });
  if (bImages.length) signals.push({ code: "BLOCKLIST_IMAGE", points: POINTS.BLOCKLIST_IDENTITY, label: `${bImages.length} photo(s) match photos from a banned account` });
  if (bDevices.length) signals.push({ code: "BLOCKLIST_DEVICE", points: POINTS.BLOCKLIST_IDENTITY, label: "Seller uses a banned device" });
  if (bWords.length) signals.push({ code: "BLOCKLIST_KEYWORD", points: POINTS.BLOCKLIST_KEYWORD, label: `Banned phrase: "${bWords.join('", "')}"` });

  // ── price vs market ──
  const market = await marketMedian(l);
  if (market) {
    const ratio = price / market.median;
    const detail = { median: Math.round(market.median), samples: market.n, ratio: Math.round(ratio * 100) / 100 };
    if (ratio < 0.5) signals.push({ code: "PRICE_FAR_BELOW_MARKET", points: POINTS.PRICE_FAR_BELOW_MARKET, label: `Price is ${Math.round(ratio * 100)}% of the market median (TSh ${(market.median / 1e6).toFixed(1)}M from ${market.n} similar cars)`, detail });
    else if (ratio < 0.65) signals.push({ code: "PRICE_BELOW_MARKET", points: POINTS.PRICE_BELOW_MARKET, label: `Price is ${Math.round(ratio * 100)}% of the market median (TSh ${(market.median / 1e6).toFixed(1)}M from ${market.n} similar cars)`, detail });
  }

  // ── photos reused by other sellers ──
  if (hashes.length) {
    const matches = new Map<string, { slug: string; title: string; sellerId: string }>();
    for (const h of hashes) {
      const rows = await prisma.$queryRaw<Array<{ listingId: string; slug: string; title: string; sellerId: string }>>`
        SELECT li."listingId", l.slug, l.title, l."sellerId"
        FROM "ListingImage" li JOIN "Listing" l ON l.id = li."listingId" JOIN "User" u ON u.id = l."sellerId"
        WHERE li.phash IS NOT NULL AND li."listingId" <> ${l.id} AND l."sellerId" <> ${s.id}
          AND u.status = 'ACTIVE' AND u."isShadowBanned" = false
          AND l."createdAt" < ${l.createdAt}
          AND bit_count((li.phash # ${h})::bit(64)) <= ${PHOTO_MAX_HAMMING}
        LIMIT 3`;
      rows.forEach((r) => matches.set(r.listingId, r));
    }
    const photoHits = hashes.length && matches.size
      ? Math.min(POINTS.PHOTO_CAP, POINTS.PHOTO_USED_BY_OTHER_SELLER * Math.min(matches.size, 2))
      : 0;
    if (photoHits) {
      signals.push({
        code: "PHOTO_USED_BY_OTHER_SELLER", points: photoHits,
        label: `Photos already appear on ${matches.size} earlier listing(s) by other accounts`,
        detail: { listings: [...matches.values()].map((m) => ({ slug: m.slug, title: m.title })) },
      });
    }
  }

  // ── wording ──
  signals.push(...scanScamWording(`${l.title}\n${l.description}`, l.isImportOnOrder));

  // ── contact number shared with other accounts ──
  // Only numbers that are NOT the seller's own registered number: if someone else
  // advertises with this seller's number, that other account is the abuser.
  const ownNumbers = new Set([s.phone, s.whatsapp, s.walletMsisdn, l.business?.phone, l.business?.whatsapp].filter(Boolean));
  const contactPhones = [...new Set([l.contactPhone, l.contactWhatsapp].filter((p): p is string => !!p && !ownNumbers.has(p)))];
  if (contactPhones.length) {
    const [viaListings, viaUsers] = await Promise.all([
      prisma.listing.findMany({
        where: {
          sellerId: { not: s.id },
          seller: { status: "ACTIVE", isShadowBanned: false },
          OR: [{ contactPhone: { in: contactPhones } }, { contactWhatsapp: { in: contactPhones } }],
          ...(l.businessId ? { NOT: { businessId: l.businessId } } : {}),
        },
        select: { sellerId: true }, distinct: ["sellerId"],
      }),
      prisma.user.findMany({ where: { id: { not: s.id }, status: "ACTIVE", isShadowBanned: false, OR: [{ phone: { in: contactPhones } }, { whatsapp: { in: contactPhones } }] }, select: { id: true } }),
    ]);
    let others = new Set([...viaListings.map((x) => x.sellerId), ...viaUsers.map((x) => x.id)]);
    if (l.businessId) {
      const members = await prisma.businessMember.findMany({ where: { businessId: l.businessId }, select: { userId: true } });
      others = new Set([...others].filter((id) => !members.some((m) => m.userId === id)));
    }
    if (others.size >= 3) signals.push({ code: "PHONE_SHARED", points: POINTS.PHONE_SHARED_3, label: `Contact number is used by ${others.size} other accounts`, detail: { accounts: [...others] } });
    else if (others.size >= 1) signals.push({ code: "PHONE_SHARED", points: POINTS.PHONE_SHARED_1, label: `Contact number is used by ${others.size} other account(s)`, detail: { accounts: [...others] } });
  }

  // ── devices shared with other / banned accounts ──
  if (devices.length) {
    const shared = await prisma.userDevice.findMany({
      where: { deviceHash: { in: devices.map((d) => d.deviceHash) }, userId: { not: s.id } },
      select: { userId: true, user: { select: { status: true, isShadowBanned: true } } },
      distinct: ["userId"],
    });
    if (shared.some((d) => d.user.status !== "ACTIVE" || d.user.isShadowBanned)) {
      signals.push({ code: "DEVICE_OF_BANNED_USER", points: POINTS.DEVICE_OF_BANNED_USER, label: "Seller's device was also used by a banned account", detail: { accounts: shared.map((x) => x.userId) } });
    } else if (shared.length >= 3) {
      signals.push({ code: "DEVICE_MANY_ACCOUNTS", points: POINTS.DEVICE_MANY_ACCOUNTS, label: `Seller's device is linked to ${shared.length} other accounts`, detail: { accounts: shared.map((x) => x.userId) } });
    }
  }

  // ── chassis ──
  if (chassis) {
    if (!CHASSIS_PATTERNS.some((re) => re.test(chassis))) signals.push({ code: "CHASSIS_FORMAT", points: POINTS.CHASSIS_FORMAT, label: `Chassis number "${chassis}" is not a valid VIN or frame number` });
    const dup = await prisma.$queryRaw<Array<{ slug: string; title: string }>>`
      SELECT l.slug, l.title FROM "Listing" l JOIN "User" u ON u.id = l."sellerId"
      WHERE upper(regexp_replace(l."chassisNumber", '[^A-Za-z0-9]', '', 'g')) = ${cKey} AND l."sellerId" <> ${s.id}
        AND u.status = 'ACTIVE' AND u."isShadowBanned" = false AND l."createdAt" < ${l.createdAt}
      LIMIT 3`;
    if (dup.length) signals.push({ code: "CHASSIS_DUPLICATE", points: POINTS.CHASSIS_DUPLICATE, label: `Chassis number already listed earlier by another account`, detail: { listings: dup } });
  }

  // ── account age / value / wallet ──
  const ageH = (Date.now() - s.createdAt.getTime()) / 3600_000;
  if (ageH < 24 && price >= 100_000_000) signals.push({ code: "NEW_ACCOUNT_HIGH_VALUE", points: POINTS.BRAND_NEW_ACCOUNT_VERY_HIGH, label: "Account under 24 hours old listing a vehicle over TSh 100M" });
  else if (ageH < 72 && price >= 50_000_000) signals.push({ code: "NEW_ACCOUNT_HIGH_VALUE", points: POINTS.NEW_ACCOUNT_HIGH_VALUE, label: "Account under 3 days old listing a vehicle over TSh 50M" });
  if (!l.businessId && !s.walletVerifiedAt && price >= 30_000_000) signals.push({ code: "NO_WALLET_HIGH_VALUE", points: POINTS.NO_WALLET_HIGH_VALUE, label: "Private seller without a mobile-money-verified wallet, price over TSh 30M" });

  // ── community reports ──
  const reports = await prisma.listingReport.findMany({ where: { listingId: l.id, reason: "SCAM", resolved: false }, select: { reporterId: true } });
  const reporters = new Set(reports.map((r) => r.reporterId ?? "anonymous"));
  if (reporters.size >= AUTO_HOLD_REPORTERS) signals.push({ code: "SCAM_REPORTS", points: POINTS.SCAM_REPORTS_2, label: `Reported as a scam by ${reporters.size} different people` });
  else if (reporters.size === 1) signals.push({ code: "SCAM_REPORTS", points: POINTS.SCAM_REPORT_1, label: "Reported as a scam once" });
  const sellerReports = await prisma.listingReport.count({ where: { reason: "SCAM", resolved: false, listing: { sellerId: s.id } } });
  if (sellerReports >= 3) signals.push({ code: "SELLER_MANY_REPORTS", points: POINTS.SELLER_MANY_REPORTS, label: `${sellerReports} open scam reports across this seller's listings` });

  // ── edits after approval ──
  if (opts.edit && l.publishedAt) {
    if ((opts.edit.priceDropPct ?? 0) >= 40) signals.push({ code: "SUSPICIOUS_EDIT", points: POINTS.SUSPICIOUS_EDIT, label: `Price cut by ${Math.round(opts.edit.priceDropPct!)}% after approval` });
    if (opts.edit.contactChanged) signals.push({ code: "SUSPICIOUS_EDIT", points: POINTS.SUSPICIOUS_EDIT, label: "Contact number changed after approval" });
  }

  // ── trust credits ──
  if (l.business?.verification === "VERIFIED") signals.push({ code: "VERIFIED_BUSINESS", points: POINTS.VERIFIED_BUSINESS, label: "Verified business (TIN/BRELA checked)" });
  if (s.walletVerifiedAt) signals.push({ code: "WALLET_VERIFIED", points: POINTS.WALLET_VERIFIED, label: "Mobile-money wallet verified" });
  if (ageH > 90 * 24) {
    const history = await prisma.listing.count({ where: { sellerId: s.id, id: { not: l.id }, publishedAt: { not: null }, riskLevel: { not: "HIGH" } } });
    if (history >= 3) signals.push({ code: "ESTABLISHED_SELLER", points: POINTS.ESTABLISHED_SELLER, label: `Established seller (${history} earlier listings)` });
  }

  const result = finish(signals);
  await prisma.$transaction([
    prisma.listing.update({
      where: { id: l.id },
      data: { riskScore: result.score, riskLevel: result.level, riskReasons: result.signals as unknown as Prisma.InputJsonValue, riskCheckedAt: new Date() },
    }),
    prisma.fraudFlag.deleteMany({ where: { entity: "LISTING", entityId: l.id, resolved: false } }),
    prisma.fraudFlag.createMany({
      data: result.signals.filter((x) => x.points > 0).map((x) => ({
        entity: "LISTING" as const, entityId: l.id, userId: s.id, signal: x.code, points: x.points,
        detail: { label: x.label, ...(x.detail ?? {}) } as Prisma.InputJsonValue,
      })),
    }),
  ]);
  await refreshUserRisk(s.id);
  return result;
}

/** User risk = highest open listing risk + identity flags; shown in admin. */
export async function refreshUserRisk(userId: string) {
  const top = await prisma.listing.aggregate({ where: { sellerId: userId, status: { not: "ARCHIVED" } }, _max: { riskScore: true } });
  const userFlags = await prisma.fraudFlag.aggregate({ where: { entity: "USER", entityId: userId, resolved: false }, _sum: { points: true } });
  await prisma.user.update({ where: { id: userId }, data: { riskScore: Math.max(top._max.riskScore ?? 0, userFlags._sum.points ?? 0) } });
}

/* ═════════════════════════════ inquiries ═══════════════════════════════════ */

export async function scoreInquiry(input: { phone: string; email?: string; message: string; buyerId?: string | null; deviceHash?: string | null }): Promise<RiskResult & { held: boolean }> {
  const signals: Signal[] = [];
  const [bPhone, bEmail, bDevice, buyer, words] = await Promise.all([
    isBlocked("PHONE", input.phone),
    isBlocked("EMAIL", input.email?.toLowerCase()),
    isBlocked("DEVICE", input.deviceHash),
    input.buyerId ? prisma.user.findUnique({ where: { id: input.buyerId }, select: { isShadowBanned: true, status: true } }) : null,
    keywordHits(input.message),
  ]);
  if (bPhone) signals.push({ code: "BLOCKLIST_PHONE", points: POINTS.BLOCKLIST_IDENTITY, label: "Sender's phone is banned" });
  if (bEmail) signals.push({ code: "BLOCKLIST_EMAIL", points: POINTS.BLOCKLIST_IDENTITY, label: "Sender's email is banned" });
  if (bDevice) signals.push({ code: "BLOCKLIST_DEVICE", points: POINTS.BLOCKLIST_IDENTITY, label: "Sender's device is banned" });
  if (buyer && (buyer.isShadowBanned || buyer.status !== "ACTIVE")) signals.push({ code: "SELLER_SHADOW_BANNED", points: POINTS.SELLER_SHADOW_BANNED, label: "Sender's account is under fraud hold" });
  if (words.length) signals.push({ code: "BLOCKLIST_KEYWORD", points: POINTS.BLOCKLIST_KEYWORD, label: `Banned phrase: "${words.join('", "')}"` });
  const hits = INQUIRY_SCAM_PHRASES.filter((p) => p.re.test(input.message));
  if (hits.length) {
    signals.push({ code: "SCAM_WORDING", points: Math.min(80, hits.reduce((a, h) => a + h.weight, 0)), label: `Scam wording: ${hits.map((h) => h.label).join(", ")}` });
  }
  const r = finish(signals);
  return { ...r, held: r.blocked || r.score >= RISK_THRESHOLDS.HIGH };
}

/* ═════════════════════════════ reports ═════════════════════════════════════ */

/**
 * After a report: rescore, and if enough different people call it a scam,
 * take the listing down for review straight away (it can be restored by a moderator).
 */
export async function onListingReported(listingId: string) {
  const l = await prisma.listing.findUnique({ where: { id: listingId }, select: { status: true, fraudReviewedAt: true } });
  if (!l) return;
  const result = await scoreListing(listingId);
  const reports = await prisma.listingReport.findMany({
    where: { listingId, reason: "SCAM", resolved: false, ...(l.fraudReviewedAt ? { createdAt: { gt: l.fraudReviewedAt } } : {}) },
    select: { reporterId: true },
  });
  const reporters = new Set(reports.map((r) => r.reporterId ?? "anonymous"));
  if (l.status === "ACTIVE" && (reporters.size >= AUTO_HOLD_REPORTERS || result.level === "HIGH")) {
    await prisma.listing.update({ where: { id: listingId }, data: { status: "PENDING_REVIEW" } });
    await prisma.auditLog.create({ data: { action: "listing.auto_hold", entityType: "Listing", entityId: listingId, meta: { reporters: reporters.size, score: result.score } } });
  }
}

/* ═════════════════════════════ linked accounts ═════════════════════════════ */

/** Other accounts that share a device or a phone number with this user. */
export async function linkedAccounts(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true, whatsapp: true, walletMsisdn: true, devices: { select: { deviceHash: true } } } });
  const listingPhones = await prisma.listing.findMany({ where: { sellerId: userId }, select: { contactPhone: true, contactWhatsapp: true } });
  const phones = [...new Set([u.phone, u.whatsapp, u.walletMsisdn, ...listingPhones.flatMap((l) => [l.contactPhone, l.contactWhatsapp])].filter((p): p is string => !!p))];
  const [byDevice, byPhone, byListingPhone] = await Promise.all([
    u.devices.length ? prisma.userDevice.findMany({ where: { deviceHash: { in: u.devices.map((d) => d.deviceHash) }, userId: { not: userId } }, select: { userId: true }, distinct: ["userId"] }) : [],
    phones.length ? prisma.user.findMany({ where: { id: { not: userId }, OR: [{ phone: { in: phones } }, { whatsapp: { in: phones } }, { walletMsisdn: { in: phones } }] }, select: { id: true } }) : [],
    phones.length ? prisma.listing.findMany({ where: { sellerId: { not: userId }, OR: [{ contactPhone: { in: phones } }, { contactWhatsapp: { in: phones } }] }, select: { sellerId: true }, distinct: ["sellerId"] }) : [],
  ]);
  const reasons = new Map<string, Set<string>>();
  const add = (id: string, why: string) => reasons.set(id, (reasons.get(id) ?? new Set()).add(why));
  byDevice.forEach((d) => add(d.userId, "same device"));
  byPhone.forEach((d) => add(d.id, "same phone"));
  byListingPhone.forEach((d) => add(d.sellerId, "same listing phone"));
  if (!reasons.size) return [];
  const users = await prisma.user.findMany({ where: { id: { in: [...reasons.keys()] } }, select: { id: true, name: true, phone: true, status: true, isShadowBanned: true, createdAt: true, riskScore: true } });
  return users.map((x) => ({ ...x, reasons: [...(reasons.get(x.id) ?? [])] }));
}

/* ═════════════════════════════ bans ════════════════════════════════════════ */

/**
 * BAN: suspend the account (cannot log in), archive its listings, hold its
 * inquiries, and blocklist every identifier it used so it cannot come back:
 * phones (account, WhatsApp, wallet, listing contacts), email, devices,
 * chassis numbers and photo hashes.
 * SHADOW: the account keeps working from the user's point of view, but its
 * listings never go live and its inquiries are silently held.
 */
export async function banUser(adminId: string, userId: string, reason: string, mode: "BAN" | "SHADOW") {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      devices: { select: { deviceHash: true } },
      listings: { select: { id: true, contactPhone: true, contactWhatsapp: true, chassisNumber: true, images: { select: { phash: true } } } },
    },
  });
  const now = new Date();
  const entries: Array<{ type: BlockType; value: string }> = [];

  // Scammers often copy a real seller's number, photos or chassis number. Never
  // blocklist identifiers that belong to someone else — they are the victim.
  const ownPhones = new Set([u.phone, u.whatsapp, u.walletMsisdn].filter((p): p is string => !!p));
  const listingPhones = new Set(u.listings.flatMap((l) => [l.contactPhone, l.contactWhatsapp]).filter((p): p is string => !!p && !ownPhones.has(p)));
  const phoneOwnedByOthers = async (p: string) => {
    const [user, biz] = await Promise.all([
      prisma.user.findFirst({ where: { id: { not: userId }, status: "ACTIVE", isShadowBanned: false, OR: [{ phone: p }, { whatsapp: p }, { walletMsisdn: p }] }, select: { id: true } }),
      prisma.business.findFirst({ where: { OR: [{ phone: p }, { whatsapp: p }], members: { none: { userId } } }, select: { id: true } }),
    ]);
    return !!(user || biz);
  };
  for (const p of ownPhones) if (!(await phoneOwnedByOthers(p))) entries.push({ type: "PHONE", value: p });
  for (const p of listingPhones) if (!(await phoneOwnedByOthers(p))) entries.push({ type: "PHONE", value: p });
  if (u.email) entries.push({ type: "EMAIL", value: u.email.toLowerCase() });
  u.devices.forEach((d) => entries.push({ type: "DEVICE", value: d.deviceHash }));
  for (const l of u.listings) {
    const c = chassisKey(l.chassisNumber);
    if (c) {
      const others = await prisma.$queryRaw<Array<{ n: number }>>`
        SELECT count(*)::int AS n FROM "Listing" l JOIN "User" u ON u.id = l."sellerId"
        WHERE upper(regexp_replace(l."chassisNumber", '[^A-Za-z0-9]', '', 'g')) = ${c} AND l."sellerId" <> ${userId}
          AND u.status = 'ACTIVE' AND u."isShadowBanned" = false`;
      if (!others[0]?.n) entries.push({ type: "CHASSIS", value: c });
    }
    for (const img of l.images) {
      if (img.phash === null) continue;
      const others = await prisma.$queryRaw<Array<{ n: number }>>`
        SELECT count(*)::int AS n FROM "ListingImage" li
        JOIN "Listing" l ON l.id = li."listingId" JOIN "User" u ON u.id = l."sellerId"
        WHERE li.phash IS NOT NULL AND l."sellerId" <> ${userId} AND u.status = 'ACTIVE' AND u."isShadowBanned" = false
          AND bit_count((li.phash # ${img.phash})::bit(64)) <= ${PHOTO_MAX_HAMMING}`;
      if (!others[0]?.n) entries.push({ type: "IMAGE_HASH", value: img.phash.toString() });
    }
  }
  const phones = new Set(entries.filter((e) => e.type === "PHONE").map((e) => e.value));

  await prisma.$transaction([
    prisma.blocklist.createMany({
      data: entries.map((e) => ({ ...e, reason, sourceUserId: userId, createdById: adminId })),
      skipDuplicates: true,
    }),
    prisma.user.update({
      where: { id: userId },
      data: mode === "BAN"
        ? { status: "SUSPENDED", isShadowBanned: true, bannedAt: now, banReason: reason }
        : { isShadowBanned: true, bannedAt: now, banReason: reason },
    }),
    mode === "BAN"
      ? prisma.listing.updateMany({ where: { sellerId: userId, status: { not: "ARCHIVED" } }, data: { status: "ARCHIVED", rejectionReason: "Removed: fraud", riskLevel: "HIGH" } })
      : prisma.listing.updateMany({ where: { sellerId: userId, status: "ACTIVE" }, data: { status: "PENDING_REVIEW", riskLevel: "HIGH" } }),
    prisma.inquiry.updateMany({ where: { OR: [{ buyerId: userId }, { phone: { in: [...phones] } }] }, data: { isHeld: true, status: "SPAM" } }),
    prisma.fraudFlag.create({ data: { entity: "USER", entityId: userId, userId, signal: mode === "BAN" ? "BANNED" : "SHADOW_BANNED", points: 100, detail: { reason, by: adminId } } }),
    prisma.auditLog.create({ data: { actorId: adminId, action: mode === "BAN" ? "user.ban" : "user.shadow_ban", entityType: "User", entityId: userId, meta: { reason, blocklisted: entries.length } } }),
  ]);
  await refreshUserRisk(userId);
  return { blocklisted: entries.length };
}

export async function unbanUser(adminId: string, userId: string) {
  await prisma.$transaction([
    prisma.blocklist.deleteMany({ where: { sourceUserId: userId } }),
    prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE", isShadowBanned: false, bannedAt: null, banReason: null, riskScore: 0 } }),
    prisma.fraudFlag.updateMany({ where: { OR: [{ userId }, { entity: "USER", entityId: userId }], resolved: false }, data: { resolved: true } }),
    prisma.inquiry.updateMany({ where: { buyerId: userId, isHeld: true }, data: { isHeld: false, status: "NEW" } }),
    prisma.auditLog.create({ data: { actorId: adminId, action: "user.unban", entityType: "User", entityId: userId } }),
  ]);
}

/** Moderator cleared a flagged listing: mark reviewed and resolve its flags. */
export async function clearListingFlags(adminId: string, listingId: string) {
  await prisma.$transaction([
    prisma.listing.update({ where: { id: listingId }, data: { fraudReviewedAt: new Date(), fraudReviewedBy: adminId } }),
    prisma.fraudFlag.updateMany({ where: { entity: "LISTING", entityId: listingId, resolved: false }, data: { resolved: true } }),
    prisma.listingReport.updateMany({ where: { listingId, resolved: false }, data: { resolved: true } }),
  ]);
}

/** Marks a user's mobile-money wallet as verified after a successful mobile-money payment. */
export async function markWalletVerified(userId: string, msisdn: string) {
  await prisma.user.updateMany({ where: { id: userId, walletVerifiedAt: null }, data: { walletVerifiedAt: new Date(), walletMsisdn: msisdn } });
}

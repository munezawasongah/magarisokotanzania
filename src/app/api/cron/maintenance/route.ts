import { prisma } from "@/lib/prisma";
import { runListingMaintenance } from "@/server/listings";
import { scoreListing } from "@/server/fraud/engine";
import { json, jsonError } from "@/lib/json";

/**
 * Run hourly (Vercel Cron / GitHub Actions / any scheduler):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/maintenance
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) return jsonError("Forbidden", 403);
  await runListingMaintenance(true);
  const now = new Date();
  const [subs, payments, otps] = await prisma.$transaction([
    prisma.subscription.updateMany({ where: { status: { in: ["ACTIVE", "TRIALING"] }, currentPeriodEnd: { lt: now } }, data: { status: "EXPIRED" } }),
    prisma.payment.updateMany({ where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - 60 * 60_000) } }, data: { status: "FAILED", failureReason: "Expired" } }),
    prisma.otpCode.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * 3600_000) } } }),
  ]);
  // Re-run fraud checks on recent live listings (market prices and reports change).
  // Scores only — a live listing is only taken down by reports or edits, not by drift.
  const recent = await prisma.listing.findMany({
    where: { status: "ACTIVE", OR: [{ createdAt: { gte: new Date(now.getTime() - 14 * 86400_000) } }, { riskCheckedAt: null }] },
    select: { id: true }, take: 500,
  });
  for (const l of recent) await scoreListing(l.id).catch(() => undefined);
  const purged = await prisma.blocklist.deleteMany({ where: { expiresAt: { lt: now } } });
  return json({ ok: true, expiredSubscriptions: subs.count, expiredPayments: payments.count, purgedOtps: otps.count, rescored: recent.length, expiredBlocks: purged.count });
}

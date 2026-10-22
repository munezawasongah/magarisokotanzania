import "server-only";
import { prisma } from "@/lib/prisma";

export const PERIODS = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 } as const;
export type Period = keyof typeof PERIODS;

/** Calendar day / month key in Tanzania time (EAT, UTC+3), so a payment at 01:00 counts for the right day. */
const EAT_MS = 3 * 3600_000;
const dayKey = (d: Date) => new Date(d.getTime() + EAT_MS).toISOString().slice(0, 10);
const monthKey = (d: Date) => new Date(d.getTime() + EAT_MS).toISOString().slice(0, 7);

export type RevenueEntry = { id: string; at: Date; amountTzs: number; purpose: string; method: string; who: string; reference: string };

/**
 * Money actually received in the period:
 *   • online payments confirmed by the gateway (status SUCCESS, counted on paidAt)
 *   • Lipa Namba registration payments, counted when the admin verified and approved them
 */
export async function getRevenueReport(period: Period = "30d") {
  const days = PERIODS[period];
  const since = new Date(Date.now() - days * 86400_000);
  const [online, manual, pendingRegs, failed, funnel] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "SUCCESS", OR: [{ paidAt: { gte: since } }, { paidAt: null, updatedAt: { gte: since } }] },
      select: { id: true, amountTzs: true, purpose: true, provider: true, paidAt: true, updatedAt: true, reference: true, user: { select: { name: true } }, business: { select: { name: true } } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.sellerRegistration.findMany({
      where: { status: "APPROVED", paymentId: null, manualReference: { not: null }, reviewedAt: { gte: since } },
      select: { id: true, feeTzs: true, reviewedAt: true, manualReference: true, user: { select: { name: true } } },
    }),
    prisma.sellerRegistration.aggregate({ where: { status: "PAYMENT_SUBMITTED" }, _count: { _all: true }, _sum: { feeTzs: true } }),
    prisma.payment.count({ where: { status: { in: ["FAILED", "CANCELLED"] }, createdAt: { gte: since } } }),
    Promise.all([
      prisma.sellerRegistration.count({ where: { createdAt: { gte: since } } }),
      prisma.sellerRegistration.count({ where: { submittedAt: { gte: since } } }),
      prisma.sellerRegistration.count({ where: { status: "APPROVED", reviewedAt: { gte: since } } }),
      prisma.sellerRegistration.count({ where: { status: "REJECTED", reviewedAt: { gte: since } } }),
    ]),
  ]);

  const entries: RevenueEntry[] = [
    ...online.map((p) => ({
      id: p.id, at: p.paidAt ?? p.updatedAt, amountTzs: Number(p.amountTzs), purpose: p.purpose, method: p.provider,
      who: p.business?.name ?? p.user.name, reference: p.reference,
    })),
    ...manual.map((r) => ({
      id: r.id, at: r.reviewedAt!, amountTzs: Number(r.feeTzs), purpose: "REGISTRATION_FEE", method: "LIPA_NAMBA",
      who: r.user.name, reference: r.manualReference ?? "",
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const total = entries.reduce((s, e) => s + e.amountTzs, 0);
  const group = (key: (e: RevenueEntry) => string) => {
    const m = new Map<string, { tzs: number; count: number }>();
    for (const e of entries) {
      const k = key(e);
      const g = m.get(k) ?? { tzs: 0, count: 0 };
      g.tzs += e.amountTzs; g.count++;
      m.set(k, g);
    }
    return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.tzs - a.tzs);
  };

  // time series with empty buckets filled in, oldest first
  const monthly = period === "12m";
  const buckets: Array<{ key: string; tzs: number; count: number }> = [];
  if (monthly) {
    const now = new Date(Date.now() + EAT_MS);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      buckets.push({ key: d.toISOString().slice(0, 7), tzs: 0, count: 0 });
    }
  } else {
    for (let i = days - 1; i >= 0; i--) buckets.push({ key: dayKey(new Date(Date.now() - i * 86400_000)), tzs: 0, count: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const e of entries) {
    const b = byKey.get(monthly ? monthKey(e.at) : dayKey(e.at));
    if (b) { b.tzs += e.amountTzs; b.count++; }
  }

  const [started, paid, approved, rejected] = funnel;
  return {
    period, days, since, total, count: entries.length,
    payingCustomers: new Set(entries.map((e) => e.who)).size,
    perDay: Math.round(total / days),
    byPurpose: group((e) => e.purpose),
    byMethod: group((e) => e.method),
    series: buckets, monthly,
    awaiting: { count: pendingRegs._count._all, tzs: Number(pendingRegs._sum.feeTzs ?? 0) },
    failed,
    funnel: { started, paid, approved, rejected },
    entries,
  };
}

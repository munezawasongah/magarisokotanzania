import Link from "next/link";
import { getAdminStats } from "@/server/admin";
import { prisma } from "@/lib/prisma";
import { formatTzs } from "@/lib/money";
import { resolveReportAction } from "@/server/actions/admin";

export default async function AdminHome() {
  const [s, reports] = await Promise.all([
    getAdminStats(),
    prisma.listingReport.findMany({ where: { resolved: false }, include: { listing: { select: { title: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const tiles: Array<[string, string | number]> = [
    ["Users", s.users], ["Active listings", s.active], ["Awaiting review", s.pending], ["Businesses", s.businesses],
    ["Awaiting verification", s.pendingBiz], ["Open reports", s.reports], ["Revenue (30d)", formatTzs(s.revenue30)], ["Payments (30d)", s.payments30],
  ];
  return (
    <div className="space-y-6">
      <h1 className="display text-2xl">Overview</h1>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([k, v]) => <div key={k} className="panel p-4"><dt className="text-xs text-ink-500">{k}</dt><dd className="condensed mt-1 text-2xl font-bold tabular-nums">{typeof v === "number" ? v.toLocaleString() : v}</dd></div>)}
      </dl>
      <section className="panel p-5">
        <h2 className="mb-3 font-bold">Revenue by stream (30 days)</h2>
        {s.revenueByPurpose.length === 0 ? <p className="text-sm text-ink-500">No payments yet.</p> : (
          <ul className="space-y-2 text-sm">
            {s.revenueByPurpose.map((r) => {
              const pct = s.revenue30 ? (r.tzs / s.revenue30) * 100 : 0;
              return (
                <li key={r.purpose}>
                  <div className="flex justify-between"><span>{r.purpose}</span><span className="tabular-nums">{formatTzs(r.tzs)}</span></div>
                  <div className="mt-1 h-2 rounded bg-ink-100"><div className="h-2 rounded bg-ink-700" style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="panel overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 font-bold">Reported listings</h2>
        {reports.length === 0 ? <p className="p-5 text-sm text-ink-500">Nothing reported.</p> : (
          <ul className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span><strong>{r.reason}</strong> — <Link href={`/cars/${r.listing.slug}`} className="underline">{r.listing.title}</Link>{r.details ? <span className="block text-xs text-ink-500">{r.details}</span> : null}</span>
                <form action={resolveReportAction}><input type="hidden" name="id" value={r.id} /><button className="btn-ghost py-1.5 text-xs">Mark resolved</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

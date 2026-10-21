import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/i18n/server";
import { getSellerOverview } from "@/server/dashboard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { formatTzs, formatTzsCompact } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { fmt } from "@/i18n";
import { SITE } from "@/config/site";

export default async function DashboardHome() {
  const user = await requireUser();
  const { dict } = await getDictionary();
  const [o, reg] = await Promise.all([
    getSellerOverview(user.id),
    prisma.sellerRegistration.findUnique({ where: { userId: user.id }, select: { status: true, rejectionReason: true } }),
  ]);
  const approved = reg?.status === "APPROVED" || user.roles.includes("ADMIN");
  const tiles: Array<[string, number]> = [
    [dict.dash.active, o.statusCounts.ACTIVE ?? 0], [dict.dash.views30, o.views30], [dict.dash.wa30, o.whatsapp30],
    [dict.dash.calls30, o.calls30], [dict.dash.leads30, o.leads30],
  ];
  const conv = o.views30 ? ((o.leads30 / o.views30) * 100).toFixed(1) : "0.0";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-2xl">{dict.dash.overview}</h1>
        {approved && <Link href="/sell" className="btn-plate">{dict.nav.sell}</Link>}
      </div>
      {!approved && (
        <div className="rounded-lg bg-ink-900 p-5 text-white">
          {reg?.status === "PAYMENT_SUBMITTED" ? (
            <p className="text-sm">{dict.reg.submitted}</p>
          ) : (
            <>
              <p className="font-semibold">{dict.reg.needRegistration}</p>
              <p className="mt-1 text-sm text-ink-100">{reg?.status === "REJECTED" && reg.rejectionReason ? fmt(dict.reg.rejected, { reason: reg.rejectionReason }) : fmt(dict.reg.subtitle, { fee: formatTzs(SITE.registrationFeeTzs) })}</p>
              <Link href="/dashboard/registration" className="btn-plate mt-4">{reg ? dict.reg.continue : dict.reg.registerNow}</Link>
            </>
          )}
        </div>
      )}
      {o.newLeads > 0 && (
        <Link href="/dashboard/leads" className="block rounded-md border border-plate-500 bg-plate-300/30 p-3 text-sm font-medium">
          {o.newLeads} new {o.newLeads === 1 ? "lead is" : "leads are"} waiting for a reply.
        </Link>
      )}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map(([k, v]) => (
          <div key={k} className="panel p-4">
            <dt className="text-xs text-ink-500">{k}</dt>
            <dd className="condensed mt-1 text-3xl font-bold tabular-nums">{v.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      <section className="panel p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-bold">Last 30 days</h2>
          <p className="text-xs text-ink-500">Lead rate {conv}% of views</p>
        </div>
        <TrendChart series={o.series} labels={{ views: "views", leads: "leads" }} />
      </section>
      <section className="panel overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 font-bold">Top listings</h2>
        {o.top.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">No active listings yet. <Link href="/sell" className="font-semibold underline">List your first vehicle</Link>.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-100/50 text-left text-xs text-ink-500"><tr><th className="px-5 py-2 font-medium">Listing</th><th className="px-3 py-2 text-right font-medium">Price</th><th className="px-3 py-2 text-right font-medium">Views</th><th className="px-5 py-2 text-right font-medium">Leads</th></tr></thead>
            <tbody>
              {o.top.map((l) => (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-5 py-2.5"><Link href={`/cars/${l.slug}`} className="font-medium hover:underline">{l.title}</Link></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatTzsCompact(l.priceTzs)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{l.viewCount}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{l.leadCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

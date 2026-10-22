import Link from "next/link";
import { Download } from "lucide-react";
import { getRevenueReport, PERIODS, type Period } from "@/server/revenue";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { formatTzs } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Revenue" };

const PURPOSE: Record<string, string> = { REGISTRATION_FEE: "Seller registrations", PROMOTION: "Featured / sponsored ads", SUBSCRIPTION: "Monthly plans", INSPECTION_FEE: "Inspection fees", AD_PLACEMENT: "Banner adverts", LISTING_FEE: "Listing fees (old)" };
const METHOD: Record<string, string> = { MPESA: "Vodacom M-Pesa", TIGO_PESA: "Mixx by Yas", AIRTEL_MONEY: "Airtel Money", HALOPESA: "HaloPesa", AZAMPESA: "AzamPesa", CARD: "Visa / Mastercard", LIPA_NAMBA: "Lipa Namba (manual)" };
const LABEL: Record<Period, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "12m": "12 months" };

function Bars({ title, rows, names, total }: { title: string; rows: Array<{ key: string; tzs: number; count: number }>; names: Record<string, string>; total: number }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-3 font-bold">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-ink-500">No payments in this period.</p> : (
        <ul className="space-y-3 text-sm">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-3">
                <span>{names[r.key] ?? r.key} <span className="text-xs text-ink-500">· {r.count}</span></span>
                <span className="tabular-nums">{formatTzs(r.tzs)} <span className="text-xs text-ink-500">({total ? Math.round((r.tzs / total) * 100) : 0}%)</span></span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-ink-700" style={{ width: `${total ? (r.tzs / total) * 100 : 0}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: p } = await searchParams;
  const period = (p && p in PERIODS ? p : "30d") as Period;
  const r = await getRevenueReport(period);
  const conv = r.funnel.started ? Math.round((r.funnel.approved / r.funnel.started) * 100) : 0;
  const tiles: Array<[string, string, string?]> = [
    ["Revenue", formatTzs(r.total), `${r.count} payments`],
    ["Average per day", formatTzs(r.perDay)],
    ["Paying customers", r.payingCustomers.toLocaleString()],
    ["Awaiting your verification", formatTzs(r.awaiting.tzs), `${r.awaiting.count} registrations`],
  ];
  const funnel: Array<[string, string | number]> = [
    ["Started", r.funnel.started], ["Paid", r.funnel.paid], ["Approved", r.funnel.approved], ["Rejected", r.funnel.rejected], ["Started → approved", `${conv}%`],
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-2xl">Revenue</h1>
          <p className="mt-1 text-sm text-ink-500">Money received: online payments confirmed by the gateway, plus Lipa Namba registration payments you verified.</p>
        </div>
        <a href={`/api/admin/revenue?period=${period}`} className="btn-ghost py-2 text-sm"><Download className="h-4 w-4" />Download CSV</a>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Period">
        {(Object.keys(PERIODS) as Period[]).map((k) => (
          <Link key={k} href={`/admin/revenue?period=${k}`} aria-current={period === k ? "page" : undefined} className={cn("chip", period === k && "border-ink-900 bg-ink-900 text-white")}>{LABEL[k]}</Link>
        ))}
      </nav>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([k, v, sub]) => (
          <div key={k} className="panel p-4">
            <dt className="text-xs text-ink-500">{k}</dt>
            <dd className="condensed mt-1 text-2xl font-bold tabular-nums">{v}</dd>
            {sub && <dd className="text-xs text-ink-500">{sub}</dd>}
          </div>
        ))}
      </dl>

      <RevenueChart series={r.series} monthly={r.monthly} title={`Revenue per ${r.monthly ? "month" : "day"} — last ${LABEL[period]}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Bars title="By revenue stream" rows={r.byPurpose} names={PURPOSE} total={r.total} />
        <Bars title="By payment method" rows={r.byMethod} names={METHOD} total={r.total} />
      </div>

      <section className="panel p-5">
        <h2 className="mb-3 font-bold">Seller registrations — last {LABEL[period]}</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          {funnel.map(([k, v]) => (
            <div key={k}><dt className="text-xs text-ink-500">{k}</dt><dd className="condensed text-xl font-bold tabular-nums">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-500">{r.failed} payment attempts failed or were cancelled in this period. <Link href="/admin/registrations" className="underline">Verify waiting registrations</Link></p>
      </section>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 font-bold">Latest payments</h2>
        {r.entries.length === 0 ? <p className="p-5 text-sm text-ink-500">No payments yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs text-ink-500"><th className="px-5 py-2">Date</th><th className="px-2 py-2">From</th><th className="px-2 py-2">For</th><th className="px-2 py-2">Method</th><th className="px-2 py-2">Reference</th><th className="px-5 py-2 text-right">Amount</th></tr></thead>
              <tbody>
                {r.entries.slice(0, 30).map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="whitespace-nowrap px-5 py-2">{e.at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Dar_es_Salaam" })}</td>
                    <td className="px-2 py-2">{e.who}</td>
                    <td className="px-2 py-2">{PURPOSE[e.purpose] ?? e.purpose}</td>
                    <td className="px-2 py-2">{METHOD[e.method] ?? e.method}</td>
                    <td className="px-2 py-2 font-mono text-xs">{e.reference}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{formatTzs(e.amountTzs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

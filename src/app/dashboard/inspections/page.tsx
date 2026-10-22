import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/i18n/server";
import { inspectionsForUser } from "@/server/inspections";
import { InspectionActions } from "@/components/inspections/InspectionActions";
import { Badge } from "@/components/ui/Badge";
import { formatTzPhone } from "@/lib/phone";
import { formatTzs } from "@/lib/money";

export const metadata = { title: "Inspections", robots: { index: false } };

const TONE = { REQUESTED: "plate", SCHEDULED: "ink", COMPLETED: "go", CANCELLED: "muted" } as const;
const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "—");

export default async function InspectionsPage() {
  const user = await requireUser("/dashboard/inspections");
  const { dict } = await getDictionary();
  const t = dict.inspect;
  const { asProvider, asBuyer, isProvider } = await inspectionsForUser(user.id);

  type Row = (typeof asBuyer)[number];
  const card = (r: Row, role: "provider" | "buyer") => (
    <li key={r.id} className="panel grid gap-3 p-4 md:grid-cols-[1fr_auto]">
      <div className="min-w-0 space-y-1 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          <Badge tone={TONE[r.status]}>{r.status}</Badge>
          <Link href={`/cars/${r.listing.slug}`} className="font-semibold hover:underline">{r.listing.title}</Link>
        </p>
        {role === "provider" ? (
          <p className="text-ink-700">{r.buyer.name} · <a className="tabular-nums underline" href={`tel:${r.buyer.phone}`}>{r.buyer.phone ? formatTzPhone(r.buyer.phone) : "—"}</a> · seller <a className="tabular-nums underline" href={`tel:${r.listing.contactPhone}`}>{formatTzPhone(r.listing.contactPhone)}</a></p>
        ) : (
          <p className="text-ink-700">{r.provider ? <Link href={`/shop/${r.provider.slug}`} className="underline">{r.provider.name}</Link> : "—"}{r.provider?.phone ? <> · <a className="tabular-nums underline" href={`tel:${r.provider.phone}`}>{formatTzPhone(r.provider.phone)}</a></> : null}</p>
        )}
        <p className="text-xs text-ink-500">
          {[r.listing.locationAddress, r.listing.region.name].filter(Boolean).join(", ")} · preferred {fmtDate(r.preferredDate)}
          {r.scheduledAt ? ` · confirmed ${r.scheduledAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : ""}
          {r.feeTzs ? ` · ${t.fee} ${formatTzs(r.feeTzs)}` : ""}
        </p>
        {r.buyerMessage && <p className="text-xs text-ink-700">“{r.buyerMessage}”</p>}
        {r.status === "COMPLETED" && (r.reportUrl
          ? <a href={r.reportUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-1 py-1.5 text-xs">Open report</a>
          : r.notes && <p className="mt-1 whitespace-pre-line rounded-md bg-paper p-3 text-xs text-ink-700">{r.notes}</p>)}
      </div>
      <InspectionActions id={r.id} status={r.status} role={role} />
    </li>
  );

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="display text-2xl">{t.my}</h1>
      {isProvider && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t.asProvider} <span className="text-ink-500">({asProvider.length})</span></h2>
          {asProvider.length ? <ul className="space-y-3">{asProvider.map((r) => card(r, "provider"))}</ul> : <p className="panel p-5 text-sm text-ink-500">No requests yet. Add “Pre-purchase inspection” with your price to your mini-site services so buyers can book you.</p>}
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t.asBuyer} <span className="text-ink-500">({asBuyer.length})</span></h2>
        {asBuyer.length ? <ul className="space-y-3">{asBuyer.map((r) => card(r, "buyer"))}</ul> : <p className="panel p-5 text-sm text-ink-500">{t.intro}</p>}
      </section>
    </div>
  );
}

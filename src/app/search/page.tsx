import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Phone, Search } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { searchEverything } from "@/server/search";
import { getRegionsWithDistricts } from "@/server/taxonomy";
import { VehicleCard } from "@/components/listing/VehicleCard";
import { PartCard } from "@/components/parts/PartCard";
import { Pagination } from "@/components/ui/Pagination";
import { WhatsAppIcon } from "@/components/ui/icons";
import { formatTzs } from "@/lib/money";
import { formatTzPhone } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Stars } from "@/components/ui/Stars";

type SP = Promise<{ q?: string; region?: string; scope?: string; page?: string }>;
const SCOPES = ["all", "cars", "parts", "services", "shops"] as const;
type Scope = (typeof SCOPES)[number];

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `${q} — search` : "Search cars, spare parts and services", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const scope: Scope = (SCOPES as readonly string[]).includes(sp.scope ?? "") ? (sp.scope as Scope) : "all";
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const { dict, locale } = await getDictionary();
  const t = dict.searchAll;
  const [r, regions] = await Promise.all([
    searchEverything({ q: sp.q, region: sp.region, scope, page }),
    getRegionsWithDistricts(),
  ]);
  const totals = {
    cars: r.cars?.total ?? 0, parts: r.parts?.total ?? 0, services: r.services?.total ?? 0, shops: r.shops?.total ?? 0,
  };
  const total = totals.cars + totals.parts + totals.services + totals.shops;
  const href = (s: Scope) => {
    const p = new URLSearchParams();
    if (r.q) p.set("q", r.q);
    if (r.region) p.set("region", r.region);
    if (s !== "all") p.set("scope", s);
    return `/search${p.size ? `?${p}` : ""}`;
  };
  const label: Record<Scope, string> = { all: t.all, cars: t.cars, parts: t.parts, services: t.services, shops: t.shops };
  const seeAll = (s: Exclude<Scope, "all">, n: number, shown: number) =>
    scope === "all" && n > shown ? <Link href={href(s)} className="text-sm font-semibold underline-offset-2 hover:underline">{fmt(t.seeAll, { n })}</Link> : null;

  return (
    <div className="container py-8">
      <form action="/search" className="panel grid gap-2 p-3 sm:grid-cols-[1fr_220px_auto]" role="search">
        <input name="q" defaultValue={r.q ?? ""} className="field" placeholder={t.placeholder} aria-label={t.title} enterKeyHint="search" autoFocus={!r.q} />
        <select name="region" defaultValue={r.region ?? ""} className="field" aria-label={dict.spec.region}>
          <option value="">{dict.hero.anyRegion}</option>
          {regions.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
        </select>
        {scope !== "all" && <input type="hidden" name="scope" value={scope} />}
        <button className="btn-plate min-h-11 px-6"><Search className="h-4 w-4" />{dict.hero.search}</button>
      </form>

      <h1 className="mt-6 text-xl font-bold">{r.q ? fmt(t.results, { count: total, q: r.q }) : fmt(t.resultsNoQ, { count: total })}</h1>

      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={t.title}>
        {SCOPES.map((s) => (
          <Link key={s} href={href(s)} aria-current={scope === s ? "page" : undefined} className={cn("chip shrink-0", scope === s && "border-ink-900 bg-ink-900 text-white")}>
            {label[s]}{s !== "all" && scope === "all" ? <span className="ml-1 tabular-nums opacity-70">{totals[s]}</span> : null}
          </Link>
        ))}
      </nav>

      {total === 0 && <p className="panel mt-6 p-8 text-center text-sm text-ink-500">{t.none}</p>}

      {r.cars && r.cars.total > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-3"><h2 className="text-lg font-bold">{t.cars} <span className="text-ink-500">({r.cars.total})</span></h2>{seeAll("cars", r.cars.total, r.cars.items.length)}</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{r.cars.items.map((l) => <VehicleCard key={l.id} listing={l} dict={dict} locale={locale} />)}</div>
          {scope === "cars" && <Pagination page={r.cars.page} pages={r.cars.pages} basePath="/search" params={{ q: r.q ?? "", region: r.region ?? "", scope: "cars" }} dict={dict} />}
        </section>
      )}

      {r.parts && r.parts.total > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-3"><h2 className="text-lg font-bold">{t.parts} <span className="text-ink-500">({r.parts.total})</span></h2>{seeAll("parts", r.parts.total, r.parts.items.length)}</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{r.parts.items.map((p) => <PartCard key={p.id} part={p} dict={dict} locale={locale} />)}</div>
          {scope === "parts" && <Pagination page={r.parts.page} pages={r.parts.pages} basePath="/search" params={{ q: r.q ?? "", region: r.region ?? "", scope: "parts" }} dict={dict} />}
        </section>
      )}

      {r.services && r.services.total > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-3"><h2 className="text-lg font-bold">{t.services} <span className="text-ink-500">({r.services.total})</span></h2>{seeAll("services", r.services.total, r.services.items.length)}</div>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
            {r.services.items.map((s) => {
              const b = s.business;
              return (
                <li key={s.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-xs text-ink-500">{enumLabel(dict, "ServiceCategory", s.category)}{s.mobileService ? ` · ${dict.services.mobile}` : ""}</p>
                    <Link href={`/shop/${b.slug}`} className="mt-1 flex items-center gap-1 font-medium hover:underline">{b.name}{b.verification === "VERIFIED" && <BadgeCheck className="h-4 w-4 text-go-600" aria-label={dict.listing.verified} />}</Link>
                    <p className="flex items-center gap-1 text-xs text-ink-500"><MapPin className="h-3.5 w-3.5" />{[b.address, b.district?.name, b.region.name].filter(Boolean).join(", ")}</p>
                  </div>
                  <span className="plate w-fit text-sm">{t.from} {formatTzs(s.priceFromTzs)}</span>
                  <div className="flex gap-2">
                    <a href={`tel:${b.phone}`} className="btn-ghost px-3 py-2 text-xs tabular-nums"><Phone className="h-4 w-4" />{formatTzPhone(b.phone)}</a>
                    <a href={whatsappLink(b.whatsapp ?? b.phone, `Habari ${b.name}, naomba maelezo kuhusu: ${s.title} (MagariSOKO Tanzania)`)} target="_blank" rel="noopener noreferrer" className="btn-wa px-3 py-2" aria-label={dict.listing.whatsapp}><WhatsAppIcon className="h-4 w-4" /></a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {r.shops && r.shops.total > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-3"><h2 className="text-lg font-bold">{t.shops} <span className="text-ink-500">({r.shops.total})</span></h2>{seeAll("shops", r.shops.total, r.shops.items.length)}</div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {r.shops.items.map((b) => (
              <li key={b.id} className="panel flex flex-col gap-2 p-4 text-sm">
                <Link href={`/shop/${b.slug}`} className="flex items-center gap-1.5 text-base font-bold hover:underline">{b.name}{b.verification === "VERIFIED" && <BadgeCheck className="h-4 w-4 text-go-600" aria-label={dict.listing.verified} />}</Link>
                <p className="text-xs text-ink-500">{enumLabel(dict, "BusinessType", b.type)}{b.tagline ? ` — ${b.tagline}` : ""}</p>
                {b.ratingCount > 0 && <p className="flex items-center gap-1.5 text-xs"><Stars value={b.ratingAvg} size="h-3.5 w-3.5" /><span className="tabular-nums">{b.ratingAvg.toFixed(1)}</span><span className="text-ink-500">({b.ratingCount})</span></p>}
                <p className="flex items-center gap-1 text-xs text-ink-700"><MapPin className="h-3.5 w-3.5 text-ink-300" />{[b.address, b.region.name].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-ink-500">{b._count.listings} {dict.nav.cars.toLowerCase()} · {b._count.parts} {dict.nav.parts.toLowerCase()} · {b._count.services} {dict.nav.services.toLowerCase()}</p>
                <div className="mt-auto flex gap-2 pt-1">
                  <a href={`tel:${b.phone}`} className="btn-ghost flex-1 justify-center px-3 py-2 text-xs tabular-nums"><Phone className="h-4 w-4" />{formatTzPhone(b.phone)}</a>
                  <a href={whatsappLink(b.whatsapp ?? b.phone, `Habari ${b.name} (MagariSOKO Tanzania)`)} target="_blank" rel="noopener noreferrer" className="btn-wa px-3 py-2" aria-label={dict.listing.whatsapp}><WhatsAppIcon className="h-4 w-4" /></a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

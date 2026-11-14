import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { listDealers } from "@/server/businesses";
import { Stars } from "@/components/ui/Stars";
import { getRegionsWithDistricts } from "@/server/taxonomy";
import { SITE } from "@/config/site";

export const metadata = { title: `Car dealers & importers in ${SITE.countryName}`, description: `Verified car dealerships and vehicle importers in ${SITE.majorCities} and across ${SITE.countryName}.` };

export default async function DealersPage({ searchParams }: { searchParams: Promise<{ region?: string; q?: string }> }) {
  const { region, q } = await searchParams;
  const { dict, locale } = await getDictionary();
  const sw = locale === "sw";
  const [dealers, regions] = await Promise.all([listDealers(region, q), getRegionsWithDistricts()]);
  return (
    <div className="container py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-3xl">{dict.nav.dealers}</h1>
        <form action="/dealers" role="search" className="flex w-full flex-wrap gap-2 sm:w-auto">
          <input name="q" defaultValue={q ?? ""} className="field min-w-0 flex-1 sm:w-64" placeholder={sw ? "Jina la muuzaji au yadi" : "Dealer or yard name"} aria-label={sw ? "Tafuta muuzaji kwa jina" : "Find a dealer by name"} />
          <select name="region" defaultValue={region ?? ""} className="field w-auto"><option value="">{dict.hero.anyRegion}</option>{regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</select>
          <button className="btn-primary">{dict.hero.search}</button>
        </form>
      </div>
      {q && <p className="mt-4 text-sm text-ink-700">{dealers.length ? (sw ? `Wauzaji ${dealers.length} wanaolingana na "${q}"` : `${dealers.length} dealer${dealers.length === 1 ? "" : "s"} matching "${q}"`) : (sw ? `Hakuna muuzaji anayeitwa "${q}". Jaribu sehemu ya jina tu.` : `No dealer called "${q}". Try part of the name.`)}</p>}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.map((d) => (
          <li key={d.id}>
            <Link href={`/shop/${d.slug}`} className="panel block h-full p-5 hover:border-ink-300">
              <p className="flex items-center gap-1.5 text-lg font-bold">{d.name}{d.verification === "VERIFIED" && <BadgeCheck className="h-5 w-5 text-go-600" aria-label={dict.listing.verified} />}</p>
              <p className="text-sm text-ink-500">{enumLabel(dict, "BusinessType", d.type)}{d.tagline ? ` — ${d.tagline}` : ""}</p>
              {d.ratingCount > 0 && <p className="mt-2 flex items-center gap-1.5 text-xs"><Stars value={d.ratingAvg} size="h-3.5 w-3.5" /><span className="tabular-nums">{d.ratingAvg.toFixed(1)}</span><span className="text-ink-500">({d.ratingCount})</span></p>}
              <p className="mt-3 flex items-center gap-1 text-sm"><MapPin className="h-4 w-4 text-ink-300" />{d.region.name}</p>
              <p className="mt-1 text-sm font-semibold">{d._count.listings} {dict.nav.cars.toLowerCase()}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

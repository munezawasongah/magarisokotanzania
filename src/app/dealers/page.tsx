import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { listDealers } from "@/server/businesses";
import { getRegionsWithDistricts } from "@/server/taxonomy";

export const metadata = { title: "Car dealers & importers in Tanzania", description: "Verified car dealerships and vehicle importers in Dar es Salaam, Arusha, Mwanza, Dodoma and across Tanzania." };

export default async function DealersPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  const { region } = await searchParams;
  const { dict } = await getDictionary();
  const [dealers, regions] = await Promise.all([listDealers(region), getRegionsWithDistricts()]);
  return (
    <div className="container py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-3xl">{dict.nav.dealers}</h1>
        <form action="/dealers" className="flex gap-2">
          <select name="region" defaultValue={region ?? ""} className="field w-auto"><option value="">{dict.hero.anyRegion}</option>{regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</select>
          <button className="btn-primary">{dict.hero.search}</button>
        </form>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.map((d) => (
          <li key={d.id}>
            <Link href={`/shop/${d.slug}`} className="panel block h-full p-5 hover:border-ink-300">
              <p className="flex items-center gap-1.5 text-lg font-bold">{d.name}{d.verification === "VERIFIED" && <BadgeCheck className="h-5 w-5 text-go-600" aria-label={dict.listing.verified} />}</p>
              <p className="text-sm text-ink-500">{enumLabel(dict, "BusinessType", d.type)}{d.tagline ? ` — ${d.tagline}` : ""}</p>
              <p className="mt-3 flex items-center gap-1 text-sm"><MapPin className="h-4 w-4 text-ink-300" />{d.region.name}</p>
              <p className="mt-1 text-sm font-semibold">{d._count.listings} {dict.nav.cars.toLowerCase()}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

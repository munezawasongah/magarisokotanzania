import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { HeroSearch } from "@/components/search/HeroSearch";
import { VehicleCard } from "@/components/listing/VehicleCard";
import { Img } from "@/components/ui/Img";
import { getMakesWithModels, getRegionsWithDistricts } from "@/server/taxonomy";
import { getFeaturedListings, getLatestListings } from "@/server/listings";
import { prisma } from "@/lib/prisma";
import { getBodyTypeTiles } from "@/server/body-types";
import { SITE } from "@/config/site";
import { formatTzs } from "@/lib/money";

export const revalidate = 120;

const BODY_TILES = ["SUV", "SEDAN", "HATCHBACK", "PICKUP", "MINIVAN", "TRUCK", "MOTORCYCLE"] as const;

export default async function HomePage() {
  const { dict, locale } = await getDictionary();
  const now = new Date();
  const [makes, regions, featured, latest, counts, ad, regionCounts, bodyTiles] = await Promise.all([
    getMakesWithModels(),
    getRegionsWithDistricts(),
    getFeaturedListings(8),
    getLatestListings(8),
    Promise.all([
      prisma.listing.count({ where: { status: "ACTIVE" } }),
      prisma.sparePart.count({ where: { status: "ACTIVE" } }),
      prisma.business.count({ where: { verification: "VERIFIED" } }),
    ]),
    prisma.adPlacement.findFirst({ where: { slot: "HOME_INLINE", isActive: true, startsAt: { lte: now }, endsAt: { gte: now } }, orderBy: { startsAt: "desc" } }),
    prisma.listing.groupBy({ by: ["regionId"], where: { status: "ACTIVE" }, _count: { _all: true }, orderBy: { _count: { regionId: "desc" } }, take: 8 }),
    getBodyTypeTiles([...BODY_TILES]),
  ]);
  const [carCount, partCount, verifiedCount] = counts;
  const regionMap = new Map(regions.map((r) => [r.id, r]));

  return (
    <>
      {/* Hero: the search IS the hero — a buyer's first action */}
      <section className="relative overflow-hidden bg-ink-950 pb-14 pt-12 text-white md:pb-20 md:pt-16">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[repeating-linear-gradient(90deg,transparent_0_56px,rgba(255,212,59,.18)_56px_104px)] [mask-image:linear-gradient(to_top,black,transparent)]" />
        <div className="container relative">
          <h1 className="display max-w-3xl text-4xl leading-[1.05] text-white md:text-6xl">{dict.hero.title}</h1>
          <p className="mt-4 max-w-xl text-base text-ink-100 md:text-lg">{dict.hero.subtitle}</p>
          <div className="mt-8 max-w-5xl">
            <HeroSearch makes={makes} regions={regions.map((r) => ({ slug: r.slug, name: r.name }))} />
          </div>
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-100">
            <div><dt className="sr-only">Cars</dt><dd><strong className="text-white tabular-nums">{carCount.toLocaleString()}</strong> {dict.nav.cars.toLowerCase()}</dd></div>
            <div><dt className="sr-only">Parts</dt><dd><strong className="text-white tabular-nums">{partCount.toLocaleString()}</strong> {dict.nav.parts.toLowerCase()}</dd></div>
            <div><dt className="sr-only">Verified</dt><dd><strong className="text-white tabular-nums">{verifiedCount}</strong> {locale === "sw" ? "biashara zilizothibitishwa" : "verified businesses"}</dd></div>
          </dl>
        </div>
      </section>

      {/* Body types */}
      <section className="container mt-12">
        <h2 className="text-xl font-bold">{dict.spec.body}</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {bodyTiles.map((t) => (
            <Link key={t.body} href={`/cars?body=${t.body}`} className="group overflow-hidden rounded-lg border border-line bg-white">
              <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
                <Img src={t.url} alt={enumLabel(dict, "BodyType", t.body)} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 33vw, 200px" transform="f_auto,q_auto,c_fill,w_400,h_300" />
              </div>
              <p className="px-2 pt-2 text-center text-xs font-semibold text-ink-900 group-hover:underline">{enumLabel(dict, "BodyType", t.body)}</p>
              <p className="pb-2 text-center text-2xs tabular-nums text-ink-500">{t.count.toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container mt-14">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold">{dict.listing.featured}</h2>
            <Link href="/cars" className="text-sm font-semibold text-ink-700 underline-offset-2 hover:underline">{fmt(dict.search.results, { count: carCount })}</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((l, i) => <VehicleCard key={l.id} listing={l} dict={dict} locale={locale} priority={i < 4} />)}
          </div>
        </section>
      )}

      {ad && (
        <section className="container mt-14">
          <a href={`/api/ads/${ad.id}/click`} className="block overflow-hidden rounded-lg border border-line" rel="sponsored">
            <Img src={ad.imageUrl} alt={ad.title} width={1200} height={200} className="h-auto w-full" />
          </a>
          <p className="mt-1 text-right text-2xs text-ink-500">{dict.listing.sponsored} · {ad.advertiser}</p>
        </section>
      )}

      <section className="container mt-14">
        <h2 className="text-xl font-bold">{locale === "sw" ? "Mapya sokoni" : "Just listed"}</h2>
        {latest.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latest.map((l) => <VehicleCard key={l.id} listing={l} dict={dict} locale={locale} />)}
          </div>
        ) : (
          <div className="panel mt-4 p-6 text-sm text-ink-700">
            <p>{locale === "sw" ? "Bado hakuna magari yaliyochapishwa. Wauzaji waliosajiliwa wataanza kuweka matangazo hivi karibuni." : "No vehicles have been published yet. Registered sellers will start posting soon."}</p>
            <Link href="/dashboard/registration" className="btn-primary mt-4">{dict.reg.registerNow}</Link>
          </div>
        )}
      </section>

      <section className="container mt-14 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold">{dict.spec.region}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {(regionCounts.length ? regionCounts : regions.slice(0, 8).map((r) => ({ regionId: r.id, _count: { _all: 0 } }))).map((r) => {
              const reg = regionMap.get(r.regionId);
              if (!reg) return null;
              return (
                <li key={r.regionId}>
                  <Link href={`/cars?region=${reg.slug}`} className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-2.5 text-sm hover:border-ink-300">
                    <span className="font-medium">{reg.name}</span><span className="tabular-nums text-ink-500">{r._count._all}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-lg bg-ink-900 p-6 text-white md:p-8">
          <h2 className="display text-2xl text-white">{dict.sell.title}</h2>
          <p className="mt-2 text-ink-100">{fmt(dict.reg.subtitle, { fee: formatTzs(SITE.registrationFeeTzs) })}</p>
          <ol className="mt-5 space-y-2 text-sm text-ink-100">
            <li><span className="plate mr-2 px-1.5 py-0 text-xs">1</span>{dict.sell.step1} & {dict.sell.step2.toLowerCase()}</li>
            <li><span className="plate mr-2 px-1.5 py-0 text-xs">2</span>{dict.sell.step4}</li>
            <li><span className="plate mr-2 px-1.5 py-0 text-xs">3</span>{locale === "sw" ? "Pokea simu na WhatsApp kutoka kwa wanunuzi" : "Get calls and WhatsApp messages from buyers"}</li>
          </ol>
          <Link href="/dashboard/registration" className="btn-plate mt-6">{dict.reg.registerNow}</Link>
        </div>
      </section>
    </>
  );
}

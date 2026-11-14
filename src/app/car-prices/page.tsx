import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { prisma } from "@/lib/prisma";
import { marketBy, marketSummary, MIN_GROUP, type Scope } from "@/server/market";
import { formatTzsCompact } from "@/lib/money";
import { priceBandLinks } from "@/lib/price-bands";
import { bodyFromSlug, browseHref } from "@/lib/browse";
import { BodyType } from "@/generated/prisma/enums";
import { SITE } from "@/config/site";

export const revalidate = 600;
type SP = Promise<{ make?: string; model?: string; body?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const make = sp.make ? await prisma.make.findUnique({ where: { slug: sp.make }, select: { name: true } }) : null;
  const model = make && sp.model ? await prisma.vehicleModel.findFirst({ where: { slug: sp.model, make: { slug: sp.make } }, select: { name: true } }) : null;
  const what = [make?.name, model?.name].filter(Boolean).join(" ");
  return {
    title: what ? `${what} prices in ${SITE.countryName}` : `Car prices in ${SITE.countryName}`,
    description: `What ${what || "used and new cars"} cost in ${SITE.countryName} right now: typical asking prices by model, model year and town, from cars for sale on ${SITE.name}. Updated through the day.`,
    alternates: { canonical: `/car-prices${sp.make ? `?make=${sp.make}${sp.model ? `&model=${sp.model}` : ""}` : ""}` },
  };
}

export default async function CarPricesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { dict, locale } = await getDictionary();
  const sw = locale === "sw";

  const make = sp.make ? await prisma.make.findUnique({ where: { slug: sp.make }, select: { id: true, name: true, slug: true, models: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } } } }) : null;
  const model = make && sp.model ? make.models.find((m) => m.slug === sp.model) ?? null : null;
  const body = sp.body ? bodyFromSlug(sp.body) : null;
  const scope: Scope = { makeId: make?.id, modelId: model?.id, body: body ?? undefined };
  const what = [make?.name, model?.name].filter(Boolean).join(" ") || (body ? enumLabel(dict, "BodyType", body) : "");

  const listingWhere = { status: "ACTIVE" as const, makeId: make?.id, modelId: model?.id, bodyType: body ?? undefined };
  const bands = priceBandLinks(dict);
  const [makes, summary, byModel, byYear, byCondition, byRegion, bandCounts] = await Promise.all([
    prisma.make.findMany({ where: { listings: { some: { status: "ACTIVE" } } }, select: { name: true, slug: true }, orderBy: { name: "asc" } }),
    marketSummary(scope),
    model ? Promise.resolve([]) : marketBy(scope, "model", 15),
    make ? marketBy(scope, "year", 30, 2) : Promise.resolve([]),
    marketBy(scope, "condition", 5, 2),
    marketBy(scope, "region", 12, 2),
    Promise.all(bands.map((b) => prisma.listing.count({ where: { ...listingWhere, priceTzs: { gte: b.min ? BigInt(b.min) : undefined, lt: b.max ? BigInt(b.max) : undefined } } }))),
  ]);
  const [models, regions] = await Promise.all([
    prisma.vehicleModel.findMany({ where: { id: { in: byModel.map((g) => Number(g.key)) } }, select: { id: true, name: true, slug: true, make: { select: { name: true, slug: true } } } }),
    prisma.region.findMany({ where: { id: { in: byRegion.map((g) => Number(g.key)) } }, select: { id: true, name: true, slug: true } }),
  ]);
  const modelById = new Map(models.map((m) => [String(m.id), m]));
  const regionById = new Map(regions.map((r) => [String(r.id), r]));
  const years = [...byYear].sort((a, b) => Number(b.key) - Number(a.key));
  const bandTotal = bandCounts.reduce((a, b) => a + b, 0) || 1;
  const carsHref = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ ...(make ? { make: make.slug } : {}), ...(model ? { model: model.slug } : {}), ...(body ? { body } : {}), ...extra });
    return `/cars${p.size ? `?${p}` : ""}`;
  };
  const th = "py-2 pr-3 text-left text-xs font-semibold text-ink-500";
  const td = "py-2.5 pr-3 tabular-nums";

  return (
    <div className="container max-w-5xl py-8">
      <h1 className="display text-3xl md:text-4xl">{what ? (sw ? `Bei za ${what} ${SITE.countryName}` : `${what} prices in ${SITE.countryName}`) : (sw ? `Bei za magari ${SITE.countryName}` : `Car prices in ${SITE.countryName}`)}</h1>
      <p className="mt-2 max-w-2xl text-ink-700">{sw ? `Bei zinazoombwa sasa kwenye ${SITE.name}, kwa modeli, mwaka na mji. Bei ya kawaida ni ya katikati; "mengi kati ya" ni nusu ya kati ya magari yote.` : `What cars are listed for on ${SITE.name} right now, by model, model year and town. "Typical" is the middle price; "most between" covers the middle half of cars.`}</p>

      <form action="/car-prices" className="panel mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <select name="make" defaultValue={make?.slug ?? ""} className="field" aria-label={dict.spec.make}>
          <option value="">{dict.hero.anyMake}</option>
          {makes.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
        </select>
        <select name="model" defaultValue={model?.slug ?? ""} className="field" aria-label={dict.spec.model} disabled={!make}>
          <option value="">{make ? dict.hero.anyModel : (sw ? "Chagua aina kwanza" : "Choose a make first")}</option>
          {make?.models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
        </select>
        <select name="body" defaultValue={body ?? ""} className="field" aria-label={dict.spec.body}>
          <option value="">{sw ? "Umbo lolote" : "Any body type"}</option>
          {Object.values(BodyType).map((b) => <option key={b} value={b.toLowerCase()}>{enumLabel(dict, "BodyType", b)}</option>)}
        </select>
        <button className="btn-primary">{sw ? "Onyesha bei" : "Show prices"}</button>
      </form>

      {summary.count === 0 ? (
        <p className="panel mt-6 p-6 text-sm text-ink-700">{sw ? "Hakuna magari yanayouzwa yanayolingana na chaguo hili kwa sasa." : "No cars for sale match this right now."} <Link href="/car-prices" className="font-semibold underline">{sw ? "Ona bei zote" : "See all prices"}</Link></p>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="panel p-4"><dt className="text-xs text-ink-500">{sw ? "Yanayouzwa" : "Cars for sale"}</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{summary.count.toLocaleString()}</dd></div>
            <div className="panel p-4"><dt className="text-xs text-ink-500">{sw ? "Bei ya kawaida" : "Typical asking price"}</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{summary.count >= MIN_GROUP ? formatTzsCompact(summary.median) : "—"}</dd></div>
            <div className="panel p-4"><dt className="text-xs text-ink-500">{sw ? "Mengi kati ya" : "Most between"}</dt><dd className="mt-1 text-lg font-bold tabular-nums">{summary.count >= 4 ? `${formatTzsCompact(summary.p25)} – ${formatTzsCompact(summary.p75)}` : "—"}</dd></div>
            <div className="panel p-4"><dt className="text-xs text-ink-500">{sw ? "Kilomita za kawaida" : "Typical mileage"}</dt><dd className="mt-1 text-lg font-bold tabular-nums">{summary.medianKm !== null ? `${summary.medianKm.toLocaleString()} km` : "—"}</dd></div>
          </dl>

          {byModel.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{sw ? "Modeli maarufu" : "Popular models"}</h2>
              <div className="panel mt-3 overflow-x-auto px-4">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead><tr className="border-b border-line"><th className={th}>{dict.spec.model}</th><th className={th}>{sw ? "Magari" : "Cars"}</th><th className={th}>{sw ? "Bei ya kawaida" : "Typical"}</th><th className={th}>{sw ? "Mengi kati ya" : "Most between"}</th></tr></thead>
                  <tbody>
                    {byModel.map((g) => {
                      const m = modelById.get(g.key);
                      if (!m) return null;
                      return (
                        <tr key={g.key} className="border-b border-line last:border-0">
                          <td className="py-2.5 pr-3"><Link href={`/car-prices?make=${m.make.slug}&model=${m.slug}`} className="font-medium hover:underline">{make ? m.name : `${m.make.name} ${m.name}`}</Link></td>
                          <td className={td}><Link href={`/cars?make=${m.make.slug}&model=${m.slug}`} className="underline-offset-2 hover:underline">{g.count}</Link></td>
                          <td className={`${td} font-semibold`}>{formatTzsCompact(g.median)}</td>
                          <td className={`${td} text-ink-700`}>{formatTzsCompact(g.p25)} – {formatTzsCompact(g.p75)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {years.length > 1 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{sw ? `Bei kwa mwaka wa gari${what ? ` — ${what}` : ""}` : `Price by model year${what ? ` — ${what}` : ""}`}</h2>
              <div className="panel mt-3 overflow-x-auto px-4">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead><tr className="border-b border-line"><th className={th}>{dict.spec.year}</th><th className={th}>{sw ? "Magari" : "Cars"}</th><th className={th}>{sw ? "Bei ya kawaida" : "Typical"}</th><th className={th}>{sw ? "Mengi kati ya" : "Most between"}</th></tr></thead>
                  <tbody>
                    {years.map((g) => (
                      <tr key={g.key} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-3 font-medium tabular-nums"><Link href={carsHref({ yearMin: g.key, yearMax: g.key })} className="hover:underline">{g.key}</Link></td>
                        <td className={td}>{g.count}</td>
                        <td className={`${td} font-semibold`}>{formatTzsCompact(g.median)}</td>
                        <td className={`${td} text-ink-700`}>{g.count >= 4 ? `${formatTzsCompact(g.p25)} – ${formatTzsCompact(g.p75)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <section>
              <h2 className="text-xl font-bold">{sw ? "Magari kwa kiwango cha bei" : "Cars by budget"}</h2>
              <ul className="mt-3 space-y-2.5">
                {bands.map((b, i) => (
                  <li key={b.href}>
                    <Link href={carsHref({ ...(b.min ? { priceMin: String(b.min) } : {}), ...(b.max ? { priceMax: String(b.max) } : {}) })} className="group block">
                      <span className="flex justify-between text-sm"><span className="font-medium group-hover:underline">{b.label}</span><span className="tabular-nums text-ink-500">{bandCounts[i].toLocaleString()}</span></span>
                      <span className="mt-1 block h-2 rounded-full bg-ink-100"><span className="block h-2 rounded-full bg-ink-700" style={{ width: `${Math.round((bandCounts[i] / bandTotal) * 100)}%` }} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {byCondition.length > 0 && (
              <section>
                <h2 className="text-xl font-bold">{sw ? "Yaliyoagizwa dhidi ya yaliyotumika nchini" : "Imported vs locally used"}</h2>
                <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white">
                  {byCondition.map((g) => (
                    <li key={g.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <Link href={carsHref({ condition: g.key })} className="font-medium hover:underline">{enumLabel(dict, "VehicleCondition", g.key)}</Link>
                      <span className="text-right tabular-nums"><span className="font-semibold">{formatTzsCompact(g.median)}</span><span className="block text-2xs text-ink-500">{fmt(sw ? "magari {n}" : "{n} cars", { n: g.count })}</span></span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-2xs text-ink-500">{sw ? "Linganisha mwaka mmoja wa modeli moja ili kuona tofauti halisi." : "Compare one model and year to see the real difference — pick a model above."}</p>
              </section>
            )}
          </div>

          {byRegion.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{sw ? `Kwa ${dict.spec.region.toLowerCase()}` : `By ${dict.spec.region.toLowerCase()}`}</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {byRegion.map((g) => {
                  const r = regionById.get(g.key);
                  return r ? (
                    <li key={g.key}>
                      <Link href={browseHref.region(r.slug)} className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-2.5 text-sm hover:border-ink-300">
                        <span className="font-medium">{r.name}<span className="block text-2xs font-normal text-ink-500">{fmt(sw ? "magari {n}" : "{n} cars", { n: g.count })}</span></span>
                        <span className="font-semibold tabular-nums">{formatTzsCompact(g.median)}</span>
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="mt-10 max-w-3xl text-xs leading-5 text-ink-500">
        {sw
          ? `Takwimu hizi zinatoka kwa magari yanayouzwa sasa kwenye ${SITE.name} na husasishwa mara kwa mara mchana. Ni bei zinazoombwa na wauzaji, si bei za mauzo wala thamani rasmi, na hatukagui hali, kilomita wala nyaraka za magari. Kila gari lina "Ukaguzi wa bei" kwenye ukurasa wake.`
          : `These figures come from cars for sale on ${SITE.name} right now and refresh through the day. They are sellers' asking prices — not sale prices or official valuations — and we don't verify condition, mileage or papers. Every car page has its own price check against similar cars.`}
      </p>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { listingFilterSchema, SORTS, type ListingFilters } from "@/lib/validation";
import { searchListings } from "@/server/listings";
import { marketBy, marketSummary, type Scope } from "@/server/market";
import { verdictsFor } from "@/server/market";
import { prisma } from "@/lib/prisma";
import { formatTzsCompact } from "@/lib/money";
import { VehicleCard } from "@/components/listing/VehicleCard";
import { SortSelect } from "@/components/search/SortSelect";
import { QuickFilters } from "@/components/search/QuickFilters";
import { Pagination } from "@/components/ui/Pagination";
import { browseHref } from "@/lib/browse";

type Crumb = { href: string; label: string };

/**
 * Shared layout for the make, body-type and town landing pages: what's for sale and at what
 * price (asking prices, labelled), a breakdown to drill into, then the cars themselves.
 */
export async function BrowseLanding({
  title, crumbs, scope, filters, basePath, searchParams, breakdown, moreHref, guideHref,
}: {
  title: string;
  crumbs: Crumb[];
  scope: Scope;
  filters: Partial<Record<keyof ListingFilters, unknown>>;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  breakdown: "model" | "make";
  moreHref: string;
  guideHref: string;
}) {
  const { dict, locale } = await getDictionary();
  const sw = locale === "sw";
  const params = Object.fromEntries(Object.entries(searchParams).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const f = listingFilterSchema.parse({ ...params, ...filters, sort: params.sort ?? "newest" });
  const [result, summary, groups, conditions] = await Promise.all([
    searchListings(f, { facets: false }),
    marketSummary(scope),
    marketBy(scope, breakdown, 24, 1),
    marketBy(scope, "condition", 5, 1),
  ]);
  const verdicts = await verdictsFor(result.items.map((l) => l.id));
  const names = breakdown === "model"
    ? await prisma.vehicleModel.findMany({ where: { id: { in: groups.map((g) => Number(g.key)) } }, select: { id: true, name: true, slug: true, make: { select: { slug: true } } } })
    : await prisma.make.findMany({ where: { id: { in: groups.map((g) => Number(g.key)) } }, select: { id: true, name: true, slug: true } });
  const byId = new Map(names.map((n) => [String(n.id), n]));
  const groupHref = (key: string) => {
    const n = byId.get(key) as { slug: string; make?: { slug: string } } | undefined;
    if (!n) return moreHref;
    if (breakdown === "model") return `/cars?make=${n.make!.slug}&model=${n.slug}`;
    const p = new URLSearchParams(moreHref.split("?")[1] ?? "");
    p.set("make", n.slug);
    return Object.keys(filters).length === 1 && filters.make ? browseHref.make(n.slug) : `/cars?${p}`;
  };
  const priced = groups.filter((g) => g.count >= 3).slice(0, 8);

  return (
    <div className="container py-8">
      <nav className="mb-3 text-xs text-ink-500" aria-label="Breadcrumb">
        {crumbs.map((c, i) => <span key={c.href}>{i > 0 && " / "}<Link href={c.href} className="hover:underline">{c.label}</Link></span>)}
      </nav>
      <h1 className="display text-3xl md:text-4xl">{title}</h1>

      {summary.count > 0 ? (
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div><dt className="text-xs text-ink-500">{sw ? "Yanayouzwa" : "For sale"}</dt><dd className="font-bold tabular-nums">{summary.count.toLocaleString()}</dd></div>
          {summary.count >= 3 && <div><dt className="text-xs text-ink-500">{sw ? "Bei ya kawaida" : "Typical asking price"}</dt><dd className="font-bold tabular-nums">{formatTzsCompact(summary.median)}</dd></div>}
          {summary.count >= 4 && <div><dt className="text-xs text-ink-500">{sw ? "Mengi kati ya" : "Most between"}</dt><dd className="font-bold tabular-nums">{formatTzsCompact(summary.p25)} – {formatTzsCompact(summary.p75)}</dd></div>}
          {summary.yearMin && <div><dt className="text-xs text-ink-500">{sw ? "Miaka" : "Model years"}</dt><dd className="font-bold tabular-nums">{summary.yearMin === summary.yearMax ? summary.yearMin : `${summary.yearMin} – ${summary.yearMax}`}</dd></div>}
          {summary.medianKm !== null && <div><dt className="text-xs text-ink-500">{sw ? "Kilomita za kawaida" : "Typical mileage"}</dt><dd className="font-bold tabular-nums">{summary.medianKm.toLocaleString()} km</dd></div>}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-ink-700">{sw ? "Hakuna gari linalouzwa hapa kwa sasa. Hifadhi utafutaji upate taarifa gari likiwekwa." : "Nothing for sale here right now. Save a search on the cars page to hear when one is listed."}</p>
      )}

      {groups.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2" aria-label={breakdown === "model" ? (sw ? "Modeli" : "Models") : (sw ? "Aina" : "Makes")}>
          {groups.map((g) => {
            const n = byId.get(g.key);
            return n ? <Link key={g.key} href={groupHref(g.key)} className="chip hover:border-ink-700">{n.name}<span className="font-normal tabular-nums text-ink-500">{g.count}</span></Link> : null;
          })}
        </div>
      )}
      {conditions.length > 1 && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
          {conditions.map((c) => <span key={c.key}>{enumLabel(dict, "VehicleCondition", c.key)} <strong className="tabular-nums text-ink-700">{c.count}</strong></span>)}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label={dict.nav.cars}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <QuickFilters params={params} dict={dict} basePath={basePath} locale={locale} />
            <div className="shrink-0 self-end sm:self-start"><Suspense><SortSelect options={SORTS} /></Suspense></div>
          </div>
          {result.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((l, i) => <VehicleCard key={l.id} listing={l} dict={dict} locale={locale} priority={i < 3} verdict={verdicts[l.id]} />)}
            </div>
          ) : summary.count > 0 ? (
            <div className="panel p-8 text-center text-sm text-ink-700">{dict.search.noResults}</div>
          ) : null}
          <Pagination page={result.page} pages={result.pages} basePath={basePath} params={params} dict={dict} />
          <p className="mt-6 text-sm"><Link href={moreHref} className="font-semibold underline underline-offset-2">{sw ? "Chuja zaidi: bei, mwaka, kilomita, injini…" : "More filters: price, year, mileage, engine…"}</Link></p>
        </section>

        {priced.length > 0 && (
          <aside className="space-y-3 lg:sticky lg:top-28 lg:self-start">
            <div className="panel p-4">
              <h2 className="font-bold">{sw ? "Bei za kawaida" : "Typical asking prices"}</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {priced.map((g) => (
                    <tr key={g.key} className="border-t border-line first:border-0">
                      <td className="py-2 pr-2"><Link href={groupHref(g.key)} className="hover:underline">{byId.get(g.key)?.name}</Link><span className="block text-2xs text-ink-500">{fmt(sw ? "magari {n}" : "{n} cars", { n: g.count })}</span></td>
                      <td className="py-2 text-right tabular-nums"><span className="font-semibold">{formatTzsCompact(g.median)}</span><span className="block text-2xs text-ink-500">{formatTzsCompact(g.p25)}–{formatTzsCompact(g.p75)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link href={guideHref} className="mt-3 inline-block text-sm font-semibold underline underline-offset-2">{sw ? "Mwongozo kamili wa bei" : "Full price guide"}</Link>
            </div>
            <p className="text-2xs leading-4 text-ink-500">{sw ? "Bei zinazoombwa na wauzaji kwenye tovuti hii sasa, si bei za mauzo wala thamani. Hatukagui magari." : "Sellers' asking prices on this site right now — not sale prices or valuations. Inspect any car before you pay."}</p>
          </aside>
        )}
      </div>
    </div>
  );
}

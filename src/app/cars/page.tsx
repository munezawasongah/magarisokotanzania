import type { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { listingFilterSchema, parseSearchParams, SORTS } from "@/lib/validation";
import { searchListings } from "@/server/listings";
import { getMakesWithModels, getRegionsWithDistricts } from "@/server/taxonomy";
import { VehicleCard } from "@/components/listing/VehicleCard";
import { FilterSidebar } from "@/components/search/FilterSidebar";
import { SortSelect } from "@/components/search/SortSelect";
import { KeywordBox } from "@/components/search/KeywordBox";
import { Pagination } from "@/components/ui/Pagination";
import { QuickFilters } from "@/components/search/QuickFilters";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** SEO: "Toyota Harrier for sale in Arusha" style titles derived from filters. */
export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = parseSearchParams(listingFilterSchema, await searchParams);
  const [makes, regions] = await Promise.all([getMakesWithModels(), getRegionsWithDistricts()]);
  const make = makes.find((m) => m.slug === f.make);
  const model = make?.models.find((m) => m.slug === f.model);
  const region = regions.find((r) => r.slug === f.region);
  const what = [make?.name, model?.name].filter(Boolean).join(" ") || "Cars";
  const where = region ? ` in ${region.name}` : " in Tanzania";
  const title = `${what} for sale${where}`;
  const canonical = new URLSearchParams();
  if (f.make) canonical.set("make", f.make);
  if (f.model) canonical.set("model", f.model);
  if (f.region) canonical.set("region", f.region);
  return {
    title,
    description: `Browse ${what.toLowerCase() === "cars" ? "new and used cars" : what} for sale${where}. Prices in TZS, verified dealers, chat with sellers on WhatsApp.`,
    alternates: { canonical: `/cars${canonical.size ? `?${canonical}` : ""}` },
  };
}

export default async function CarsPage({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const filters = parseSearchParams(listingFilterSchema, raw);
  const { dict, locale } = await getDictionary();
  const [result, makes, regions] = await Promise.all([searchListings(filters), getMakesWithModels(), getRegionsWithDistricts()]);
  const params = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string")) as Record<string, string>;

  const make = makes.find((m) => m.slug === filters.make);
  const model = make?.models.find((m) => m.slug === filters.model);
  const region = regions.find((r) => r.slug === filters.region);
  const heading = [make?.name, model?.name].filter(Boolean).join(" ") || (filters.body?.length === 1 ? enumLabel(dict, "BodyType", filters.body[0]) : dict.nav.cars);

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-3xl">{heading}{region ? ` · ${region.name}` : ""}</h1>
          <p className="mt-1 text-sm text-ink-500" aria-live="polite">{fmt(dict.search.results, { count: result.total.toLocaleString() })}</p>
        </div>
        <KeywordBox placeholder={`${dict.search.keyword}: Harrier, 4x4, diesel…`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar
          makes={makes}
          regions={regions}
          facets={result.facets}
          total={result.total}
        />
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <QuickFilters params={params} dict={dict} />
            <div className="shrink-0 self-end sm:self-start"><SortSelect options={SORTS} /></div>
          </div>
          {result.items.length === 0 ? (
            <div className="panel p-10 text-center">
              <p className="text-lg font-semibold">{dict.search.noResults}</p>
              <p className="mt-1 text-sm text-ink-500">{locale === "sw" ? "Jaribu kuondoa baadhi ya vichujio au kutafuta mkoa mwingine." : "Try removing a filter or searching another region."}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((l, i) => <VehicleCard key={l.id} listing={l} dict={dict} locale={locale} priority={i < 3} />)}
            </div>
          )}
          <Pagination page={result.page} pages={result.pages} basePath="/cars" params={params} dict={dict} />
        </div>
      </div>
    </div>
  );
}

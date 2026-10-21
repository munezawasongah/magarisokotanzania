import type { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";
import { parseSearchParams, partFilterSchema } from "@/lib/validation";
import { searchParts } from "@/server/parts";
import { getMakesWithModels, getRegionsWithDistricts } from "@/server/taxonomy";
import { PartCard } from "@/components/parts/PartCard";
import { PartFilters } from "@/components/parts/PartFilters";
import { KeywordBox } from "@/components/search/KeywordBox";
import { SortSelect } from "@/components/search/SortSelect";
import { Pagination } from "@/components/ui/Pagination";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = parseSearchParams(partFilterSchema, await searchParams);
  const makes = await getMakesWithModels();
  const make = makes.find((m) => m.slug === f.make);
  const model = make?.models.find((m) => m.slug === f.model);
  const veh = [make?.name, model?.name].filter(Boolean).join(" ");
  return { title: veh ? `${veh} spare parts in Tanzania` : "Car spare parts in Tanzania", description: `Genuine, OEM and ex-Japan ${veh ? veh + " " : ""}spare parts with fitment check. Prices in TZS from verified vendors in Kariakoo and across Tanzania.` };
}

export default async function PartsPage({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const f = parseSearchParams(partFilterSchema, raw);
  const { dict, locale } = await getDictionary();
  const [res, makes, regions] = await Promise.all([searchParts(f), getMakesWithModels(), getRegionsWithDistricts()]);
  const params = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-3xl">{dict.parts.title}</h1>
          <p className="mt-1 text-sm text-ink-500" aria-live="polite">{fmt(dict.parts.results, { count: res.total })}</p>
        </div>
        <KeywordBox placeholder={dict.hero.keywordParts} />
      </div>
      <PartFilters makes={makes} regions={regions.map((r) => ({ slug: r.slug, name: r.name }))} />
      <div className="my-4 flex justify-end"><SortSelect options={["relevance", "newest", "price_asc", "price_desc"]} /></div>
      {res.items.length === 0 ? (
        <div className="panel p-10 text-center"><p className="font-semibold">{locale === "sw" ? "Hakuna kipuri kilichopatikana" : "No parts match"}</p><p className="mt-1 text-sm text-ink-500">{locale === "sw" ? "Jaribu namba ya OEM au ondoa mwaka." : "Try the OEM number or remove the year filter."}</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{res.items.map((p) => <PartCard key={p.id} part={p} dict={dict} locale={locale} />)}</div>
      )}
      <Pagination page={res.page} pages={res.pages} basePath="/parts" params={params} dict={dict} />
    </div>
  );
}

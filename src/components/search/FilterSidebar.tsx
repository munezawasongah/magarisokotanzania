"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import { BodyType, FuelType, SellerType, Steering, Transmission, VehicleCondition } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type MakeOpt = { slug: string; name: string; models: Array<{ slug: string; name: string }> };
type RegionOpt = { slug: string; name: string; districts: Array<{ id: number; name: string }> };
type Facets = { makes: Array<{ slug: string; count: number }>; bodyTypes: Array<{ value: string; count: number }>; fuelTypes: Array<{ value: string; count: number }>; regions: Array<{ slug: string; count: number }> } | null;

const YEARS = Array.from({ length: 36 }, (_, i) => new Date().getFullYear() + 1 - i);

/**
 * Advanced filters, synced to the URL so every search is shareable and SEO-crawlable.
 * Desktop: sticky sidebar. Mobile: full-screen sheet behind a "Filters" button.
 */
export function FilterSidebar({ makes, regions, facets, total }: { makes: MakeOpt[]; regions: RegionOpt[]; facets: Facets; total: number }) {
  const { dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(sp.entries()));

  useEffect(() => setDraft(Object.fromEntries(sp.entries())), [sp]);

  const count = (list: Array<{ value?: string; slug?: string; count: number }> | undefined, key: string) =>
    list?.find((x) => (x.value ?? x.slug) === key)?.count;

  function commit(next: Record<string, string>) {
    const clean = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v && k !== "page") clean.set(k, v);
    start(() => router.push(`${pathname}${clean.size ? `?${clean}` : ""}`, { scroll: false }));
  }
  function set(key: string, value: string, immediate = true) {
    const next = { ...draft, [key]: value };
    if (key === "make") next.model = "";
    if (key === "region") next.district = "";
    setDraft(next);
    if (immediate) commit(next);
  }
  function toggleList(key: string, value: string) {
    const cur = new Set((draft[key] ?? "").split(",").filter(Boolean));
    if (cur.has(value)) cur.delete(value);
    else cur.add(value);
    set(key, [...cur].join(","));
  }
  const has = (key: string, value: string) => (draft[key] ?? "").split(",").includes(value);

  const models = useMemo(() => makes.find((m) => m.slug === draft.make)?.models ?? [], [makes, draft.make]);
  const districts = useMemo(() => regions.find((r) => r.slug === draft.region)?.districts ?? [], [regions, draft.region]);
  const activeCount = Object.entries(draft).filter(([k, v]) => v && !["sort", "page", "q"].includes(k)).length;

  const checks = (name: string, group: EnumGroup, values: string[], facet?: Array<{ value: string; count: number }>) => (
    <Checks values={values} group={group} dict={dict} isChecked={(v) => has(name, v)} onToggle={(v) => toggleList(name, v)} countOf={(v) => count(facet, v)} />
  );

  const body = (
    <div className={cn("space-y-0", pending && "opacity-70")}>
      <Section title={`${dict.spec.make} / ${dict.spec.model}`}>
        <div className="space-y-2">
          <select className="field" value={draft.make ?? ""} onChange={(e) => set("make", e.target.value)} aria-label={dict.spec.make}>
            <option value="">{dict.hero.anyMake}</option>
            {makes.map((m) => {
              const c = count(facets?.makes, m.slug);
              return <option key={m.slug} value={m.slug}>{m.name}{c ? ` (${c})` : ""}</option>;
            })}
          </select>
          <select className="field" value={draft.model ?? ""} onChange={(e) => set("model", e.target.value)} disabled={!draft.make} aria-label={dict.spec.model}>
            <option value="">{dict.hero.anyModel}</option>
            {models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </select>
        </div>
      </Section>

      <Section title={dict.spec.condition}>{checks("condition", "VehicleCondition", Object.values(VehicleCondition))}</Section>
      <Section title={dict.search.sellerType}>{checks("sellerType", "SellerType", Object.values(SellerType))}</Section>

      <Section title={dict.search.yearRange}>
        <div className="grid grid-cols-2 gap-2">
          <select className="field" value={draft.yearMin ?? ""} onChange={(e) => set("yearMin", e.target.value)} aria-label={`${dict.search.yearRange} ${dict.search.min}`}>
            <option value="">{dict.search.min}</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="field" value={draft.yearMax ?? ""} onChange={(e) => set("yearMax", e.target.value)} aria-label={`${dict.search.yearRange} ${dict.search.max}`}>
            <option value="">{dict.search.max}</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </Section>

      <Section title={dict.search.priceRange}>
        <form className="grid grid-cols-[1fr_1fr_auto] gap-2" onSubmit={(e) => { e.preventDefault(); commit(draft); }}>
          <input className="field" inputMode="numeric" placeholder={`${dict.search.min} (e.g. 15m)`} value={draft.priceMin ?? ""} onChange={(e) => set("priceMin", e.target.value, false)} aria-label={`${dict.search.priceRange} ${dict.search.min}`} />
          <input className="field" inputMode="numeric" placeholder={`${dict.search.max} (e.g. 60m)`} value={draft.priceMax ?? ""} onChange={(e) => set("priceMax", e.target.value, false)} aria-label={`${dict.search.priceRange} ${dict.search.max}`} />
          <button className="btn-ghost px-3" type="submit">OK</button>
        </form>
      </Section>

      <Section title={dict.spec.fuel}>{checks("fuel", "FuelType", Object.values(FuelType), facets?.fuelTypes)}</Section>

      <Section title={dict.spec.transmission}>{checks("transmission", "Transmission", Object.values(Transmission))}</Section>
      <Section title={dict.search.mileage}>
        <div className="grid grid-cols-2 gap-2">
          <select className="field" value={draft.mileageMin ?? ""} onChange={(e) => set("mileageMin", e.target.value)} aria-label={`${dict.search.mileage} ${dict.search.min}`}>
            <option value="">{dict.search.min}</option>
            {[10000, 30000, 50000, 80000, 100000, 150000].map((k) => <option key={k} value={k}>≥ {k.toLocaleString()} km</option>)}
          </select>
          <select className="field" value={draft.mileageMax ?? ""} onChange={(e) => set("mileageMax", e.target.value)} aria-label={`${dict.search.mileage} ${dict.search.max}`}>
            <option value="">{dict.search.max}</option>
            {[10000, 30000, 50000, 80000, 100000, 150000, 200000].map((k) => <option key={k} value={k}>≤ {k.toLocaleString()} km</option>)}
          </select>
        </div>
      </Section>

      <Section title={dict.spec.body}>{checks("body", "BodyType", Object.values(BodyType), facets?.bodyTypes)}</Section>
      <Section title={`${dict.spec.region} / ${dict.spec.district}`}>
        <div className="space-y-2">
          <select className="field" value={draft.region ?? ""} onChange={(e) => set("region", e.target.value)} aria-label={dict.spec.region}>
            <option value="">{dict.hero.anyRegion}</option>
            {regions.map((r) => {
              const c = count(facets?.regions, r.slug);
              return <option key={r.slug} value={r.slug}>{r.name}{c ? ` (${c})` : ""}</option>;
            })}
          </select>
          {districts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {districts.map((d) => (
                <button key={d.id} type="button" onClick={() => toggleList("district", String(d.id))}
                  className={cn("chip", has("district", String(d.id)) && "border-ink-900 bg-ink-900 text-white")}>{d.name}</button>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section title={dict.spec.steering}>{checks("steering", "Steering", Object.values(Steering))}</Section>
      <Section title={dict.search.terrain}>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" className="h-4 w-4 rounded border-line" checked={draft.fourWd === "1"} onChange={(e) => set("fourWd", e.target.checked ? "1" : "")} />
            {dict.search.fourWdOnly}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" className="h-4 w-4 rounded border-line" checked={draft.importOnly === "1"} onChange={(e) => set("importOnly", e.target.checked ? "1" : "")} />
            {dict.search.importOnly}
          </label>
          <select className="field" value={draft.minClearance ?? ""} onChange={(e) => set("minClearance", e.target.value)} aria-label={dict.search.minClearance}>
            <option value="">{dict.search.minClearance}</option>
            {[160, 180, 200, 220].map((mm) => <option key={mm} value={mm}>≥ {mm} mm</option>)}
          </select>
        </div>
      </Section>
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-2 lg:hidden">
        <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> {dict.search.filters}{activeCount ? ` (${activeCount})` : ""}
        </button>
        {activeCount > 0 && <button type="button" className="text-sm font-medium text-ink-700 underline" onClick={() => commit({ q: draft.q ?? "", sort: draft.sort ?? "" })}>{dict.search.clear}</button>}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-28 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{dict.search.filters}</h2>
            {activeCount > 0 && <button type="button" className="text-xs font-medium text-ink-700 underline" onClick={() => commit({ q: draft.q ?? "", sort: draft.sort ?? "" })}>{dict.search.clear}</button>}
          </div>
          {body}
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden" role="dialog" aria-modal="true" aria-label={dict.search.filters}>
          <div className="flex items-center justify-between border-b border-line p-4">
            <h2 className="text-base font-bold">{dict.search.filters}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label={dict.common.cancel}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{body}</div>
          <div className="border-t border-line p-4">
            <button type="button" className="btn-primary w-full" onClick={() => setOpen(false)}>{dict.search.apply} ({total})</button>
          </div>
        </div>
      )}
    </>
  );
}

type EnumGroup = Parameters<typeof enumLabel>[1];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 text-sm font-semibold text-ink-950">{title}</legend>
      {children}
    </fieldset>
  );
}

function Checks({ values, group, dict, isChecked, onToggle, countOf }: {
  values: string[]; group: EnumGroup; dict: ReturnType<typeof useI18n>["dict"];
  isChecked: (v: string) => boolean; onToggle: (v: string) => void; countOf: (v: string) => number | undefined;
}) {
  return (
    <div className="space-y-1.5">
      {values.map((v) => {
        const c = countOf(v);
        return (
          <label key={v} className="flex cursor-pointer items-center justify-between gap-2 text-sm text-ink-700">
            <span className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-line text-ink-900 focus:ring-ink-700" checked={isChecked(v)} onChange={() => onToggle(v)} />
              {enumLabel(dict, group, v)}
            </span>
            {c !== undefined && <span className="text-xs tabular-nums text-ink-300">{c}</span>}
          </label>
        );
      })}
    </div>
  );
}

"use client";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import { PartCategory, PartCondition, PartAuthenticity } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type MakeOpt = { slug: string; name: string; models: Array<{ slug: string; name: string }> };
const YEARS = Array.from({ length: 35 }, (_, i) => new Date().getFullYear() - i);

/** "My vehicle" fitment bar + category chips for the parts store. */
export function PartFilters({ makes, regions }: { makes: MakeOpt[]; regions: Array<{ slug: string; name: string }> }) {
  const { dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";
  const models = useMemo(() => makes.find((m) => m.slug === get("make"))?.models ?? [], [makes, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(patch: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    router.push(`${pathname}?${next}`, { scroll: false });
  }
  const cats = get("category").split(",").filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-ink-900 p-4 text-white">
        <p className="mb-2 text-sm font-semibold">{dict.parts.fitment}:</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <select className="field" value={get("make")} onChange={(e) => set({ make: e.target.value, model: "" })} aria-label={dict.hero.fitsMake}>
            <option value="">{dict.parts.allMakes}</option>{makes.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </select>
          <select className="field" value={get("model")} disabled={!get("make")} onChange={(e) => set({ model: e.target.value })} aria-label={dict.hero.fitsModel}>
            <option value="">{dict.hero.anyModel}</option>{models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </select>
          <select className="field" value={get("year")} onChange={(e) => set({ year: e.target.value })} aria-label={dict.hero.year}>
            <option value="">{dict.hero.year}</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="field" value={get("region")} onChange={(e) => set({ region: e.target.value })} aria-label={dict.spec.region}>
            <option value="">{dict.hero.anyRegion}</option>{regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.values(PartCategory).map((c) => {
          const on = cats.includes(c);
          return (
            <button key={c} type="button" onClick={() => set({ category: on ? cats.filter((x) => x !== c).join(",") : [...cats, c].join(",") })}
              className={cn("chip", on && "border-ink-900 bg-ink-900 text-white")} aria-pressed={on}>{enumLabel(dict, "PartCategory", c)}</button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <select className="field w-auto py-1.5" value={get("condition")} onChange={(e) => set({ condition: e.target.value })} aria-label={dict.spec.condition}>
          <option value="">{dict.spec.condition}: {dict.search.any}</option>{Object.values(PartCondition).map((c) => <option key={c} value={c}>{enumLabel(dict, "PartCondition", c)}</option>)}
        </select>
        <select className="field w-auto py-1.5" value={get("authenticity")} onChange={(e) => set({ authenticity: e.target.value })} aria-label="Type">
          <option value="">OEM / aftermarket</option>{Object.values(PartAuthenticity).map((c) => <option key={c} value={c}>{enumLabel(dict, "PartAuthenticity", c)}</option>)}
        </select>
      </div>
    </div>
  );
}

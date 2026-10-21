"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, LayoutGrid, Search, Wrench } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import { cn } from "@/lib/utils";
import { PartCategory } from "@/generated/prisma/enums";

type MakeOpt = { id: number; name: string; slug: string; isPopular: boolean; models: Array<{ id: number; name: string; slug: string }> };
type RegionOpt = { slug: string; name: string };

const PRICE_STEPS = [5, 10, 15, 20, 30, 40, 50, 70, 100, 150, 200, 300].map((m) => m * 1_000_000);
const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

/**
 * Tabbed hero search. "Cars" builds a /cars query; "Spare Parts" builds a /parts
 * query with vehicle fitment (make/model/year) so results only show parts that fit.
 */
type Tab = "all" | "cars" | "parts";

export function HeroSearch({ makes, regions, defaultTab = "all" }: { makes: MakeOpt[]; regions: RegionOpt[]; defaultTab?: Tab }) {
  const { dict } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [region, setRegion] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");

  const models = useMemo(() => makes.find((m) => m.slug === make)?.models ?? [], [make, makes]);
  const popular = makes.filter((m) => m.isPopular);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (tab === "all") {
      if (q.trim()) sp.set("q", q.trim());
      if (region) sp.set("region", region);
      router.push(`/search${sp.size ? `?${sp}` : ""}`);
      return;
    }
    if (make) sp.set("make", make);
    if (model) sp.set("model", model);
    if (region) sp.set("region", region);
    if (tab === "cars") {
      if (priceMax) sp.set("priceMax", priceMax);
      router.push(`/cars${sp.size ? `?${sp}` : ""}`);
    } else {
      if (q.trim()) sp.set("q", q.trim());
      if (category) sp.set("category", category);
      if (year) sp.set("year", year);
      router.push(`/parts${sp.size ? `?${sp}` : ""}`);
    }
  }

  const tabBtn = (id: Tab, label: string, Icon: typeof Car) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={cn(
        "flex items-center gap-2 rounded-t-md px-4 py-2.5 text-sm font-semibold transition-colors",
        tab === id ? "bg-white text-ink-950" : "text-ink-100 hover:bg-white/10",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className="w-full">
      <div role="tablist" className="flex gap-1">
        {tabBtn("all", dict.searchAll.all, LayoutGrid)}
        {tabBtn("cars", dict.hero.tabCars, Car)}
        {tabBtn("parts", dict.hero.tabParts, Wrench)}
      </div>
      <form onSubmit={submit} className="rounded-b-lg rounded-tr-lg bg-white p-3 shadow-lift sm:p-4">
        {tab === "all" ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_220px_auto]">
            <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.searchAll.placeholder} aria-label={dict.searchAll.title} enterKeyHint="search" />
            <select className="field" value={region} onChange={(e) => setRegion(e.target.value)} aria-label={dict.spec.region}>
              <option value="">{dict.hero.anyRegion}</option>
              {regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
            <button className="btn-plate min-h-11 px-6" type="submit"><Search className="h-4 w-4" /> {dict.hero.search}</button>
          </div>
        ) : tab === "cars" ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <select className="field" value={make} onChange={(e) => { setMake(e.target.value); setModel(""); }} aria-label={dict.spec.make}>
              <option value="">{dict.hero.anyMake}</option>
              {makes.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
            <select className="field" value={model} onChange={(e) => setModel(e.target.value)} disabled={!make} aria-label={dict.spec.model}>
              <option value="">{dict.hero.anyModel}</option>
              {models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
            <select className="field" value={region} onChange={(e) => setRegion(e.target.value)} aria-label={dict.spec.region}>
              <option value="">{dict.hero.anyRegion}</option>
              {regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
            <select className="field" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} aria-label={dict.hero.maxPrice}>
              <option value="">{dict.hero.maxPrice}</option>
              {PRICE_STEPS.map((p) => <option key={p} value={p}>TSh {p / 1_000_000}M</option>)}
            </select>
            <button className="btn-plate h-full min-h-11 px-6 sm:col-span-2 lg:col-span-1" type="submit">
              <Search className="h-4 w-4" /> {dict.hero.search}
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <input className="field sm:col-span-2 lg:col-span-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.hero.keywordParts} aria-label={dict.search.keyword} />
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)} aria-label={dict.hero.category}>
              <option value="">{dict.hero.anyCategory}</option>
              {Object.values(PartCategory).map((c) => <option key={c} value={c}>{enumLabel(dict, "PartCategory", c)}</option>)}
            </select>
            <select className="field" value={make} onChange={(e) => { setMake(e.target.value); setModel(""); }} aria-label={dict.hero.fitsMake}>
              <option value="">{dict.hero.fitsMake}</option>
              {makes.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select className="field" value={model} onChange={(e) => setModel(e.target.value)} disabled={!make} aria-label={dict.hero.fitsModel}>
                <option value="">{dict.hero.fitsModel}</option>
                {models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
              </select>
              <select className="field" value={year} onChange={(e) => setYear(e.target.value)} aria-label={dict.hero.year}>
                <option value="">{dict.hero.year}</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn-plate min-h-11 px-6" type="submit"><Search className="h-4 w-4" /> {dict.hero.search}</button>
          </div>
        )}
        {tab !== "parts" && popular.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            <span>{dict.hero.popular}</span>
            {popular.slice(0, 8).map((m) => (
              <a key={m.slug} href={`/cars?make=${m.slug}`} className="font-medium text-ink-700 underline-offset-2 hover:underline">{m.name}</a>
            ))}
          </p>
        )}
      </form>
    </div>
  );
}

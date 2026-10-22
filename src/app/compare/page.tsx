import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { Img } from "@/components/ui/Img";
import { PriceTag } from "@/components/ui/PriceTag";
import { CallButton, WhatsAppButton } from "@/components/listing/ContactButtons";
import { CompareRemove } from "@/components/compare/CompareRemove";
import { formatTzs } from "@/lib/money";
import { absoluteUrl, formatKm } from "@/lib/utils";
import { estimateMonthly, LOAN_DEFAULTS } from "@/lib/import-cost";
import { listingWhatsappMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Compare cars", robots: { index: false } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids: raw } = await searchParams;
  const { dict, locale } = await getDictionary();
  const t = dict.compare;
  const ids = (raw ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9]{20,40}$/i.test(s)).slice(0, 3);
  const found = ids.length
    ? await prisma.listing.findMany({
        where: { id: { in: ids }, status: "ACTIVE" },
        include: {
          make: { select: { name: true } }, model: { select: { name: true } }, region: { select: { name: true } }, district: { select: { name: true } },
          business: { select: { name: true, slug: true, verification: true, ratingAvg: true, ratingCount: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      })
    : [];
  const cars = ids.map((id) => found.find((c) => c.id === id)).filter((c): c is (typeof found)[number] => !!c);

  if (cars.length === 0) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <h1 className="display text-3xl">{t.title}</h1>
        <p className="mt-3 text-ink-500">{t.empty}</p>
        <Link href="/cars" className="btn-primary mt-6">{dict.nav.cars}</Link>
      </div>
    );
  }

  const price = (c: (typeof cars)[number]) => Number(c.landedCostTzs ?? c.priceTzs);
  const min = (vals: number[]) => Math.min(...vals);
  const max = (vals: number[]) => Math.max(...vals);
  const bestPrice = min(cars.map(price));
  const bestKm = min(cars.map((c) => c.mileageKm));
  const bestYear = max(cars.map((c) => c.year));

  type Row = { label: string; cells: React.ReactNode[]; best?: boolean[] };
  const rows: Row[] = [
    { label: dict.spec.year, cells: cars.map((c) => c.year), best: cars.map((c) => cars.length > 1 && c.year === bestYear) },
    { label: dict.spec.make, cells: cars.map((c) => c.make.name) },
    { label: dict.spec.model, cells: cars.map((c) => [c.model.name, c.trim].filter(Boolean).join(" ")) },
    { label: dict.spec.mileage, cells: cars.map((c) => formatKm(c.mileageKm)), best: cars.map((c) => cars.length > 1 && c.mileageKm === bestKm) },
    { label: dict.spec.fuel, cells: cars.map((c) => enumLabel(dict, "FuelType", c.fuelType)) },
    { label: dict.spec.transmission, cells: cars.map((c) => enumLabel(dict, "Transmission", c.transmission)) },
    { label: dict.spec.condition, cells: cars.map((c) => enumLabel(dict, "VehicleCondition", c.condition)) },
    { label: dict.search.sellerType, cells: cars.map((c) => enumLabel(dict, "SellerType", c.sellerType)) },
    { label: dict.spec.body, cells: cars.map((c) => enumLabel(dict, "BodyType", c.bodyType)) },
    { label: dict.spec.engine, cells: cars.map((c) => (c.engineCc ? `${c.engineCc.toLocaleString()} cc` : "—")) },
    { label: dict.spec.drivetrain, cells: cars.map((c) => (c.drivetrain ? enumLabel(dict, "Drivetrain", c.drivetrain) : "—")) },
    { label: dict.spec.steering, cells: cars.map((c) => enumLabel(dict, "Steering", c.steering)) },
    { label: dict.spec.color, cells: cars.map((c) => c.colorExterior ?? "—") },
    { label: dict.listing.landedTitle, cells: cars.map((c) => (c.isImportOnOrder && c.landedCostTzs ? formatTzs(c.landedCostTzs) : "—")) },
    { label: t.monthly, cells: cars.map((c) => formatTzs(estimateMonthly(price(c)))) },
    { label: dict.listing.features, cells: cars.map((c) => (c.features.length ? c.features.slice(0, 12).join(", ") : "—")) },
  ];

  return (
    <div className="container py-8">
      <h1 className="display text-3xl">{t.title}</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-sm">
          <colgroup><col className="w-36 sm:w-44" />{cars.map((c) => <col key={c.id} />)}</colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-paper" />
              {cars.map((c) => (
                <th key={c.id} className="px-2 pb-4 text-left align-top font-normal">
                  <div className="relative overflow-hidden rounded-lg border border-line bg-white">
                    <Link href={`/cars/${c.slug}`} className="relative block aspect-[4/3] bg-ink-100">
                      <Img src={c.images[0]?.url ?? "/placeholders/sedan.svg"} alt={c.title} fill sizes="(max-width: 768px) 60vw, 25vw" className="object-cover" transform="f_auto,q_auto,c_fill,w_480,h_360" />
                    </Link>
                    <CompareRemove id={c.id} label={t.remove} />
                    <div className="space-y-2 p-3">
                      <Link href={`/cars/${c.slug}`} className="line-clamp-2 font-semibold hover:underline">{c.title}</Link>
                      <div className="flex items-center gap-2">
                        <PriceTag value={c.priceTzs} />
                        {cars.length > 1 && price(c) === bestPrice && <span className="rounded bg-go-600 px-1.5 py-0.5 text-2xs font-bold text-white">{t.best}</span>}
                      </div>
                      <p className="flex items-center gap-1 text-xs text-ink-700"><MapPin className="h-3.5 w-3.5 text-ink-300" />{[c.district?.name, c.region.name].filter(Boolean).join(", ")}</p>
                      {c.business && (
                        <Link href={`/shop/${c.business.slug}`} className="flex items-center gap-1 text-xs text-ink-500 hover:underline">
                          {c.business.name}{c.business.verification === "VERIFIED" && <BadgeCheck className="h-3.5 w-3.5 text-go-600" aria-label={dict.listing.verified} />}
                          {c.business.ratingCount > 0 && <span>· ★ {c.business.ratingAvg.toFixed(1)}</span>}
                        </Link>
                      )}
                      <div className="flex gap-1.5">
                        <CallButton compact className="min-w-0 flex-1 justify-center text-xs" phone={c.contactPhone} listingId={c.id} label={dict.listing.call} />
                        <WhatsAppButton compact iconOnly className="shrink-0" phone={c.contactWhatsapp ?? c.contactPhone} listingId={c.id} label={dict.listing.whatsapp}
                          message={listingWhatsappMessage({ title: c.title, priceTzs: c.priceTzs, url: absoluteUrl(`/cars/${c.slug}`), locale })} />
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 ? "" : "bg-white"}>
                <th scope="row" className={cn("sticky left-0 z-10 border-t border-line px-3 py-2.5 text-left text-xs font-semibold text-ink-500", i % 2 ? "bg-paper" : "bg-white")}>{r.label}</th>
                {r.cells.map((cell, k) => (
                  <td key={k} className={cn("border-t border-line px-3 py-2.5 align-top", r.best?.[k] && "font-bold text-go-700")}>
                    {cell}{r.best?.[k] ? <span className="ml-1 text-2xs uppercase">· {t.best}</span> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-500">{fmt(dict.finance.note, { pct: LOAN_DEFAULTS.depositPct, months: LOAN_DEFAULTS.months, rate: LOAN_DEFAULTS.ratePct })}</p>
    </div>
  );
}

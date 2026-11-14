import Link from "next/link";
import { Fuel, ShieldCheck, Wrench } from "lucide-react";
import type { PriceCheck as Check } from "@/server/market";
import { PriceVerdict } from "@/components/market/PriceVerdict";
import { formatTzs, formatTzsCompact } from "@/lib/money";
import { SITE } from "@/config/site";

/** "Is this a fair price?" — compares the asking price with similar live cars. */
export function PriceCheck({ check, car, locale }: { check: Check | null; car: { make: string; model: string; makeSlug: string; modelSlug: string; condition: string; price: number }; locale: string }) {
  const sw = locale === "sw";
  const guide = `/car-prices?make=${car.makeSlug}&model=${car.modelSlug}`;
  if (!check) {
    return (
      <section className="panel p-5">
        <h2 className="text-lg font-bold">{sw ? "Ukaguzi wa bei" : "Price check"}</h2>
        <p className="mt-2 text-sm text-ink-700">
          {sw ? `Bado hakuna magari ya kutosha ya ${car.make} ${car.model} ya miaka hii yanayouzwa ili kulinganisha bei.` : `There aren't enough ${car.make} ${car.model}s of these years for sale yet to compare the price.`}{" "}
          <Link href={guide} className="font-semibold underline underline-offset-2">{sw ? "Angalia mwongozo wa bei" : "See the price guide"}</Link>
        </p>
      </section>
    );
  }
  const diff = Math.round(((car.price - check.median) / check.median) * 100);
  const span = Math.max(check.p75, car.price, check.median) * 1.08 - Math.min(check.p25, car.price, check.median) * 0.92;
  const lo = Math.min(check.p25, car.price, check.median) * 0.92;
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / span) * 100))}%`;
  const years = `${check.yearFrom}–${check.yearTo}`;
  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{sw ? "Ukaguzi wa bei" : "Price check"}</h2>
        <PriceVerdict verdict={check.verdict} locale={locale} className="text-xs" />
      </div>
      <p className="mt-2 text-sm text-ink-700">
        {sw
          ? <>Bei ya kawaida ya {car.make} {car.model} ya {years} inayouzwa sasa ni <strong className="tabular-nums text-ink-950">{formatTzs(check.median)}</strong>; mengi ni kati ya {formatTzsCompact(check.p25)} na {formatTzsCompact(check.p75)}. Gari hili ni {Math.abs(diff)}% {diff < 0 ? "chini" : "juu"} ya bei hiyo.</>
          : <>Typical asking price for a {years} {car.make} {car.model} for sale now is <strong className="tabular-nums text-ink-950">{formatTzs(check.median)}</strong>; most are between {formatTzsCompact(check.p25)} and {formatTzsCompact(check.p75)}. This car is {diff === 0 ? "right at" : `${Math.abs(diff)}% ${diff < 0 ? "below" : "above"}`} that.</>}
      </p>
      {/* Range bar: shaded middle half, tick at the typical price, dot at this car */}
      <div className="relative mt-5 h-2 rounded-full bg-ink-100" aria-hidden>
        <div className="absolute inset-y-0 rounded-full bg-ink-300/70" style={{ left: pos(check.p25), right: `calc(100% - ${pos(check.p75)})` }} />
        <div className="absolute -top-1 h-4 w-0.5 bg-ink-700" style={{ left: pos(check.median) }} />
        <div className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-plate-500 shadow" style={{ left: pos(car.price) }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-2xs text-ink-500 tabular-nums">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-ink-300/70" aria-hidden />{sw ? "Mengi" : "Most"} {formatTzsCompact(check.p25)}–{formatTzsCompact(check.p75)}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-0.5 bg-ink-700" aria-hidden />{sw ? "Bei ya kawaida" : "Typical"} {formatTzsCompact(check.median)}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-plate-500" aria-hidden />{sw ? "Gari hili" : "This car"} {formatTzsCompact(car.price)}</span>
      </div>
      <p className="mt-3 text-xs text-ink-500">
        {sw
          ? `Kulingana na magari ${check.count} yanayofanana${check.sameCondition ? " ya hali hiyo hiyo" : ""}. Hizi ni bei zinazoombwa na wauzaji, si thamani ya gari — kagua gari na nyaraka kabla ya kulipa.`
          : `Based on ${check.count} similar cars${check.sameCondition ? " in the same condition" : ""}. These are sellers' asking prices, not a valuation — inspect the car and its papers before you pay.`}{" "}
        <Link href={guide} className="font-semibold underline underline-offset-2">{sw ? "Mwongozo kamili wa bei" : "Full price guide"}</Link>
      </p>
    </section>
  );
}

/** Estimated monthly fuel and yearly insurance, clearly labelled as an estimate. */
export function RunningCosts({ est, fuelLabel, fuelNote, insurancePct, locale }: { est: { kmpl: number | null; litrePrice: number; fuelPerMonth: number | null; insurancePerYear: number; kmPerMonth: number }; fuelLabel: string; fuelNote: string; insurancePct: number; locale: string }) {
  const sw = locale === "sw";
  return (
    <section className="panel p-5">
      <h2 className="text-lg font-bold">{sw ? "Gharama za kuendesha (makadirio)" : "Cost to run (estimate)"}</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {est.fuelPerMonth !== null && (
          <div className="rounded-md bg-paper p-3">
            <dt className="flex items-center gap-1.5 text-xs text-ink-500"><Fuel className="h-3.5 w-3.5" aria-hidden />{sw ? "Mafuta kwa mwezi" : "Fuel per month"}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{formatTzs(est.fuelPerMonth)}</dd>
            <dd className="mt-0.5 text-2xs text-ink-500">{sw ? `Km ${est.kmPerMonth.toLocaleString()} kwa takriban km ${est.kmpl}/lita, ${fuelLabel.toLowerCase()} ${SITE.currencySymbol} ${est.litrePrice.toLocaleString()}/lita` : `${est.kmPerMonth.toLocaleString()} km at about ${est.kmpl} km/litre, ${fuelLabel.toLowerCase()} at ${SITE.currencySymbol} ${est.litrePrice.toLocaleString()}/litre`}</dd>
          </div>
        )}
        <div className="rounded-md bg-paper p-3">
          <dt className="flex items-center gap-1.5 text-xs text-ink-500"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />{sw ? "Bima kamili kwa mwaka" : "Comprehensive insurance per year"}</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">{formatTzs(est.insurancePerYear)}</dd>
          <dd className="mt-0.5 text-2xs text-ink-500">{sw ? `Takriban ${insurancePct}% ya bei ya gari` : `About ${insurancePct}% of the car's price`}</dd>
        </div>
      </dl>
      <p className="mt-3 text-2xs text-ink-500">{sw ? `Makadirio tu, si kutoka kwa muuzaji. Bei ya mafuta: ${fuelNote}. Matumizi halisi hutegemea gari, dereva na barabara; pata nukuu ya bima kutoka kwa kampuni ya bima.` : `An estimate, not from the seller. Fuel price: ${fuelNote}. Real use depends on the car, the driver and the roads; get an insurance quote from an insurer.`}</p>
    </section>
  );
}

/** Link to spare parts on the platform that fit this car. */
export function PartsThatFit({ count, href, label, locale }: { count: number; href: string; label: string; locale: string }) {
  if (!count) return null;
  const sw = locale === "sw";
  return (
    <Link href={href} className="panel flex items-center justify-between gap-3 p-4 hover:border-ink-300">
      <span className="flex items-center gap-3"><Wrench className="h-5 w-5 text-ink-500" aria-hidden />
        <span><span className="block font-semibold">{sw ? `Vipuri ${count.toLocaleString()} vinavyofaa ${label}` : `${count.toLocaleString()} spare part${count === 1 ? "" : "s"} that fit this ${label}`}</span>
        <span className="text-xs text-ink-500">{sw ? "Kutoka kwa wauzaji wa vipuri kwenye tovuti hii — hakikisha vinafaa kabla ya kununua" : "From parts sellers on this site — check the fit before you buy"}</span></span>
      </span>
      <span className="text-sm font-semibold text-ink-700" aria-hidden>›</span>
    </Link>
  );
}

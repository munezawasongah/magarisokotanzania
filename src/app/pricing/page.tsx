import Link from "next/link";
import { BadgePercent, Car, Store, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { formatTzs } from "@/lib/money";
import { getMonetisation, listingFeesOn } from "@/lib/settings";
import { SITE } from "@/config/site";

export const metadata = {
  title: "Pricing for sellers & businesses",
  description: `List your car on ${SITE.name}. Private sellers list free; dealers, importers, parts shops and garages get a mini-site and optional monthly plans. No commission on sales.`,
};
export const revalidate = 300;

export default async function PricingPage() {
  const { dict, locale } = await getDictionary();
  const t = dict.fees;
  const sw = locale === "sw";
  const [plans, promos, money] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.promotionProduct.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getMonetisation(),
  ]);
  const paidListings = listingFeesOn(money);
  const groups = Object.entries(plans.reduce<Record<string, typeof plans>>((acc, p) => ((acc[p.businessType] ??= []).push(p), acc), {}));
  const days = SITE.listingLifetimeDays;

  return (
    <div className="container py-10">
      <h1 className="display text-3xl md:text-4xl">{t.pricingTitle}</h1>
      <p className="mt-2 max-w-2xl text-ink-500">{t.pricingLead}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Private sellers: the offer that brings the cars */}
        <section className="flex flex-col rounded-lg bg-ink-900 p-6 text-white md:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-100"><Car className="h-4 w-4" aria-hidden />{t.privateTitle}</p>
          <h2 className="display mt-3 text-3xl text-white md:text-4xl">{paidListings ? fmt(t.privateFirstFree, { n: money.freePrivateListings }) : t.privateFreeNow}</h2>
          <p className="mt-3 max-w-lg text-ink-100">
            {paidListings ? fmt(t.privateFirstFreeText, { fee: formatTzs(money.privateListingFee), days }) : fmt(t.privateFreeNowText, { days })}
          </p>
          <p className="mt-2 text-sm text-ink-100">{t.signupFree}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-auto md:pt-6">
            <span className="plate text-2xl">{paidListings ? formatTzs(money.privateListingFee) : dict.reg.free}</span>
            <Link href="/sell?as=private" className="btn-plate">{t.startFree}</Link>
          </div>
        </section>

        <section className="panel flex flex-col p-6 md:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-500"><Store className="h-4 w-4" aria-hidden />{t.businessTitle}</p>
          <p className="mt-3 text-ink-700">{t.businessText}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
            <li>✓ {money.phase === "PAID" ? fmt(t.businessPaid, { n: money.businessFreeListings }) : t.businessLaunch}</li>
            <li>✓ {money.registrationFee > 0 ? fmt(t.signupFee, { fee: formatTzs(money.registrationFee) }) : t.signupFree}</li>
          </ul>
          <Link href="/dashboard/registration" className="btn-primary mt-6 w-fit md:mt-auto">{dict.reg.registerNow}</Link>
        </section>
      </div>

      <section className="mt-6 flex items-start gap-3 rounded-lg border border-go-600/30 bg-go-600/5 p-5">
        <BadgePercent className="mt-0.5 h-5 w-5 shrink-0 text-go-600" aria-hidden />
        <div>
          <h2 className="font-bold">{t.commissionTitle}</h2>
          <p className="mt-1 text-sm text-ink-700">{t.commissionText}</p>
        </div>
      </section>

      {promos.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold"><Zap className="h-5 w-5" aria-hidden />{t.boostTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">{t.boostText}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {promos.map((p) => (
              <li key={p.code} className="panel p-4">
                <p className="text-sm font-semibold">{(sw && p.nameSw) || p.name}</p>
                <p className="mt-3"><span className="plate">{formatTzs(p.priceTzs)}</span></p>
                <p className="mt-2 text-xs text-ink-500">{enumLabel(dict, "PromotionType", p.type)} · {p.days} {p.days === 1 ? t.day : t.days}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.map(([type, list]) => (
        <section key={type} className="mt-12">
          <h2 className="text-xl font-bold">{enumLabel(dict, "BusinessType", type)}</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {list.map((p) => (
              <li key={p.code} className="panel flex flex-col p-5">
                <p className="font-semibold">{p.name}</p>
                <p className="condensed mt-2 text-3xl font-bold tabular-nums">{formatTzs(p.priceTzsMonthly)}<span className="text-sm font-normal text-ink-500"> {t.perMonth}</span></p>
                {p.priceTzsYearly && <p className="text-xs text-ink-500">{formatTzs(p.priceTzsYearly)} {t.perYear}</p>}
                <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
                  <li>{p.maxActiveListings === -1 ? t.unlimited : p.maxActiveListings.toLocaleString()} {t.activeListings}</li>
                  <li>{p.featuredCredits} {t.featuredCredits}</li>
                  {p.leadAnalytics && <li>{t.leadAnalytics}</li>}
                  {p.verifiedBadge && <li>{t.verifiedBadge}</li>}
                </ul>
                <Link href="/dashboard/shop#plans" className="btn-primary mt-auto pt-2.5">{fmt(t.choosePlan, { plan: p.name })}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

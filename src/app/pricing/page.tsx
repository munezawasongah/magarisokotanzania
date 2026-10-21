import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { formatTzs } from "@/lib/money";
import { SITE } from "@/config/site";

export const metadata = {
  title: "Pricing for sellers & businesses",
  description: "One-off TSh 30,000 registration for sellers, dealers, importers, spare-parts shops and service providers, with your own mini-site. Optional featured ads and monthly plans.",
};
export const revalidate = 3600;

export default async function PricingPage() {
  const { dict, locale } = await getDictionary();
  const sw = locale === "sw";
  const [plans, promos] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.promotionProduct.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const groups = Object.entries(plans.reduce<Record<string, typeof plans>>((acc, p) => ((acc[p.businessType] ??= []).push(p), acc), {}));
  return (
    <div className="container py-10">
      <h1 className="display text-3xl md:text-4xl">{sw ? "Bei" : "Pricing"}</h1>
      <p className="mt-2 max-w-2xl text-ink-500">{sw ? "Kununua na kutafuta ni bure kwa wateja wote." : "Browsing, searching and contacting sellers is always free for buyers."}</p>

      <section className="mt-8 grid gap-6 rounded-lg bg-ink-900 p-6 text-white md:grid-cols-[1fr_auto] md:items-center md:p-8">
        <div>
          <h2 className="display text-2xl text-white">{dict.reg.feeTitle}</h2>
          <p className="mt-2 max-w-2xl text-ink-100">{fmt(dict.reg.subtitle, { fee: formatTzs(SITE.registrationFeeTzs) })}</p>
          <ul className="mt-4 grid gap-1.5 text-sm text-ink-100 sm:grid-cols-2">
            <li>✓ {sw ? "Malipo ya mara moja tu" : "One-off payment — no per-listing fee"}</li>
            <li>✓ {sw ? "Mini-tovuti yako yenye picha, bei, mawasiliano na ramani" : "Your own mini-site with photos, prices, contacts and map"}</li>
            <li>✓ {sw ? `Hadi matangazo ${SITE.baseActiveListings} hai kwa wakati mmoja` : `Up to ${SITE.baseActiveListings} live listings at a time`}</li>
            <li>✓ {sw ? "Unaonekana kwenye utafutaji wa wateja wote" : "Shown in every buyer search with your price and contacts"}</li>
          </ul>
        </div>
        <div className="text-center">
          <p><span className="plate text-2xl">{formatTzs(SITE.registrationFeeTzs)}</span></p>
          <Link href="/dashboard/registration" className="btn-plate mt-4">{dict.reg.registerNow}</Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">{sw ? "Ongeza tangazo lako (hiari)" : "Boost a listing (optional)"}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {promos.map((p) => (
            <li key={p.code} className="panel p-4">
              <p className="text-sm font-semibold">{(sw && p.nameSw) || p.name}</p>
              <p className="mt-3"><span className="plate">{formatTzs(p.priceTzs)}</span></p>
              <p className="mt-2 text-xs text-ink-500">{enumLabel(dict, "PromotionType", p.type)} · {p.days} {p.days === 1 ? "day" : "days"}</p>
            </li>
          ))}
        </ul>
      </section>

      {groups.length > 0 && (
        <p className="mt-12 max-w-2xl text-sm text-ink-500">
          {sw ? "Biashara zinazohitaji matangazo zaidi zinaweza kuchagua mpango wa mwezi baada ya usajili kuidhinishwa." : "Businesses that need more live listings can add a monthly plan after their registration is approved."}
        </p>
      )}
      {groups.map(([type, list]) => (
        <section key={type} className="mt-8">
          <h2 className="text-xl font-bold">{enumLabel(dict, "BusinessType", type)}</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {list.map((p) => (
              <li key={p.code} className="panel flex flex-col p-5">
                <p className="font-semibold">{p.name}</p>
                <p className="condensed mt-2 text-3xl font-bold tabular-nums">{formatTzs(p.priceTzsMonthly)}<span className="text-sm font-normal text-ink-500"> / month</span></p>
                {p.priceTzsYearly && <p className="text-xs text-ink-500">{formatTzs(p.priceTzsYearly)} / year (2 months free)</p>}
                <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
                  <li>{p.maxActiveListings === -1 ? "Unlimited" : p.maxActiveListings.toLocaleString()} active listings</li>
                  <li>{p.featuredCredits} featured credits / month</li>
                  {p.leadAnalytics && <li>Lead analytics & inbox</li>}
                  {p.verifiedBadge && <li>Verified badge & instant publishing</li>}
                </ul>
                <Link href="/dashboard/shop#plans" className="btn-primary mt-auto pt-2.5">Choose {p.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

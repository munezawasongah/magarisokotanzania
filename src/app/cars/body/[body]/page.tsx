import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { BrowseLanding } from "@/components/browse/BrowseLanding";
import { marketSummary } from "@/server/market";
import { formatTzsCompact } from "@/lib/money";
import { bodyFromSlug, bodySlug } from "@/lib/browse";
import { SITE } from "@/config/site";

export const revalidate = 300;
type P = { params: Promise<{ body: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const body = bodyFromSlug((await params).body);
  if (!body) return { title: "Not found" };
  const { dict } = await getDictionary();
  const label = enumLabel(dict, "BodyType", body);
  const s = await marketSummary({ body });
  return {
    title: `${label} for sale in ${SITE.countryName}`,
    description: `${s.count.toLocaleString()} ${label.toLowerCase()} vehicles for sale in ${SITE.countryName}${s.count >= 3 ? `, typically ${formatTzsCompact(s.median)}` : ""}. Compare makes, prices and mileage, and contact sellers on WhatsApp.`,
    alternates: { canonical: `/cars/body/${bodySlug(body)}` },
  };
}

export default async function BodyPage({ params, searchParams }: P) {
  const body = bodyFromSlug((await params).body);
  if (!body) notFound();
  const { dict, locale } = await getDictionary();
  const label = enumLabel(dict, "BodyType", body);
  return (
    <BrowseLanding
      title={locale === "sw" ? `${label} zinazouzwa ${SITE.countryName}` : `${label} for sale in ${SITE.countryName}`}
      crumbs={[{ href: "/cars", label: dict.nav.cars }, { href: `/cars/body/${bodySlug(body)}`, label }]}
      scope={{ body }}
      filters={{ body }}
      basePath={`/cars/body/${bodySlug(body)}`}
      searchParams={await searchParams}
      breakdown="make"
      moreHref={`/cars?body=${body}`}
      guideHref={`/car-prices?body=${body}`}
    />
  );
}

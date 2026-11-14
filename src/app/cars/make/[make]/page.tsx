import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { BrowseLanding } from "@/components/browse/BrowseLanding";
import { marketSummary } from "@/server/market";
import { formatTzsCompact } from "@/lib/money";
import { SITE } from "@/config/site";

export const revalidate = 300;
type P = { params: Promise<{ make: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const findMake = (slug: string) => prisma.make.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const make = await findMake((await params).make);
  if (!make) return { title: "Not found" };
  const s = await marketSummary({ makeId: make.id });
  return {
    title: `${make.name} cars for sale in ${SITE.countryName}`,
    description: `${s.count.toLocaleString()} ${make.name} cars for sale in ${SITE.countryName}${s.count >= 3 ? `, typically ${formatTzsCompact(s.median)}` : ""}. Compare prices, mileage and photos from dealers and private sellers, and WhatsApp the seller in one tap.`,
    alternates: { canonical: `/cars/make/${make.slug}` },
  };
}

export default async function MakePage({ params, searchParams }: P) {
  const make = await findMake((await params).make);
  if (!make) notFound();
  const { dict, locale } = await getDictionary();
  return (
    <BrowseLanding
      title={locale === "sw" ? `Magari ya ${make.name} yanayouzwa ${SITE.countryName}` : `${make.name} for sale in ${SITE.countryName}`}
      crumbs={[{ href: "/cars", label: dict.nav.cars }, { href: `/cars/make/${make.slug}`, label: make.name }]}
      scope={{ makeId: make.id }}
      filters={{ make: make.slug }}
      basePath={`/cars/make/${make.slug}`}
      searchParams={await searchParams}
      breakdown="model"
      moreHref={`/cars?make=${make.slug}`}
      guideHref={`/car-prices?make=${make.slug}`}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { BrowseLanding } from "@/components/browse/BrowseLanding";
import { marketSummary } from "@/server/market";
import { formatTzsCompact } from "@/lib/money";
import { SITE } from "@/config/site";

export const revalidate = 300;
type P = { params: Promise<{ region: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const findRegion = (slug: string) => prisma.region.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const region = await findRegion((await params).region);
  if (!region) return { title: "Not found" };
  const s = await marketSummary({ regionId: region.id });
  return {
    title: `Cars for sale in ${region.name}`,
    description: `${s.count.toLocaleString()} cars for sale in ${region.name}, ${SITE.countryName}${s.count >= 3 ? `, typically ${formatTzsCompact(s.median)}` : ""}. Dealers and private sellers near you — WhatsApp the seller in one tap.`,
    alternates: { canonical: `/cars/in/${region.slug}` },
  };
}

export default async function RegionPage({ params, searchParams }: P) {
  const region = await findRegion((await params).region);
  if (!region) notFound();
  const { dict, locale } = await getDictionary();
  return (
    <BrowseLanding
      title={locale === "sw" ? `Magari yanayouzwa ${region.name}` : `Cars for sale in ${region.name}`}
      crumbs={[{ href: "/cars", label: dict.nav.cars }, { href: `/cars/in/${region.slug}`, label: region.name }]}
      scope={{ regionId: region.id }}
      filters={{ region: region.slug }}
      basePath={`/cars/in/${region.slug}`}
      searchParams={await searchParams}
      breakdown="make"
      moreHref={`/cars?region=${region.slug}`}
      guideHref={`/car-prices`}
    />
  );
}

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/config/site";
import { BodyType } from "@/generated/prisma/enums";
import { bodySlug } from "@/lib/browse";

export const dynamic = "force-dynamic"; // reads the DB at request time, so builds never need a database

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [listings, parts, businesses, makes, regions] = await Promise.all([
    prisma.listing.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 45000 }),
    prisma.sparePart.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, take: 4000 }),
    prisma.business.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.make.findMany({ where: { listings: { some: { status: "ACTIVE" } } }, select: { slug: true, models: { where: { listings: { some: { status: "ACTIVE" } } }, select: { slug: true } } } }),
    prisma.region.findMany({ select: { slug: true } }),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/cars`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/parts`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/services`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/dealers`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/car-prices`, changeFrequency: "daily", priority: 0.8 },
    ...["terms", "privacy", "safety"].map((p) => ({ url: `${base}/${p}`, changeFrequency: "yearly" as const, priority: 0.3 })),
    // landing pages: "<make> for sale", "<body type> for sale", "cars for sale in <town>", price guides
    ...makes.map((m) => ({ url: `${base}/cars/make/${m.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...makes.map((m) => ({ url: `${base}/car-prices?make=${m.slug}`, changeFrequency: "daily" as const, priority: 0.5 })),
    ...makes.flatMap((m) => m.models.map((md) => ({ url: `${base}/cars?make=${m.slug}&model=${md.slug}` }))),
    ...Object.values(BodyType).map((b) => ({ url: `${base}/cars/body/${bodySlug(b)}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...regions.map((r) => ({ url: `${base}/cars/in/${r.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...listings.map((l) => ({ url: `${base}/cars/${l.slug}`, lastModified: l.updatedAt })),
    ...parts.map((p) => ({ url: `${base}/parts/${p.slug}`, lastModified: p.updatedAt })),
    ...businesses.map((b) => ({ url: `${base}/dealers/${b.slug}`, lastModified: b.updatedAt })),
  ];
}

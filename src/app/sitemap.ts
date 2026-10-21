import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/config/site";

export const dynamic = "force-dynamic"; // reads the DB at request time, so builds never need a database

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [listings, parts, businesses, makes, regions] = await Promise.all([
    prisma.listing.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 45000 }),
    prisma.sparePart.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, take: 4000 }),
    prisma.business.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.make.findMany({ select: { slug: true, models: { select: { slug: true } } } }),
    prisma.region.findMany({ select: { slug: true } }),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/cars`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/parts`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/services`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/dealers`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.4 },
    ...["terms", "privacy", "safety"].map((p) => ({ url: `${base}/${p}`, changeFrequency: "yearly" as const, priority: 0.3 })),
    // landing pages for "<make> <model> for sale" and "cars for sale in <region>"
    ...makes.flatMap((m) => [{ url: `${base}/cars?make=${m.slug}` }, ...m.models.map((md) => ({ url: `${base}/cars?make=${m.slug}&model=${md.slug}` }))]),
    ...regions.map((r) => ({ url: `${base}/cars?region=${r.slug}` })),
    ...listings.map((l) => ({ url: `${base}/cars/${l.slug}`, lastModified: l.updatedAt })),
    ...parts.map((p) => ({ url: `${base}/parts/${p.slug}`, lastModified: p.updatedAt })),
    ...businesses.map((b) => ({ url: `${base}/dealers/${b.slug}`, lastModified: b.updatedAt })),
  ];
}

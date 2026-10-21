import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { ServiceCategory } from "@/generated/prisma/enums";

export async function getBusinessBySlug(slug: string) {
  return prisma.business.findFirst({
    where: { slug, isActive: true },
    include: { region: true, district: true, services: true, _count: { select: { listings: { where: { status: "ACTIVE" } }, parts: { where: { status: "ACTIVE" } } } } },
  });
}

export async function searchServiceProviders(f: { category?: ServiceCategory; region?: string; q?: string; page?: number }) {
  const where: Prisma.BusinessWhereInput = {
    isActive: true,
    type: { in: ["SERVICE_PROVIDER", "INSPECTION_CENTER", "FINANCE_INSURANCE", "IMPORTER"] },
    ...(f.category ? { services: { some: { category: f.category } } } : {}),
    ...(f.region ? { region: { slug: f.region } } : {}),
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }, { services: { some: { title: { contains: f.q, mode: "insensitive" } } } }] } : {}),
  };
  const page = f.page ?? 1;
  const [items, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: { region: true, district: true, services: { take: 6 } },
      orderBy: [{ verifiedAt: { sort: "desc", nulls: "last" } }, { ratingAvg: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * 24, take: 24,
    }),
    prisma.business.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / 24)), page };
}

export async function listDealers(region?: string) {
  return prisma.business.findMany({
    where: { isActive: true, type: { in: ["DEALERSHIP", "CAR_YARD", "IMPORTER"] }, ...(region ? { region: { slug: region } } : {}) },
    include: { region: true, _count: { select: { listings: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ verifiedAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    take: 200,
  });
}

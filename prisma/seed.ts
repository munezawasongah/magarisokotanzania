/**
 * Seed: reference data (regions, districts, makes, models, plans, promotion
 * prices) + the admin account. No demo or sample listings are created — every
 * listing on the platform comes from a registered, admin-approved seller.
 *
 *   npx prisma db seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { TZ_REGIONS } from "../src/config/locations";
import { VEHICLE_MAKES } from "../src/config/vehicles";
import { PLAN_SEED, PROMOTION_SEED } from "../src/config/site";
import { DEFAULT_IMPORT_TAX_RULES } from "../src/config/import-tax";
import { slugify } from "../src/lib/slug";

// Windows: "localhost" tries IPv6 first and can stall — use 127.0.0.1
const dbUrl = (process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/garisoko").replace("@localhost:", "@127.0.0.1:");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

async function seedReference() {
  console.log("→ regions & districts");
  for (const [i, r] of TZ_REGIONS.entries()) {
    const region = await prisma.region.upsert({
      where: { slug: slugify(r.name) },
      create: { name: r.name, nameSw: r.nameSw, slug: slugify(r.name), zone: r.zone, isZanzibar: !!r.isZanzibar, sortOrder: i },
      update: { nameSw: r.nameSw, zone: r.zone, isZanzibar: !!r.isZanzibar, sortOrder: i },
    });
    for (const d of r.districts) {
      await prisma.district.upsert({
        where: { regionId_slug: { regionId: region.id, slug: slugify(d) } },
        create: { name: d, slug: slugify(d), regionId: region.id },
        update: { name: d },
      });
    }
  }

  console.log("→ makes & models");
  for (const [i, m] of VEHICLE_MAKES.entries()) {
    const make = await prisma.make.upsert({
      where: { slug: slugify(m.name) },
      create: { name: m.name, slug: slugify(m.name), country: m.country, isPopular: !!m.popular, sortOrder: i },
      update: { country: m.country, isPopular: !!m.popular, sortOrder: i },
    });
    for (const [name, body] of m.models) {
      await prisma.vehicleModel.upsert({
        where: { makeId_slug: { makeId: make.id, slug: slugify(name) } },
        create: { name, slug: slugify(name), makeId: make.id, defaultBodyType: body },
        update: { name, defaultBodyType: body },
      });
    }
  }

  console.log("→ plans & promotion prices");
  for (const p of PLAN_SEED) {
    const data = { ...p, priceTzsMonthly: BigInt(p.priceTzsMonthly), priceTzsYearly: BigInt(p.priceTzsYearly) };
    await prisma.plan.upsert({ where: { code: p.code }, create: data, update: data });
  }
  for (const p of PROMOTION_SEED) {
    const data = { ...p, priceTzs: BigInt(p.priceTzs) };
    await prisma.promotionProduct.upsert({ where: { code: p.code }, create: data, update: data });
  }
  await prisma.siteSetting.upsert({
    where: { key: "importTaxRules" },
    create: { key: "importTaxRules", value: DEFAULT_IMPORT_TAX_RULES as unknown as Prisma.InputJsonValue },
    update: {},
  });
  await prisma.exchangeRate.create({ data: { rate: Number(process.env.FX_FALLBACK_USD_TZS || 2600), source: "seed" } });
}

async function seedAdmin() {
  const phone = process.env.SEED_ADMIN_PHONE || "+255668212595";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026";
  const email = "admin@magarisoko.co.tz";
  console.log(`→ admin account ${phone}`);
  // If an admin already exists (e.g. created with an older number), move it to the configured number.
  const existing =
    (await prisma.user.findUnique({ where: { phone } })) ??
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.findFirst({ where: { roles: { has: "ADMIN" } }, orderBy: { createdAt: "asc" } }));
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { phone, phoneVerified: existing.phoneVerified ?? new Date(), roles: Array.from(new Set([...existing.roles, "ADMIN", "BUYER"])) as typeof existing.roles },
    });
  }
  return prisma.user.create({
    data: {
      name: "MagariSOKO Tanzania Admin", phone, email, phoneVerified: new Date(),
      passwordHash: await bcrypt.hash(password, 12), roles: ["ADMIN", "BUYER"],
    },
  });
}

async function main() {
  await seedReference();
  await seedAdmin();
  console.log("✔ seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

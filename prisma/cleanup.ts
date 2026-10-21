/**
 * One-off clean-up for databases that were seeded with the old demo data.
 *
 *   npx tsx prisma/cleanup.ts
 *
 * - removes the demo accounts and everything they posted (cars, parts, shops, services, inquiries, payments)
 * - removes every listing / spare part / shop that does not belong to an admin-approved, paid seller registration
 * - removes the demo advert
 * - moves the admin account to ADMIN_PHONE (default 0668 212 595)
 *
 * Safe to run more than once.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Windows: "localhost" tries IPv6 first and can stall — use 127.0.0.1
const dbUrl = (process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/garisoko").replace("@localhost:", "@127.0.0.1:");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE || "+255668212595";
const OLD_ADMIN_PHONE = "+255700000001";
const DEMO_PHONES = ["+255754100200", "+255713300400", "+255688500600", "+255765700800", "+255622900100"];
const DEMO_ADVERTISERS = ["Simba Motor Finance"];

async function main() {
  const approved = await prisma.sellerRegistration.findMany({ where: { status: "APPROVED" }, select: { userId: true, businessId: true } });
  const approvedUsers = new Set(approved.map((r) => r.userId));
  const approvedBusinesses = approved.map((r) => r.businessId).filter((x): x is string => !!x);
  const admins = await prisma.user.findMany({ where: { roles: { has: "ADMIN" } }, select: { id: true } });
  const keepSellers = [...approvedUsers, ...admins.map((a) => a.id)];

  const demoUsers = await prisma.user.findMany({ where: { phone: { in: DEMO_PHONES }, NOT: { roles: { has: "ADMIN" } } }, select: { id: true, phone: true } });
  const demoIds = demoUsers.map((u) => u.id);

  const res = await prisma.$transaction(async (tx) => {
    // listings & parts not owned by an approved seller (or an admin), and anything owned by demo accounts
    const badListings = await tx.listing.findMany({ where: { OR: [{ sellerId: { notIn: keepSellers } }, { sellerId: { in: demoIds } }] }, select: { id: true } });
    const badParts = await tx.sparePart.findMany({ where: { OR: [{ sellerId: { notIn: keepSellers } }, { sellerId: { in: demoIds } }] }, select: { id: true } });
    const badBusinesses = await tx.business.findMany({ where: { id: { notIn: approvedBusinesses } }, select: { id: true } });
    const listingIds = badListings.map((l) => l.id);
    const partIds = badParts.map((p) => p.id);
    const businessIds = badBusinesses.map((b) => b.id);

    await tx.inquiry.deleteMany({ where: { OR: [{ listingId: { in: listingIds } }, { partId: { in: partIds } }, { businessId: { in: businessIds } }, { recipientId: { in: demoIds } }, { buyerId: { in: demoIds } }] } });
    await tx.promotion.deleteMany({ where: { listingId: { in: listingIds } } });
    const listings = await tx.listing.deleteMany({ where: { id: { in: listingIds } } });
    const parts = await tx.sparePart.deleteMany({ where: { id: { in: partIds } } });
    await tx.payment.deleteMany({ where: { OR: [{ userId: { in: demoIds } }, { businessId: { in: businessIds } }] } });
    await tx.subscription.deleteMany({ where: { businessId: { in: businessIds } } });
    const businesses = await tx.business.deleteMany({ where: { id: { in: businessIds } } });
    const users = await tx.user.deleteMany({ where: { id: { in: demoIds } } });
    const ads = await tx.adPlacement.deleteMany({ where: { advertiser: { in: DEMO_ADVERTISERS } } });
    return { listings: listings.count, parts: parts.count, businesses: businesses.count, users: users.count, ads: ads.count };
  });
  // Seller roles now come only from an approved registration.
  const sellerRoles = ["SELLER", "DEALER", "IMPORTER", "PARTS_VENDOR", "SERVICE_PROVIDER"];
  const unregistered = await prisma.user.findMany({ where: { id: { notIn: [...approvedUsers] }, roles: { hasSome: sellerRoles as never[] } }, select: { id: true, roles: true } });
  for (const u of unregistered) {
    const roles = u.roles.filter((r) => !sellerRoles.includes(r));
    await prisma.user.update({ where: { id: u.id }, data: { roles: (roles.length ? roles : ["BUYER"]) as typeof u.roles } });
  }
  console.log(`✔ removed ${res.listings} listings, ${res.parts} spare parts, ${res.businesses} shops, ${res.users} demo accounts, ${res.ads} demo ads`);

  // Admin phone number
  const target = await prisma.user.findUnique({ where: { phone: ADMIN_PHONE } });
  if (target) {
    if (!target.roles.includes("ADMIN")) {
      await prisma.user.update({ where: { id: target.id }, data: { roles: Array.from(new Set([...target.roles, "ADMIN", "BUYER"])) as typeof target.roles, phoneVerified: target.phoneVerified ?? new Date() } });
    }
    // the old default admin account is no longer needed
    const old = await prisma.user.findUnique({ where: { phone: OLD_ADMIN_PHONE } });
    if (old && old.id !== target.id && old.roles.includes("ADMIN")) {
      await prisma.user.update({ where: { id: old.id }, data: { roles: old.roles.filter((r) => r !== "ADMIN") as typeof old.roles, status: "SUSPENDED" } });
    }
    console.log(`✔ admin phone is ${ADMIN_PHONE}`);
  } else {
    const admin =
      (await prisma.user.findUnique({ where: { phone: OLD_ADMIN_PHONE } })) ??
      (await prisma.user.findFirst({ where: { roles: { has: "ADMIN" } }, orderBy: { createdAt: "asc" } }));
    if (admin) {
      await prisma.user.update({ where: { id: admin.id }, data: { phone: ADMIN_PHONE, phoneVerified: new Date() } });
      console.log(`✔ admin phone changed to ${ADMIN_PHONE} (password unchanged)`);
    } else {
      console.log("! no admin account found — run: npx prisma db seed");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

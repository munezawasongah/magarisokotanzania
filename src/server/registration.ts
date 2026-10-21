import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { BusinessType, RegistrationAccountType, Role } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/session";
import type { ShopInput } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";
import { sendSms } from "@/lib/sms";
import { absoluteUrl } from "@/lib/utils";
import { SITE } from "@/config/site";
import { ListingError } from "./errors";
import { isBlocked, markWalletVerified } from "./fraud/engine";

/**
 * Seller registration lifecycle
 *   1. details saved            → AWAITING_PAYMENT
 *   2. fee paid online, or a manual mobile-money code submitted → PAYMENT_SUBMITTED
 *   3. admin verifies payment   → APPROVED: role granted + mini-site (Business) created
 *      or rejects               → REJECTED (user can pay / resubmit again)
 */

export const ROLE_FOR: Record<RegistrationAccountType, Role> = {
  SELLER: "SELLER", DEALER: "DEALER", YARD: "DEALER", IMPORTER: "IMPORTER", PARTS_VENDOR: "PARTS_VENDOR", SERVICE_PROVIDER: "SERVICE_PROVIDER",
};

export function businessTypeFor(type: RegistrationAccountType, shop: ShopInput): BusinessType {
  switch (type) {
    case "SELLER": return "PRIVATE_SELLER";
    case "DEALER": return "DEALERSHIP";
    case "YARD": return "CAR_YARD";
    case "IMPORTER": return "IMPORTER";
    case "PARTS_VENDOR": return "PARTS_VENDOR";
    case "SERVICE_PROVIDER": return shop.serviceKind ?? "SERVICE_PROVIDER";
  }
}

/** Shop types that may list vehicles / spare parts. */
export const CAN_LIST_VEHICLES: BusinessType[] = ["PRIVATE_SELLER", "DEALERSHIP", "CAR_YARD", "IMPORTER"];
export const CAN_LIST_PARTS: BusinessType[] = ["PRIVATE_SELLER", "DEALERSHIP", "CAR_YARD", "IMPORTER", "PARTS_VENDOR"];

/** Car yards share the dealership plans. */
export function planBusinessType(t: BusinessType): BusinessType {
  if (t === "CAR_YARD") return "DEALERSHIP";
  if (t === "INSPECTION_CENTER" || t === "FINANCE_INSURANCE") return "SERVICE_PROVIDER";
  return t;
}

export async function getMyRegistration(userId: string) {
  return prisma.sellerRegistration.findUnique({ where: { userId } });
}

async function assertContactsAllowed(shop: ShopInput) {
  if ((await isBlocked("PHONE", shop.phone)) || (await isBlocked("PHONE", shop.whatsapp)) || (await isBlocked("EMAIL", shop.email))) {
    throw new ListingError("These contact details cannot be used. Contact support if you think this is a mistake.", 403);
  }
}

async function assertLocation(shop: ShopInput) {
  if (shop.districtId) {
    const d = await prisma.district.findUnique({ where: { id: shop.districtId } });
    if (!d || d.regionId !== shop.regionId) throw new ListingError("District does not belong to the region");
  }
}

/** Step 1: save (or update) the details. Allowed until the registration is approved. */
export async function saveRegistrationDetails(user: SessionUser, accountType: RegistrationAccountType, shop: ShopInput) {
  await assertContactsAllowed(shop);
  await assertLocation(shop);
  const existing = await getMyRegistration(user.id);
  if (existing?.status === "APPROVED") throw new ListingError("You are already registered. Edit your mini-site instead.", 409);
  const data = { accountType, shopDetails: shop as unknown as Prisma.InputJsonValue };
  return existing
    ? prisma.sellerRegistration.update({ where: { userId: user.id }, data })
    : prisma.sellerRegistration.create({ data: { ...data, userId: user.id, feeTzs: BigInt(SITE.registrationFeeTzs) } });
}

/** Step 2b: the user paid to the Lipa Namba and submits the transaction code. */
export async function submitManualPayment(user: SessionUser, reference: string, msisdn: string) {
  if (!SITE.manualPayment.lipaNamba) throw new ListingError("Manual payment is not available. Please pay online.", 400);
  const reg = await getMyRegistration(user.id);
  if (!reg) throw new ListingError("Fill in your details first", 400);
  if (reg.status === "APPROVED") throw new ListingError("Your registration is already approved", 409);
  if (reg.status === "PAYMENT_SUBMITTED") throw new ListingError("Your payment is already waiting for verification", 409);
  if (await isBlocked("PHONE", msisdn)) throw new ListingError("This mobile money number cannot be used. Contact support.", 403);
  const reused = await prisma.sellerRegistration.findFirst({ where: { manualReference: reference, id: { not: reg.id } } });
  if (reused) throw new ListingError("This transaction code has already been used for another registration", 409);
  return prisma.sellerRegistration.update({
    where: { id: reg.id },
    data: { manualReference: reference, manualMsisdn: msisdn, status: "PAYMENT_SUBMITTED", submittedAt: new Date(), rejectionReason: null },
  });
}

/** Called by payment fulfilment when an online registration payment succeeds. */
export async function markRegistrationPaid(tx: Prisma.TransactionClient, userId: string, paymentId: string) {
  await tx.sellerRegistration.updateMany({
    where: { userId, status: { in: ["AWAITING_PAYMENT", "REJECTED"] } },
    data: { paymentId, status: "PAYMENT_SUBMITTED", submittedAt: new Date(), rejectionReason: null },
  });
}

function assertStaff(user: SessionUser) {
  if (!user.roles.includes("ADMIN") && !user.roles.includes("MODERATOR")) throw new ListingError("Forbidden", 403);
}

/** Step 3: admin verified the payment → create the mini-site and grant the seller role. */
export async function approveRegistration(admin: SessionUser, registrationId: string) {
  assertStaff(admin);
  const reg = await prisma.sellerRegistration.findUniqueOrThrow({ where: { id: registrationId }, include: { user: true } });
  if (reg.status !== "PAYMENT_SUBMITTED") throw new ListingError("Only registrations with a submitted payment can be approved", 409);
  const payment = reg.paymentId ? await prisma.payment.findUnique({ where: { id: reg.paymentId } }) : null;
  if (reg.paymentId && payment?.status !== "SUCCESS") throw new ListingError("The online payment has not been confirmed by the payment provider yet", 409);
  if (!reg.paymentId && !reg.manualReference) throw new ListingError("No payment evidence on this registration", 409);

  const shop = reg.shopDetails as unknown as ShopInput;
  const type = businessTypeFor(reg.accountType, shop);
  const role = ROLE_FOR[reg.accountType];

  const business = await prisma.$transaction(async (tx) => {
    const b = await tx.business.create({
      data: {
        type,
        name: shop.name,
        slug: uniqueSlug(shop.name),
        tagline: shop.tagline,
        description: shop.description,
        phone: shop.phone,
        whatsapp: shop.whatsapp ?? shop.phone,
        email: shop.email,
        website: shop.website,
        address: shop.address,
        latitude: shop.latitude,
        longitude: shop.longitude,
        regionId: shop.regionId,
        districtId: shop.districtId,
        tin: shop.tin,
        brelaRegNo: shop.brelaRegNo,
        verification: shop.tin || shop.brelaRegNo ? "PENDING" : "UNVERIFIED",
        openingHours: shop.openingHours ? { text: shop.openingHours } : undefined,
        importCountries: shop.importCountries,
        logoUrl: shop.logoUrl,
        coverUrl: shop.coverUrl,
        isActive: true,
        members: { create: { userId: reg.userId, role: "OWNER" } },
        services: { create: shop.services.map((s) => ({ ...s, priceFromTzs: BigInt(s.priceFromTzs) })) },
      },
    });
    const roles = Array.from(new Set([...reg.user.roles, role]));
    await tx.user.update({ where: { id: reg.userId }, data: { roles } });
    await tx.sellerRegistration.update({
      where: { id: reg.id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: admin.id, businessId: b.id, rejectionReason: null },
    });
    await tx.auditLog.create({ data: { actorId: admin.id, action: "registration.approve", entityType: "SellerRegistration", entityId: reg.id, meta: { businessId: b.id } } });
    return b;
  });

  // A verified manual mobile-money payment also proves wallet ownership.
  if (reg.manualMsisdn) await markWalletVerified(reg.userId, reg.manualMsisdn);
  const to = reg.user.phone ?? shop.phone;
  void sendSms(to, `MagariSOKO Tanzania: Registration approved! Your mini-site is live: ${absoluteUrl(`/shop/${business.slug}`)} . Ongeza matangazo yako sasa.`);
  return business;
}

export async function rejectRegistration(admin: SessionUser, registrationId: string, reason: string) {
  assertStaff(admin);
  const reg = await prisma.sellerRegistration.findUniqueOrThrow({ where: { id: registrationId }, include: { user: { select: { phone: true } } } });
  if (reg.status === "APPROVED") throw new ListingError("Already approved", 409);
  await prisma.sellerRegistration.update({
    where: { id: reg.id },
    // clear the online payment link so a fresh payment can be attached
    data: { status: "REJECTED", rejectionReason: reason, reviewedAt: new Date(), reviewedById: admin.id, paymentId: null, manualReference: null },
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "registration.reject", entityType: "SellerRegistration", entityId: reg.id, meta: { reason } } });
  if (reg.user.phone) void sendSms(reg.user.phone, `MagariSOKO Tanzania: Your registration payment could not be verified: ${reason}. Please check and try again from your dashboard.`);
}

/** The approved mini-site owned by this user (null if not registered yet). */
export async function getMyShop(userId: string) {
  const reg = await prisma.sellerRegistration.findUnique({ where: { userId }, select: { status: true, businessId: true } });
  if (reg?.status !== "APPROVED" || !reg.businessId) return null;
  return prisma.business.findUnique({ where: { id: reg.businessId }, include: { services: { orderBy: { createdAt: "asc" } }, region: true, district: true } });
}

/** Throws unless the user has an approved registration (admins are exempt). */
export async function requireShop(user: SessionUser, allowed?: BusinessType[]) {
  const shop = await getMyShop(user.id);
  if (!shop) {
    if (user.roles.includes("ADMIN")) return null;
    throw new ListingError("Complete your seller registration (TSh 30,000) before posting listings.", 403);
  }
  if (!shop.isActive) throw new ListingError("Your mini-site is suspended. Contact support.", 403);
  if (allowed && !allowed.includes(shop.type)) throw new ListingError("Your account type cannot post this kind of listing.", 403);
  return shop;
}

/** Edit the mini-site after approval (contacts, location, photos, hours, services with prices). */
export async function updateShop(user: SessionUser, shop: ShopInput) {
  const current = await getMyShop(user.id);
  if (!current) throw new ListingError("Your registration is not approved yet", 403);
  await assertContactsAllowed(shop);
  await assertLocation(shop);
  if (current.type === "SERVICE_PROVIDER" || current.type === "INSPECTION_CENTER" || current.type === "FINANCE_INSURANCE") {
    if (!shop.services.length) throw new ListingError("Add at least one service with its price", 400);
  }
  const phoneChanged = shop.phone !== current.phone || (shop.whatsapp ?? shop.phone) !== current.whatsapp;
  await prisma.$transaction([
    prisma.business.update({
      where: { id: current.id },
      data: {
        name: shop.name, tagline: shop.tagline ?? null, description: shop.description ?? null,
        phone: shop.phone, whatsapp: shop.whatsapp ?? shop.phone, email: shop.email ?? null, website: shop.website ?? null,
        address: shop.address, latitude: shop.latitude ?? null, longitude: shop.longitude ?? null,
        regionId: shop.regionId, districtId: shop.districtId ?? null,
        tin: shop.tin ?? null, brelaRegNo: shop.brelaRegNo ?? null,
        openingHours: shop.openingHours ? { text: shop.openingHours } : Prisma.DbNull,
        importCountries: shop.importCountries,
        logoUrl: shop.logoUrl ?? null, coverUrl: shop.coverUrl ?? null,
      },
    }),
    prisma.serviceOffering.deleteMany({ where: { businessId: current.id } }),
    prisma.serviceOffering.createMany({ data: shop.services.map((s) => ({ ...s, priceFromTzs: BigInt(s.priceFromTzs), businessId: current.id })) }),
  ]);
  if (phoneChanged) {
    // listings that used the shop number follow the new number
    await prisma.listing.updateMany({ where: { businessId: current.id, contactPhone: current.phone }, data: { contactPhone: shop.phone } });
  }
  return prisma.business.findUniqueOrThrow({ where: { id: current.id }, select: { slug: true } });
}

/** Registrations awaiting the admin, with payment evidence. */
export async function getRegistrationQueue(status?: "PAYMENT_SUBMITTED" | "AWAITING_PAYMENT" | "APPROVED" | "REJECTED") {
  const regs = await prisma.sellerRegistration.findMany({
    where: status ? { status } : { status: { in: ["PAYMENT_SUBMITTED", "AWAITING_PAYMENT"] } },
    include: { user: { select: { id: true, name: true, phone: true, email: true, createdAt: true, riskScore: true, isShadowBanned: true } } },
    orderBy: [{ submittedAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
  });
  const paymentIds = regs.map((r) => r.paymentId).filter((x): x is string => !!x);
  const payments = paymentIds.length ? await prisma.payment.findMany({ where: { id: { in: paymentIds } } }) : [];
  const regionIds = [...new Set(regs.map((r) => (r.shopDetails as unknown as ShopInput).regionId))];
  const regions = await prisma.region.findMany({ where: { id: { in: regionIds } }, select: { id: true, name: true } });
  return regs.map((r) => ({
    ...r,
    shop: r.shopDetails as unknown as ShopInput,
    regionName: regions.find((x) => x.id === (r.shopDetails as unknown as ShopInput).regionId)?.name ?? "",
    payment: payments.find((p) => p.id === r.paymentId) ?? null,
  }));
}

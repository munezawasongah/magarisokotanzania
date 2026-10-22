/**
 * The money flow, end to end, against a throw-away database:
 *   sign-up → registration details → TSh 30,000 payment → admin approval → mini-site →
 *   car listing (price + mileage enforced) → publish → saved-search alert →
 *   price drop alert → review → revenue report; plus password reset and the
 *   database guards (no price = no listing).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { listingCreateSchema, paymentInitSchema, partCreateSchema, shopSchema } from "@/lib/validation";
import { approveRegistration, rejectRegistration, saveRegistrationDetails, submitManualPayment, getMyShop } from "@/server/registration";
import { fulfillPayment, initiatePayment } from "@/server/payments";
import { createListing, updateListing } from "@/server/listings";
import { moderateListing } from "@/server/admin";
import { createPart, setPartStatus, updatePart } from "@/server/parts";
import { notifyPriceDrops, notifySavedSearches, saveSearch, sendExpiryWarnings } from "@/server/alerts";
import { reviewEligibility, upsertReview } from "@/server/reviews";
import { requestInspection, updateInspection } from "@/server/inspections";
import { confirmPasswordReset, requestPasswordReset } from "@/server/password-reset";
import { getRevenueReport } from "@/server/revenue";

let admin: SessionUser, dealer: SessionUser, buyer: SessionUser, garage: SessionUser;
let regionId: number, makeId: number, modelId: number;

async function user(name: string, phone: string, roles: SessionUser["roles"] = ["BUYER"], password?: string): Promise<SessionUser> {
  const u = await prisma.user.create({ data: { name, phone, roles, phoneVerified: new Date(), passwordHash: password ? await bcrypt.hash(password, 4) : undefined, termsAcceptedAt: new Date() } });
  return { id: u.id, name: u.name, phone: u.phone, roles: u.roles };
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  const region = await prisma.region.create({ data: { name: "Dar es Salaam", slug: "dar-es-salaam", zone: "Coastal", sortOrder: 0 } });
  regionId = region.id;
  await prisma.district.create({ data: { name: "Kinondoni", slug: "kinondoni", regionId } });
  const make = await prisma.make.create({ data: { name: "Toyota", slug: "toyota", isPopular: true } });
  makeId = make.id;
  modelId = (await prisma.vehicleModel.create({ data: { name: "Harrier", slug: "harrier", makeId, defaultBodyType: "SUV" } })).id;
  admin = await user("Site Admin", "+255668212595", ["ADMIN", "BUYER"]);
  dealer = await user("Juma Motors Owner", "+255711222444");
  buyer = await user("Asha Buyer", "+255744111222", ["BUYER"], "OldPassword1");
  garage = await user("Neema Garage", "+255688333222");
});

afterAll(async () => {
  await wait(300); // let fire-and-forget notifications finish
  await prisma.$disconnect();
});

const shop = (name: string, phone: string, extra: Record<string, unknown> = {}) =>
  shopSchema.parse({ name, phone, regionId: 1, address: "Mikocheni B, near Shoppers Plaza", latitude: -6.76, longitude: 39.25, ...extra });

describe("seller registration (TSh 30,000)", () => {
  it("cannot list a car before registering", async () => {
    const input = listingCreateSchema.parse({ makeId, modelId, year: 2016, condition: "FOREIGN_USED", bodyType: "SUV", transmission: "AUTOMATIC", fuelType: "PETROL", mileageKm: 78000, description: "Clean Harrier with full service history, viewing any day.", priceTzs: "62m", regionId, confirmOwnership: true });
    await expect(createListing(dealer, input)).rejects.toThrow(/registration/i);
  });

  it("saves details, takes the online payment, and waits for the admin", async () => {
    const reg = await saveRegistrationDetails(dealer, "DEALER", shop("Juma Motors", "0711222444", { regionId }));
    expect(reg.status).toBe("AWAITING_PAYMENT");
    expect(Number(reg.feeTzs)).toBe(30_000);

    const pay = await initiatePayment(dealer, paymentInitSchema.parse({ purpose: "REGISTRATION_FEE", provider: "MPESA", msisdn: "0754999888" }));
    expect(Number((await prisma.payment.findUniqueOrThrow({ where: { id: pay.paymentId } })).amountTzs)).toBe(30_000);
    await fulfillPayment(pay.paymentId, { gatewayRef: "MPESA-TEST-1" });
    // a second callback for the same payment must not double-process
    expect((await fulfillPayment(pay.paymentId)).delivered).toBe(false);

    const after = await prisma.sellerRegistration.findUniqueOrThrow({ where: { userId: dealer.id } });
    expect(after.status).toBe("PAYMENT_SUBMITTED");
    expect(await getMyShop(dealer.id)).toBeNull(); // not live until the admin approves
  });

  it("only staff can approve; approval creates the mini-site and seller role", async () => {
    const reg = await prisma.sellerRegistration.findUniqueOrThrow({ where: { userId: dealer.id } });
    await expect(approveRegistration(buyer, reg.id)).rejects.toThrow();
    const biz = await approveRegistration(admin, reg.id);
    expect(biz.type).toBe("DEALERSHIP");
    expect(biz.slug).toMatch(/^juma-motors/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: dealer.id } })).roles).toContain("DEALER");
    dealer.roles = [...dealer.roles, "DEALER"];
    expect((await getMyShop(dealer.id))?.id).toBe(biz.id);
  });

  it("Lipa Namba: a transaction code can only be used once, and a rejection lets the seller pay again", async () => {
    process.env.NEXT_PUBLIC_LIPA_NAMBA = "5512345";
    const { SITE } = await import("@/config/site");
    (SITE.manualPayment as { lipaNamba: string }).lipaNamba = "5512345";
    await saveRegistrationDetails(garage, "SERVICE_PROVIDER", shop("Neema Auto Garage", "0688333222", { regionId, services: [{ category: "PRE_PURCHASE_INSPECTION", title: "120-point inspection", priceFromTzs: "80,000" }, { category: "FINANCING", title: "Car loans", priceFromTzs: "100000" }] }));
    const r1 = await submitManualPayment(garage, "QJK7H2LM9P", "+255688333222");
    expect(r1.status).toBe("PAYMENT_SUBMITTED");
    await rejectRegistration(admin, r1.id, "Code not found on statement");
    const r2 = await submitManualPayment(garage, "QJK7H2LM9Q", "+255688333222");
    const other = await user("Someone Else", "+255622111000");
    await saveRegistrationDetails(other, "SELLER", shop("Someone", "0622111000", { regionId }));
    await expect(submitManualPayment(other, "QJK7H2LM9Q", "+255622111000")).rejects.toThrow(/already been used/);
    await approveRegistration(admin, r2.id);
    garage.roles = [...garage.roles, "SERVICE_PROVIDER"];
  });
});

let listingId = "";
describe("listings: price and mileage are compulsory", () => {
  const base = { makeId: 0, modelId: 0, year: 2016, condition: "FOREIGN_USED", bodyType: "SUV", transmission: "AUTOMATIC", fuelType: "PETROL", mileageKm: 78000, description: "Clean Harrier with full service history, viewing any day.", priceTzs: "62m", regionId: 0, confirmOwnership: true };

  it("the database itself refuses a listing priced at zero", async () => {
    const biz = await getMyShop(dealer.id);
    await expect(prisma.listing.create({
      data: { slug: "zero-price", title: "x", description: "x", sellerId: dealer.id, businessId: biz!.id, contactPhone: "+255711222444", makeId, modelId, year: 2016, condition: "NEW", bodyType: "SUV", transmission: "AUTOMATIC", fuelType: "PETROL", mileageKm: 0, priceTzs: 0n, regionId },
    })).rejects.toThrow();
  });

  it("a registered dealer lists a car; it is held for review, then published", async () => {
    const input = listingCreateSchema.parse({ ...base, makeId, modelId, regionId });
    const r = await createListing(dealer, input);
    listingId = r.id;
    expect(r.status).toBe("PENDING_REVIEW");
    const l = await prisma.listing.findUniqueOrThrow({ where: { id: r.id } });
    expect(l.sellerType).toBe("DEALER");
    expect(l.mileageKm).toBe(78000);
    expect(l.latitude).toBeCloseTo(-6.76); // location defaults from the mini-site
  });

  it("a buyer's saved search is alerted when the car goes live", async () => {
    const s = await saveSearch(buyer, { name: "Harrier under 70M", query: `make=toyota&priceMax=70000000&region=dar-es-salaam`, alerts: true });
    const miss = await saveSearch(buyer, { name: "Cheap cars", query: "priceMax=10000000", alerts: true });
    await moderateListing(admin, listingId, "APPROVE");
    // the approval sends the alert in the background
    for (let i = 0; i < 30 && !(await prisma.savedSearch.findUniqueOrThrow({ where: { id: s.id } })).lastAlertAt; i++) await wait(100);
    expect((await prisma.savedSearch.findUniqueOrThrow({ where: { id: s.id } })).lastAlertAt).not.toBeNull();
    expect((await prisma.savedSearch.findUniqueOrThrow({ where: { id: miss.id } })).lastAlertAt).toBeNull();
    // the same car never triggers a second alert inside the cool-down, even when called again at once
    const again = await Promise.all([notifySavedSearches(listingId), notifySavedSearches(listingId)]);
    expect(again).toEqual([0, 0]);
  });

  it("buyers who saved the car get a price-drop alert once", async () => {
    await prisma.favorite.create({ data: { userId: buyer.id, listingId, alertPriceTzs: 62_000_000n } });
    await prisma.listing.update({ where: { id: listingId }, data: { priceTzs: 58_000_000n } });
    // two triggers at the same moment still send exactly one alert
    const sent = await Promise.all([notifyPriceDrops(listingId), notifyPriceDrops(listingId)]);
    expect(sent[0] + sent[1]).toBe(1);
    expect(await notifyPriceDrops(listingId)).toBe(0);
    expect((await prisma.favorite.findFirstOrThrow({ where: { listingId } })).alertPriceTzs).toBe(58_000_000n);
  });

  it("the seller is reminded before expiry and can renew for free", async () => {
    await prisma.listing.update({ where: { id: listingId }, data: { expiresAt: new Date(Date.now() + 2 * 86400_000) } });
    expect(await sendExpiryWarnings()).toBe(1);
    expect(await sendExpiryWarnings()).toBe(0);
    await updateListing(dealer, listingId, { renew: true });
    const l = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(l.expiryNotifiedAt).toBeNull();
    expect(l.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 59 * 86400_000);
  });
});

describe("spare parts management", () => {
  it("lists, edits, sells out and restocks a part", async () => {
    const input = partCreateSchema.parse({ title: "Brake pads Harrier", category: "BRAKES", regionId, priceTzs: "145,000", stockQty: 2, fitments: [{ makeId, modelId, yearFrom: 2013, yearTo: 2020 }] });
    const p = await createPart(dealer, input);
    const edited = await updatePart(dealer, p.id, { ...input, priceTzs: 139_000, title: "Brake pads Harrier (front)" });
    expect(edited.slug).toBe(p.slug);
    expect(Number((await prisma.sparePart.findUniqueOrThrow({ where: { id: p.id } })).priceTzs)).toBe(139_000);
    expect((await setPartStatus(dealer, p.id, { stockQty: 0 })).status).toBe("SOLD");
    expect((await setPartStatus(dealer, p.id, { stockQty: 5 })).status).toBe("ACTIVE");
    await expect(setPartStatus(buyer, p.id, { status: "ARCHIVED" })).rejects.toThrow(/Forbidden/);
  });
});

describe("inspections and reviews", () => {
  it("a buyer books the garage, the garage confirms and completes", async () => {
    const g = await getMyShop(garage.id);
    const req = await requestInspection(buyer, { listingId, providerId: g!.id, preferredDate: new Date(Date.now() + 86400_000) });
    expect(Number(req.feeTzs)).toBe(80_000);
    await expect(requestInspection(buyer, { listingId, providerId: g!.id })).rejects.toThrow(/already/);
    await updateInspection(garage, req.id, { action: "schedule", scheduledAt: new Date(Date.now() + 2 * 86400_000) });
    const done = await updateInspection(garage, req.id, { action: "complete", report: "Engine and gearbox good. Minor scratch rear bumper." });
    expect(done.status).toBe("COMPLETED");
  });

  it("only buyers who made contact can review; the rating is recalculated", async () => {
    const d = await getMyShop(dealer.id);
    expect((await reviewEligibility(buyer.id, d!.id)).ok).toBe(false);
    expect((await reviewEligibility(dealer.id, d!.id)).ok).toBe(false); // own business
    await prisma.inquiry.create({ data: { listingId, recipientId: dealer.id, buyerId: buyer.id, name: "Asha", phone: "+255744111222", message: "Is it available?" } });
    await upsertReview(buyer, { businessId: d!.id, rating: 4, body: "Honest dealer, car exactly as described. Call me on 0712 345 678" });
    const biz = await prisma.business.findUniqueOrThrow({ where: { id: d!.id } });
    expect(biz.ratingAvg).toBe(4);
    expect(biz.ratingCount).toBe(1);
    const review = await prisma.review.findFirstOrThrow({ where: { businessId: d!.id } });
    expect(review.body).not.toContain("0712"); // contact details removed
    // the garage became reviewable through the inspection
    const g = await getMyShop(garage.id);
    expect((await reviewEligibility(buyer.id, g!.id)).ok).toBe(true);
  });
});

describe("password reset", () => {
  it("resets by SMS code and rejects a wrong code", async () => {
    const r = await requestPasswordReset("0744 111 222");
    expect(r.devCode).toMatch(/^\d{6}$/);
    await expect(confirmPasswordReset("0744111222", "000000" === r.devCode ? "111111" : "000000", "NewPassword9")).rejects.toThrow(/wrong|expired/);
    await confirmPasswordReset("0744111222", r.devCode!, "NewPassword9");
    const u = await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } });
    expect(await bcrypt.compare("NewPassword9", u.passwordHash!)).toBe(true);
  });
  it("does not reveal whether an account exists", async () => {
    await expect(requestPasswordReset("0699 000 000")).resolves.toEqual({ ok: true });
  });
});

describe("revenue report", () => {
  it("counts the online and the verified Lipa Namba registration fees", async () => {
    const r = await getRevenueReport("30d");
    expect(r.total).toBe(60_000);
    expect(r.byMethod.map((m) => m.key).sort()).toEqual(["LIPA_NAMBA", "MPESA"]);
    expect(r.byPurpose[0]).toMatchObject({ key: "REGISTRATION_FEE", tzs: 60_000, count: 2 });
    expect(r.series.reduce((s, p) => s + p.tzs, 0)).toBe(60_000);
  });
});

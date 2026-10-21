import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentGateway, PaymentProvider } from "@/generated/prisma/enums";
import type { PaymentInitInput } from "@/lib/validation";
import type { SessionUser } from "@/lib/session";
import { absoluteUrl } from "@/lib/utils";
import { ListingError } from "../listings";
import type { InitiateResult, PaymentGatewayAdapter } from "./types";
import { azampay } from "./azampay";
import { selcom } from "./selcom";
import { dpo } from "./dpo";
import { isBlocked, markWalletVerified } from "../fraud/engine";
import { markRegistrationPaid, planBusinessType } from "../registration";

/**
 * Development gateway: used automatically when no real gateway is configured
 * and NODE_ENV !== "production". The payment succeeds on the first status poll
 * after ~4 seconds, so the full promote → pay → feature flow can be tested.
 */
const mock: PaymentGatewayAdapter = {
  name: "MANUAL",
  isConfigured: () => process.env.NODE_ENV !== "production",
  supports: () => true,
  async initiate(p): Promise<InitiateResult> {
    console.info(`💳 [mock payment] ${p.reference} TZS ${p.amountTzs} via ${p.provider} ${p.msisdn ?? ""}`);
    return { ok: true, status: "PENDING", gatewayRef: `MOCK-${p.reference}` };
  },
};

/** Gateway routing: mobile money → AzamPay (fallback Selcom); cards → DPO (fallback Selcom). */
function pickGateway(provider: PaymentProvider): PaymentGatewayAdapter {
  const order = provider === "CARD" ? [dpo, selcom] : [azampay, selcom];
  const preferred = provider === "CARD" ? process.env.PAYMENTS_CARD_GATEWAY : process.env.PAYMENTS_MNO_GATEWAY;
  if (preferred) order.sort((a) => (a.name.toLowerCase() === preferred.toLowerCase() ? -1 : 1));
  const gw = order.find((g) => g.isConfigured() && g.supports(provider));
  if (gw) return gw;
  if (mock.isConfigured()) return mock;
  throw new ListingError("Payments are not configured", 503);
}

function newReference() {
  return `GS${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Resolves the price server-side — the client never sends an amount. */
async function resolveCharge(user: SessionUser, input: PaymentInitInput) {
  if (input.purpose === "PROMOTION") {
    const [product, listing] = await Promise.all([
      prisma.promotionProduct.findUnique({ where: { code: input.productCode! } }),
      prisma.listing.findUnique({ where: { id: input.listingId! }, select: { id: true, sellerId: true, title: true, status: true, businessId: true } }),
    ]);
    if (!product?.isActive) throw new ListingError("Unknown promotion");
    if (!listing || listing.sellerId !== user.id) throw new ListingError("Listing not found", 404);
    if (listing.status !== "ACTIVE") throw new ListingError("Only active listings can be promoted", 409);
    return {
      amountTzs: product.priceTzs, businessId: listing.businessId ?? undefined,
      description: `${product.name}: ${listing.title}`.slice(0, 100),
      metadata: { productCode: product.code, listingId: listing.id },
    };
  }
  if (input.purpose === "REGISTRATION_FEE") {
    const reg = await prisma.sellerRegistration.findUnique({ where: { userId: user.id } });
    if (!reg) throw new ListingError("Fill in your registration details first", 400);
    if (reg.status === "APPROVED") throw new ListingError("Your registration is already approved", 409);
    if (reg.status === "PAYMENT_SUBMITTED") throw new ListingError("Your payment is already waiting for admin verification", 409);
    return { amountTzs: reg.feeTzs, description: "MagariSOKO Tanzania seller registration", metadata: { registrationId: reg.id } };
  }
  if (input.purpose === "LISTING_FEE") throw new ListingError("Listings have no per-listing fee. Sellers pay the one-off registration fee.", 400);
  // SUBSCRIPTION
  const [plan, member] = await Promise.all([
    prisma.plan.findUnique({ where: { code: input.planCode! } }),
    prisma.businessMember.findUnique({ where: { businessId_userId: { businessId: input.businessId!, userId: user.id } }, include: { business: true } }),
  ]);
  if (!plan?.isActive) throw new ListingError("Unknown plan");
  if (!member || !["OWNER", "MANAGER"].includes(member.role)) throw new ListingError("Only owners and managers can manage billing", 403);
  if (plan.businessType !== planBusinessType(member.business.type)) throw new ListingError("This plan is not for your business type");
  const yearly = input.billing === "yearly" && plan.priceTzsYearly;
  return {
    amountTzs: yearly ? plan.priceTzsYearly! : plan.priceTzsMonthly,
    businessId: member.businessId,
    description: `${plan.name} (${yearly ? "yearly" : "monthly"}) — ${member.business.name}`.slice(0, 100),
    metadata: { planId: plan.id, planCode: plan.code, billing: yearly ? "yearly" : "monthly" },
  };
}

export async function initiatePayment(user: SessionUser, input: PaymentInitInput) {
  if (input.msisdn && (await isBlocked("PHONE", input.msisdn))) throw new ListingError("This mobile money number cannot be used. Contact support.", 403);
  const charge = await resolveCharge(user, input);
  const gateway = pickGateway(input.provider);
  const reference = newReference();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, phone: true } });

  const payment = await prisma.payment.create({
    data: {
      reference, userId: user.id, businessId: charge.businessId, purpose: input.purpose, amountTzs: charge.amountTzs,
      provider: input.provider, gateway: gateway.name as PaymentGateway, msisdn: input.msisdn, metadata: charge.metadata,
    },
  });

  const token = process.env.AZAMPAY_CALLBACK_TOKEN ? `?token=${process.env.AZAMPAY_CALLBACK_TOKEN}` : "";
  const result = await gateway.initiate({
    reference,
    amountTzs: Number(charge.amountTzs),
    provider: input.provider,
    msisdn: input.msisdn,
    description: charge.description,
    buyer: { name: dbUser.name, email: dbUser.email, phone: dbUser.phone },
    callbackUrl: absoluteUrl(`/api/payments/callback/${gateway.name.toLowerCase()}${gateway.name === "AZAMPAY" ? token : ""}`),
    returnUrl: absoluteUrl(`/api/payments/return?ref=${reference}`),
    cancelUrl: absoluteUrl(`/dashboard/payments/${payment.id}?cancelled=1`),
  });

  if (!result.ok) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: result.error, rawResponse: toJson(result.raw) } });
    throw new ListingError(result.error, 502);
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayRef: result.gatewayRef, checkoutUrl: result.checkoutUrl, rawResponse: toJson(result.raw) },
  });
  return { paymentId: payment.id, reference, status: "PENDING" as const, checkoutUrl: result.checkoutUrl ?? null, gateway: gateway.name };
}

function toJson(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined || v === null) return undefined;
  return (typeof v === "object" ? v : { value: String(v) }) as Prisma.InputJsonValue;
}

/**
 * Marks a payment successful and delivers what was bought. Idempotent:
 * concurrent webhooks / polls cannot deliver twice (conditional update).
 */
export async function fulfillPayment(paymentId: string, opts: { gatewayRef?: string; raw?: unknown; paidAmountTzs?: number } = {}) {
  const result = await deliverPayment(paymentId, opts);
  if (result.delivered) {
    // A completed mobile-money payment proves control of a NIDA-registered SIM wallet.
    const p = await prisma.payment.findUnique({ where: { id: paymentId }, select: { userId: true, msisdn: true, provider: true } });
    if (p?.msisdn && p.provider !== "CARD") await markWalletVerified(p.userId, p.msisdn);
  }
  return result;
}

async function deliverPayment(paymentId: string, opts: { gatewayRef?: string; raw?: unknown; paidAmountTzs?: number }) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (opts.paidAmountTzs !== undefined && opts.paidAmountTzs < Number(payment.amountTzs)) {
      await tx.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED", failureReason: `Underpaid: ${opts.paidAmountTzs}`, rawCallback: toJson(opts.raw) } });
      return { delivered: false, reason: "underpaid" };
    }
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "SUCCESS", paidAt: new Date(), gatewayRef: opts.gatewayRef ?? payment.gatewayRef, rawCallback: toJson(opts.raw) },
    });
    if (claimed.count === 0) return { delivered: false, reason: "already-processed" };

    const meta = (payment.metadata ?? {}) as Record<string, string>;
    const now = new Date();

    if (payment.purpose === "PROMOTION") {
      const product = await tx.promotionProduct.findUniqueOrThrow({ where: { code: meta.productCode } });
      const listing = await tx.listing.findUniqueOrThrow({ where: { id: meta.listingId } });
      const days = product.days * 86400_000;
      const extend = (until: Date | null) => new Date(Math.max(until?.getTime() ?? 0, now.getTime()) + days);
      let endsAt = new Date(now.getTime() + days);
      if (product.type === "FEATURED") {
        endsAt = extend(listing.featuredUntil);
        await tx.listing.update({ where: { id: listing.id }, data: { isFeatured: true, featuredUntil: endsAt } });
      } else if (product.type === "SPONSORED" || product.type === "HOMEPAGE_SPOTLIGHT") {
        endsAt = extend(listing.sponsoredUntil);
        await tx.listing.update({ where: { id: listing.id }, data: { isSponsored: true, sponsoredUntil: endsAt } });
      } else if (product.type === "BUMP") {
        await tx.listing.update({ where: { id: listing.id }, data: { publishedAt: now, bumpedAt: now } });
      }
      await tx.promotion.create({ data: { listingId: listing.id, type: product.type, startsAt: now, endsAt, paymentId } });
    } else if (payment.purpose === "REGISTRATION_FEE") {
      // Paid, but an admin must still verify before the mini-site is created.
      await markRegistrationPaid(tx, payment.userId, paymentId);
    } else if (payment.purpose === "LISTING_FEE") {
      await tx.listing.updateMany({ where: { id: meta.listingId, status: "DRAFT" }, data: { status: "PENDING_REVIEW" } });
    } else if (payment.purpose === "SUBSCRIPTION" && payment.businessId) {
      const months = meta.billing === "yearly" ? 12 : 1;
      const current = await tx.subscription.findFirst({
        where: { businessId: payment.businessId, status: { in: ["ACTIVE", "TRIALING"] }, currentPeriodEnd: { gt: now } },
        orderBy: { currentPeriodEnd: "desc" },
      });
      const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };
      if (current && current.planId === meta.planId) {
        await tx.subscription.update({ where: { id: current.id }, data: { currentPeriodEnd: addMonths(current.currentPeriodEnd, months), status: "ACTIVE" } });
        await tx.payment.update({ where: { id: paymentId }, data: { subscriptionId: current.id } });
      } else {
        if (current) await tx.subscription.update({ where: { id: current.id }, data: { status: "CANCELLED" } });
        const sub = await tx.subscription.create({
          data: { businessId: payment.businessId, planId: meta.planId, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: addMonths(now, months) },
        });
        await tx.payment.update({ where: { id: paymentId }, data: { subscriptionId: sub.id } });
      }
    }
    return { delivered: true };
  });
}

export async function failPayment(paymentId: string, reason: string, raw?: unknown) {
  await prisma.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED", failureReason: reason, rawCallback: toJson(raw) } });
}

/** Polled by the browser while the customer approves the USSD prompt. */
export async function getPaymentStatus(user: SessionUser, paymentId: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.userId !== user.id) throw new ListingError("Not found", 404);

  if (p.status === "PENDING") {
    const ageMs = Date.now() - p.createdAt.getTime();
    if (p.gateway === "MANUAL" && process.env.NODE_ENV !== "production" && ageMs > 4000) {
      await fulfillPayment(p.id, { raw: { mock: true } });
    } else if (p.gateway === "SELCOM" && ageMs > 15000) {
      const v = await selcom.verify(p.reference).catch(() => null);
      if (v?.status === "SUCCESS") await fulfillPayment(p.id, { gatewayRef: v.gatewayRef, raw: v.raw, paidAmountTzs: v.amountTzs });
      else if (v?.status === "FAILED") await failPayment(p.id, "Declined at Selcom", v.raw);
    } else if (p.gateway === "DPO" && p.gatewayRef && ageMs > 15000) {
      const v = await dpo.verify(p.gatewayRef).catch(() => null);
      if (v?.status === "SUCCESS") await fulfillPayment(p.id, { raw: v.raw, paidAmountTzs: v.amountTzs });
      else if (v?.status === "FAILED" && ageMs > 30 * 60_000) await failPayment(p.id, "Card payment not completed", v.raw);
    } else if (ageMs > 10 * 60_000) {
      await failPayment(p.id, "Timed out waiting for confirmation");
    }
  }
  const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { id: true, status: true, failureReason: true, purpose: true, amountTzs: true, checkoutUrl: true, metadata: true } });
  return fresh;
}

export { selcom, dpo };

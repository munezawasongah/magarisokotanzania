import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { fulfillPayment, failPayment } from "@/server/payments";
import type { AzamPayCallback } from "@/server/payments/azampay";
import { json, jsonError } from "@/lib/json";

function tokenOk(given: string | null) {
  const expected = process.env.AZAMPAY_CALLBACK_TOKEN;
  if (!expected) return process.env.NODE_ENV !== "production";
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * AzamPay MNO checkout callback. AzamPay does not sign callbacks, so the URL
 * carries a shared secret (?token=…) and the amount must match our record.
 */
export async function POST(req: Request) {
  if (!tokenOk(new URL(req.url).searchParams.get("token"))) return jsonError("Forbidden", 403);
  const body = (await req.json().catch(() => ({}))) as AzamPayCallback;
  const ref = body.utilityref;
  if (!ref) return jsonError("Missing reference", 400);
  const payment = await prisma.payment.findUnique({ where: { reference: ref } });
  if (!payment || payment.gateway !== "AZAMPAY") return jsonError("Unknown payment", 404);

  if ((body.transactionstatus ?? "").toLowerCase() === "success") {
    await fulfillPayment(payment.id, { gatewayRef: body.reference, raw: body, paidAmountTzs: body.amount ? Math.round(Number(body.amount)) : undefined });
  } else {
    await failPayment(payment.id, body.message || "Payment failed", body);
  }
  return json({ received: true });
}

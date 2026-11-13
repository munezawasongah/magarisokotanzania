import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { fulfillPayment, failPayment } from "@/server/payments";
import { daraja, type DarajaCallback } from "@/server/payments/daraja";
import { json } from "@/lib/json";

function tokenOk(given: string | null) {
  const expected = process.env.DARAJA_CALLBACK_TOKEN;
  if (!expected) return process.env.NODE_ENV !== "production";
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * M-Pesa Express (STK push) result. Safaricom does not sign callbacks, so the URL carries a
 * shared secret (?token=…), the CheckoutRequestID must match a payment we started, the amount
 * must match, and a "paid" result is confirmed with Safaricom's query API before we deliver.
 * Always answers 200 with ResultCode 0 so Safaricom stops retrying.
 */
export async function POST(req: Request) {
  const ack = json({ ResultCode: 0, ResultDesc: "Accepted" });
  if (!tokenOk(new URL(req.url).searchParams.get("token"))) return json({ ResultCode: 1, ResultDesc: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as DarajaCallback;
  const cb = body.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return ack;
  const payment = await prisma.payment.findFirst({ where: { gatewayRef: cb.CheckoutRequestID, gateway: "DARAJA" } });
  if (!payment) return ack;

  if (cb.ResultCode === 0) {
    const item = (n: string) => cb.CallbackMetadata?.Item?.find((i) => i.Name === n)?.Value;
    const confirmed = process.env.NODE_ENV !== "production" || (await daraja.verify(cb.CheckoutRequestID).catch(() => null))?.status === "SUCCESS";
    if (confirmed) {
      const amount = Number(item("Amount"));
      await fulfillPayment(payment.id, { gatewayRef: String(item("MpesaReceiptNumber") ?? cb.CheckoutRequestID), raw: body, paidAmountTzs: Number.isFinite(amount) ? Math.round(amount) : undefined });
    }
  } else {
    await failPayment(payment.id, cb.ResultDesc || "M-Pesa payment not completed", body);
  }
  return ack;
}

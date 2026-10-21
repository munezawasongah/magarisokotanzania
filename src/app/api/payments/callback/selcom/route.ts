import { prisma } from "@/lib/prisma";
import { fulfillPayment, failPayment, selcom } from "@/server/payments";
import { json, jsonError } from "@/lib/json";

/** Selcom webhook. The payload is treated as a hint: status is confirmed via the order-status API. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { order_id?: string };
  if (!body.order_id) return jsonError("Missing order_id", 400);
  const payment = await prisma.payment.findUnique({ where: { reference: body.order_id } });
  if (!payment || payment.gateway !== "SELCOM") return jsonError("Unknown payment", 404);
  const v = await selcom.verify(payment.reference);
  if (v.status === "SUCCESS") await fulfillPayment(payment.id, { gatewayRef: v.gatewayRef, raw: { webhook: body, verify: v.raw }, paidAmountTzs: v.amountTzs });
  else if (v.status === "FAILED") await failPayment(payment.id, "Declined", { webhook: body, verify: v.raw });
  return json({ result: "SUCCESS", resultcode: "000" });
}

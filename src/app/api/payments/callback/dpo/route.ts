import { prisma } from "@/lib/prisma";
import { fulfillPayment, failPayment, dpo } from "@/server/payments";
import { jsonError } from "@/lib/json";

/** DPO push notification (XML or form). Always re-verified with verifyToken. */
export async function POST(req: Request) {
  const text = await req.text();
  const token = text.match(/<TransactionToken>([^<]+)<\/TransactionToken>/)?.[1] ?? new URLSearchParams(text).get("TransactionToken");
  if (!token) return jsonError("Missing token", 400);
  const payment = await prisma.payment.findFirst({ where: { gatewayRef: token, gateway: "DPO" } });
  if (!payment) return jsonError("Unknown payment", 404);
  const v = await dpo.verify(token);
  if (v.status === "SUCCESS") await fulfillPayment(payment.id, { raw: v.raw, paidAmountTzs: v.amountTzs });
  else if (v.status === "FAILED") await failPayment(payment.id, "Declined", v.raw);
  return new Response("<?xml version=\"1.0\" encoding=\"utf-8\"?><API3G><Response>OK</Response></API3G>", { headers: { "Content-Type": "application/xml" } });
}

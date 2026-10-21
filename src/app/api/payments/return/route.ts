import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fulfillPayment, dpo, selcom } from "@/server/payments";

/** Browser lands here after a card checkout; verify, then show the payment page. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const ref = sp.get("ref");
  const payment = ref ? await prisma.payment.findUnique({ where: { reference: ref } }) : null;
  if (!payment) redirect("/dashboard");
  if (payment.status === "PENDING") {
    if (payment.gateway === "DPO" && payment.gatewayRef) {
      const v = await dpo.verify(payment.gatewayRef).catch(() => null);
      if (v?.status === "SUCCESS") await fulfillPayment(payment.id, { raw: v.raw, paidAmountTzs: v.amountTzs });
    } else if (payment.gateway === "SELCOM") {
      const v = await selcom.verify(payment.reference).catch(() => null);
      if (v?.status === "SUCCESS") await fulfillPayment(payment.id, { gatewayRef: v.gatewayRef, raw: v.raw, paidAmountTzs: v.amountTzs });
    }
  }
  redirect(`/dashboard/payments/${payment.id}`);
}

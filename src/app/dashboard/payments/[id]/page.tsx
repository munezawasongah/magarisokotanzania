import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatTzs } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const p = await prisma.payment.findUnique({ where: { id }, include: { promotion: true } });
  if (!p || p.userId !== user.id) notFound();
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="display text-2xl">Payment {p.reference}</h1>
      <div className="panel space-y-2 p-5 text-sm">
        <p className="flex justify-between"><span className="text-ink-500">Status</span><Badge tone={p.status === "SUCCESS" ? "go" : p.status === "PENDING" ? "plate" : "danger"}>{p.status}</Badge></p>
        <p className="flex justify-between"><span className="text-ink-500">Amount</span><span className="tabular-nums">{formatTzs(p.amountTzs)}</span></p>
        <p className="flex justify-between"><span className="text-ink-500">Method</span><span>{p.provider} via {p.gateway}</span></p>
        {p.promotion && <p className="flex justify-between"><span className="text-ink-500">Active until</span><span>{p.promotion.endsAt.toLocaleString("en-GB")}</span></p>}
        {p.failureReason && <p className="text-danger">{p.failureReason}</p>}
      </div>
      <Link href="/dashboard/listings" className="btn-primary">Back to inventory</Link>
    </div>
  );
}

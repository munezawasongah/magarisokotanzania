import Link from "next/link";
import { CheckCircle2, Clock, Smartphone, XCircle } from "lucide-react";
import { getRegistrationQueue } from "@/server/registration";
import { approveRegistrationAction, rejectRegistrationAction } from "@/server/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { formatTzPhone } from "@/lib/phone";
import { formatTzs } from "@/lib/money";
import { SITE } from "@/config/site";
import { cn } from "@/lib/utils";

export const metadata = { title: "Seller registrations" };

const TABS = [
  ["PAYMENT_SUBMITTED", "Awaiting verification"],
  ["AWAITING_PAYMENT", "Not paid yet"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
] as const;
type Tab = (typeof TABS)[number][0];

const TYPE_LABEL: Record<string, string> = { SELLER: "Private seller", DEALER: "Car dealer", YARD: "Car yard", IMPORTER: "Importer", PARTS_VENDOR: "Spare parts shop", SERVICE_PROVIDER: "Garage / service provider" };

export default async function RegistrationsPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const sp = await searchParams;
  const status: Tab = (TABS.find(([k]) => k === sp.status)?.[0] ?? "PAYMENT_SUBMITTED") as Tab;
  const list = await getRegistrationQueue(status);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="display text-2xl">Seller registrations</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          Every seller, dealer, importer, spare-parts shop and service provider pays {formatTzs(SITE.registrationFeeTzs)}. Confirm the money is in the account
          (online payments are confirmed by the gateway; for Lipa Namba payments, match the transaction code and amount on your M-Pesa / Mixx / Airtel statement), then approve.
          Approval creates the seller&apos;s mini-site and sends them an SMS.
        </p>
      </header>
      {sp.error && <p className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger" role="alert">{sp.error}</p>}

      <nav className="flex flex-wrap gap-2" aria-label="Status">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/registrations?status=${k}`} className={cn("chip", status === k && "border-ink-900 bg-ink-900 text-white")}>{label}</Link>
        ))}
      </nav>

      <ul className="space-y-3">
        {list.map((r) => {
          const pay = r.payment;
          const paidOnline = pay?.status === "SUCCESS";
          return (
            <li key={r.id} className="panel grid gap-4 p-4 lg:grid-cols-[1.3fr_1fr_auto]">
              <div className="min-w-0 space-y-1 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{r.shop.name}</span>
                  <Badge tone="ink">{TYPE_LABEL[r.accountType] ?? r.accountType}</Badge>
                  {r.user.isShadowBanned && <Badge tone="danger">Shadow-banned user</Badge>}
                  {r.user.riskScore >= 30 && <Badge tone="plate">Risk {r.user.riskScore}</Badge>}
                </p>
                <p className="text-ink-700">{r.user.name} · {r.user.phone ? formatTzPhone(r.user.phone) : r.user.email}</p>
                <p className="text-ink-500">Shop phone {formatTzPhone(r.shop.phone)} · {r.shop.address}, {r.regionName}</p>
                {(r.shop.tin || r.shop.brelaRegNo) && <p className="text-xs">TIN <code>{r.shop.tin ?? "—"}</code> · BRELA <code>{r.shop.brelaRegNo ?? "—"}</code></p>}
                {r.shop.services.length > 0 && (
                  <p className="text-xs text-ink-500">Services: {r.shop.services.map((s) => `${s.title} (${formatTzs(s.priceFromTzs)})`).join(", ")}</p>
                )}
                <p className="text-xs text-ink-300">Registered {r.createdAt.toLocaleString("en-GB")}{r.submittedAt ? ` · paid ${r.submittedAt.toLocaleString("en-GB")}` : ""}</p>
                {r.rejectionReason && <p className="text-xs text-danger">Rejected: {r.rejectionReason}</p>}
              </div>

              <div className="space-y-1.5 rounded-md bg-paper p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Payment evidence</p>
                <p><span className="plate text-sm">{formatTzs(r.feeTzs)}</span></p>
                {pay ? (
                  <>
                    <p className="flex items-center gap-1.5">
                      {paidOnline ? <CheckCircle2 className="h-4 w-4 text-go-600" /> : pay.status === "FAILED" ? <XCircle className="h-4 w-4 text-danger" /> : <Clock className="h-4 w-4 text-plate-500" />}
                      Online · {pay.provider} · <strong>{pay.status}</strong>
                    </p>
                    <p className="text-xs text-ink-500">Amount {formatTzs(pay.amountTzs)} · from {pay.msisdn ? formatTzPhone(pay.msisdn) : "card"}</p>
                    <p className="text-xs text-ink-500">Ref <code>{pay.reference}</code>{pay.gatewayRef ? <> · gateway <code>{pay.gatewayRef}</code></> : null}</p>
                  </>
                ) : r.manualReference ? (
                  <>
                    <p className="flex items-center gap-1.5"><Smartphone className="h-4 w-4 text-ink-500" />Lipa Namba · code <code className="font-bold">{r.manualReference}</code></p>
                    <p className="text-xs text-ink-500">Paid from {r.manualMsisdn ? formatTzPhone(r.manualMsisdn) : "—"} — check your statement before approving.</p>
                  </>
                ) : (
                  <p className="text-xs text-ink-500">No payment yet.</p>
                )}
              </div>

              <div className="flex flex-col gap-2 lg:w-56">
                {r.status === "PAYMENT_SUBMITTED" && (
                  <>
                    <form action={approveRegistrationAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn w-full bg-go-600 text-white hover:bg-go-700" disabled={!!pay && !paidOnline}>Payment verified — approve</button>
                    </form>
                    <form action={rejectRegistrationAction} className="space-y-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="reason" className="field py-2 text-xs" placeholder="Reason (sent to the seller)" />
                      <button className="btn-danger w-full">Payment not found — reject</button>
                    </form>
                  </>
                )}
                {r.status === "APPROVED" && r.businessId && <ApprovedLink businessId={r.businessId} />}
              </div>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="panel p-8 text-center text-sm text-ink-500">Nothing here.</p>}
    </div>
  );
}

async function ApprovedLink({ businessId }: { businessId: string }) {
  const { prisma } = await import("@/lib/prisma");
  const b = await prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } });
  return b ? <Link href={`/shop/${b.slug}`} className="btn-ghost py-2">View mini-site</Link> : null;
}

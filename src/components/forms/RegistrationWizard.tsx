"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, Clock, Store, Truck, Warehouse, Wrench, Cog, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { formatTzs } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PaymentForm } from "@/components/dashboard/PaymentForm";
import { ShopForm, type ShopKind, type ShopValues, type SubmitResult } from "./ShopForm";

type RegionOpt = { id: number; name: string; districts: Array<{ id: number; name: string }> };
const TYPES: ShopKind[] = ["SELLER", "DEALER", "YARD", "IMPORTER", "PARTS_VENDOR", "SERVICE_PROVIDER"];
const ICONS: Record<ShopKind, typeof Car> = { SELLER: Car, DEALER: Store, YARD: Warehouse, IMPORTER: Truck, PARTS_VENDOR: Cog, SERVICE_PROVIDER: Wrench };

export type WizardProps = {
  regions: RegionOpt[];
  feeTzs: number;
  defaultPhone: string;
  initialType: ShopKind | null;
  initialShop: ShopValues;
  status: "NONE" | "AWAITING_PAYMENT" | "PAYMENT_SUBMITTED" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  manual: { lipaNamba: string; accountName: string; network: string };
};

/** Seller registration: account type → mini-site details → TSh 30,000 payment → admin verification. */
export function RegistrationWizard(p: WizardProps) {
  const { dict } = useI18n();
  const t = dict.reg;
  const router = useRouter();
  const hasDetails = p.status === "AWAITING_PAYMENT" || p.status === "REJECTED";
  const [step, setStep] = useState<0 | 1 | 2>(hasDetails ? 2 : p.initialType ? 1 : 0);
  const [type, setType] = useState<ShopKind | null>(p.initialType);
  const [shop, setShop] = useState<ShopValues>(p.initialShop);
  const [manual, setManual] = useState({ reference: "", msisdn: p.defaultPhone });
  const [manualState, setManualState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const fee = formatTzs(p.feeTzs);

  async function saveDetails(payload: Record<string, unknown>): Promise<SubmitResult> {
    const r = await fetch("/api/registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountType: type, shop: payload }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: data.error ?? dict.common.error, fieldErrors: data.details };
    setShop((s) => ({ ...s, ...(payload as Partial<ShopValues>), latitude: (payload.latitude as number | null) || null, longitude: (payload.longitude as number | null) || null }));
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return { ok: true };
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setManualState({ busy: true });
    const r = await fetch("/api/registration/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(manual) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return setManualState({ busy: false, error: data.error ?? dict.common.error });
    router.refresh();
  }

  const steps = [t.stepType, t.stepDetails, t.stepPayment, t.stepReview];

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} className={cn("border-t-4 pt-2 text-xs font-semibold sm:text-sm", i <= step ? "border-ink-900 text-ink-900" : "border-line text-ink-300")} aria-current={i === step ? "step" : undefined}>
            <span className="tabular-nums">{i + 1}.</span> {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <ul className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((k) => {
              const Icon = ICONS[k];
              const [title, desc] = t.types[k];
              return (
                <li key={k}>
                  <button type="button" onClick={() => setType(k)} aria-pressed={type === k}
                    className={cn("flex w-full items-start gap-3 rounded-lg border bg-white p-4 text-left transition-colors", type === k ? "border-ink-900 ring-2 ring-ink-900" : "border-line hover:border-ink-300")}>
                    <Icon className="mt-0.5 h-6 w-6 shrink-0 text-ink-700" aria-hidden />
                    <span><span className="block font-semibold">{title}</span><span className="text-sm text-ink-500">{desc}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-ink-700">{dict.reg.feeTitle}: <span className="plate text-sm">{fee}</span></p>
          <button type="button" className="btn-primary" disabled={!type} onClick={() => setStep(1)}>{t.continue}</button>
        </div>
      )}

      {step === 1 && type && (
        <div className="space-y-4">
          <button type="button" className="text-sm font-semibold text-ink-700 underline" onClick={() => setStep(0)}>← {t.back} · {t.types[type][0]}</button>
          <ShopForm kind={type} regions={p.regions} initial={shop} onSubmit={saveDetails} submitLabel={t.saveDetails} />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {p.status === "REJECTED" && p.rejectionReason && (
              <p className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger" role="alert">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />{fmt(t.rejected, { reason: p.rejectionReason })}
              </p>
            )}
            <section className="panel p-5">
              <h2 className="text-lg font-bold">{t.payOnline}</h2>
              <p className="mb-4 mt-1 text-sm text-ink-500">{t.feeTitle}: {fee}</p>
              <PaymentForm
                purpose="REGISTRATION_FEE"
                defaultPhone={p.defaultPhone}
                successHref="/dashboard/registration"
                items={[{ code: "REGISTRATION_FEE", name: t.feeTitle, priceTzs: p.feeTzs }]}
              />
            </section>
            {p.manual.lipaNamba && (
              <section className="panel p-5">
                <h2 className="text-lg font-bold">{t.payManual}</h2>
                <p className="mt-1 text-sm text-ink-700">{fmt(t.manualInstructions, { amount: fee, number: p.manual.lipaNamba, name: p.manual.accountName, network: p.manual.network })}</p>
                <form onSubmit={submitManual} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="ref">{t.reference}</label>
                    <input id="ref" className="field uppercase tracking-wide" value={manual.reference} onChange={(e) => setManual((m) => ({ ...m, reference: e.target.value.toUpperCase().replace(/\s/g, "") }))} placeholder="e.g. QJK7H2LM9P" required maxLength={14} />
                  </div>
                  <div>
                    <label className="label" htmlFor="payer">{t.payerPhone}</label>
                    <input id="payer" className="field" inputMode="tel" value={manual.msisdn} onChange={(e) => setManual((m) => ({ ...m, msisdn: e.target.value }))} required />
                  </div>
                  {manualState.error && <p className="text-sm text-danger sm:col-span-2" role="alert">{manualState.error}</p>}
                  <button className="btn-primary sm:col-span-2 sm:w-fit" disabled={manualState.busy}>{manualState.busy ? dict.common.loading : t.submitPayment}</button>
                </form>
              </section>
            )}
          </div>
          <aside className="panel h-fit space-y-2 p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" />{t.awaiting}</p>
            <p className="text-ink-700"><span className="font-semibold">{shop.name}</span>{type ? ` · ${t.types[type][0]}` : ""}</p>
            <p className="text-ink-500">{shop.address}</p>
            <button type="button" className="btn-ghost mt-2 py-2" onClick={() => setStep(type ? 1 : 0)}>{t.editDetails}</button>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Shown once payment is submitted (waiting for admin) or after approval. */
export function RegistrationStatus({ status, shopSlug, addHref }: { status: "PAYMENT_SUBMITTED" | "APPROVED"; shopSlug?: string | null; addHref?: string }) {
  const { dict } = useI18n();
  const t = dict.reg;
  if (status === "PAYMENT_SUBMITTED") {
    return (
      <div className="panel space-y-3 p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-plate-500" />
        <p className="mx-auto max-w-lg text-lg font-semibold">{t.submitted}</p>
      </div>
    );
  }
  return (
    <div className="panel space-y-4 p-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-go-600" />
      <p className="text-lg font-semibold">{t.approved}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {shopSlug && <a className="btn-primary" href={`/shop/${shopSlug}`}>{t.viewMiniSite}</a>}
        {addHref && <a className="btn-plate" href={addHref}>{t.addListing}</a>}
      </div>
    </div>
  );
}

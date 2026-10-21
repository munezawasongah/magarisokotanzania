"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import { detectNetwork, normalizeTzPhone } from "@/lib/phone";
import { formatTzs } from "@/lib/money";
import { cn } from "@/lib/utils";

type Provider = "MPESA" | "TIGO_PESA" | "AIRTEL_MONEY" | "HALOPESA" | "AZAMPESA" | "CARD";
const PROVIDERS: Provider[] = ["MPESA", "TIGO_PESA", "AIRTEL_MONEY", "HALOPESA", "AZAMPESA", "CARD"];
const NETWORK_TO_PROVIDER: Record<string, Provider> = { VODACOM: "MPESA", YAS: "TIGO_PESA", AIRTEL: "AIRTEL_MONEY", HALOTEL: "HALOPESA" };
const SWATCH: Record<Provider, string> = { MPESA: "bg-[#E60000]", TIGO_PESA: "bg-[#00377B]", AIRTEL_MONEY: "bg-[#ED1C24]", HALOPESA: "bg-[#F58220]", AZAMPESA: "bg-[#0B6E4F]", CARD: "bg-ink-900" };

export type PayItem = { code: string; name: string; priceTzs: number; note?: string };

/**
 * Mobile-money first checkout. Mobile money: a USSD push appears on the payer's
 * phone and this component polls until the gateway confirms. Card: redirect.
 */
export function PaymentForm({ purpose, items, listingId, businessId, defaultPhone, successHref, billing }: {
  purpose: "PROMOTION" | "SUBSCRIPTION" | "REGISTRATION_FEE"; items: PayItem[]; listingId?: string; businessId?: string;
  defaultPhone?: string | null; successHref: string; billing?: "monthly" | "yearly";
}) {
  const { dict } = useI18n();
  const [code, setCode] = useState(items[0]?.code ?? "");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [provider, setProvider] = useState<Provider>(() => NETWORK_TO_PROVIDER[detectNetwork(defaultPhone ?? "")] ?? "MPESA");
  const [state, setState] = useState<"idle" | "sending" | "pending" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const item = items.find((i) => i.code === code);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function onPhone(val: string) {
    setPhone(val);
    const n = normalizeTzPhone(val);
    const p = n ? NETWORK_TO_PROVIDER[detectNetwork(n)] : undefined;
    if (p && provider !== "CARD") setProvider(p);
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    const body = {
      purpose, listingId, businessId, provider, billing,
      msisdn: provider === "CARD" ? undefined : phone,
      productCode: purpose === "PROMOTION" ? code : undefined,
      planCode: purpose === "SUBSCRIPTION" ? code : undefined,
    };
    const r = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) { setState("failed"); return setError(data.error ?? dict.common.error); }
    if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
    setState("pending");
    const started = Date.now();
    timer.current = setInterval(async () => {
      const s = await fetch(`/api/payments/${data.paymentId}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (s?.status === "SUCCESS") { clearInterval(timer.current!); setState("success"); }
      else if (s?.status === "FAILED" || Date.now() - started > 5 * 60_000) { clearInterval(timer.current!); setState("failed"); setError(s?.failureReason ?? "Payment was not completed."); }
    }, 3000);
  }

  if (state === "success") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-go-600" />
        <p className="font-semibold">{dict.dash.paymentSuccess}</p>
        <a href={successHref} className="btn-primary">{dict.common.view}</a>
      </div>
    );
  }

  return (
    <form onSubmit={pay} className="space-y-5">
      {items.length > 1 && (
        <fieldset className="space-y-2">
          {items.map((i) => (
            <label key={i.code} className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3", code === i.code ? "border-ink-900 bg-ink-100/50" : "border-line")}>
              <span className="flex items-center gap-3">
                <input type="radio" name="item" value={i.code} checked={code === i.code} onChange={() => setCode(i.code)} />
                <span><span className="block text-sm font-semibold">{i.name}</span>{i.note && <span className="text-xs text-ink-500">{i.note}</span>}</span>
              </span>
              <span className="plate text-sm">{formatTzs(i.priceTzs)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <fieldset>
        <legend className="label">{dict.dash.payWith}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <label key={p} className={cn("flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm", provider === p ? "border-ink-900 ring-1 ring-ink-900" : "border-line")}>
              <input type="radio" className="sr-only" name="provider" value={p} checked={provider === p} onChange={() => setProvider(p)} />
              <span className={cn("h-3 w-3 shrink-0 rounded-full", SWATCH[p])} aria-hidden />
              {enumLabel(dict, "PaymentProvider", p)}
            </label>
          ))}
        </div>
      </fieldset>

      {provider !== "CARD" && (
        <div>
          <label className="label" htmlFor="pay-phone">{dict.dash.payPhone}</label>
          <input id="pay-phone" className="field" inputMode="tel" value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="0754 123 456" required />
        </div>
      )}

      {state === "pending" && (
        <p className="flex items-center gap-2 rounded-md bg-plate-300/40 p-3 text-sm" role="status"><LoaderCircle className="h-4 w-4 animate-spin" />{dict.dash.paymentPending}</p>
      )}
      {state === "failed" && error && <p className="flex items-center gap-2 text-sm text-danger" role="alert"><XCircle className="h-4 w-4" />{error}</p>}

      <button className="btn-plate w-full py-3 text-base" disabled={state === "sending" || state === "pending" || !item}>
        {state === "sending" ? dict.common.loading : `${dict.dash.pay} · ${item ? formatTzs(item.priceTzs) : ""}`}
      </button>
    </form>
  );
}

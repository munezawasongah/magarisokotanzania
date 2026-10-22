"use client";
import { useState } from "react";
import { BadgeCheck, CheckCircle2, Truck } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatTzs } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ProviderOption = { id: string; name: string; slug: string; region: string; sameRegion: boolean; priceFromTzs: number; mobile: boolean; ratingAvg: number; ratingCount: number; verified: boolean };

/** Buyer picks a registered inspection centre, a preferred date and sends the request. */
export function InspectionBooking({ listingId, providers, loggedIn, loginHref }: { listingId: string; providers: ProviderOption[]; loggedIn: boolean; loginHref: string }) {
  const { dict } = useI18n();
  const t = dict.inspect;
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await fetch("/api/inspections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, providerId, preferredDate: date || undefined, message: message || undefined }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(d.error ?? dict.common.error);
    setDone(true);
  }

  return (
    <div id="inspection" className="panel scroll-mt-28 p-5">
      <h2 className="text-base font-bold">{t.title}</h2>
      <p className="mt-1 text-xs leading-5 text-ink-500">{t.intro}</p>
      {done ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-go-700" role="status"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{t.sent}</p>
      ) : providers.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">{t.none}</p>
      ) : !open ? (
        <button type="button" className="btn-ghost mt-3 w-full" onClick={() => setOpen(true)}>{t.submit}</button>
      ) : !loggedIn ? (
        <a href={loginHref} className="btn-primary mt-3 w-full">{t.loginToBook}</a>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <fieldset className="space-y-2">
            <legend className="label">{t.choose}</legend>
            {providers.map((p) => (
              <label key={p.id} className={cn("flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm", providerId === p.id ? "border-ink-900 bg-ink-100/40" : "border-line")}>
                <input type="radio" name="provider" className="mt-1" checked={providerId === p.id} onChange={() => setProviderId(p.id)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-semibold">{p.name}{p.verified && <BadgeCheck className="h-4 w-4 text-go-600" aria-label={dict.listing.verified} />}</span>
                  <span className="block text-xs text-ink-500">
                    {p.region}{p.mobile ? <> · <Truck className="inline h-3 w-3" /> {dict.services.mobile}</> : null}{p.ratingCount ? ` · ★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums">{t.fee} {formatTzs(p.priceFromTzs)}</span>
              </label>
            ))}
          </fieldset>
          <div>
            <label className="label" htmlFor="ins-date">{t.date}</label>
            <input id="ins-date" type="date" min={today} className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ins-msg">{t.message}</label>
            <textarea id="ins-msg" className="field min-h-16" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || !providerId}>{busy ? dict.common.loading : t.submit}</button>
        </form>
      )}
    </div>
  );
}

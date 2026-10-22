"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { VEHICLE_FEATURES } from "@/config/vehicles";
import { updateListingAction } from "@/server/actions/listing";
import { formatTzs, parseTzsInput } from "@/lib/money";
import { cn } from "@/lib/utils";

export type EditableListing = {
  id: string; slug: string; title: string; status: string; priceTzs: number; priceNegotiable: boolean; mileageKm: number;
  description: string; features: string[]; contactPhone: string; contactWhatsapp: string;
};

/**
 * Edit price, mileage, description, features and contacts. Every save is re-checked by the
 * fraud engine; a large price cut or new phone number sends a live car back for review.
 * Lowering the price alerts buyers who saved the car.
 */
export function ListingEditForm({ l }: { l: EditableListing }) {
  const { dict } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [v, setV] = useState({
    priceTzs: l.priceTzs.toLocaleString("en-US"), priceNegotiable: l.priceNegotiable, mileageKm: String(l.mileageKm),
    description: l.description, features: l.features, contactPhone: l.contactPhone, contactWhatsapp: l.contactWhatsapp === l.contactPhone ? "" : l.contactWhatsapp,
  });
  const price = parseTzsInput(v.priceTzs);
  const lower = price !== null && price < l.priceTzs;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!price || price <= 0) return setMsg({ ok: false, text: "Enter the price in TZS — a listing cannot be published without a price." });
    if (v.mileageKm === "") return setMsg({ ok: false, text: "Enter the mileage in km (0 for a brand-new vehicle)." });
    const patch: Record<string, unknown> = {};
    if (price !== l.priceTzs) patch.priceTzs = price;
    if (v.priceNegotiable !== l.priceNegotiable) patch.priceNegotiable = v.priceNegotiable;
    if (Number(v.mileageKm) !== l.mileageKm) patch.mileageKm = Number(v.mileageKm);
    if (v.description.trim() !== l.description) patch.description = v.description.trim();
    if (v.features.join("|") !== l.features.join("|")) patch.features = v.features;
    if (v.contactPhone !== l.contactPhone) patch.contactPhone = v.contactPhone;
    const wa = v.contactWhatsapp || v.contactPhone;
    if (wa !== l.contactWhatsapp) patch.contactWhatsapp = wa;
    if (!Object.keys(patch).length) return setMsg({ ok: true, text: "Nothing changed." });
    start(async () => {
      const r = await updateListingAction(l.id, patch);
      if (!r.ok) return setMsg({ ok: false, text: r.message });
      setMsg({ ok: true, text: r.status === "PENDING_REVIEW" && l.status === "ACTIVE" ? "Saved. Because of this change our team will quickly re-check the listing before it shows again." : "Saved — your listing is updated." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <section className="panel grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="price">Price (TZS) *</label>
          <input id="price" className="field text-lg tabular-nums" inputMode="numeric" value={v.priceTzs} onChange={(e) => setV({ ...v, priceTzs: e.target.value })} required />
          {price ? <p className="mt-1.5"><span className="plate text-sm">{formatTzs(price)}</span></p> : null}
          {lower && <p className="mt-1.5 text-xs text-go-700">Buyers who saved this car will get a price-drop alert.</p>}
        </div>
        <div>
          <label className="label" htmlFor="km">{dict.search.mileage} *</label>
          <input id="km" className="field tabular-nums" inputMode="numeric" value={v.mileageKm} onChange={(e) => setV({ ...v, mileageKm: e.target.value.replace(/\D/g, "") })} required />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={v.priceNegotiable} onChange={(e) => setV({ ...v, priceNegotiable: e.target.checked })} />{dict.listing.negotiable}</label>
        <div>
          <label className="label" htmlFor="ph">{dict.inquiry.phone}</label>
          <input id="ph" className="field" inputMode="tel" value={v.contactPhone} onChange={(e) => setV({ ...v, contactPhone: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="wa">WhatsApp (if different)</label>
          <input id="wa" className="field" inputMode="tel" value={v.contactWhatsapp} onChange={(e) => setV({ ...v, contactWhatsapp: e.target.value })} />
        </div>
      </section>
      <section className="panel space-y-4 p-5">
        <div>
          <label className="label" htmlFor="desc">{dict.listing.description}</label>
          <textarea id="desc" className="field min-h-36" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} minLength={20} maxLength={5000} required />
        </div>
        <fieldset>
          <legend className="label">{dict.listing.features}</legend>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_FEATURES.map((f) => {
              const on = v.features.includes(f);
              return <button key={f} type="button" aria-pressed={on} onClick={() => setV({ ...v, features: on ? v.features.filter((x) => x !== f) : [...v.features, f] })} className={cn("chip", on && "border-ink-900 bg-ink-900 text-white")}>{f}</button>;
            })}
          </div>
        </fieldset>
      </section>
      {msg && <p className={`text-sm ${msg.ok ? "text-go-700" : "text-danger"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-plate" disabled={pending}>{pending ? dict.common.loading : "Save changes"}</button>
        <a href="/dashboard/listings" className="btn-ghost">{dict.dash.inventory}</a>
      </div>
    </form>
  );
}

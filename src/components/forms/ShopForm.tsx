"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import { OriginCountry, ServiceCategory } from "@/generated/prisma/enums";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { ImageUploader, type UploadedImage } from "./ImageUploader";
import { cn } from "@/lib/utils";

import { type ShopKind, type ShopValues } from "@/lib/shop-values";
export type { ShopKind, ShopValues } from "@/lib/shop-values";

type RegionOpt = { id: number; name: string; districts: Array<{ id: number; name: string }> };

export type SubmitResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

/**
 * Mini-site details: used in the registration wizard and in the mini-site editor.
 * Services are only shown for service providers and every service must carry a price.
 */
export function ShopForm({ kind, regions, initial, onSubmit, submitLabel }: {
  kind: ShopKind; regions: RegionOpt[]; initial: ShopValues; onSubmit: (payload: Record<string, unknown>) => Promise<SubmitResult>; submitLabel: string;
}) {
  const { dict } = useI18n();
  const t = dict.shop;
  const [v, setV] = useState<ShopValues>(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const set = <K extends keyof ShopValues>(k: K, val: ShopValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const region = useMemo(() => regions.find((r) => String(r.id) === v.regionId), [regions, v.regionId]);
  const isService = kind === "SERVICE_PROVIDER";
  const isBusiness = kind !== "SELLER";
  const err = (k: string) => {
    const fe = result?.fieldErrors ?? {};
    return (fe[k] ?? fe[`shop.${k}`])?.[0];
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const payload = {
      ...v,
      latitude: v.latitude ?? "", longitude: v.longitude ?? "",
      serviceKind: isService ? v.serviceKind : undefined,
      services: isService ? v.services.filter((s) => s.title.trim()) : [],
      importCountries: kind === "DEALER" || kind === "IMPORTER" ? v.importCountries : [],
    };
    const r = await onSubmit(payload);
    setResult(r);
    setBusy(false);
  }

  const Field = ({ label, k, children, className }: { label: string; k?: string; children: React.ReactNode; className?: string }) => (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {k && err(k) && <p className="mt-1 text-xs text-danger">{err(k)}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="panel grid gap-4 p-5 sm:grid-cols-2">
        {Field({ label: kind === "SELLER" ? t.namePrivate : t.name, k: "name", className: "sm:col-span-2", children: <input className="field" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={100} /> })}
        {Field({ label: t.tagline, k: "tagline", className: "sm:col-span-2", children: <input className="field" value={v.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={140} /> })}
        {Field({ label: t.phone, k: "phone", children: <input className="field" inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0712 345 678" required /> })}
        {Field({ label: t.whatsapp, k: "whatsapp", children: <input className="field" inputMode="tel" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="0754 000 000" /> })}
        {Field({ label: t.email, k: "email", children: <input className="field" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /> })}
        {isBusiness && Field({ label: t.website, k: "website", children: <input className="field" type="url" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /> })}
        {Field({ label: t.about, k: "description", className: "sm:col-span-2", children: <textarea className="field min-h-24" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={3000} /> })}
      </section>

      <section className="panel grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-base font-bold sm:col-span-2">{t.location}</h2>
        {Field({ label: dict.spec.region, k: "regionId", children: (
          <select className="field" value={v.regionId} onChange={(e) => setV((s) => ({ ...s, regionId: e.target.value, districtId: "" }))} required>
            <option value="">—</option>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        ) })}
        {Field({ label: dict.spec.district, k: "districtId", children: (
          <select className="field" value={v.districtId} onChange={(e) => set("districtId", e.target.value)} disabled={!region}>
            <option value="">—</option>{region?.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) })}
        {Field({ label: kind === "SELLER" ? t.addressPrivate : t.address, k: "address", className: "sm:col-span-2", children: <input className="field" value={v.address} onChange={(e) => set("address", e.target.value)} required maxLength={200} placeholder="e.g. Mikocheni B, near Shoppers Plaza" /> })}
        <div className="sm:col-span-2">
          <label className="label">{t.pin}</label>
          <LocationPicker
            value={v.latitude !== null && v.longitude !== null ? { lat: v.latitude, lng: v.longitude } : null}
            onChange={(p) => setV((s) => ({ ...s, latitude: p?.lat ?? null, longitude: p?.lng ?? null }))}
            labels={{ hint: t.pinHint, useMyLocation: t.useMyLocation, locating: t.locating, clear: t.clearPin, denied: t.geoDenied }}
          />
        </div>
        {isBusiness && Field({ label: t.hours, k: "openingHours", className: "sm:col-span-2", children: <input className="field" value={v.openingHours} onChange={(e) => set("openingHours", e.target.value)} maxLength={200} /> })}
      </section>

      {isBusiness && (
        <section className="panel grid gap-4 p-5 sm:grid-cols-2">
          {Field({ label: t.tin, k: "tin", children: <input className="field" value={v.tin} onChange={(e) => set("tin", e.target.value)} maxLength={20} /> })}
          {Field({ label: t.brela, k: "brelaRegNo", children: <input className="field" value={v.brelaRegNo} onChange={(e) => set("brelaRegNo", e.target.value)} maxLength={30} /> })}
          {(kind === "DEALER" || kind === "IMPORTER") && (
            <fieldset className="sm:col-span-2">
              <legend className="label">{t.importsFrom}</legend>
              <div className="flex flex-wrap gap-2">
                {Object.values(OriginCountry).map((c) => {
                  const on = v.importCountries.includes(c);
                  return <button key={c} type="button" aria-pressed={on} onClick={() => set("importCountries", on ? v.importCountries.filter((x) => x !== c) : [...v.importCountries, c])} className={cn("chip", on && "border-ink-900 bg-ink-900 text-white")}>{enumLabel(dict, "OriginCountry", c)}</button>;
                })}
              </div>
            </fieldset>
          )}
        </section>
      )}

      {isService && (
        <section className="panel space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {Field({ label: t.serviceKind, children: (
              <select className="field" value={v.serviceKind} onChange={(e) => set("serviceKind", e.target.value)}>
                {(["SERVICE_PROVIDER", "INSPECTION_CENTER", "FINANCE_INSURANCE"] as const).map((k) => <option key={k} value={k}>{enumLabel(dict, "BusinessType", k)}</option>)}
              </select>
            ) })}
          </div>
          <h2 className="text-base font-bold">{t.services}</h2>
          {err("services") && <p className="text-xs text-danger">{err("services")}</p>}
          {v.services.map((s, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[1fr_1.2fr_160px_auto_auto] sm:items-end">
              <div>
                <label className="label text-xs">{dict.hero.category}</label>
                <select className="field" value={s.category} onChange={(e) => set("services", v.services.map((x, k) => (k === i ? { ...x, category: e.target.value } : x)))}>
                  {Object.values(ServiceCategory).map((c) => <option key={c} value={c}>{enumLabel(dict, "ServiceCategory", c)}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">{t.serviceTitle}</label>
                <input className="field" value={s.title} onChange={(e) => set("services", v.services.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} required />
              </div>
              <div>
                <label className="label text-xs">{t.servicePrice}</label>
                <input className="field tabular-nums" inputMode="numeric" value={s.priceFromTzs} onChange={(e) => set("services", v.services.map((x, k) => (k === i ? { ...x, priceFromTzs: e.target.value } : x)))} placeholder="50,000" required />
              </div>
              <label className="flex items-center gap-2 pb-2.5 text-xs"><input type="checkbox" checked={s.mobileService} onChange={(e) => set("services", v.services.map((x, k) => (k === i ? { ...x, mobileService: e.target.checked } : x)))} />{t.mobileService}</label>
              <button type="button" className="btn-ghost px-3" onClick={() => set("services", v.services.filter((_, k) => k !== i))} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" className="btn-ghost py-2" onClick={() => set("services", [...v.services, { category: "GENERAL_REPAIR", title: "", priceFromTzs: "", mobileService: false }])}>
            <Plus className="h-4 w-4" /> {t.addService}
          </button>
        </section>
      )}

      <section className="panel grid gap-6 p-5 sm:grid-cols-2">
        <div>
          <label className="label">{t.logo}</label>
          <ImageUploader max={1} value={v.logoUrl ? [{ url: v.logoUrl }] : []} onChange={(imgs: UploadedImage[]) => set("logoUrl", imgs[0]?.url ?? "")} labels={{ add: dict.sell.addPhotos, hint: "Square image works best." }} />
        </div>
        <div>
          <label className="label">{t.cover}</label>
          <ImageUploader max={1} value={v.coverUrl ? [{ url: v.coverUrl }] : []} onChange={(imgs: UploadedImage[]) => set("coverUrl", imgs[0]?.url ?? "")} labels={{ add: dict.sell.addPhotos, hint: "Shop front, yard or workshop." }} />
        </div>
      </section>

      {result && !result.ok && <p className="text-sm text-danger" role="alert">{result.error}</p>}
      {result?.ok && <p className="text-sm text-go-700" role="status">{t.saved}</p>}
      <button className="btn-plate w-full py-3 text-base sm:w-auto" disabled={busy}>{busy ? dict.common.loading : submitLabel}</button>
    </form>
  );
}


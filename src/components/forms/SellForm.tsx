"use client";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import { BodyType, Drivetrain, FuelType, OriginCountry, Steering, Transmission, VehicleCondition } from "@/generated/prisma/enums";
import { VEHICLE_FEATURES } from "@/config/vehicles";
import { createListingAction } from "@/server/actions/listing";
import { ImageUploader, type UploadedImage } from "./ImageUploader";
import { formatTzs, parseTzsInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import { LegalText } from "@/components/legal/LegalText";
import { LocationPicker } from "@/components/maps/LocationPicker";

type MakeOpt = { id: number; name: string; models: Array<{ id: number; name: string; defaultBodyType: string | null }> };
type RegionOpt = { id: number; name: string; districts: Array<{ id: number; name: string }> };
export type SellShop = { name: string; type: string; regionId: number | null; districtId: number | null; address: string | null; latitude: number | null; longitude: number | null; phone: string | null; whatsapp: string | null } | null;

const YEARS = Array.from({ length: 45 }, (_, i) => new Date().getFullYear() + 1 - i);

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Four-step listing form: vehicle → details → price & location → photos. */
export function SellForm({ makes, regions, shop, defaultPhone }: { makes: MakeOpt[]; regions: RegionOpt[]; shop: SellShop; defaultPhone?: string | null }) {
  const { dict } = useI18n();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [v, setV] = useState({
    makeId: "", modelId: "", year: String(new Date().getFullYear() - 8), trim: "", title: "",
    condition: "FOREIGN_USED", bodyType: "", transmission: "AUTOMATIC", fuelType: "PETROL", steering: "RHD", drivetrain: "",
    engineCc: "", mileageKm: "", colorExterior: "", colorInterior: "", doors: "", seats: "", groundClearanceMm: "", registrationSeries: "", chassisNumber: "",
    description: "", features: [] as string[], priceTzs: "", priceNegotiable: true, showUsdPrice: false,
    regionId: shop?.regionId ? String(shop.regionId) : "", districtId: shop?.districtId ? String(shop.districtId) : "",
    contactPhone: shop?.phone ?? defaultPhone ?? "", contactWhatsapp: shop?.whatsapp && shop.whatsapp !== shop.phone ? shop.whatsapp : "",
    locationAddress: shop?.address ?? "", latitude: shop?.latitude ?? (null as number | null), longitude: shop?.longitude ?? (null as number | null),
    isImportOnOrder: false, originCountry: "JAPAN", fobUsd: "", freightUsd: "", insuranceUsd: "", etaDays: "45",
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const e = (k: string) => errors[k]?.[0];

  const make = makes.find((m) => String(m.id) === v.makeId);
  const region = regions.find((r) => String(r.id) === v.regionId);
  const canImport = shop?.type === "DEALERSHIP" || shop?.type === "IMPORTER";
  const isPrivate = !shop || shop.type === "PRIVATE_SELLER";
  const autoTitle = useMemo(() => [v.year, make?.name, make?.models.find((m) => String(m.id) === v.modelId)?.name, v.trim].filter(Boolean).join(" "), [v.year, v.modelId, v.trim, make]);
  const pricePreview = parseTzsInput(v.priceTzs);

  const steps = [dict.sell.step1, dict.sell.step2, dict.sell.step3, dict.sell.step4];
  const stepValid = [
    v.makeId && v.modelId && v.year && v.bodyType,
    v.description.trim().length >= 20 && v.mileageKm !== "",
    pricePreview && pricePreview > 0 && v.regionId && v.locationAddress.trim().length >= 3 && (!v.isImportOnOrder || v.fobUsd),
    true,
  ];

  function submit() {
    setMessage(null); setErrors({});
    const payload = {
      ...v,
      drivetrain: v.drivetrain || undefined, districtId: v.districtId || undefined,
      contactPhone: v.contactPhone || undefined, contactWhatsapp: v.contactWhatsapp || undefined,
      originCountry: v.isImportOnOrder ? v.originCountry : undefined, title: v.title || undefined,
      registrationSeries: v.registrationSeries || undefined, chassisNumber: v.chassisNumber || undefined,
      trim: v.trim || undefined, colorExterior: v.colorExterior || undefined, colorInterior: v.colorInterior || undefined,
      locationAddress: v.locationAddress.trim() || undefined,
      latitude: v.latitude ?? undefined, longitude: v.longitude ?? undefined,
      images,
      confirmOwnership: confirmed,
    };
    start(async () => {
      const r = await createListingAction(payload);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setMessage(r.message);
        const keys = Object.keys(r.fieldErrors ?? {});
        const firstStep = keys.some((k) => ["makeId", "modelId", "year", "bodyType", "condition", "transmission", "fuelType"].includes(k)) ? 0
          : keys.some((k) => ["description", "mileageKm", "engineCc"].includes(k)) ? 1 : keys.length ? 2 : step;
        setStep(firstStep);
        return;
      }
      setDone(r.result.status === "ACTIVE" ? r.result.slug : "pending");
    });
  }

  if (done) {
    return (
      <div className="panel space-y-4 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-go-600" />
        <p className="text-lg font-semibold">{done === "pending" ? dict.sell.success : "Your listing is live."}</p>
        <div className="flex justify-center gap-2">
          {done !== "pending" && <a className="btn-primary" href={`/cars/${done}`}>{dict.common.view}</a>}
          <a className="btn-ghost" href="/dashboard/listings">{dict.dash.inventory}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => i <= step || stepValid.slice(0, i).every(Boolean) ? setStep(i) : null}
              className={cn("w-full border-t-4 pt-2 text-left text-xs font-semibold sm:text-sm", i <= step ? "border-ink-900 text-ink-900" : "border-line text-ink-300")}
              aria-current={i === step ? "step" : undefined}>
              <span className="tabular-nums">{i + 1}.</span> {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="panel p-5 sm:p-6">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {shop && (
              <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink-700 sm:col-span-2">Listing on <span className="font-semibold">{shop.name}</span> · {dict.search.sellerType}: <span className="font-semibold">{enumLabel(dict, "SellerType", shop.type === "DEALERSHIP" ? "DEALER" : shop.type === "CAR_YARD" ? "YARD" : shop.type === "IMPORTER" ? "IMPORTER" : "INDIVIDUAL")}</span></p>
            )}
            <Field label={dict.spec.make} error={e("makeId")}>
              <select className="field" value={v.makeId} onChange={(x) => { set("makeId", x.target.value); set("modelId", ""); }} required>
                <option value="">—</option>
                {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={dict.spec.model} error={e("modelId")}>
              <select className="field" value={v.modelId} disabled={!make} required
                onChange={(x) => {
                  set("modelId", x.target.value);
                  const mdl = make?.models.find((m) => String(m.id) === x.target.value);
                  if (mdl?.defaultBodyType && !v.bodyType) set("bodyType", mdl.defaultBodyType);
                }}>
                <option value="">—</option>
                {make?.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={dict.spec.year} error={e("year")}>
              <select className="field" value={v.year} onChange={(x) => set("year", x.target.value)}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
            </Field>
            <Field label={dict.spec.trim}>
              <input className="field" value={v.trim} onChange={(x) => set("trim", x.target.value)} placeholder="e.g. 2.0 Premium, TX-L, GX" />
            </Field>
            <Field label={dict.spec.body} error={e("bodyType")}>
              <select className="field" value={v.bodyType} onChange={(x) => set("bodyType", x.target.value)} required>
                <option value="">—</option>
                {Object.values(BodyType).map((b) => <option key={b} value={b}>{enumLabel(dict, "BodyType", b)}</option>)}
              </select>
            </Field>
            <Field label={dict.spec.condition}>
              <select className="field" value={v.condition} onChange={(x) => set("condition", x.target.value)}>
                {Object.values(VehicleCondition).map((c) => <option key={c} value={c}>{enumLabel(dict, "VehicleCondition", c)}</option>)}
              </select>
            </Field>
            <Field label={dict.spec.transmission}>
              <select className="field" value={v.transmission} onChange={(x) => set("transmission", x.target.value)}>
                {Object.values(Transmission).map((t) => <option key={t} value={t}>{enumLabel(dict, "Transmission", t)}</option>)}
              </select>
            </Field>
            <Field label={dict.spec.fuel}>
              <select className="field" value={v.fuelType} onChange={(x) => set("fuelType", x.target.value)}>
                {Object.values(FuelType).map((f) => <option key={f} value={f}>{enumLabel(dict, "FuelType", f)}</option>)}
              </select>
            </Field>
            <Field label={dict.spec.steering}>
              <select className="field" value={v.steering} onChange={(x) => set("steering", x.target.value)}>
                {Object.values(Steering).map((s) => <option key={s} value={s}>{enumLabel(dict, "Steering", s)}</option>)}
              </select>
            </Field>
            <Field label={dict.spec.drivetrain}>
              <select className="field" value={v.drivetrain} onChange={(x) => set("drivetrain", x.target.value)}>
                <option value="">—</option>
                {Object.values(Drivetrain).map((d) => <option key={d} value={d}>{enumLabel(dict, "Drivetrain", d)}</option>)}
              </select>
            </Field>
            <Field label="Title" className="sm:col-span-2">
              <input className="field" value={v.title} onChange={(x) => set("title", x.target.value)} placeholder={autoTitle || dict.sell.titleHint} maxLength={120} />
              <p className="mt-1 text-xs text-ink-500">{dict.sell.titleHint}</p>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={`${dict.search.mileage} *`} error={e("mileageKm")}><input className="field" inputMode="numeric" required value={v.mileageKm} onChange={(x) => set("mileageKm", x.target.value.replace(/\D/g, ""))} placeholder={v.condition === "NEW" ? "0" : "e.g. 78000"} /></Field>
            <Field label={`${dict.spec.engine} (cc)`} error={e("engineCc")}><input className="field" inputMode="numeric" value={v.engineCc} onChange={(x) => set("engineCc", x.target.value.replace(/\D/g, ""))} placeholder="1990" /></Field>
            <Field label={`${dict.spec.clearance} (mm)`}><input className="field" inputMode="numeric" value={v.groundClearanceMm} onChange={(x) => set("groundClearanceMm", x.target.value.replace(/\D/g, ""))} /></Field>
            <Field label={dict.spec.color}><input className="field" value={v.colorExterior} onChange={(x) => set("colorExterior", x.target.value)} /></Field>
            <Field label={dict.spec.interiorColor}><input className="field" value={v.colorInterior} onChange={(x) => set("colorInterior", x.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={dict.spec.doors}><input className="field" inputMode="numeric" value={v.doors} onChange={(x) => set("doors", x.target.value.replace(/\D/g, ""))} /></Field>
              <Field label={dict.spec.seats}><input className="field" inputMode="numeric" value={v.seats} onChange={(x) => set("seats", x.target.value.replace(/\D/g, ""))} /></Field>
            </div>
            <Field label="Plate series (e.g. D, E)"><input className="field uppercase" maxLength={2} value={v.registrationSeries} onChange={(x) => set("registrationSeries", x.target.value)} /></Field>
            <Field label="Chassis number (private)" className="sm:col-span-2"><input className="field uppercase" value={v.chassisNumber} onChange={(x) => set("chassisNumber", x.target.value)} placeholder="Only shown to you and moderators" /></Field>
            <Field label={dict.listing.description} error={e("description")} className="sm:col-span-3">
              <textarea className="field min-h-36" value={v.description} onChange={(x) => set("description", x.target.value)} placeholder="Condition, service history, recent repairs, reason for selling…" />
              <p className="mt-1 text-right text-xs text-ink-300">{v.description.length} / 5000</p>
            </Field>
            <fieldset className="sm:col-span-3">
              <legend className="label">{dict.listing.features}</legend>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_FEATURES.map((f) => {
                  const on = v.features.includes(f);
                  return (
                    <button key={f} type="button" aria-pressed={on} onClick={() => set("features", on ? v.features.filter((x) => x !== f) : [...v.features, f])}
                      className={cn("chip", on && "border-ink-900 bg-ink-900 text-white")}>{f}</button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (TZS)" error={e("priceTzs")}>
              <input className="field text-lg tabular-nums" inputMode="numeric" value={v.priceTzs} onChange={(x) => set("priceTzs", x.target.value)} placeholder="e.g. 45,000,000 or 45m" />
              {pricePreview ? <p className="mt-1.5"><span className="plate text-sm">{formatTzs(pricePreview)}</span></p> : null}
            </Field>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.priceNegotiable} onChange={(x) => set("priceNegotiable", x.target.checked)} />{dict.listing.negotiable}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.showUsdPrice} onChange={(x) => set("showUsdPrice", x.target.checked)} />Show approximate USD price</label>
            </div>
            <Field label={dict.spec.region} error={e("regionId")}>
              <select className="field" value={v.regionId} onChange={(x) => { set("regionId", x.target.value); set("districtId", ""); }}>
                <option value="">—</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label={dict.spec.district} error={e("districtId")}>
              <select className="field" value={v.districtId} onChange={(x) => set("districtId", x.target.value)} disabled={!region}>
                <option value="">—</option>
                {region?.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label={dict.inquiry.phone} error={e("contactPhone")}><input className="field" inputMode="tel" value={v.contactPhone} onChange={(x) => set("contactPhone", x.target.value)} placeholder="0712 345 678" /></Field>
            <Field label="WhatsApp (if different)" error={e("contactWhatsapp")}><input className="field" inputMode="tel" value={v.contactWhatsapp} onChange={(x) => set("contactWhatsapp", x.target.value)} placeholder="0754 000 000" /></Field>
            <Field label={isPrivate ? dict.shop.carLocation : dict.shop.address} error={e("locationAddress")} className="sm:col-span-2">
              <input className="field" value={v.locationAddress} onChange={(x) => set("locationAddress", x.target.value)} maxLength={200} placeholder="e.g. Sinza Mori, near Shekilango Rd" />
            </Field>
            <div className="sm:col-span-2">
              <label className="label">{dict.shop.pin}</label>
              <LocationPicker
                value={v.latitude !== null && v.longitude !== null ? { lat: v.latitude, lng: v.longitude } : null}
                onChange={(p) => setV((s) => ({ ...s, latitude: p?.lat ?? null, longitude: p?.lng ?? null }))}
                labels={{ hint: dict.shop.pinHint, useMyLocation: dict.shop.useMyLocation, locating: dict.shop.locating, clear: dict.shop.clearPin, denied: dict.shop.geoDenied }}
              />
            </div>

            {canImport && (
              <fieldset className="rounded-md border border-line p-4 sm:col-span-2">
                <legend className="px-1 text-sm font-semibold">{dict.sell.importSection}</legend>
                <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={v.isImportOnOrder} onChange={(x) => set("isImportOnOrder", x.target.checked)} />{dict.listing.importOnOrder}</label>
                {v.isImportOnOrder && (
                  <div className="grid gap-3 sm:grid-cols-5">
                    <Field label={dict.spec.origin}>
                      <select className="field" value={v.originCountry} onChange={(x) => set("originCountry", x.target.value)}>
                        {Object.values(OriginCountry).map((o) => <option key={o} value={o}>{enumLabel(dict, "OriginCountry", o)}</option>)}
                      </select>
                    </Field>
                    <Field label="FOB (USD)" error={e("fobUsd")}><input className="field" inputMode="numeric" value={v.fobUsd} onChange={(x) => set("fobUsd", x.target.value.replace(/\D/g, ""))} /></Field>
                    <Field label="Freight (USD)"><input className="field" inputMode="numeric" value={v.freightUsd} onChange={(x) => set("freightUsd", x.target.value.replace(/\D/g, ""))} /></Field>
                    <Field label="Insurance (USD)"><input className="field" inputMode="numeric" value={v.insuranceUsd} onChange={(x) => set("insuranceUsd", x.target.value.replace(/\D/g, ""))} placeholder="auto 1.5%" /></Field>
                    <Field label={dict.spec.eta}><input className="field" inputMode="numeric" value={v.etaDays} onChange={(x) => set("etaDays", x.target.value.replace(/\D/g, ""))} /></Field>
                    <p className="text-xs text-ink-500 sm:col-span-5">Duties, excise (engine & age), VAT, levies and clearing are estimated automatically and shown to buyers.</p>
                  </div>
                )}
              </fieldset>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <ImageUploader value={images} onChange={setImages} labels={{ add: dict.sell.addPhotos, hint: dict.sell.photoHint }} />
            <label className="flex items-start gap-2 rounded-md border border-line bg-paper p-3 text-sm text-ink-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-line" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <LegalText template={dict.legal.sellConfirm} labels={{ terms: dict.legal.terms, safety: dict.legal.safety }} />
            </label>
            {e("confirmOwnership") && <p className="text-xs text-danger">{e("confirmOwnership")}</p>}
          </div>
        )}
      </div>

      {message && <p className="text-sm text-danger" role="alert">{message}</p>}

      <div className="flex justify-between gap-2">
        <button type="button" className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>{dict.search.prev}</button>
        {step < 3 ? (
          <button type="button" className="btn-primary" disabled={!stepValid[step]} onClick={() => setStep((s) => s + 1)}>{dict.search.next}</button>
        ) : (
          <button type="button" className="btn-plate" disabled={pending || !confirmed || !stepValid.slice(0, 3).every(Boolean)} onClick={submit}>{pending ? dict.sell.submitting : dict.sell.submit}</button>
        )}
      </div>
    </div>
  );
}

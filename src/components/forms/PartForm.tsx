"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import { PartAuthenticity, PartCategory, PartCondition } from "@/generated/prisma/enums";
import { ImageUploader, type UploadedImage } from "./ImageUploader";

type MakeOpt = { id: number; name: string; models: Array<{ id: number; name: string }> };
export type Fit = { makeId: string; modelId: string; yearFrom: string; yearTo: string; engineCode: string };

/** Spare part listing with fitment rows (make / model / year range / engine code). */
export type PartInitial = {
  id: string; title: string; description: string; category: string; condition: string; authenticity: string; brand: string; partNumber: string; oemNumber: string;
  priceTzs: string; stockQty: string; warrantyDays: string; regionId: string; images: string[]; fitments: Fit[];
};

export function PartForm({ makes, regions, businessId, defaultRegionId, initial }: { makes: MakeOpt[]; regions: Array<{ id: number; name: string }>; businessId?: string; defaultRegionId?: number | null; initial?: PartInitial }) {
  const { dict } = useI18n();
  const editing = !!initial;
  const [f, setF] = useState(() => initial
    ? { title: initial.title, description: initial.description, category: initial.category, condition: initial.condition, authenticity: initial.authenticity, brand: initial.brand, partNumber: initial.partNumber, oemNumber: initial.oemNumber, priceTzs: initial.priceTzs, stockQty: initial.stockQty, warrantyDays: initial.warrantyDays, regionId: initial.regionId }
    : { title: "", description: "", category: "BRAKES", condition: "NEW", authenticity: "AFTERMARKET", brand: "", partNumber: "", oemNumber: "", priceTzs: "", stockQty: "1", warrantyDays: "", regionId: defaultRegionId ? String(defaultRegionId) : "" });
  const [fits, setFits] = useState<Fit[]>(initial?.fitments.length ? initial.fitments : [{ makeId: "", modelId: "", yearFrom: "", yearTo: "", engineCode: "" }]);
  const [images, setImages] = useState<UploadedImage[]>(initial ? initial.images.map((url) => ({ url })) : []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; slug?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const bind = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) });
  const setFit = (i: number, patch: Partial<Fit>) => setFits(fits.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const body = {
      ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "")),
      businessId, images: images.map((i) => i.url),
      fitments: fits.filter((x) => x.makeId).map((x) => ({ makeId: x.makeId, modelId: x.modelId || undefined, yearFrom: x.yearFrom || undefined, yearTo: x.yearTo || undefined, engineCode: x.engineCode || undefined })),
    };
    const r = await fetch(editing ? `/api/parts/${initial!.id}` : "/api/parts", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: d.error + (d.details ? `: ${Object.values(d.details).flat().join(" ")}` : "") });
    setMsg({ ok: true, text: editing ? "Changes saved." : "Part listed.", slug: d.slug });
  }

  return (
    <form onSubmit={submit} className="panel grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label">Part name</label><input className="field" required placeholder="e.g. Front brake pads set" {...bind("title")} /></div>
      <div><label className="label">{dict.hero.category}</label><select className="field" {...bind("category")}>{Object.values(PartCategory).map((c) => <option key={c} value={c}>{enumLabel(dict, "PartCategory", c)}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">{dict.spec.condition}</label><select className="field" {...bind("condition")}>{Object.values(PartCondition).map((c) => <option key={c} value={c}>{enumLabel(dict, "PartCondition", c)}</option>)}</select></div>
        <div><label className="label">Type</label><select className="field" {...bind("authenticity")}>{Object.values(PartAuthenticity).map((c) => <option key={c} value={c}>{enumLabel(dict, "PartAuthenticity", c)}</option>)}</select></div>
      </div>
      <div><label className="label">Brand</label><input className="field" placeholder="Denso, Bosch, Toyota Genuine…" {...bind("brand")} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">{dict.parts.partNo}</label><input className="field uppercase" {...bind("partNumber")} /></div>
        <div><label className="label">{dict.parts.oem}</label><input className="field uppercase" {...bind("oemNumber")} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:col-span-2">
        <div><label className="label">Price (TZS) *</label><input className="field" inputMode="numeric" required placeholder="145,000" {...bind("priceTzs")} /></div>
        <div><label className="label">Stock</label><input className="field" inputMode="numeric" {...bind("stockQty")} /></div>
        <div><label className="label">Warranty (days)</label><input className="field" inputMode="numeric" {...bind("warrantyDays")} /></div>
      </div>
      <div className="sm:col-span-2"><label className="label">{dict.spec.region}</label><select className="field" required {...bind("regionId")}><option value="">—</option>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="label">{dict.listing.description}</label><textarea className="field min-h-20" {...bind("description")} /></div>

      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="label">{dict.parts.compatible}</legend>
        {fits.map((x, i) => {
          const mk = makes.find((m) => String(m.id) === x.makeId);
          return (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-line p-2 sm:grid-cols-[1fr_1fr_90px_90px_110px_auto]">
              <select className="field" value={x.makeId} onChange={(e) => setFit(i, { makeId: e.target.value, modelId: "" })} aria-label={dict.spec.make}><option value="">{dict.spec.make}</option>{makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <select className="field" value={x.modelId} disabled={!mk} onChange={(e) => setFit(i, { modelId: e.target.value })} aria-label={dict.spec.model}><option value="">{dict.hero.anyModel}</option>{mk?.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <input className="field" inputMode="numeric" placeholder="From" value={x.yearFrom} onChange={(e) => setFit(i, { yearFrom: e.target.value })} aria-label="Year from" />
              <input className="field" inputMode="numeric" placeholder="To" value={x.yearTo} onChange={(e) => setFit(i, { yearTo: e.target.value })} aria-label="Year to" />
              <input className="field uppercase" placeholder="Engine (1NZ-FE)" value={x.engineCode} onChange={(e) => setFit(i, { engineCode: e.target.value })} aria-label="Engine code" />
              <button type="button" className="btn-ghost px-3" onClick={() => setFits(fits.filter((_, k) => k !== i))} aria-label="Remove row" disabled={fits.length === 1}><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
        <button type="button" className="btn-ghost py-2" onClick={() => setFits([...fits, { makeId: "", modelId: "", yearFrom: "", yearTo: "", engineCode: "" }])}><Plus className="h-4 w-4" /> Add vehicle</button>
      </fieldset>

      <div className="sm:col-span-2"><ImageUploader value={images} onChange={setImages} max={10} labels={{ add: dict.sell.addPhotos, hint: "Up to 10 photos — show the part number label if possible." }} /></div>
      {msg && <p className={`text-sm sm:col-span-2 ${msg.ok ? "text-go-700" : "text-danger"}`} role="status">{msg.text} {msg.slug && <a className="underline" href={`/parts/${msg.slug}`}>{dict.common.view}</a>}</p>}
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? dict.common.loading : editing ? "Save changes" : "Publish part"}</button>
    </form>
  );
}

"use client";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { Img } from "@/components/ui/Img";

export type UploadedImage = { url: string; publicId?: string; width?: number; height?: number };

/** Direct-to-Cloudinary signed uploads (local disk fallback in development). First photo = cover. */
export function ImageUploader({ value, onChange, max = 20, labels }: { value: UploadedImage[]; onChange: (v: UploadedImage[]) => void; max?: number; labels: { add: string; hint: string } }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File): Promise<UploadedImage | null> {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError("Only JPG, PNG or WebP photos"); return null; }
    if (file.size > 8 * 1024 * 1024) { setError("Each photo must be under 8 MB"); return null; }
    const sig = await (await fetch("/api/uploads/sign", { method: "POST" })).json();
    if (sig.provider === "cloudinary") {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      fd.append("transformation", sig.transformation);
      const r = await fetch(sig.uploadUrl, { method: "POST", body: fd });
      if (!r.ok) { setError("Upload failed"); return null; }
      const d = await r.json();
      return { url: d.secure_url, publicId: d.public_id, width: d.width, height: d.height };
    }
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/uploads/local", { method: "POST", body: fd });
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "Upload failed"); return null; }
    return { url: d.url };
  }

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).slice(0, max - value.length);
    setBusy(list.length);
    const out: UploadedImage[] = [];
    // upload 3 at a time — mobile data friendly
    for (let i = 0; i < list.length; i += 3) {
      const batch = await Promise.all(list.slice(i, i + 3).map(uploadOne));
      out.push(...(batch.filter(Boolean) as UploadedImage[]));
      setBusy((b) => Math.max(0, b - 3));
    }
    onChange([...value, ...out]);
    setBusy(0);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((img, i) => (
          <div key={img.url} className={`group relative aspect-[4/3] overflow-hidden rounded-md border-2 ${i === 0 ? "border-plate-500" : "border-line"}`}>
            <Img src={img.url} alt={`Photo ${i + 1}`} fill sizes="200px" className="object-cover" transform="c_fill,w_300,h_225" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink-950/60 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button type="button" className="p-1 text-white" title="Make cover" aria-label="Make cover photo" onClick={() => onChange([img, ...value.filter((_, k) => k !== i)])}><Star className="h-4 w-4" /></button>
              <button type="button" className="p-1 text-white" title="Remove" aria-label="Remove photo" onClick={() => onChange(value.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy > 0}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line bg-white text-xs font-medium text-ink-500 hover:border-ink-300">
            {busy > 0 ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            {labels.add}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handle(e.target.files)} />
      <p className="mt-2 text-xs text-ink-500">{labels.hint}</p>
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

"use client";
import { useState } from "react";
import { ImageUploader, type UploadedImage } from "@/components/forms/ImageUploader";

type Row = { body: string; label: string; chosen: string; fallback: string; fallbackSource: "listing" | "placeholder" };

/** One photo per body type. Leave empty to use the newest real car of that type. */
export function BodyPhotosForm({ rows }: { rows: Row[] }) {
  const [photos, setPhotos] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.body, r.chosen])));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    const r = await fetch("/api/admin/body-photos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(photos) });
    setState(r.ok ? "saved" : "error");
  }

  return (
    <div className="space-y-5">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <li key={r.body} className="panel space-y-2 p-4">
            <p className="font-semibold">{r.label}</p>
            <ImageUploader
              max={1}
              value={photos[r.body] ? [{ url: photos[r.body] }] : []}
              onChange={(imgs: UploadedImage[]) => { setPhotos((p) => ({ ...p, [r.body]: imgs[0]?.url ?? "" })); setState("idle"); }}
              labels={{ add: "Upload photo", hint: "A clear side or ¾ view on a plain background works best (landscape, at least 800 px wide)." }}
            />
            {!photos[r.body] && (
              <p className="text-xs text-ink-500">
                {r.fallbackSource === "listing" ? "Showing now: the newest live car of this type." : "Showing now: the drawn placeholder (no live cars of this type yet)."}
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-plate" onClick={save} disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save photos"}</button>
        {state === "saved" && <span className="text-sm text-go-700" role="status">Saved — the home page is updated.</span>}
        {state === "error" && <span className="text-sm text-danger" role="alert">Could not save. Try again.</span>}
      </div>
    </div>
  );
}

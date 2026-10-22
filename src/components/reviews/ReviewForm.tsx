"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function ReviewForm({ businessId, existing }: { businessId: string; existing?: { rating: number; body: string } | null }) {
  const { dict } = useI18n();
  const t = dict.reviews;
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setMsg({ ok: false, text: "Choose 1 to 5 stars" });
    setBusy(true); setMsg(null);
    const r = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, rating, body }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: d.error ?? dict.common.error });
    setMsg({ ok: true, text: t.thanks });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset>
        <legend className="label">{t.yourRating}</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} onMouseEnter={() => setHover(i)} aria-label={`${i} / 5`} aria-pressed={rating === i} className="p-0.5">
              <Star className={cn("h-7 w-7", (hover || rating) >= i ? "fill-plate-400 text-plate-500" : "text-ink-200")} />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="rv-body">{t.yourReview}</label>
        <textarea id="rv-body" className="field min-h-24" value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.placeholder} minLength={10} maxLength={2000} required />
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-go-700" : "text-danger"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? dict.common.loading : existing ? t.edit : t.submit}</button>
    </form>
  );
}

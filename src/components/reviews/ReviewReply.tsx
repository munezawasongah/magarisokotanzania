"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";

/** Owner's public reply to one review. */
export function ReviewReply({ reviewId, initial }: { reviewId: string; initial?: string | null }) {
  const { dict } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" className="text-xs font-semibold text-ink-700 underline" onClick={() => setOpen(true)}>{initial ? dict.common.edit : dict.reviews.reply}</button>;
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await fetch(`/api/reviews/${reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply: text }) });
        setBusy(false);
        setOpen(false);
        router.refresh();
      }}
    >
      <textarea className="field min-h-16 text-sm" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} />
      <button className="btn-primary py-2 text-sm" disabled={busy}>{busy ? dict.common.loading : dict.reviews.saveReply}</button>
    </form>
  );
}

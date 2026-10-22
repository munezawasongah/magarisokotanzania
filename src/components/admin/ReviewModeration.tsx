"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewModeration({ id, status }: { id: string; status: "PUBLISHED" | "HIDDEN" }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function set(next: "PUBLISHED" | "HIDDEN") {
    setBusy(true);
    await fetch(`/api/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next, reason: reason || undefined }) });
    setBusy(false);
    router.refresh();
  }
  return status === "PUBLISHED" ? (
    <div className="flex gap-2">
      <input className="field py-1.5 text-xs" placeholder="Reason (fake, abusive, contact details…)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button type="button" className="btn-danger px-3 py-1.5 text-xs" disabled={busy} onClick={() => set("HIDDEN")}>Hide</button>
    </div>
  ) : (
    <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={busy} onClick={() => set("PUBLISHED")}>Restore</button>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Stock count, sold out / back in stock, remove — for one of my spare parts. */
export function PartActions({ id, status, stockQty }: { id: string; status: string; stockQty: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState(String(stockQty));
  const [error, setError] = useState<string | null>(null);

  async function call(method: "PATCH" | "DELETE", body?: object) {
    if (method === "DELETE" && !window.confirm("Remove this part from the site?")) return;
    setBusy(true); setError(null);
    const r = await fetch(`/api/parts/${id}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) setError((await r.json().catch(() => ({}))).error ?? "Could not update");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {error && <p className="w-full text-right text-xs text-danger" role="alert">{error}</p>}
      <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); call("PATCH", { stockQty: Number(qty || 0) }); }}>
        <label className="text-xs text-ink-500" htmlFor={`q-${id}`}>Stock</label>
        <input id={`q-${id}`} className="field w-16 px-2 py-1.5 text-xs tabular-nums" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} />
        <button className="btn-ghost px-2 py-1.5 text-xs" disabled={busy || qty === String(stockQty)}>Save</button>
      </form>
      <a href={`/dashboard/parts/${id}/edit`} className="btn-ghost px-2.5 py-1.5 text-xs">Edit</a>
      {status === "ACTIVE"
        ? <button type="button" disabled={busy} onClick={() => call("PATCH", { status: "SOLD" })} className="btn-ghost px-2.5 py-1.5 text-xs">Sold out</button>
        : <button type="button" disabled={busy} onClick={() => call("PATCH", { status: "ACTIVE" })} className="btn-plate px-2.5 py-1.5 text-xs">Back in stock</button>}
      <button type="button" disabled={busy} onClick={() => call("DELETE")} className="px-2 py-1.5 text-xs text-ink-500 hover:text-danger">Remove</button>
    </div>
  );
}

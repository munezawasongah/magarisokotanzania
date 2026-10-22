"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";

/** Garage: confirm date, complete with report, cancel. Buyer: cancel. */
export function InspectionActions({ id, status, role }: { id: string; status: string; role: "provider" | "buyer" }) {
  const { dict } = useI18n();
  const t = dict.inspect;
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "schedule" | "complete">("none");
  const [when, setWhen] = useState("");
  const [report, setReport] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: object) {
    setBusy(true); setError(null);
    const r = await fetch(`/api/inspections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) return setError((await r.json().catch(() => ({}))).error ?? dict.common.error);
    setMode("none");
    router.refresh();
  }

  if (status === "COMPLETED" || status === "CANCELLED") return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {role === "provider" && <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => setMode("schedule")}>{t.schedule}</button>}
        {role === "provider" && status === "SCHEDULED" && <button type="button" className="btn-plate px-3 py-1.5 text-xs" onClick={() => setMode("complete")}>{t.complete}</button>}
        <button type="button" className="px-2 py-1.5 text-xs text-ink-500 hover:text-danger" disabled={busy} onClick={() => window.confirm(t.cancel + "?") && send({ action: "cancel" })}>{t.cancel}</button>
      </div>
      {mode === "schedule" && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); send({ action: "schedule", scheduledAt: new Date(when).toISOString() }); }}>
          <input type="datetime-local" className="field w-auto py-1.5 text-sm" value={when} onChange={(e) => setWhen(e.target.value)} required />
          <button className="btn-primary px-3 py-1.5 text-xs" disabled={busy}>{dict.common.save}</button>
        </form>
      )}
      {mode === "complete" && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); send({ action: "complete", report }); }}>
          <textarea className="field min-h-20 text-sm" placeholder={t.report} value={report} onChange={(e) => setReport(e.target.value)} required />
          <button className="btn-plate px-3 py-1.5 text-xs" disabled={busy}>{t.saveReport}</button>
        </form>
      )}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

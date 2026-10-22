"use client";
import { useState } from "react";
import { Bell, BellOff, Search, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";

type Row = { id: string; name: string; query: string; alertSms: boolean; lastAlertAt: string | null };

export function SavedSearchList({ initial }: { initial: Row[] }) {
  const { dict } = useI18n();
  const t = dict.alerts;
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(r: Row) {
    setBusy(r.id);
    const res = await fetch(`/api/saved-searches/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alerts: !r.alertSms }) });
    if (res.ok) setRows((x) => x.map((y) => (y.id === r.id ? { ...y, alertSms: !r.alertSms } : y)));
    setBusy(null);
  }
  async function remove(r: Row) {
    setBusy(r.id);
    const res = await fetch(`/api/saved-searches/${r.id}`, { method: "DELETE" });
    if (res.ok) setRows((x) => x.filter((y) => y.id !== r.id));
    setBusy(null);
  }

  if (!rows.length) return <p className="panel p-6 text-sm text-ink-500">{t.none}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.name}</p>
            <p className="text-xs text-ink-500">
              {r.alertSms ? t.on : t.off}
              {r.lastAlertAt ? ` · ${fmt(t.lastAlert, { date: new Date(r.lastAlertAt).toLocaleDateString("en-GB") })}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/cars?${r.query}`} className="btn-ghost px-3 py-2 text-xs"><Search className="h-4 w-4" />{t.run}</a>
            <button type="button" disabled={busy === r.id} onClick={() => toggle(r)} className={`btn-ghost px-3 py-2 text-xs ${r.alertSms ? "" : "text-ink-500"}`} aria-pressed={r.alertSms}>
              {r.alertSms ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}{r.alertSms ? t.on : t.off}
            </button>
            <button type="button" disabled={busy === r.id} onClick={() => remove(r)} className="px-2 py-2 text-xs text-ink-500 hover:text-danger" aria-label={t.remove}><Trash2 className="h-4 w-4" /></button>
          </div>
        </li>
      ))}
    </ul>
  );
}

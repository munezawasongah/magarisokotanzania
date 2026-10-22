"use client";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BellPlus, BellRing } from "lucide-react";

/** Saves the current car search and turns on SMS/email alerts for new matches. */
export function SaveSearchButton({ labels }: { labels: { save: string; saved: string; needFilter: string; manage: string } }) {
  const sp = useSearchParams();
  const path = usePathname();
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const query = sp.toString();

  async function save() {
    setState("busy");
    setMsg(null);
    const r = await fetch("/api/saved-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, alerts: true }) });
    if (r.status === 401) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(`${path}${query ? `?${query}` : ""}`)}`;
      return;
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setState("error"); setMsg(d.error ?? labels.needFilter); return; }
    setState("saved");
  }

  if (state === "saved") {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-go-700" role="status">
        <BellRing className="h-4 w-4" />{labels.saved} <a href="/dashboard/alerts" className="font-semibold underline">{labels.manage}</a>
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <button type="button" onClick={save} disabled={state === "busy"} className="btn-ghost py-2 text-sm">
        <BellPlus className="h-4 w-4" />{labels.save}
      </button>
      {msg && <p className="text-xs text-danger" role="alert">{msg}</p>}
    </div>
  );
}

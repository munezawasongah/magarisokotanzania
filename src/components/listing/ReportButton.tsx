"use client";
import { useState } from "react";
import { Flag } from "lucide-react";

const REASONS = [["SCAM", "Scam / fraud"], ["WRONG_INFO", "Wrong information"], ["SOLD", "Already sold"], ["DUPLICATE", "Duplicate"], ["OFFENSIVE", "Offensive"], ["OTHER", "Other"]] as const;

export function ReportButton({ listingId, label }: { listingId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <p className="text-xs text-ink-500">Thanks — our team will review this listing.</p>;
  return open ? (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const r = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, reason: fd.get("reason"), details: fd.get("details") }) });
        if (r.ok) setDone(true);
      }}
    >
      <select name="reason" className="field" aria-label="Reason">{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <textarea name="details" className="field" placeholder="Details (optional)" maxLength={500} />
      <div className="flex gap-2"><button className="btn-danger py-2" type="submit">Send report</button><button type="button" className="btn-ghost py-2" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  ) : (
    <button type="button" className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-danger" onClick={() => setOpen(true)}><Flag className="h-3.5 w-3.5" />{label}</button>
  );
}

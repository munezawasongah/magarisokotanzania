"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import { formatTzPhone } from "@/lib/phone";
import { formatTzs } from "@/lib/money";
import { whatsappLink } from "@/lib/whatsapp";
import { timeAgo, cn } from "@/lib/utils";
import { InquiryStatus } from "@/generated/prisma/enums";

type Lead = {
  id: string; type: string; status: string; name: string; phone: string; email: string | null; message: string; createdAt: string;
  offerTzs: number | null; preferredDate: string | null; sellerNote: string | null;
  listing: { title: string; slug: string } | null; part: { title: string; slug: string } | null;
  messages: Array<{ id: string; body: string; senderId: string | null; createdAt: string }>;
};

export function LeadsInbox({ leads, me }: { leads: Lead[]; me: string }) {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const [filter, setFilter] = useState<string>("ALL");
  const [openId, setOpenId] = useState<string | null>(leads[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = filter === "ALL" ? leads : leads.filter((l) => l.status === filter);
  const open = leads.find((l) => l.id === openId);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/inquiries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    router.refresh();
  }
  async function send() {
    if (!open || !reply.trim()) return;
    setBusy(true);
    await fetch(`/api/inquiries/${open.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }) });
    setReply(""); setBusy(false);
    router.refresh();
  }

  if (!leads.length) return <div className="panel p-10 text-center text-sm text-ink-500">{dict.dash.noLeads}</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {["ALL", ...Object.values(InquiryStatus)].map((s) => (
            <button key={s} type="button" onClick={() => setFilter(s)} className={cn("chip", filter === s && "border-ink-900 bg-ink-900 text-white")}>
              {s === "ALL" ? dict.common.all : enumLabel(dict, "InquiryStatus", s)} <span className="tabular-nums opacity-60">{s === "ALL" ? leads.length : leads.filter((l) => l.status === s).length}</span>
            </button>
          ))}
        </div>
        <ul className="panel divide-y divide-line overflow-hidden">
          {shown.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => setOpenId(l.id)} className={cn("w-full px-4 py-3 text-left", openId === l.id ? "bg-ink-100/70" : "hover:bg-ink-100/40")}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", l.status === "NEW" ? "font-bold" : "font-medium")}>{l.name}</span>
                  <span className="shrink-0 text-2xs text-ink-500">{timeAgo(l.createdAt, locale)}</span>
                </div>
                <p className="truncate text-xs text-ink-500">{l.sellerNote?.startsWith("⚠") && <span className="font-semibold text-danger">⚠ </span>}{l.listing?.title ?? l.part?.title} · {enumLabel(dict, "InquiryType", l.type)}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <div className="panel flex flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold">{open.name}</h2>
              <p className="text-sm text-ink-500">{enumLabel(dict, "InquiryType", open.type)} · {open.listing ? <a className="underline" href={`/cars/${open.listing.slug}`}>{open.listing.title}</a> : open.part ? <a className="underline" href={`/parts/${open.part.slug}`}>{open.part.title}</a> : null}</p>
              {open.offerTzs ? <p className="mt-1"><span className="plate text-sm">Offer {formatTzs(open.offerTzs)}</span></p> : null}
              {open.preferredDate && <p className="mt-1 text-sm">Preferred date: {new Date(open.preferredDate).toLocaleDateString("en-GB")}</p>}
            </div>
            <div className="flex gap-2">
              <a className="btn-wa py-2" target="_blank" rel="noopener noreferrer" href={whatsappLink(open.phone, `Habari ${open.name}, asante kwa kuwasiliana kuhusu ${open.listing?.title ?? open.part?.title ?? ""}.`)}><WhatsAppIcon /> WhatsApp</a>
              <a className="btn-ghost py-2 tabular-nums" href={`tel:${open.phone}`}><Phone className="h-4 w-4" />{formatTzPhone(open.phone)}</a>
            </div>
          </div>
          {open.sellerNote?.startsWith("⚠") && (
            <p className="mt-4 rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger" role="alert">
              {open.sellerNote} {dict.dash.scamWarning}
            </p>
          )}
          <ol className="flex-1 space-y-3 py-4">
            {open.messages.map((m) => (
              <li key={m.id} className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", m.senderId === me ? "ml-auto bg-ink-900 text-white" : "bg-ink-100")}>
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={cn("mt-1 text-2xs", m.senderId === me ? "text-ink-300" : "text-ink-500")}>{timeAgo(m.createdAt, locale)}</p>
              </li>
            ))}
          </ol>
          <div className="space-y-3 border-t border-line pt-4">
            <div className="flex gap-2">
              <textarea className="field min-h-11 flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply by SMS…" aria-label="Reply" />
              <button type="button" className="btn-primary" disabled={busy || !reply.trim()} onClick={send}>{dict.inquiry.submit}</button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              {dict.dash.markAs}
              <select className="field w-auto py-1.5" value={open.status} onChange={(e) => setStatus(open.id, e.target.value)}>
                {Object.values(InquiryStatus).map((s) => <option key={s} value={s}>{enumLabel(dict, "InquiryStatus", s)}</option>)}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

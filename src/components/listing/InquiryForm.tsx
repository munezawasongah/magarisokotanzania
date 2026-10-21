"use client";
import { useActionState, useState } from "react";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { submitInquiryAction, type FormState } from "@/server/actions/inquiry";
import { useI18n } from "@/i18n/client";
import { enumLabel } from "@/i18n";
import type { InquiryType } from "@/generated/prisma/enums";
import { LegalText } from "@/components/legal/LegalText";

const TYPES_FOR = {
  listing: ["GENERAL", "TEST_DRIVE", "INSPECTION", "FINANCING", "PRICE_OFFER"],
  part: ["PART_AVAILABILITY", "GENERAL"],
  business: ["SERVICE_BOOKING", "GENERAL"],
} as const satisfies Record<string, readonly InquiryType[]>;

export function InquiryForm({ target, defaultName, defaultPhone }: { target: { listingId?: string; partId?: string; businessId?: string }; defaultName?: string; defaultPhone?: string }) {
  const { dict } = useI18n();
  const kind = target.listingId ? "listing" : target.partId ? "part" : "business";
  const [type, setType] = useState<InquiryType>(TYPES_FOR[kind][0]);
  const [state, action, pending] = useActionState<FormState, FormData>(submitInquiryAction, { ok: false });
  const err = (k: string) => state.fieldErrors?.[k]?.[0];

  if (state.ok) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-go-500/40 bg-go-500/5 p-4 text-sm text-go-700" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> {dict.inquiry.success}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3" noValidate>
      {target.listingId && <input type="hidden" name="listingId" value={target.listingId} />}
      {target.partId && <input type="hidden" name="partId" value={target.partId} />}
      {target.businessId && <input type="hidden" name="businessId" value={target.businessId} />}
      {/* honeypot: hidden from people, bots fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div>
        <label className="label" htmlFor="inq-type">{dict.inquiry.type}</label>
        <select id="inq-type" name="type" className="field" value={type} onChange={(e) => setType(e.target.value as InquiryType)}>
          {TYPES_FOR[kind].map((t) => <option key={t} value={t}>{enumLabel(dict, "InquiryType", t)}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="inq-name">{dict.inquiry.name}</label>
          <input id="inq-name" name="name" className="field" defaultValue={defaultName} required autoComplete="name" aria-invalid={!!err("name")} />
          {err("name") && <p className="mt-1 text-xs text-danger">{err("name")}</p>}
        </div>
        <div>
          <label className="label" htmlFor="inq-phone">{dict.inquiry.phone}</label>
          <input id="inq-phone" name="phone" className="field" defaultValue={defaultPhone} required inputMode="tel" autoComplete="tel" placeholder="0712 345 678" aria-invalid={!!err("phone")} />
          {err("phone") && <p className="mt-1 text-xs text-danger">{err("phone")}</p>}
        </div>
      </div>
      {type === "PRICE_OFFER" && (
        <div>
          <label className="label" htmlFor="inq-offer">{dict.inquiry.offer}</label>
          <input id="inq-offer" name="offerTzs" className="field" inputMode="numeric" placeholder="e.g. 42,000,000 or 42m" />
        </div>
      )}
      {(type === "TEST_DRIVE" || type === "INSPECTION" || type === "SERVICE_BOOKING") && (
        <div>
          <label className="label" htmlFor="inq-date">{dict.inquiry.preferredDate}</label>
          <input id="inq-date" name="preferredDate" type="date" className="field" min={new Date().toISOString().slice(0, 10)} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="inq-msg">{dict.inquiry.message}</label>
        <textarea id="inq-msg" name="message" className="field min-h-24" defaultValue={dict.inquiry.defaultMessage} required aria-invalid={!!err("message")} />
        {err("message") && <p className="mt-1 text-xs text-danger">{err("message")}</p>}
      </div>
      {state.message && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        <MessageSquare className="h-4 w-4" /> {pending ? dict.inquiry.sending : dict.listing.message}
      </button>
      <p className="text-xs leading-5 text-ink-500"><LegalText template={dict.legal.inquiryNotice} labels={{ privacy: dict.legal.privacy }} /></p>
    </form>
  );
}

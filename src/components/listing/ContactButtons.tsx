"use client";
import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/icons";
import { whatsappLink } from "@/lib/whatsapp";
import { formatTzPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

function track(listingId: string | undefined, type: "WHATSAPP_CLICK" | "CALL_CLICK") {
  if (!listingId) return;
  const body = JSON.stringify({ type });
  if (navigator.sendBeacon) navigator.sendBeacon(`/api/listings/${listingId}/events`, new Blob([body], { type: "application/json" }));
  else void fetch(`/api/listings/${listingId}/events`, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
}

/** Opens WhatsApp with a pre-filled message; logs a lead event for seller analytics. */
export function WhatsAppButton({ phone, message, listingId, label, className, compact, iconOnly }: { phone: string; message: string; listingId?: string; label: string; className?: string; compact?: boolean; iconOnly?: boolean }) {
  return (
    <a
      href={whatsappLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { e.stopPropagation(); track(listingId, "WHATSAPP_CLICK"); }}
      className={cn("btn-wa", compact && "px-3 py-2", className)}
      aria-label={label}
    >
      <WhatsAppIcon className="h-4 w-4" />
      <span className={iconOnly ? "sr-only" : undefined}>{label}</span>
    </a>
  );
}

/** The seller's number is always shown; tapping it dials and logs a call lead. */
export function CallButton({ phone, listingId, label, className, compact }: { phone: string; listingId?: string; label: string; revealLabel?: string; className?: string; compact?: boolean }) {
  return (
    <a
      href={`tel:${phone}`}
      onClick={(e) => { e.stopPropagation(); track(listingId, "CALL_CLICK"); }}
      className={cn("btn-ghost whitespace-nowrap tabular-nums", compact && "gap-1.5 px-2.5 py-2", className)}
      aria-label={`${label} ${formatTzPhone(phone)}`}
    >
      <Phone className="h-4 w-4 shrink-0" /> <span>{formatTzPhone(phone)}</span>
    </a>
  );
}

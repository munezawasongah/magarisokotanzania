import { PHONE } from "@/config/phone";

/**
 * Phone helpers for the country in src/config/phone.ts. Everything is stored in E.164.
 */
const cc = PHONE.dialCode;

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = String(input).replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith(`00${cc}`)) d = d.slice(2);
  if (d.startsWith(cc) && d.length > 10) d = d.slice(cc.length);
  else if (d.startsWith("0")) d = d.slice(1);
  return PHONE.nationalPattern.test(d) ? `+${cc}${d}` : null;
}

export function isValidPhone(input: string | null | undefined) {
  return normalizePhone(input) !== null;
}

/** +255712345678 → "+255 712 345 678" */
export function formatPhone(e164: string | null | undefined): string {
  const n = normalizePhone(e164);
  if (!n) return e164 ?? "";
  const nat = n.slice(cc.length + 1);
  const parts: string[] = [];
  let i = 0;
  for (const len of PHONE.group) { parts.push(nat.slice(i, i + len)); i += len; }
  return `+${cc} ${parts.join(" ")}`;
}

/** Digits only, as required by wa.me and mobile-money APIs: 255712345678 */
export function toMsisdn(e164: string): string {
  return (normalizePhone(e164) ?? e164).replace(/^\+/, "");
}

export type MobileNetwork = string;

/** Best-effort network detection by prefix (longest prefix wins), used to pre-select the wallet. */
export function detectNetwork(e164: string): MobileNetwork {
  const n = normalizePhone(e164);
  if (!n) return "UNKNOWN";
  const nat = n.slice(cc.length + 1);
  let best = { net: "UNKNOWN", len: 0 };
  for (const [net, prefixes] of Object.entries(PHONE.networks)) {
    for (const p of prefixes) if (nat.startsWith(p) && p.length > best.len) best = { net, len: p.length };
  }
  return best.net;
}

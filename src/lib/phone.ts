/**
 * Tanzanian phone helpers. Everything is stored in E.164: +2557XXXXXXXX / +2556XXXXXXXX.
 */
const TZ_E164 = /^\+255[67]\d{8}$/;

export function normalizeTzPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = String(input).replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00255")) d = d.slice(2);
  if (d.startsWith("255")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  const e164 = `+255${d}`;
  return TZ_E164.test(e164) ? e164 : null;
}

export function isValidTzPhone(input: string | null | undefined) {
  return normalizeTzPhone(input) !== null;
}

/** +255712345678 → "+255 712 345 678" */
export function formatTzPhone(e164: string | null | undefined): string {
  const n = normalizeTzPhone(e164);
  if (!n) return e164 ?? "";
  return `+255 ${n.slice(4, 7)} ${n.slice(7, 10)} ${n.slice(10)}`;
}

/** Digits only, as required by wa.me and mobile-money APIs: 255712345678 */
export function toMsisdn(e164: string): string {
  return (normalizeTzPhone(e164) ?? e164).replace(/^\+/, "");
}

export type MobileNetwork = "VODACOM" | "AIRTEL" | "YAS" | "HALOTEL" | "TTCL" | "UNKNOWN";

/** Best-effort network detection by prefix, used to pre-select the wallet. */
export function detectNetwork(e164: string): MobileNetwork {
  const n = normalizeTzPhone(e164);
  if (!n) return "UNKNOWN";
  const p = n.slice(4, 6);
  if (["74", "75", "76"].includes(p)) return "VODACOM";
  if (["68", "69", "78"].includes(p)) return "AIRTEL";
  if (["65", "67", "71", "77"].includes(p)) return "YAS";
  if (["61", "62"].includes(p)) return "HALOTEL";
  if (p === "73") return "TTCL";
  return "UNKNOWN";
}

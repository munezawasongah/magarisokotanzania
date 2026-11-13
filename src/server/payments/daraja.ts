import "server-only";
import type { PaymentProvider } from "@/generated/prisma/enums";
import { toMsisdn } from "@/lib/phone";
import type { InitiateParams, InitiateResult, PaymentGatewayAdapter, VerifyResult } from "./types";

/**
 * Safaricom Daraja — M-Pesa Express (STK push): the payer gets a PIN prompt on their phone.
 * Kenya only. Paybill (CustomerPayBillOnline) or Buy Goods till (CustomerBuyGoodsOnline).
 *
 * Env: DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE (Paybill, or the store number for a till),
 *      DARAJA_PASSKEY, DARAJA_TILL_NUMBER (only for Buy Goods), DARAJA_CALLBACK_TOKEN, PAYMENTS_MODE=production for live.
 * Docs: https://developer.safaricom.co.ke (M-Pesa Express)
 */
const isProd = () => process.env.PAYMENTS_MODE === "production";
const BASE = () => (isProd() ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const basic = Buffer.from(`${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE()}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${basic}` }, signal: AbortSignal.timeout(15000) });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: string | number };
  if (!res.ok || !data.access_token) throw new Error(`M-Pesa auth failed (${res.status})`);
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) || 3599) * 1000 };
  return data.access_token;
}

/** Daraja wants the timestamp in Kenyan time: YYYYMMDDHHmmss. */
function timestamp(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}${g("month")}${g("day")}${g("hour")}${g("minute")}${g("second")}`;
}

function credentials() {
  const shortcode = process.env.DARAJA_SHORTCODE!;
  const ts = timestamp();
  return { shortcode, ts, password: Buffer.from(`${shortcode}${process.env.DARAJA_PASSKEY}${ts}`).toString("base64") };
}

export const daraja: PaymentGatewayAdapter & { verify(checkoutRequestId: string): Promise<VerifyResult> } = {
  name: "DARAJA",
  isConfigured: () => !!(process.env.DARAJA_CONSUMER_KEY && process.env.DARAJA_CONSUMER_SECRET && process.env.DARAJA_SHORTCODE && process.env.DARAJA_PASSKEY),
  supports: (p: PaymentProvider) => p === "MPESA",
  async initiate(p: InitiateParams): Promise<InitiateResult> {
    if (!p.msisdn) return { ok: false, error: "M-Pesa number required" };
    try {
      const token = await getToken();
      const { shortcode, ts, password } = credentials();
      const till = process.env.DARAJA_TILL_NUMBER;
      const phone = toMsisdn(p.msisdn);
      const body = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: till ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
        Amount: Math.max(1, Math.round(p.amountTzs)),
        PartyA: phone,
        PartyB: till || shortcode,
        PhoneNumber: phone,
        CallBackURL: p.callbackUrl,
        AccountReference: p.reference.slice(0, 12),
        TransactionDesc: p.description.replace(/[^\w ]/g, "").slice(0, 13) || "Payment",
      };
      const res = await fetch(`${BASE()}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      const raw = (await res.json().catch(() => ({}))) as { ResponseCode?: string; CheckoutRequestID?: string; errorMessage?: string; ResponseDescription?: string };
      if (!res.ok || raw.ResponseCode !== "0" || !raw.CheckoutRequestID) return { ok: false, error: raw.errorMessage || raw.ResponseDescription || `M-Pesa error ${res.status}`, raw };
      return { ok: true, status: "PENDING", gatewayRef: raw.CheckoutRequestID, raw };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  /** STK push query: ResultCode "0" = paid; 1032 = cancelled; 1037 = timed out; others = failed. Still processing → PENDING. */
  async verify(checkoutRequestId: string): Promise<VerifyResult> {
    const token = await getToken();
    const { shortcode, ts, password } = credentials();
    const res = await fetch(`${BASE()}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ BusinessShortCode: shortcode, Password: password, Timestamp: ts, CheckoutRequestID: checkoutRequestId }),
      signal: AbortSignal.timeout(20000),
    });
    const raw = (await res.json().catch(() => ({}))) as { ResultCode?: string | number; errorCode?: string };
    if (raw.errorCode || raw.ResultCode === undefined) return { status: "PENDING", raw }; // "being processed"
    return { status: String(raw.ResultCode) === "0" ? "SUCCESS" : "FAILED", raw };
  },
};

/** Shape of Daraja's STK callback POST body. */
export type DarajaCallback = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: Array<{ Name: string; Value?: string | number }> };
    };
  };
};

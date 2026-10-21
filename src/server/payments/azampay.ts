import "server-only";
import type { PaymentProvider } from "@/generated/prisma/enums";
import { toMsisdn } from "@/lib/phone";
import type { InitiateParams, InitiateResult, PaymentGatewayAdapter } from "./types";

/**
 * AzamPay — MNO "push" checkout (USSD prompt on the payer's phone).
 * Supports Vodacom M-Pesa, Mixx by Yas (Tigo Pesa), Airtel Money, HaloPesa, AzamPesa.
 * Docs: https://developerdocs.azampay.co.tz
 */
const isProd = () => process.env.PAYMENTS_MODE === "production";
const AUTH_BASE = () => (isProd() ? "https://authenticator.azampay.co.tz" : "https://authenticator-sandbox.azampay.co.tz");
const CHECKOUT_BASE = () => (isProd() ? "https://checkout.azampay.co.tz" : "https://sandbox.azampay.co.tz");

const PROVIDER_MAP: Partial<Record<PaymentProvider, string>> = {
  MPESA: "Mpesa",
  TIGO_PESA: "Tigo",
  AIRTEL_MONEY: "Airtel",
  HALOPESA: "Halopesa",
  AZAMPESA: "Azampesa",
};

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const res = await fetch(`${AUTH_BASE()}/AppRegistration/GenerateToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appName: process.env.AZAMPAY_APP_NAME,
      clientId: process.env.AZAMPAY_CLIENT_ID,
      clientSecret: process.env.AZAMPAY_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as { data?: { accessToken?: string; expire?: string } };
  const token = data.data?.accessToken;
  if (!res.ok || !token) throw new Error(`AzamPay auth failed (${res.status})`);
  const exp = data.data?.expire ? Date.parse(data.data.expire) : NaN;
  tokenCache = { token, expiresAt: Number.isFinite(exp) ? exp : Date.now() + 50 * 60_000 };
  return token;
}

export const azampay: PaymentGatewayAdapter = {
  name: "AZAMPAY",
  isConfigured: () => !!(process.env.AZAMPAY_APP_NAME && process.env.AZAMPAY_CLIENT_ID && process.env.AZAMPAY_CLIENT_SECRET),
  supports: (p) => p in PROVIDER_MAP,
  async initiate(p: InitiateParams): Promise<InitiateResult> {
    if (!p.msisdn) return { ok: false, error: "Mobile number required" };
    try {
      const token = await getToken();
      const body = {
        accountNumber: toMsisdn(p.msisdn),
        amount: String(p.amountTzs),
        currency: "TZS",
        externalId: p.reference,
        provider: PROVIDER_MAP[p.provider],
        additionalProperties: { description: p.description },
      };
      const res = await fetch(`${CHECKOUT_BASE()}/azampay/mno/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-API-Key": process.env.AZAMPAY_API_KEY ?? "" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      const raw = (await res.json().catch(() => ({}))) as { success?: boolean; transactionId?: string; message?: string };
      if (!res.ok || raw.success === false) return { ok: false, error: raw.message || `AzamPay error ${res.status}`, raw };
      return { ok: true, status: "PENDING", gatewayRef: raw.transactionId, raw };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

/** Shape of AzamPay's callback POST body. */
export type AzamPayCallback = {
  msisdn?: string;
  amount?: string;
  message?: string;
  utilityref?: string;      // = our externalId (Payment.reference)
  operator?: string;
  reference?: string;       // AzamPay transaction reference
  transactionstatus?: string; // "success" | "failure"
  submerchantAcc?: string | null;
  fspReferenceId?: string | null;
  additionalProperties?: Record<string, unknown> | null;
};

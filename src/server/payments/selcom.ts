import "server-only";
import { createHmac } from "crypto";
import type { PaymentProvider } from "@/generated/prisma/enums";
import { toMsisdn } from "@/lib/phone";
import type { InitiateParams, InitiateResult, PaymentGatewayAdapter, VerifyResult } from "./types";

/**
 * Selcom Checkout API — card payments (hosted page) and wallet push for all
 * Tanzanian mobile networks. Requests are signed with HMAC-SHA256.
 * Docs: https://developers.selcommobile.com
 */
const BASE = "https://apigw.selcommobile.com/v1";

function tzTimestamp() {
  // ISO-8601 in East Africa Time (+03:00), as Selcom expects
  const d = new Date(Date.now() + 3 * 3600_000);
  return d.toISOString().replace(/\.\d{3}Z$/, "+03:00");
}

function signedHeaders(payload: Record<string, string | number>) {
  const timestamp = tzTimestamp();
  const fields = Object.keys(payload);
  const signData = `timestamp=${timestamp}&` + fields.map((k) => `${k}=${payload[k]}`).join("&");
  const digest = createHmac("sha256", process.env.SELCOM_API_SECRET ?? "").update(signData).digest("base64");
  return {
    "Content-Type": "application/json",
    Authorization: `SELCOM ${Buffer.from(process.env.SELCOM_API_KEY ?? "").toString("base64")}`,
    "Digest-Method": "HS256",
    Digest: digest,
    Timestamp: timestamp,
    "Signed-Fields": fields.join(","),
  };
}

async function call<T>(method: "GET" | "POST", path: string, payload: Record<string, string | number>): Promise<T> {
  const url = method === "GET" ? `${BASE}${path}?${new URLSearchParams(payload as Record<string, string>)}` : `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: signedHeaders(payload),
    body: method === "POST" ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  return (await res.json().catch(() => ({ result: "FAIL", message: `HTTP ${res.status}` }))) as T;
}

type SelcomResp = { result?: string; resultcode?: string; message?: string; reference?: string; data?: Array<Record<string, string>> };

export const selcom: PaymentGatewayAdapter & { verify(reference: string): Promise<VerifyResult> } = {
  name: "SELCOM",
  isConfigured: () => !!(process.env.SELCOM_API_KEY && process.env.SELCOM_API_SECRET && process.env.SELCOM_VENDOR),
  supports: (p: PaymentProvider) => Boolean(p), // cards + every mobile wallet
  async initiate(p: InitiateParams): Promise<InitiateResult> {
    try {
      const order = {
        vendor: process.env.SELCOM_VENDOR!,
        order_id: p.reference,
        buyer_email: p.buyer.email || "noreply@magarisoko.co.tz",
        buyer_name: p.buyer.name,
        buyer_phone: p.msisdn ? toMsisdn(p.msisdn) : p.buyer.phone ? toMsisdn(p.buyer.phone) : "255700000000",
        amount: p.amountTzs,
        currency: "TZS",
        webhook: Buffer.from(p.callbackUrl).toString("base64"),
        redirect_url: Buffer.from(p.returnUrl).toString("base64"),
        cancel_url: Buffer.from(p.cancelUrl).toString("base64"),
        buyer_remarks: p.description,
        merchant_remarks: p.description,
        no_of_items: 1,
      };
      const created = await call<SelcomResp>("POST", "/checkout/create-order-minimal", order);
      if (created.resultcode !== "000") return { ok: false, error: created.message || "Selcom order failed", raw: created };

      if (p.provider === "CARD") {
        const encoded = created.data?.[0]?.payment_gateway_url;
        const checkoutUrl = encoded ? Buffer.from(encoded, "base64").toString("utf8") : undefined;
        return { ok: true, status: "PENDING", checkoutUrl, gatewayRef: created.reference, raw: created };
      }
      const push = await call<SelcomResp>("POST", "/checkout/wallet-payment", {
        transid: p.reference,
        order_id: p.reference,
        msisdn: toMsisdn(p.msisdn!),
      });
      if (push.resultcode !== "000" && push.resultcode !== "111") return { ok: false, error: push.message || "Wallet push failed", raw: push };
      return { ok: true, status: "PENDING", gatewayRef: push.reference ?? created.reference, raw: { created, push } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  /** Authoritative status check — used to confirm webhooks instead of trusting the payload. */
  async verify(reference: string): Promise<VerifyResult> {
    const r = await call<SelcomResp>("GET", "/checkout/order-status", { order_id: reference });
    const row = r.data?.[0];
    const status = (row?.payment_status || "").toUpperCase();
    return {
      status: status === "COMPLETED" ? "SUCCESS" : status === "CANCELLED" || status === "REJECTED" || status === "USERCANCELED" ? "FAILED" : "PENDING",
      gatewayRef: row?.transid || row?.reference,
      amountTzs: row?.amount ? Number(row.amount) : undefined,
      raw: r,
    };
  },
};

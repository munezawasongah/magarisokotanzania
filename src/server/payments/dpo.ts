import "server-only";
import type { PaymentProvider } from "@/generated/prisma/enums";
import type { InitiateParams, InitiateResult, PaymentGatewayAdapter, VerifyResult } from "./types";

/**
 * DPO Pay (Network International) — hosted card checkout (Visa/Mastercard).
 * createToken → redirect to payv2.php → verifyToken on return/callback.
 * Docs: https://docs.dpopay.com/api/index.html
 */
const API = "https://secure.3gdirectpay.com/API/v6/";
const PAY_URL = "https://secure.3gdirectpay.com/payv2.php?ID=";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim();

function dpoDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function post(xml: string) {
  const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/xml" }, body: xml, signal: AbortSignal.timeout(30000) });
  return res.text();
}

export const dpo: PaymentGatewayAdapter & { verify(token: string): Promise<VerifyResult> } = {
  name: "DPO",
  isConfigured: () => !!(process.env.DPO_COMPANY_TOKEN && process.env.DPO_SERVICE_TYPE),
  supports: (p: PaymentProvider) => p === "CARD",
  async initiate(p: InitiateParams): Promise<InitiateResult> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${process.env.DPO_COMPANY_TOKEN}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${p.amountTzs}</PaymentAmount>
    <PaymentCurrency>TZS</PaymentCurrency>
    <CompanyRef>${esc(p.reference)}</CompanyRef>
    <RedirectURL>${esc(p.returnUrl)}</RedirectURL>
    <BackURL>${esc(p.cancelUrl)}</BackURL>
    <CompanyRefUnique>1</CompanyRefUnique>
    <PTL>30</PTL>
    <customerFirstName>${esc(p.buyer.name.split(" ")[0] || "Customer")}</customerFirstName>
    <customerEmail>${esc(p.buyer.email || "")}</customerEmail>
    <customerCountry>TZ</customerCountry>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${process.env.DPO_SERVICE_TYPE}</ServiceType>
      <ServiceDescription>${esc(p.description)}</ServiceDescription>
      <ServiceDate>${dpoDate()}</ServiceDate>
    </Service>
  </Services>
</API3G>`;
    try {
      const out = await post(xml);
      const result = tag(out, "Result");
      const token = tag(out, "TransToken");
      if (result !== "000" || !token) return { ok: false, error: tag(out, "ResultExplanation") || "DPO token failed", raw: out };
      return { ok: true, status: "PENDING", gatewayRef: token, checkoutUrl: PAY_URL + token, raw: out };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  async verify(token: string): Promise<VerifyResult> {
    const out = await post(`<?xml version="1.0" encoding="utf-8"?>
<API3G><CompanyToken>${process.env.DPO_COMPANY_TOKEN}</CompanyToken><Request>verifyToken</Request><TransactionToken>${esc(token)}</TransactionToken></API3G>`);
    const result = tag(out, "Result");
    // 000 paid; 900-904 not yet paid / declined / cancelled
    const status = result === "000" ? "SUCCESS" : result === "900" ? "PENDING" : "FAILED";
    const amt = tag(out, "TransactionAmount");
    return { status, gatewayRef: token, amountTzs: amt ? Math.round(Number(amt)) : undefined, raw: out };
  },
};

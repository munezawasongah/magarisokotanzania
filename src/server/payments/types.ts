import type { PaymentProvider } from "@/generated/prisma/enums";

export type InitiateParams = {
  reference: string;        // our unique external id
  amountTzs: number;
  provider: PaymentProvider;
  msisdn?: string;          // E.164 for mobile money
  description: string;
  buyer: { name: string; email?: string | null; phone?: string | null };
  callbackUrl: string;      // server-to-server webhook
  returnUrl: string;        // browser redirect after card payment
  cancelUrl: string;
};

export type InitiateResult =
  | { ok: true; status: "PENDING"; gatewayRef?: string; checkoutUrl?: string; raw?: unknown }
  | { ok: false; error: string; raw?: unknown };

export type VerifyResult = { status: "SUCCESS" | "FAILED" | "PENDING"; gatewayRef?: string; amountTzs?: number; raw?: unknown };

export interface PaymentGatewayAdapter {
  readonly name: "AZAMPAY" | "SELCOM" | "DPO" | "MANUAL";
  isConfigured(): boolean;
  supports(provider: PaymentProvider): boolean;
  initiate(p: InitiateParams): Promise<InitiateResult>;
}

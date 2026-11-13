/**
 * Payment methods offered at checkout for this country (client-safe).
 * Server-side gateway routing lives in src/server/payments/routing.ts.
 */
export type PayProvider = "MPESA" | "TIGO_PESA" | "AIRTEL_MONEY" | "HALOPESA" | "AZAMPESA" | "CARD";

export const PAYMENT_METHODS: {
  providers: PayProvider[];
  /** mobile network (src/config/phone.ts) → wallet pre-selected for that number */
  networkToProvider: Record<string, PayProvider>;
  swatch: Partial<Record<PayProvider, string>>;
  phonePlaceholder: string;
} = {
  providers: ["MPESA", "TIGO_PESA", "AIRTEL_MONEY", "HALOPESA", "AZAMPESA", "CARD"],
  networkToProvider: { VODACOM: "MPESA", YAS: "TIGO_PESA", AIRTEL: "AIRTEL_MONEY", HALOTEL: "HALOPESA" },
  swatch: { MPESA: "bg-[#E60000]", TIGO_PESA: "bg-[#00377B]", AIRTEL_MONEY: "bg-[#ED1C24]", HALOPESA: "bg-[#F58220]", AZAMPESA: "bg-[#0B6E4F]", CARD: "bg-ink-900" },
  phonePlaceholder: "0754 123 456",
};

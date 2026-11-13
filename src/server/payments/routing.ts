import "server-only";
import type { PaymentGatewayAdapter } from "./types";
import { azampay } from "./azampay";
import { selcom } from "./selcom";
import { dpo } from "./dpo";

/**
 * Gateway order per payment type for this country; the first one configured and
 * supporting the wallet wins. PAYMENTS_MNO_GATEWAY / PAYMENTS_CARD_GATEWAY move one to the front.
 * Tanzania: mobile money → AzamPay (fallback Selcom); cards → DPO (fallback Selcom).
 */
export const GATEWAYS: { mobile: PaymentGatewayAdapter[]; card: PaymentGatewayAdapter[] } = {
  mobile: [azampay, selcom],
  card: [dpo, selcom],
};

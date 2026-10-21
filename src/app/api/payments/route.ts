import { paymentInitSchema } from "@/lib/validation";
import { initiatePayment } from "@/server/payments";
import { ListingError } from "@/server/listings";
import { apiUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";

/**
 * POST /api/payments — start a mobile-money push (M-Pesa, Mixx by Yas, Airtel Money,
 * HaloPesa, AzamPesa) or a card checkout. Amount is always resolved server-side.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!rateLimit(`pay:${user.id}`, 10, 10 * 60_000)) return jsonError("Too many payment attempts. Wait a few minutes.", 429);
  const parsed = paymentInitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid payment", 422);
  try {
    return json(await initiatePayment(user, parsed.data), { status: 201 });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

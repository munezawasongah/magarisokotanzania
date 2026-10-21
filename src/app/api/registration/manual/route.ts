import { manualPaymentSchema } from "@/lib/validation";
import { apiUser } from "@/lib/session";
import { submitManualPayment } from "@/server/registration";
import { ListingError } from "@/server/errors";
import { rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";

/** POST { reference, msisdn } — the user paid to the Lipa Namba; admin will verify the code. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!rateLimit(`manualpay:${user.id}`, 5, 60 * 60_000)) return jsonError("Too many attempts. Try again later.", 429);
  const parsed = manualPaymentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid details", 422, parsed.error.flatten().fieldErrors);
  try {
    const reg = await submitManualPayment(user, parsed.data.reference, parsed.data.msisdn);
    return json({ status: reg.status });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

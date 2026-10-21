import { getPaymentStatus } from "@/server/payments";
import { ListingError } from "@/server/listings";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";

/** Polled by the checkout UI every few seconds until SUCCESS / FAILED. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    return json(await getPaymentStatus(user, (await params).id), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

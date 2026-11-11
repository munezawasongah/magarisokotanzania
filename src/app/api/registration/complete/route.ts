import { apiUser } from "@/lib/session";
import { completeFreeRegistration } from "@/server/registration";
import { ListingError } from "@/server/errors";
import { json, jsonError } from "@/lib/json";

/** POST — finish a saved registration for free when its account type has no sign-up fee. */
export async function POST() {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    const business = await completeFreeRegistration(user);
    return json({ status: "APPROVED", businessSlug: business.slug, businessType: business.type });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

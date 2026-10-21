import { registrationDetailsSchema } from "@/lib/validation";
import { apiUser } from "@/lib/session";
import { getMyRegistration, saveRegistrationDetails } from "@/server/registration";
import { ListingError } from "@/server/errors";
import { fieldErrorsFrom, json, jsonError } from "@/lib/json";

/** GET — the signed-in user's registration (or null). */
export async function GET() {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  return json(await getMyRegistration(user.id));
}

/** POST { accountType, shop } — save seller registration details (step 1). */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = registrationDetailsSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Please fix the highlighted fields", 422, fieldErrorsFrom(parsed.error, "shop"));
  try {
    const reg = await saveRegistrationDetails(user, parsed.data.accountType, parsed.data.shop);
    return json({ id: reg.id, status: reg.status });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

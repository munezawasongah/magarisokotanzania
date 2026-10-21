import { revalidatePath } from "next/cache";
import { shopSchema } from "@/lib/validation";
import { apiUser } from "@/lib/session";
import { updateShop } from "@/server/registration";
import { ListingError } from "@/server/errors";
import { fieldErrorsFrom, json, jsonError } from "@/lib/json";

/** PUT — update the signed-in seller's mini-site. */
export async function PUT(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = shopSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Please fix the highlighted fields", 422, fieldErrorsFrom(parsed.error));
  try {
    const shop = await updateShop(user, parsed.data);
    revalidatePath(`/shop/${shop.slug}`);
    return json(shop);
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

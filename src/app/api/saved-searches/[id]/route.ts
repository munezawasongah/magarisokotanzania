import { z } from "zod";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";
import { deleteSavedSearch, updateSavedSearch } from "@/server/alerts";
import { ListingError } from "@/server/errors";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { alerts?, name? } — turn alerts on/off or rename. */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = z.object({ alerts: z.boolean().optional(), name: z.string().trim().min(1).max(80).optional() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid update", 422);
  try {
    return json(await updateSavedSearch(user, (await params).id, parsed.data));
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await deleteSavedSearch(user, (await params).id);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

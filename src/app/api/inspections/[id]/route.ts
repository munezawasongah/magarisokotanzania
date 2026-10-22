import { z } from "zod";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";
import { updateInspection } from "@/server/inspections";
import { ListingError } from "@/server/errors";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("schedule"), scheduledAt: z.coerce.date() }),
  z.object({ action: z.literal("complete"), report: z.string().trim().min(3, "Add the report link or a short summary").max(4000) }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().max(500).optional() }),
]);

/** PATCH — garage confirms a date, completes with a report, or cancels; the buyer can cancel. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid update", 422);
  try {
    const r = await updateInspection(user, (await params).id, parsed.data);
    return json({ id: r.id, status: r.status });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

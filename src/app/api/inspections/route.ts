import { z } from "zod";
import { apiUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";
import { requestInspection } from "@/server/inspections";
import { ListingError } from "@/server/errors";

const schema = z.object({
  listingId: z.string().cuid(),
  providerId: z.string().cuid({ message: "Choose an inspection centre" }),
  preferredDate: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().max(1000).optional(),
});

/** POST — a buyer books a pre-purchase inspection of a car with a registered garage. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Log in to book an inspection", 401);
  if (!rateLimit(`inspect:${user.id}`, 10, 24 * 60 * 60_000)) return jsonError("Too many requests today. Try again tomorrow.", 429);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  try {
    const r = await requestInspection(user, parsed.data);
    return json({ id: r.id, status: r.status }, { status: 201 });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

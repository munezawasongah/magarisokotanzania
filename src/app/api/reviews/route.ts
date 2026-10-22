import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";
import { upsertReview } from "@/server/reviews";
import { ListingError } from "@/server/errors";

const schema = z.object({
  businessId: z.string().cuid(),
  rating: z.coerce.number().int().min(1, "Choose 1 to 5 stars").max(5),
  body: z.string().trim().min(10, "Write at least a sentence about your experience").max(2000),
});

/** POST { businessId, rating, body } — write or update my review of a seller. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Log in to write a review", 401);
  if (!rateLimit(`review:${user.id}`, 10, 60 * 60_000)) return jsonError("Too many reviews. Try again later.", 429);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid review", 422);
  try {
    const r = await upsertReview(user, parsed.data);
    const biz = await prisma.business.findUnique({ where: { id: parsed.data.businessId }, select: { slug: true } });
    if (biz) revalidatePath(`/shop/${biz.slug}`);
    return json(r, { status: 201 });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";
import { moderateReview, replyToReview } from "@/server/reviews";
import { ListingError } from "@/server/errors";

const schema = z.union([
  z.object({ reply: z.string().trim().max(1500) }),
  z.object({ status: z.enum(["PUBLISHED", "HIDDEN"]), reason: z.string().trim().max(200).optional() }),
]);

/** PATCH { reply } (business owner) or { status, reason } (moderator). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid update", 422);
  const id = (await params).id;
  try {
    const r = "reply" in parsed.data ? await replyToReview(user, id, parsed.data.reply) : await moderateReview(user, id, parsed.data.status, parsed.data.reason);
    const biz = await prisma.business.findUnique({ where: { id: r.businessId }, select: { slug: true } });
    if (biz) revalidatePath(`/shop/${biz.slug}`);
    return json(r);
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

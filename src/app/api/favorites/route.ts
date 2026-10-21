import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/session";
import { recordListingEvent } from "@/server/listings";
import { json, jsonError } from "@/lib/json";

/** POST { listingId } or { partId } → toggles a saved item. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = z.object({ listingId: z.string().cuid().optional(), partId: z.string().cuid().optional() }).refine((v) => !!v.listingId !== !!v.partId).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Provide listingId or partId", 422);
  const { listingId, partId } = parsed.data;
  const where = listingId ? { userId_listingId: { userId: user.id, listingId } } : { userId_partId: { userId: user.id, partId: partId! } };
  const existing = await prisma.favorite.findUnique({ where });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return json({ saved: false });
  }
  await prisma.favorite.create({ data: { userId: user.id, listingId, partId } });
  if (listingId) await recordListingEvent(listingId, "FAVORITE");
  return json({ saved: true }, { status: 201 });
}

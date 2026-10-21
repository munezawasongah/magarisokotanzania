import { prisma } from "@/lib/prisma";
import { listingUpdateSchema } from "@/lib/validation";
import { deleteListing, ListingError, listingCardSelect, updateListing } from "@/server/listings";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const l = await prisma.listing.findFirst({
    where: { id, status: "ACTIVE" },
    select: { ...listingCardSelect, description: true, features: true, engineCc: true, colorExterior: true, landedCostBreakdown: true, images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" } } },
  });
  return l ? json(l) : jsonError("Not found", 404);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = listingUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid update", 422, parsed.error.flatten().fieldErrors);
  try {
    return json(await updateListing(user, (await params).id, parsed.data));
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await deleteListing(user, (await params).id);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

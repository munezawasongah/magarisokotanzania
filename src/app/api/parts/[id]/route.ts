import { revalidatePath } from "next/cache";
import { z } from "zod";
import { partCreateSchema } from "@/lib/validation";
import { setPartStatus, updatePart } from "@/server/parts";
import { ListingError } from "@/server/errors";
import { apiUser } from "@/lib/session";
import { fieldErrorsFrom, json, jsonError } from "@/lib/json";

type Ctx = { params: Promise<{ id: string }> };

function fail(e: unknown) {
  if (e instanceof ListingError) return jsonError(e.message, e.status);
  throw e;
}

/** PUT — full edit of my spare part (price is required, like when listing). */
export async function PUT(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = partCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid part", 422, fieldErrorsFrom(parsed.error));
  try {
    const p = await updatePart(user, (await params).id, parsed.data);
    revalidatePath(`/parts/${p.slug}`);
    return json(p);
  } catch (e) {
    return fail(e);
  }
}

/** PATCH { status?: ACTIVE | SOLD, stockQty? } — sold out, back in stock, stock count. */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = z.object({ status: z.enum(["ACTIVE", "SOLD"]).optional(), stockQty: z.coerce.number().int().min(0).max(100000).optional() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid update", 422);
  try {
    const p = await setPartStatus(user, (await params).id, parsed.data);
    revalidatePath(`/parts/${p.slug}`);
    return json(p);
  } catch (e) {
    return fail(e);
  }
}

/** DELETE — remove the part from the site (kept for records, never shown again). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    const p = await setPartStatus(user, (await params).id, { status: "ARCHIVED" });
    revalidatePath(`/parts/${p.slug}`);
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

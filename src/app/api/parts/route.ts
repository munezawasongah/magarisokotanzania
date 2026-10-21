import { parseSearchParams, partCreateSchema, partFilterSchema } from "@/lib/validation";
import { createPart, searchParts } from "@/server/parts";
import { ListingError } from "@/server/listings";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";

/** GET /api/parts?q=brake+pads&category=BRAKES&make=toyota&model=hilux&year=2018 */
export async function GET(req: Request) {
  const f = parseSearchParams(partFilterSchema, new URL(req.url).searchParams);
  return json(await searchParts(f), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}

/** POST /api/parts — list a spare part with fitment data (parts vendors / sellers). */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = partCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid part", 422, parsed.error.flatten().fieldErrors);
  try {
    return json(await createPart(user, parsed.data), { status: 201 });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

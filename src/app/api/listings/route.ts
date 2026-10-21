import { listingCreateSchema, listingFilterSchema, parseSearchParams } from "@/lib/validation";
import { createListing, ListingError, searchListings } from "@/server/listings";
import { apiUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";

/**
 * GET /api/listings?make=toyota&model=harrier&priceMax=60m&region=dar-es-salaam&body=SUV,PICKUP&sort=price_asc&page=2
 * Public, cacheable filtered search with facet counts.
 */
export async function GET(req: Request) {
  const filters = parseSearchParams(listingFilterSchema, new URL(req.url).searchParams);
  const result = await searchListings(filters);
  return json(result, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}

/** POST /api/listings — create a vehicle listing (auth required). */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in to list a vehicle", 401);
  if (!rateLimit(`list:${user.id}`, 20, 60 * 60_000)) return jsonError("Too many listings created. Try again later.", 429);
  const parsed = listingCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid listing", 422, parsed.error.flatten().fieldErrors);
  try {
    const created = await createListing(user, parsed.data);
    return json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

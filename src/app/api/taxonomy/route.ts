import { getMakesWithModels, getRegionsWithDistricts } from "@/server/taxonomy";
import { json } from "@/lib/json";

/** Reference data for mobile apps and client dropdowns. */
export async function GET() {
  const [makes, regions] = await Promise.all([getMakesWithModels(), getRegionsWithDistricts()]);
  return json({ makes, regions }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}

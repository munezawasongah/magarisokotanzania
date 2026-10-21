import { getUsdTzsRate } from "@/lib/fx";
import { json } from "@/lib/json";

export async function GET() {
  return json({ base: "USD", quote: "TZS", rate: await getUsdTzsRate() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
}

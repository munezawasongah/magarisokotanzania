import { z } from "zod";
import { estimateLandedCost } from "@/lib/import-cost";
import { getUsdTzsRate } from "@/lib/fx";
import { getImportTaxRules } from "@/lib/settings";
import { json, jsonError } from "@/lib/json";

const schema = z.object({
  fobUsd: z.coerce.number().positive().max(2_000_000),
  freightUsd: z.coerce.number().min(0).max(100_000).optional(),
  insuranceUsd: z.coerce.number().min(0).max(100_000).optional(),
  year: z.coerce.number().int().min(1960).max(new Date().getFullYear() + 1),
  engineCc: z.coerce.number().int().min(0).max(20000).optional(),
  fuelType: z.string().optional(),
});

/** POST — landed-cost calculator for importers' quoting and the public import tool. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid input", 422, parsed.error.flatten().fieldErrors);
  const [rate, rules] = await Promise.all([getUsdTzsRate(), getImportTaxRules()]);
  const d = parsed.data;
  return json(estimateLandedCost({ ...d, isElectric: d.fuelType === "ELECTRIC", usdTzsRate: rate, rules }));
}

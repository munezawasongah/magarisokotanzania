import "server-only";
import { prisma } from "./prisma";

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * USD → TZS rate. Uses the latest stored rate if < 12h old, otherwise refreshes
 * from a free public API, otherwise falls back to FX_FALLBACK_USD_TZS.
 * Admins can also insert a manual rate (source = "manual") which always wins
 * while it is fresh.
 */
export async function getUsdTzsRate(): Promise<number> {
  const fallback = Number(process.env.FX_FALLBACK_USD_TZS || 2600);
  try {
    const latest = await prisma.exchangeRate.findFirst({ where: { base: "USD", quote: "TZS" }, orderBy: { fetchedAt: "desc" } });
    if (latest && Date.now() - latest.fetchedAt.getTime() < MAX_AGE_MS) return latest.rate;

    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 43200 }, signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      const rate = data.rates?.TZS;
      if (rate && rate > 500) {
        await prisma.exchangeRate.create({ data: { rate, source: "open.er-api.com" } });
        return rate;
      }
    }
    return latest?.rate ?? fallback;
  } catch {
    return fallback;
  }
}

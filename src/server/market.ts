import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { BodyType, VehicleCondition } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Market price statistics from live listings. All figures are ASKING prices
 * (not sale prices or valuations) and are labelled that way wherever shown.
 * "Typical" = median; "most between" = middle half (25th–75th percentile).
 */
export type PriceStat = { count: number; median: number; p25: number; p75: number };
export type Scope = { makeId?: number; modelId?: number; body?: BodyType; regionId?: number; condition?: VehicleCondition; yearFrom?: number; yearTo?: number };
type Row = { count: bigint | number; median: number | null; p25: number | null; p75: number | null };

/** Fewest cars needed before we publish a typical price for a group. */
export const MIN_GROUP = 3;
/** Fewest comparable cars needed before a car gets a price verdict. */
export const MIN_COMPARABLES = 5;

function where(s: Scope) {
  const p: Prisma.Sql[] = [Prisma.sql`"status" = 'ACTIVE'`, Prisma.sql`"priceTzs" > 0`];
  if (s.makeId) p.push(Prisma.sql`"makeId" = ${s.makeId}`);
  if (s.modelId) p.push(Prisma.sql`"modelId" = ${s.modelId}`);
  if (s.body) p.push(Prisma.sql`"bodyType" = ${s.body}::"BodyType"`);
  if (s.regionId) p.push(Prisma.sql`"regionId" = ${s.regionId}`);
  if (s.condition) p.push(Prisma.sql`"condition" = ${s.condition}::"VehicleCondition"`);
  if (s.yearFrom) p.push(Prisma.sql`"year" >= ${s.yearFrom}`);
  if (s.yearTo) p.push(Prisma.sql`"year" <= ${s.yearTo}`);
  return Prisma.join(p, " AND ");
}

const STATS = Prisma.sql`count(*) AS count,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceTzs")::float8 AS median,
  percentile_cont(0.25) WITHIN GROUP (ORDER BY "priceTzs")::float8 AS p25,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY "priceTzs")::float8 AS p75`;

const toStat = (r: Row): PriceStat => ({ count: Number(r.count), median: Math.round(r.median ?? 0), p25: Math.round(r.p25 ?? 0), p75: Math.round(r.p75 ?? 0) });

/** Group key column whitelist (never interpolate user input into SQL identifiers). */
const GROUPS = { model: Prisma.raw(`"modelId"`), make: Prisma.raw(`"makeId"`), year: Prisma.raw(`"year"`), region: Prisma.raw(`"regionId"`), condition: Prisma.raw(`"condition"::text`), body: Prisma.raw(`"bodyType"::text`) } as const;
type GroupBy = keyof typeof GROUPS;

async function _summary(s: Scope) {
  const [stat] = await prisma.$queryRaw<Row[]>`SELECT ${STATS} FROM "Listing" WHERE ${where(s)}`;
  const [extra] = await prisma.$queryRaw<Array<{ ymin: number | null; ymax: number | null; km: number | null }>>`
    SELECT min("year") AS ymin, max("year") AS ymax, percentile_cont(0.5) WITHIN GROUP (ORDER BY "mileageKm")::float8 AS km
    FROM "Listing" WHERE ${where(s)}`;
  return { ...toStat(stat), yearMin: extra.ymin, yearMax: extra.ymax, medianKm: extra.km ? Math.round(extra.km) : null };
}

async function _grouped(s: Scope, by: GroupBy, limit: number, minCount: number) {
  const col = GROUPS[by];
  const rows = await prisma.$queryRaw<Array<Row & { key: string | number }>>`
    SELECT ${col} AS key, ${STATS} FROM "Listing" WHERE ${where(s)}
    GROUP BY 1 HAVING count(*) >= ${minCount} ORDER BY count(*) DESC LIMIT ${limit}`;
  return rows.map((r) => ({ key: String(r.key), ...toStat(r) }));
}

const cacheKey = (s: Scope) => JSON.stringify(s, Object.keys(s).sort());

/** Totals for a scope: count, typical price, middle half, year range, typical mileage. Cached 10 min. */
export function marketSummary(s: Scope) {
  return unstable_cache(() => _summary(s), ["market-summary", cacheKey(s)], { revalidate: 600, tags: ["market"] })();
}

/** Typical price per group (model, make, year, region, condition, body). Cached 10 min. */
export function marketBy(s: Scope, by: GroupBy, limit = 12, minCount = MIN_GROUP) {
  return unstable_cache(() => _grouped(s, by, limit, minCount), ["market-by", by, String(limit), String(minCount), cacheKey(s)], { revalidate: 600, tags: ["market"] })();
}

/* ─────────────────────── per-car price verdict ─────────────────────── */

export type Verdict = "good" | "fair" | "high";
export type PriceCheck = PriceStat & { verdict: Verdict; yearFrom: number; yearTo: number; sameCondition: boolean };

/** Below 90% of the typical price = good; above 112% = high; otherwise fair. */
export function verdictFor(price: number, median: number): Verdict {
  if (price < median * 0.9) return "good";
  if (price > median * 1.12) return "high";
  return "fair";
}

/**
 * Price check for many cars in one query: each car is compared with other live cars of the
 * same model within ±1 model year — the same condition (locally used / imported / new) when
 * there are enough of them, otherwise any condition. Cars with too few comparables get none.
 */
export async function priceChecks(ids: string[]): Promise<Map<string, PriceCheck>> {
  const out = new Map<string, PriceCheck>();
  if (!ids.length) return out;
  const rows = await prisma.$queryRaw<Array<{
    id: string; price: number; year: number;
    c_count: bigint; c_median: number | null; c_p25: number | null; c_p75: number | null;
    a_count: bigint; a_median: number | null; a_p25: number | null; a_p75: number | null;
  }>>`
    SELECT c."id", c."priceTzs"::float8 AS price, c."year",
      s.c_count, s.c_median, s.c_p25, s.c_p75, s.a_count, s.a_median, s.a_p25, s.a_p75
    FROM "Listing" c
    CROSS JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE l."condition" = c."condition") AS c_count,
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY l."priceTzs") FILTER (WHERE l."condition" = c."condition"))::float8 AS c_median,
        (percentile_cont(0.25) WITHIN GROUP (ORDER BY l."priceTzs") FILTER (WHERE l."condition" = c."condition"))::float8 AS c_p25,
        (percentile_cont(0.75) WITHIN GROUP (ORDER BY l."priceTzs") FILTER (WHERE l."condition" = c."condition"))::float8 AS c_p75,
        count(*) AS a_count,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY l."priceTzs")::float8 AS a_median,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY l."priceTzs")::float8 AS a_p25,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY l."priceTzs")::float8 AS a_p75
      FROM "Listing" l
      WHERE l."status" = 'ACTIVE' AND l."priceTzs" > 0 AND l."id" <> c."id"
        AND l."modelId" = c."modelId" AND l."year" BETWEEN c."year" - 1 AND c."year" + 1
    ) s
    WHERE c."id" IN (${Prisma.join(ids)}) AND c."priceTzs" > 0`;
  for (const r of rows) {
    const same = Number(r.c_count) >= MIN_COMPARABLES;
    const count = same ? Number(r.c_count) : Number(r.a_count);
    const median = same ? r.c_median : r.a_median;
    if (count < MIN_COMPARABLES || !median) continue;
    out.set(r.id, {
      verdict: verdictFor(r.price, median),
      count, median: Math.round(median),
      p25: Math.round((same ? r.c_p25 : r.a_p25) ?? 0), p75: Math.round((same ? r.c_p75 : r.a_p75) ?? 0),
      yearFrom: r.year - 1, yearTo: r.year + 1, sameCondition: same,
    });
  }
  return out;
}

/** Just the verdicts, for listing cards. */
export async function verdictsFor(ids: string[]): Promise<Record<string, Verdict>> {
  const checks = await priceChecks(ids);
  return Object.fromEntries([...checks].map(([id, c]) => [id, c.verdict]));
}

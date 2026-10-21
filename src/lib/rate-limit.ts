import "server-only";
import { headers } from "next/headers";
import { createHash } from "crypto";

/**
 * In-memory sliding-window limiter (per server instance). Good enough as a
 * first line of defence; DB-backed checks (OTP, inquiries) provide the hard limit.
 * For multi-instance deployments swap the Map for Redis/Upstash.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 50_000) buckets.clear();
  return true;
}

export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0";
  return createHash("sha256").update(`${ip}:${process.env.NEXTAUTH_SECRET}`).digest("hex").slice(0, 24);
}

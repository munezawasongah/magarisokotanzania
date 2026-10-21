import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordListingEvent } from "@/server/listings";
import { clientIpHash } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";

const schema = z.object({ type: z.enum(["VIEW", "WHATSAPP_CLICK", "CALL_CLICK", "SHARE"]) });

/** Beacon endpoint for engagement analytics (views, WhatsApp taps, call taps). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await req.text();
  const parsed = schema.safeParse((() => { try { return JSON.parse(raw); } catch { return {}; } })());
  if (!parsed.success) return jsonError("Bad event", 400);
  const exists = await prisma.listing.findFirst({ where: { id, status: "ACTIVE" }, select: { id: true } });
  if (!exists) return jsonError("Not found", 404);
  const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|slurp|facebookexternalhit/i.test(ua)) return json({ ok: true, counted: false });
  const counted = await recordListingEvent(id, parsed.data.type, await clientIpHash());
  return json({ ok: true, counted });
}

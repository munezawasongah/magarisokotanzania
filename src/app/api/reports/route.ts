import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/session";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";
import { ReportReason } from "@/generated/prisma/enums";
import { onListingReported } from "@/server/fraud/engine";

export async function POST(req: Request) {
  if (!rateLimit(`rep:${await clientIpHash()}`, 10, 60 * 60_000)) return jsonError("Too many reports", 429);
  const parsed = z.object({ listingId: z.string().cuid(), reason: z.nativeEnum(ReportReason), details: z.string().max(500).optional().nullable() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid report", 422);
  const user = await apiUser();
  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId }, select: { sellerId: true } });
  if (!listing) return jsonError("Listing not found", 404);
  if (user?.id === listing.sellerId) return jsonError("You cannot report your own listing", 400);
  // one open report per person per listing
  if (user && (await prisma.listingReport.findFirst({ where: { listingId: parsed.data.listingId, reporterId: user.id, resolved: false } }))) return json({ ok: true }, { status: 200 });
  await prisma.listingReport.create({ data: { listingId: parsed.data.listingId, reason: parsed.data.reason, details: parsed.data.details ?? undefined, reporterId: user?.id } });
  await onListingReported(parsed.data.listingId);
  return json({ ok: true }, { status: 201 });
}

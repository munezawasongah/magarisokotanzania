import { inquirySchema } from "@/lib/validation";
import { createInquiry, listInquiriesForUser } from "@/server/inquiries";
import { ListingError } from "@/server/listings";
import { apiUser } from "@/lib/session";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";
import { InquiryStatus } from "@/generated/prisma/enums";

/** POST /api/inquiries — buyer → seller lead (public; rate-limited, honeypot-protected). */
export async function POST(req: Request) {
  const ipHash = await clientIpHash();
  if (!rateLimit(`inq:${ipHash}`, 10, 60 * 60_000)) return jsonError("Too many messages. Try again later.", 429);
  const parsed = inquirySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid inquiry", 422, parsed.error.flatten().fieldErrors);
  try {
    const inquiry = await createInquiry(parsed.data, { buyer: await apiUser(), ipHash });
    return json(inquiry, { status: 201 });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

/** GET /api/inquiries?status=NEW — the signed-in seller's leads inbox. */
export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const s = new URL(req.url).searchParams.get("status");
  const status = s && s in InquiryStatus ? (s as InquiryStatus) : undefined;
  return json(await listInquiriesForUser(user.id, status));
}

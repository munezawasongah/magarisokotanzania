import { z } from "zod";
import { InquiryStatus } from "@/generated/prisma/enums";
import { replyToInquiry, updateInquiryStatus } from "@/server/inquiries";
import { ListingError } from "@/server/listings";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { status, sellerNote? } — move a lead through the pipeline. */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = z.object({ status: z.nativeEnum(InquiryStatus), sellerNote: z.string().max(1000).optional() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid status", 422);
  try {
    return json(await updateInquiryStatus(user, (await params).id, parsed.data.status, parsed.data.sellerNote));
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

/** POST { body } — reply in the inquiry thread (buyer gets an SMS). */
export async function POST(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Message required", 422);
  try {
    return json(await replyToInquiry(user, (await params).id, parsed.data.body), { status: 201 });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

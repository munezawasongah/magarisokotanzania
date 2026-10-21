"use server";
import { inquirySchema } from "@/lib/validation";
import { createInquiry } from "@/server/inquiries";
import { ListingError } from "@/server/listings";
import { getCurrentUser } from "@/lib/session";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";

export type FormState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[] | undefined> };

/** Server action behind the "Contact the seller" form. */
export async function submitInquiryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ipHash = await clientIpHash();
  if (!rateLimit(`inq:${ipHash}`, 10, 60 * 60_000)) return { ok: false, message: "Too many messages. Please try again later." };

  const parsed = inquirySchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => v !== "")));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, message: "Please check the highlighted fields." };
  try {
    await createInquiry(parsed.data, { buyer: await getCurrentUser(), ipHash });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof ListingError ? e.message : "Something went wrong. Please try again." };
  }
}

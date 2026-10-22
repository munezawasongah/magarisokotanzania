import { z } from "zod";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";
import { confirmPasswordReset, requestPasswordReset } from "@/server/password-reset";
import { ListingError } from "@/server/errors";

const requestSchema = z.object({ identifier: z.string().trim().min(5).max(120) });
const confirmSchema = z.object({
  identifier: z.string().trim().min(5).max(120),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  password: z.string().min(8, "Use at least 8 characters").max(100),
});

/**
 * POST { identifier }                     → sends a reset code by SMS or email
 * POST { identifier, code, password }     → sets the new password
 */
export async function POST(req: Request) {
  const ip = await clientIpHash();
  if (!rateLimit(`reset-ip:${ip}`, 15, 60 * 60_000)) return jsonError("Too many attempts. Try again later.", 429);
  const body = await req.json().catch(() => ({}));
  try {
    if ("code" in body) {
      const p = confirmSchema.safeParse(body);
      if (!p.success) return jsonError(p.error.issues[0]?.message ?? "Invalid details", 422);
      return json(await confirmPasswordReset(p.data.identifier, p.data.code, p.data.password));
    }
    const p = requestSchema.safeParse(body);
    if (!p.success) return jsonError("Enter your phone number or email", 422);
    return json(await requestPasswordReset(p.data.identifier, ip));
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}

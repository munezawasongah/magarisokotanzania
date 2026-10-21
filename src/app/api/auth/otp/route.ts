import { otpRequestSchema } from "@/lib/validation";
import { issueOtp } from "@/lib/otp";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";

/** POST { phone } → sends a 6-digit login code by SMS. */
export async function POST(req: Request) {
  const ip = await clientIpHash();
  if (!rateLimit(`otp-ip:${ip}`, 10, 60 * 60_000)) return jsonError("Too many requests", 429);
  const parsed = otpRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid phone", 422);
  const r = await issueOtp(parsed.data.phone, "LOGIN", ip);
  if (!r.ok) return jsonError(r.error, 429);
  return json({ ok: true, phone: parsed.data.phone, devCode: r.devCode });
}

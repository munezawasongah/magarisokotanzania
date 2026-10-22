import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { normalizeTzPhone } from "@/lib/phone";
import { notify } from "@/lib/notify";
import { ListingError } from "./errors";
import { SITE } from "@/config/site";
import { formatTzPhone } from "@/lib/phone";

type Dest = { key: string; via: "sms" | "email"; where: { phone: string } | { email: string } };

/** Phone (any Tanzanian format) or email → where the code goes and how to find the account. */
export function resetDestination(identifier: string): Dest | null {
  const id = identifier.trim();
  if (id.includes("@")) {
    const email = id.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { key: email, via: "email", where: { email } } : null;
  }
  const phone = normalizeTzPhone(id);
  return phone ? { key: phone, via: "sms", where: { phone } } : null;
}

/**
 * Step 1: send a reset code. The answer is the same whether or not an account exists,
 * so nobody can use this form to find out who is registered.
 */
export async function requestPasswordReset(identifier: string, ipHash?: string) {
  const dest = resetDestination(identifier);
  if (!dest) throw new ListingError("Enter a valid Tanzanian phone number or email address", 422);
  const user = await prisma.user.findFirst({ where: { ...dest.where, status: "ACTIVE" }, select: { id: true } });
  if (!user) return { ok: true as const };
  const r = await issueOtp(dest.key, "RESET_PASSWORD", ipHash, dest.via);
  if (!r.ok) throw new ListingError(r.error, 429);
  return { ok: true as const, devCode: r.devCode };
}

/** Step 2: check the code and set the new password. */
export async function confirmPasswordReset(identifier: string, code: string, password: string) {
  const dest = resetDestination(identifier);
  if (!dest) throw new ListingError("Enter a valid Tanzanian phone number or email address", 422);
  const user = await prisma.user.findFirst({ where: { ...dest.where, status: "ACTIVE" }, select: { id: true, phone: true, email: true } });
  // verify even when there is no account, so timing does not reveal it
  const valid = await verifyOtp(dest.key, code, "RESET_PASSWORD");
  if (!valid || !user) throw new ListingError("The code is wrong or has expired. Request a new one.", 400);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      ...(dest.via === "sms" ? { phoneVerified: new Date() } : { emailVerified: new Date() }),
    },
  });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "user.password_reset", entityType: "User", entityId: user.id, meta: { via: dest.via } } });
  void notify(user, {
    sms: `MagariSOKO Tanzania: your password was just changed. If this wasn't you, call us immediately on ${formatTzPhone(SITE.supportPhone)}.`,
    email: { subject: "Your password was changed", lines: ["The password on your MagariSOKO Tanzania account was just changed.", "If this wasn't you, contact us immediately so we can secure your account."] },
  });
  return { ok: true as const };
}

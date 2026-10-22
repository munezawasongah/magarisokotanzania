import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import type { OtpPurpose } from "@/generated/prisma/enums";
import { isBlocked } from "@/server/fraud/engine";

const OTP_TTL_MIN = 5;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;
const RESEND_COOLDOWN_SEC = 45;

const hash = (phone: string, code: string) =>
  createHash("sha256").update(`${phone}:${code}:${process.env.NEXTAUTH_SECRET}`).digest("hex");

/**
 * Sends a 6-digit code. `phone` is the destination key: an E.164 number (SMS) or, with
 * via = "email", a lower-cased email address (used for password resets on email-only accounts).
 */
export async function issueOtp(phone: string, purpose: OtpPurpose = "LOGIN", ipHash?: string, via: "sms" | "email" = "sms") {
  if (await isBlocked(via === "email" ? "EMAIL" : "PHONE", phone)) return { ok: false as const, error: "This number cannot be used on MagariSOKO Tanzania. Contact support if you think this is a mistake." };
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.otpCode.findMany({ where: { phone, purpose, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } });
  if (recent.length >= MAX_PER_HOUR) return { ok: false as const, error: "Too many codes requested. Try again in an hour." };
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_COOLDOWN_SEC * 1000) {
    return { ok: false as const, error: `Please wait ${RESEND_COOLDOWN_SEC} seconds before requesting another code.` };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.create({
    data: { phone, purpose, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000), ipHash },
  });
  const what = purpose === "RESET_PASSWORD" ? "password reset code" : "code";
  const sent = via === "email"
    ? await sendEmail({
        to: phone,
        subject: purpose === "RESET_PASSWORD" ? "Your password reset code" : "Your verification code",
        lines: [`Your MagariSOKO Tanzania ${what} is ${code}.`, `It expires in ${OTP_TTL_MIN} minutes. Never share it with anyone — our staff will never ask for it.`, "If you did not request this, you can ignore this email."],
      })
    : await sendSms(phone, `MagariSOKO Tanzania: your ${what} is ${code}. It expires in ${OTP_TTL_MIN} minutes. Usimpe mtu yeyote namba hii.`);
  if (!sent.ok) return { ok: false as const, error: via === "email" ? "Could not send the email. Please try again." : "Could not send SMS. Please try again." };
  const consoleDriver = via === "email" ? (process.env.EMAIL_DRIVER || "console") === "console" : process.env.SMS_DRIVER === "console";
  return { ok: true as const, devCode: consoleDriver && process.env.NODE_ENV !== "production" ? code : undefined };
}

export async function verifyOtp(phone: string, code: string, purpose: OtpPurpose = "LOGIN"): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= MAX_ATTEMPTS) return false;

  const a = Buffer.from(otp.codeHash, "hex");
  const b = Buffer.from(hash(phone, code), "hex");
  const match = a.length === b.length && timingSafeEqual(a, b);
  await prisma.otpCode.update({
    where: { id: otp.id },
    data: match ? { consumedAt: new Date() } : { attempts: { increment: 1 } },
  });
  return match;
}

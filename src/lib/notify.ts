import "server-only";
import { prisma } from "./prisma";
import { sendSms } from "./sms";
import { sendEmail, type EmailMessage } from "./email";

/**
 * Send one notification by SMS (if the person has a phone) and email (if they have an email).
 * Never throws: a failed notification must not break the action that triggered it.
 */
export async function notify(
  to: { phone?: string | null; email?: string | null },
  msg: { sms?: string; email?: Omit<EmailMessage, "to"> },
) {
  const jobs: Array<Promise<unknown>> = [];
  if (to.phone && msg.sms) jobs.push(sendSms(to.phone, msg.sms));
  if (to.email && msg.email) jobs.push(sendEmail({ ...msg.email, to: to.email }));
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === "rejected") console.error("[notify]", r.reason);
    else if (r.value && typeof r.value === "object" && "ok" in r.value && !(r.value as { ok: boolean }).ok) console.error("[notify]", (r.value as { error?: string }).error);
  }
}

/** Same, looked up by user id (uses the user's phone and email). */
export async function notifyUser(userId: string, msg: Parameters<typeof notify>[1]) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true, status: true } });
  if (!u || u.status !== "ACTIVE") return;
  await notify(u, msg);
}

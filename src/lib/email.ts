import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { SITE } from "@/config/site";

/**
 * Email drivers (EMAIL_DRIVER):
 *  - console: prints the email in the server console (development default)
 *  - smtp:    any SMTP mailbox (cPanel / Google Workspace / Zoho …) — SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *  - resend:  Resend HTTP API — RESEND_API_KEY
 * EMAIL_FROM sets the sender, e.g. "MagariSOKO Tanzania <no-reply@magarisoko.co.tz>".
 */
export type EmailMessage = {
  to: string;
  subject: string;
  /** Short paragraphs; rendered as text and as branded HTML. */
  lines: string[];
  /** Optional call-to-action button. */
  action?: { label: string; url: string };
  replyTo?: string;
};

let smtp: Transporter | null = null;
function smtpTransport() {
  if (!smtp) {
    const port = Number(process.env.SMTP_PORT || 587);
    smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return smtp;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderEmail(m: EmailMessage) {
  const text = [...m.lines, ...(m.action ? [`${m.action.label}: ${m.action.url}`] : []), "", `— ${SITE.fullName}`, `${SITE.supportPhone} · ${SITE.supportEmail}`].join("\n\n");
  const logo = `${SITE.url.replace(/\/$/, "")}/brand/logo-tile-256.png`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f7;font-family:Arial,Helvetica,sans-serif;color:#0b1730">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b1730;padding:18px;text-align:center"><img src="${logo}" width="88" height="88" alt="${esc(SITE.fullName)}" style="border-radius:14px;background:#fff"></td></tr>
<tr><td style="padding:24px 24px 8px"><h1 style="margin:0 0 12px;font-size:20px">${esc(m.subject)}</h1>
${m.lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:22px">${esc(l)}</p>`).join("")}
${m.action ? `<p style="margin:20px 0"><a href="${esc(m.action.url)}" style="display:inline-block;background:#ffd43b;color:#0b1730;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:8px">${esc(m.action.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;color:#5b6478;border-top:1px solid #e5e7ee">${esc(SITE.fullName)} · ${esc(SITE.supportPhone)} · ${esc(SITE.supportEmail)}<br>© ${SITE.copyrightYear} ${esc(SITE.company)}</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

export async function sendEmail(m: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const driver = (process.env.EMAIL_DRIVER || "console").toLowerCase();
  const from = process.env.EMAIL_FROM || `${SITE.fullName} <no-reply@magarisoko.co.tz>`;
  const { text, html } = renderEmail(m);
  try {
    if (driver === "smtp") {
      await smtpTransport().sendMail({ from, to: m.to, subject: m.subject, text, html, replyTo: m.replyTo });
      return { ok: true };
    }
    if (driver === "resend") {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, text, html, reply_to: m.replyTo }),
      });
      if (!r.ok) return { ok: false, error: `Resend ${r.status}: ${await r.text()}` };
      return { ok: true };
    }
    console.info(`\n📧 [EMAIL → ${m.to}] ${m.subject}\n${text}\n`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

import "server-only";

/**
 * SMS drivers for OTP and alerts.
 *  - console:         logs to the server console (development)
 *  - beem:            Beem Africa (Tanzanian aggregator, all networks)
 *  - africastalking:  Africa's Talking
 */
export async function sendSms(toE164: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const driver = (process.env.SMS_DRIVER || "console").toLowerCase();
  const msisdn = toE164.replace(/^\+/, "");
  try {
    if (driver === "beem") {
      const auth = Buffer.from(`${process.env.BEEM_API_KEY}:${process.env.BEEM_SECRET_KEY}`).toString("base64");
      const res = await fetch("https://apisms.beem.africa/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          source_addr: process.env.BEEM_SENDER_ID || "INFO",
          encoding: 0,
          schedule_time: "",
          message,
          recipients: [{ recipient_id: 1, dest_addr: msisdn }],
        }),
      });
      if (!res.ok) return { ok: false, error: `Beem ${res.status}: ${await res.text()}` };
      return { ok: true };
    }
    if (driver === "africastalking") {
      const body = new URLSearchParams({ username: process.env.AT_USERNAME!, to: toE164, message });
      if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
      const host = process.env.AT_USERNAME === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
      const res = await fetch(`https://${host}/version1/messaging`, {
        method: "POST",
        headers: { apiKey: process.env.AT_API_KEY!, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) return { ok: false, error: `AfricasTalking ${res.status}: ${await res.text()}` };
      return { ok: true };
    }
    console.info(`\n📱 [SMS → ${toE164}] ${message}\n`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

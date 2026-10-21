import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { json, jsonError } from "@/lib/json";
import { SITE } from "@/config/site";
import { isBlocked } from "@/server/fraud/engine";
import { getDeviceContext, recordDevice } from "@/lib/device";

/** POST { name, email?, phone?, password, accountType } → creates an email/password account. */
export async function POST(req: Request) {
  if (!rateLimit(`reg:${await clientIpHash()}`, 5, 60 * 60_000)) return jsonError("Too many sign-ups from this network", 429);
  const parsed = registerSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid details", 422, parsed.error.flatten().fieldErrors);
  const { name, email, phone, password, accountType } = parsed.data;

  const device = await getDeviceContext();
  if ((phone && (await isBlocked("PHONE", phone))) || (email && (await isBlocked("EMAIL", email))) || (await isBlocked("DEVICE", device.deviceHash))) {
    return jsonError("We can't create an account with these details. Contact support if you think this is a mistake.", 403);
  }
  const clash = await prisma.user.findFirst({ where: { OR: [email ? { email } : {}, phone ? { phone } : {}].filter((o) => Object.keys(o).length) } });
  if (clash) return jsonError("An account with this email or phone already exists. Log in instead.", 409);

  // Everyone starts as a buyer. Seller roles are granted only after the
  // registration fee is paid and verified by an admin (see /dashboard/registration).
  const roles: Array<"BUYER"> = ["BUYER"];
  void accountType;
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash: await bcrypt.hash(password, 12), roles, termsAcceptedAt: new Date(), termsVersion: SITE.legalUpdated },
    select: { id: true, name: true, email: true, phone: true, roles: true },
  });
  await recordDevice(user.id, device);
  return json({ user }, { status: 201 });
}

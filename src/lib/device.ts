import "server-only";
import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { clientIpHash } from "./rate-limit";

/** Long-lived random browser id set by middleware (see src/middleware.ts). */
export const DEVICE_COOKIE = "gs_did";

export type DeviceContext = { deviceHash: string | null; ipHash: string | null; userAgent: string | null };

export function hashDeviceId(did: string | null | undefined): string | null {
  if (!did || did.length < 16) return null;
  return createHash("sha256").update(`dev:${did}:${process.env.NEXTAUTH_SECRET}`).digest("hex").slice(0, 32);
}

/** Device context for server components, route handlers and server actions. */
export async function getDeviceContext(): Promise<DeviceContext> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return {
    deviceHash: hashDeviceId(c.get(DEVICE_COOKIE)?.value),
    ipHash: await clientIpHash(),
    userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
  };
}

/** Parse the device cookie from a raw Cookie header (NextAuth authorize() only gives headers). */
export function deviceHashFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  const m = (cookieHeader ?? "").match(new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=([^;]+)`));
  return hashDeviceId(m ? decodeURIComponent(m[1]) : null);
}

/** Remembers which devices an account uses (links multi-accounting and banned devices). */
export async function recordDevice(userId: string, ctx: DeviceContext) {
  if (!ctx.deviceHash) return;
  await prisma.userDevice.upsert({
    where: { userId_deviceHash: { userId, deviceHash: ctx.deviceHash } },
    create: { userId, deviceHash: ctx.deviceHash, ipHash: ctx.ipHash, userAgent: ctx.userAgent },
    update: { lastSeen: new Date(), ipHash: ctx.ipHash ?? undefined, userAgent: ctx.userAgent ?? undefined },
  }).catch(() => undefined);
}

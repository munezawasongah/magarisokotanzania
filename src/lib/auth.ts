import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { verifyOtp } from "./otp";
import { normalizeTzPhone } from "./phone";
import type { Role } from "@/generated/prisma/enums";
import { SITE } from "@/config/site";
import { deviceHashFromCookieHeader } from "./device";
import { isBlocked } from "@/server/fraud/engine";

/** Records the login device; a banned device silently puts the account on fraud hold. */
async function trackLoginDevice(userId: string, headers: Record<string, unknown> | undefined) {
  const h = (headers ?? {}) as Record<string, string | undefined>;
  const deviceHash = deviceHashFromCookieHeader(h.cookie);
  if (!deviceHash) return;
  await prisma.userDevice.upsert({
    where: { userId_deviceHash: { userId, deviceHash } },
    create: { userId, deviceHash, userAgent: h["user-agent"]?.slice(0, 250) },
    update: { lastSeen: new Date() },
  }).catch(() => undefined);
  if (await isBlocked("DEVICE", deviceHash)) {
    await prisma.user.update({ where: { id: userId }, data: { isShadowBanned: true } });
    await prisma.fraudFlag.create({ data: { entity: "USER", entityId: userId, userId, signal: "BLOCKLIST_DEVICE", points: 100, detail: { label: "Signed in from a banned device" } } });
  }
}

/**
 * Two sign-in methods:
 *  1. "phone-otp"       — phone + 6-digit SMS code (creates the account on first login)
 *  2. "email-password"  — email or phone + password
 * Sessions are JWTs (no DB adapter needed). Roles are embedded in the token and
 * refreshed from the DB every 10 minutes so role changes take effect quickly.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone",
      credentials: { phone: { type: "text" }, code: { type: "text" }, name: { type: "text" } },
      async authorize(creds, req) {
        const phone = normalizeTzPhone(creds?.phone);
        const code = String(creds?.code ?? "");
        if (!phone || !/^\d{6}$/.test(code)) return null;
        if (await isBlocked("PHONE", phone)) return null;
        if (!(await verifyOtp(phone, code, "LOGIN"))) return null;

        const user = await prisma.user.upsert({
          where: { phone },
          // OTP sign-up screen states that continuing means accepting the Terms + Privacy Policy
          create: { phone, name: creds?.name?.trim() || "MagariSOKO user", phoneVerified: new Date(), lastLoginAt: new Date(), termsAcceptedAt: new Date(), termsVersion: SITE.legalUpdated },
          update: { phoneVerified: new Date(), lastLoginAt: new Date() },
        });
        if (user.status !== "ACTIVE") return null;
        await trackLoginDevice(user.id, req?.headers);
        return { id: user.id, name: user.name, email: user.email, phone: user.phone, roles: user.roles };
      },
    }),
    CredentialsProvider({
      id: "email-password",
      name: "Email",
      credentials: { identifier: { type: "text" }, password: { type: "password" } },
      async authorize(creds, req) {
        const id = String(creds?.identifier ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!id || !password) return null;
        const phone = normalizeTzPhone(id);
        const user = await prisma.user.findFirst({ where: phone ? { phone } : { email: id } });
        if (!user?.passwordHash || user.status !== "ACTIVE") return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await trackLoginDevice(user.id, req?.headers);
        return { id: user.id, name: user.name, email: user.email, phone: user.phone, roles: user.roles };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.roles = user.roles;
        token.phone = user.phone ?? null;
        token.rolesAt = Date.now();
      } else if (token.uid && (!token.rolesAt || Date.now() - token.rolesAt > 10 * 60 * 1000)) {
        const fresh = await prisma.user.findUnique({ where: { id: token.uid }, select: { roles: true, status: true, name: true } });
        if (!fresh || fresh.status !== "ACTIVE") return { ...token, uid: undefined, roles: [] };
        token.roles = fresh.roles;
        token.name = fresh.name;
        token.rolesAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user = { ...session.user, id: token.uid, roles: (token.roles ?? []) as Role[], phone: token.phone ?? null };
      }
      return session;
    },
  },
};

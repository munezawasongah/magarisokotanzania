import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import type { Role } from "@/generated/prisma/enums";

export type SessionUser = { id: string; name?: string | null; email?: string | null; phone?: string | null; roles: Role[] };

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? (session.user as SessionUser) : null;
}

export function hasRole(user: SessionUser | null, ...roles: Role[]) {
  return !!user && user.roles.some((r) => roles.includes(r));
}

export const isStaff = (u: SessionUser | null) => hasRole(u, "ADMIN", "MODERATOR");

/** For server components / actions: redirects to login when signed out. */
export async function requireUser(callbackUrl = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

export async function requireRole(roles: Role[], callbackUrl = "/dashboard") {
  const user = await requireUser(callbackUrl);
  if (!hasRole(user, ...roles)) redirect("/");
  return user;
}

/** For API routes: returns null instead of redirecting. */
export async function apiUser() {
  return getCurrentUser();
}

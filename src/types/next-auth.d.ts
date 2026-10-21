import type { Role } from "@/generated/prisma/enums";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    roles: Role[];
    phone?: string | null;
  }
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null; roles: Role[]; phone?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: Role[];
    phone?: string | null;
    rolesAt?: number;
  }
}

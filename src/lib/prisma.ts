import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * On Windows, "localhost" resolves to IPv6 (::1) first, and the fallback to IPv4 can
 * take seconds — long enough to break transactions. Connect to 127.0.0.1 directly.
 */
export function databaseUrl() {
  const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/garisoko";
  return url.replace("@localhost:", "@127.0.0.1:").replace("@localhost/", "@127.0.0.1/");
}

function createClient() {
  const adapter = new PrismaPg({
    connectionString: databaseUrl(),
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    connectionTimeoutMillis: 15_000, // wait for a free connection instead of failing fast
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({
    adapter,
    // Prisma's defaults (2 s to start, 5 s to finish) are too tight for a busy dev machine.
    transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

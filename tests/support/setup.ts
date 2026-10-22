import { vi } from "vitest";
import { testDatabaseUrl } from "./db-url";

// Everything talks to the throw-away test database, and nothing is really sent.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.SMS_DRIVER = "console";
process.env.EMAIL_DRIVER = "console";
process.env.NEXTAUTH_SECRET ||= "test-secret";
process.env.CRON_SECRET ||= "test-cron";
delete process.env.AZAMPAY_CLIENT_ID;
delete process.env.SELCOM_API_KEY;
delete process.env.DPO_COMPANY_TOKEN;

// Quiet the console drivers so test output stays readable.
vi.spyOn(console, "info").mockImplementation(() => undefined);

// Request-only Next.js helpers have no request in a test.
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn, revalidatePath: () => undefined, revalidateTag: () => undefined }));
vi.mock("@/lib/device", () => ({
  DEVICE_COOKIE: "gs_did",
  hashDeviceId: () => null,
  getDeviceContext: async () => ({ deviceHash: null, ipHash: "test-ip", userAgent: "vitest" }),
  recordDevice: async () => undefined,
  deviceHashFromCookieHeader: () => null,
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => true, clientIpHash: async () => "test-ip" }));

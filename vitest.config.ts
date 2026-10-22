import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 *   npm test                  → unit + integration (needs PostgreSQL running)
 *   npm run test:unit         → pure logic only (no database)
 *   npm run test:integration  → the money flow against a throw-away database "garisoko_test"
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: /^server-only$/, replacement: path.resolve(__dirname, "tests/support/empty.ts") },
      { find: /^@\//, replacement: path.resolve(__dirname, "src") + "/" },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/support/setup.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    pool: "forks",
  },
});

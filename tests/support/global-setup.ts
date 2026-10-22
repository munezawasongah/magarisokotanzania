import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { testDatabaseUrl } from "./db-url";

/**
 * Creates a fresh "garisoko_test" database and applies every migration in order,
 * exactly like `prisma migrate deploy` does on the real database.
 * Skipped when only unit tests are run (TEST_SCOPE=unit).
 */
export default async function setup() {
  // `npm run test:unit` (or TEST_SCOPE=unit) needs no database
  if (process.env.TEST_SCOPE === "unit" || (process.argv.some((a) => a.includes("tests/unit")) && !process.argv.some((a) => a.includes("tests/integration")))) return;
  const url = new URL(testDatabaseUrl());
  const dbName = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(dbName)) throw new Error(`Refusing to use "${dbName}" for tests — the name must end in _test`);
  const admin = new URL(url.toString());
  admin.pathname = "/postgres";
  const c = new pg.Client({ connectionString: admin.toString() });
  try {
    await c.connect();
  } catch (e) {
    throw new Error(`Integration tests need PostgreSQL running (${(e as Error).message}). Run "npm run test:unit" for the tests without a database.`);
  }
  await c.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await c.query(`CREATE DATABASE "${dbName}"`);
  await c.end();

  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  const dir = path.resolve(__dirname, "../../prisma/migrations");
  for (const m of fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort()) {
    await db.query(fs.readFileSync(path.join(dir, m, "migration.sql"), "utf8"));
  }
  await db.end();
}

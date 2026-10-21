/**
 * Safe wrapper around `prisma migrate dev` for this project.
 *
 * The full-text search objects (generated `search` tsvector columns and their
 * GIN / trigram indexes) live in raw SQL because Prisma cannot model them.
 * Plain `prisma migrate dev` would therefore generate statements that DROP
 * them. This script creates the migration with --create-only, strips those
 * statements, then applies it.
 *
 *   npm run db:migrate:dev -- --name add_something
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2).join(" ");
const dir = path.join("prisma", "migrations");
const before = new Set(readdirSync(dir));

execSync(`npx prisma migrate dev --create-only ${args}`, { stdio: "inherit" });

const created = readdirSync(dir).filter((d) => !before.has(d) && statSync(path.join(dir, d)).isDirectory());
const PROTECTED = /("Listing_search_idx"|"Listing_title_trgm_idx"|"SparePart_search_idx"|"SparePart_title_trgm_idx"|"search")/;

for (const d of created) {
  const file = path.join(dir, d, "migration.sql");
  const sql = readFileSync(file, "utf8");
  const kept = sql
    .split(/\n(?=-- )/)
    .filter((block) => !(PROTECTED.test(block) && /(DROP INDEX|DROP COLUMN|ALTER COLUMN "search"|ADD COLUMN\s+"search")/i.test(block)));
  const out = kept.join("\n").trim();
  if (!out || out.split("\n").every((l) => l.startsWith("--") || !l.trim())) {
    rmSync(path.join(dir, d), { recursive: true });
    console.log(`\n✔ ${d}: only search-index noise — migration removed, schema already in sync.`);
  } else {
    writeFileSync(file, out + "\n");
    console.log(`\n✔ ${d}: protected full-text-search objects kept.`);
  }
}

execSync("npx prisma migrate dev", { stdio: "inherit" });

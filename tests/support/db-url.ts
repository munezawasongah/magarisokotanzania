/** The integration tests use their own database so they never touch your real data. */
export function testDatabaseUrl() {
  const base = process.env.TEST_DATABASE_URL ?? (process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/garisoko").replace(/\/[^/?]+(\?|$)/, "/garisoko_test$1");
  return base.replace("@localhost:", "@127.0.0.1:").replace(/\?schema=public$/, "");
}

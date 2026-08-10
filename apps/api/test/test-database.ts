import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

/**
 * Integration tests truncate every table, so they must never point at the
 * development database. This derives a dedicated `<name>_test` database on the
 * same server (or takes TEST_DATABASE_URL verbatim), creates it if missing and
 * applies migrations — making `pnpm test:integration` safe by construction.
 */
export function resolveTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const base = process.env.DATABASE_URL ?? readUrlFromDotenv();
  if (!base) {
    throw new Error("Set DATABASE_URL (or TEST_DATABASE_URL) before running integration tests.");
  }

  const url = new URL(base);
  const name = url.pathname.replace(/^\//, "").split("?")[0];
  if (name.endsWith("_test")) return base;
  url.pathname = `/${name}_test`;
  return url.toString();
}

function readUrlFromDotenv(): string | undefined {
  // Vitest does not load the workspace .env; read the one the app itself uses.
  for (const candidate of [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")]) {
    if (!existsSync(candidate)) continue;
    const match = readFileSync(candidate, "utf8").match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  }
  return undefined;
}

/** vitest globalSetup: provision the test database and bring its schema up to date. */
export default async function globalSetup(): Promise<void> {
  const testUrl = resolveTestDatabaseUrl();
  const url = new URL(testUrl);
  const database = url.pathname.replace(/^\//, "").split("?")[0];

  const admin = new URL(testUrl);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`[test-db] created ${database}`);
    }
  } finally {
    await client.end();
  }

  execSync("pnpm exec prisma migrate deploy --schema ../../prisma/schema.prisma", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}

import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";
import { resolveTestDatabaseUrl } from "./test/test-database";

/**
 * Integration tests boot the real Nest app against a dedicated `<name>_test`
 * database — never the development one, because suites truncate every table.
 * The globalSetup creates that database and applies migrations on demand.
 * They run serially: they share one schema and truncate between suites.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.spec.ts"],
    root: "./",
    fileParallelism: false,
    // BullMQ workers hold native Redis connections that crash vitest's default
    // worker_threads pool; child processes shut them down cleanly.
    pool: "forks",
    globalSetup: ["./test/test-database.ts"],
    env: {
      DATABASE_URL: resolveTestDatabaseUrl(),
    },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});

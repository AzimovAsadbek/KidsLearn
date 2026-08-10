import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

/**
 * Integration tests boot the real Nest app against a dedicated database.
 * They run serially: they share one schema and truncate between suites.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.spec.ts"],
    root: "./",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});

import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    root: "./",
  },
  // Nest relies on decorator metadata, which esbuild does not emit.
  plugins: [swc.vite({ module: { type: "es6" } })],
});

/**
 * Smoke test config — runs only the *.smoke.test.ts files against a live
 * deployment. Default `npm test` excludes these; `npm run test:smoke`
 * triggers this config explicitly.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://erpaio.vercel.app npm run test:smoke
 */
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/smoke/**/*.smoke.test.ts"],
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    // Production cold start tolerance.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});

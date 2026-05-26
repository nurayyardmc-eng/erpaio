import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
    // *.smoke.test.ts: only run when SMOKE_BASE_URL set (production checks).
    // Default `npm test` skips them — CI build remains hermetic.
    exclude: ["src/**/*.smoke.test.ts", "**/node_modules/**", "**/.next/**"],
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});

import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/__tests__/**/*.test.ts",
      // Mobile pure-logic helper tests (must not import react-native / expo modules)
      "mobile/src/lib/retry.test.ts",
    ],
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});

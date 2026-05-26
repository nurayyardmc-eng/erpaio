import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Mobile (Expo/React Native) has its own toolchain & lint setup.
    "mobile/**",
    // Claude Code worktrees (gitignored, but local eslint sees them
    // through the working dir scan).
    ".claude/**",
    // k6 load-test scripts run in a separate runtime (xk6/Goja, not
    // Node.js) with its own conventions (anonymous default export is
    // the k6 idiom for the scenario function). They don't share our
    // app's lint rules.
    "load-test/**",
  ]),
]);

export default eslintConfig;

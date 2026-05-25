import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

// Exported for test (Track RRRR). Redaction paths are a security contract —
// CI must catch regressions where a sensitive field is renamed without
// updating this list.
export const REDACT_PATHS = [
  "*.password",
  "*.passwordEnc",
  "*.passwordHash",
  "*.CRON_SECRET",
  "*.TWILIO_AUTH_TOKEN",
  "headers.authorization",
  "headers.cookie",
];
export const REDACT_CENSOR = "[Filtered]";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: {
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  },
  redact: {
    paths: REDACT_PATHS,
    censor: REDACT_CENSOR,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: {
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  },
  redact: {
    paths: [
      "*.password",
      "*.passwordEnc",
      "*.passwordHash",
      "*.CRON_SECRET",
      "*.TWILIO_AUTH_TOKEN",
      "headers.authorization",
      "headers.cookie",
    ],
    censor: "[Filtered]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

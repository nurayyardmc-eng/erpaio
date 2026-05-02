import * as Sentry from "@sentry/nextjs";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-cron-secret",
  "x-auth-token",
]);

const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "passwordEnc",
  "CRON_SECRET",
  "TWILIO_AUTH_TOKEN",
  "NEXTAUTH_SECRET",
  "DATABASE_URL",
  "ANTHROPIC_API_KEY",
];

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend(event) {
    if (event.request?.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
          event.request.headers[key] = "[Filtered]";
        }
      }
    }
    if (event.contexts) {
      scrub(event.contexts);
    }
    if (event.extra) {
      scrub(event.extra);
    }
    return event;
  },
});

function scrub(obj: Record<string, unknown>) {
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      obj[key] = "[Filtered]";
    } else if (obj[key] && typeof obj[key] === "object") {
      scrub(obj[key] as Record<string, unknown>);
    }
  }
}

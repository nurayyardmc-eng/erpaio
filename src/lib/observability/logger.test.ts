import { describe, it, expect } from "vitest";
import pino from "pino";
import { REDACT_PATHS, REDACT_CENSOR } from "./logger";

// Build a pino instance with the SAME redaction config as the production
// logger, but with a capture stream so we can assert on the JSON output.
function makeCaptureLogger() {
  const lines: string[] = [];
  const stream = {
    write(chunk: string) {
      lines.push(chunk);
    },
  };
  const log = pino(
    {
      level: "trace",
      redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR },
      formatters: { level: (label) => ({ level: label }) },
    },
    stream,
  );
  return {
    log,
    parsed() {
      return lines.flatMap((l) =>
        l
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line) as Record<string, unknown>),
      );
    },
  };
}

describe("observability/logger REDACT_PATHS contract", () => {
  it("censor value is exactly '[Filtered]' (UI/grep stability)", () => {
    expect(REDACT_CENSOR).toBe("[Filtered]");
  });

  it("paths list contains all expected sensitive keys", () => {
    expect(REDACT_PATHS).toContain("*.password");
    expect(REDACT_PATHS).toContain("*.passwordEnc");
    expect(REDACT_PATHS).toContain("*.passwordHash");
    expect(REDACT_PATHS).toContain("*.CRON_SECRET");
    expect(REDACT_PATHS).toContain("*.TWILIO_AUTH_TOKEN");
    expect(REDACT_PATHS).toContain("headers.authorization");
    expect(REDACT_PATHS).toContain("headers.cookie");
  });

  it("no duplicate paths", () => {
    expect(new Set(REDACT_PATHS).size).toBe(REDACT_PATHS.length);
  });
});

describe("observability/logger redaction behavior", () => {
  it("nested *.password → [Filtered]", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info({ user: { password: "secret123" } }, "creating user");
    expect(parsed()[0].user).toMatchObject({ password: "[Filtered]" });
  });

  it("nested *.passwordEnc (encrypted credentials) → [Filtered]", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info({ conn: { passwordEnc: "AES-blob" } }, "loaded");
    expect(parsed()[0].conn).toMatchObject({ passwordEnc: "[Filtered]" });
  });

  it("nested *.passwordHash (bcrypt) → [Filtered]", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info({ user: { passwordHash: "$2b$12$abc" } }, "auth");
    expect(parsed()[0].user).toMatchObject({ passwordHash: "[Filtered]" });
  });

  it("nested *.CRON_SECRET → [Filtered]", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info({ env: { CRON_SECRET: "supersecret" } }, "boot");
    expect(parsed()[0].env).toMatchObject({ CRON_SECRET: "[Filtered]" });
  });

  it("nested *.TWILIO_AUTH_TOKEN → [Filtered]", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info({ creds: { TWILIO_AUTH_TOKEN: "tok_abc" } }, "twilio");
    expect(parsed()[0].creds).toMatchObject({ TWILIO_AUTH_TOKEN: "[Filtered]" });
  });

  it("headers.authorization → [Filtered], other headers intact", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info(
      { headers: { authorization: "Bearer abc", "content-type": "application/json" } },
      "req",
    );
    const headers = parsed()[0].headers as Record<string, unknown>;
    expect(headers.authorization).toBe("[Filtered]");
    expect(headers["content-type"]).toBe("application/json");
  });

  it("headers.cookie → [Filtered]", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info({ headers: { cookie: "session=abc" } }, "req");
    expect((parsed()[0].headers as Record<string, unknown>).cookie).toBe("[Filtered]");
  });

  it("non-sensitive fields pass through unchanged", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info({ tenantId: "t_123", count: 42 }, "ok");
    const entry = parsed()[0];
    expect(entry.tenantId).toBe("t_123");
    expect(entry.count).toBe(42);
  });

  it("level field uses string label (not numeric)", () => {
    const { log, parsed } = makeCaptureLogger();
    log.info({}, "test");
    expect(parsed()[0].level).toBe("info");
  });

  it("child logger inherits redaction", () => {
    const { log, parsed } = makeCaptureLogger();
    const child = log.child({ component: "x" });
    child.info({ user: { password: "p" } }, "msg");
    expect(parsed()[0].component).toBe("x");
    expect(parsed()[0].user).toMatchObject({ password: "[Filtered]" });
  });

  it("top-level password key (no parent) NOT redacted (wildcard requires depth)", () => {
    // Document current behavior: "*.password" matches *.password not top-level.
    // If we ever want top-level redaction, add bare "password" to paths.
    const { log, parsed } = makeCaptureLogger();
    log.info({ password: "leaks" }, "warning regression marker");
    expect(parsed()[0].password).toBe("leaks");
  });
});

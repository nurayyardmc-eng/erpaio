import { describe, it, expect } from "vitest";
import { DEFAULT_STALE_MS, cronSkipResponse } from "./lock";

describe("cron/lock constants", () => {
  it("DEFAULT_STALE_MS is 10 minutes", () => {
    expect(DEFAULT_STALE_MS).toBe(10 * 60_000);
  });

  it("DEFAULT_STALE_MS is greater than max cron maxDuration (300s)", () => {
    // Sanity: stale threshold > Vercel maxDuration so a normally-running job
    // isn't prematurely marked stale and overlapped.
    expect(DEFAULT_STALE_MS).toBeGreaterThan(300_000);
  });
});

describe("cron/cronSkipResponse", () => {
  it("returns 409 status (Conflict — duplicate run)", () => {
    const r = cronSkipResponse("existing-run-id");
    expect(r.status).toBe(409);
  });

  it("body shape: ok=true, skipped=true, reason='duplicate', existingRunId", async () => {
    const r = cronSkipResponse("existing-run-id");
    const body = (await r.json()) as Record<string, unknown>;
    expect(body).toEqual({
      ok: true,
      skipped: true,
      reason: "duplicate",
      existingRunId: "existing-run-id",
    });
  });

  it("propagates custom headers (e.g. x-request-id)", () => {
    const r = cronSkipResponse("rid", {
      headers: { "x-request-id": "req-123" },
    });
    expect(r.headers.get("x-request-id")).toBe("req-123");
  });

  it("no custom headers → no extra headers added (only standard)", () => {
    const r = cronSkipResponse("rid");
    expect(r.headers.get("x-request-id")).toBeNull();
  });

  it("existingRunId echoed verbatim (no transformation)", async () => {
    const r = cronSkipResponse("abc-XYZ_123");
    const body = (await r.json()) as { existingRunId: string };
    expect(body.existingRunId).toBe("abc-XYZ_123");
  });
});

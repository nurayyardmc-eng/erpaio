import { describe, it, expect } from "vitest";
import { DEFAULT_STALE_MS } from "./lock";

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

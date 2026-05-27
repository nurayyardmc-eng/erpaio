import { describe, it, expect } from "vitest";
import { deriveCronFinalStatus, CRON_STATUSES } from "./finalStatus";

describe("cron/CRON_STATUSES", () => {
  it("has exactly 4 status values (RUNNING + 3 finals)", () => {
    expect(CRON_STATUSES).toEqual([
      "RUNNING",
      "SUCCESS",
      "PARTIAL_FAILURE",
      "FAILED",
    ]);
  });

  it("includes RUNNING (in-progress, between acquire+finalize)", () => {
    expect(CRON_STATUSES).toContain("RUNNING");
  });

  it("includes 3 final states", () => {
    expect(CRON_STATUSES).toContain("SUCCESS");
    expect(CRON_STATUSES).toContain("PARTIAL_FAILURE");
    expect(CRON_STATUSES).toContain("FAILED");
  });

  it("no duplicates", () => {
    const unique = new Set(CRON_STATUSES);
    expect(unique.size).toBe(CRON_STATUSES.length);
  });
});

describe("cron/deriveCronFinalStatus", () => {
  it("failed=0 → SUCCESS regardless of successCount", () => {
    expect(deriveCronFinalStatus(0, 0)).toBe("SUCCESS");
    expect(deriveCronFinalStatus(0, 5)).toBe("SUCCESS");
    expect(deriveCronFinalStatus(0, 100)).toBe("SUCCESS");
  });

  it("failed>0 + successCount>0 → PARTIAL_FAILURE", () => {
    expect(deriveCronFinalStatus(1, 1)).toBe("PARTIAL_FAILURE");
    expect(deriveCronFinalStatus(5, 5)).toBe("PARTIAL_FAILURE");
    expect(deriveCronFinalStatus(99, 1)).toBe("PARTIAL_FAILURE");
  });

  it("failed>0 + successCount=0 → FAILED", () => {
    expect(deriveCronFinalStatus(1, 0)).toBe("FAILED");
    expect(deriveCronFinalStatus(10, 0)).toBe("FAILED");
  });

  it("only failed=1 + success=0 → FAILED (single-attempt total failure)", () => {
    expect(deriveCronFinalStatus(1, 0)).toBe("FAILED");
  });

  it("watchlist semantic: all 100 succeeded → SUCCESS", () => {
    // failedCount=0, successCount=100
    expect(deriveCronFinalStatus(0, 100)).toBe("SUCCESS");
  });

  it("watchlist semantic: 99 succeeded + 1 failed → PARTIAL_FAILURE", () => {
    expect(deriveCronFinalStatus(1, 99)).toBe("PARTIAL_FAILURE");
  });

  it("watchlist semantic: all 100 failed → FAILED", () => {
    expect(deriveCronFinalStatus(100, 0)).toBe("FAILED");
  });

  it("trial-warnings semantic: errors=0,sent=5 → SUCCESS", () => {
    expect(deriveCronFinalStatus(0, 5)).toBe("SUCCESS");
  });

  it("trial-warnings semantic: errors=3,sent=0 → FAILED", () => {
    expect(deriveCronFinalStatus(3, 0)).toBe("FAILED");
  });

  it("return type is one of CronFinalStatus literals", () => {
    const r = deriveCronFinalStatus(1, 1);
    expect(["SUCCESS", "PARTIAL_FAILURE", "FAILED"]).toContain(r);
  });
});

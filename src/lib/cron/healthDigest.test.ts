import { describe, expect, it } from "vitest";
import {
  formatCronHealthDigestHtml,
  summarizeFailedRuns,
  type RecentFailedRun,
} from "./healthDigest";

const run = (overrides: Partial<RecentFailedRun> = {}): RecentFailedRun => ({
  id: "r1",
  jobName: "watchlists",
  startedAt: new Date("2026-05-17T10:00:00Z"),
  status: "FAILED",
  errorMessage: null,
  tenantsFail: 0,
  tenantsTotal: 1,
  ...overrides,
});

describe("cron/healthDigest", () => {
  describe("summarizeFailedRuns", () => {
    it("empty input → empty array", () => {
      expect(summarizeFailedRuns([])).toEqual([]);
    });

    it("single run → single summary", () => {
      const result = summarizeFailedRuns([run()]);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        jobName: "watchlists",
        count: 1,
        latestStatus: "FAILED",
      });
    });

    it("groups multiple runs by jobName + counts", () => {
      const result = summarizeFailedRuns([
        run({ id: "r1", jobName: "watchlists" }),
        run({ id: "r2", jobName: "watchlists" }),
        run({ id: "r3", jobName: "anomaly" }),
      ]);
      expect(result).toHaveLength(2);
      const watch = result.find((s) => s.jobName === "watchlists");
      expect(watch?.count).toBe(2);
      const anomaly = result.find((s) => s.jobName === "anomaly");
      expect(anomaly?.count).toBe(1);
    });

    it("latest run wins for error message (most recent startedAt)", () => {
      const result = summarizeFailedRuns([
        run({
          id: "old",
          jobName: "watchlists",
          startedAt: new Date("2026-05-17T08:00:00Z"),
          errorMessage: "old error",
        }),
        run({
          id: "new",
          jobName: "watchlists",
          startedAt: new Date("2026-05-17T10:00:00Z"),
          errorMessage: "new error",
        }),
      ]);
      expect(result[0].latestRunId).toBe("new");
      expect(result[0].latestErrorMessage).toBe("new error");
      expect(result[0].count).toBe(2);
    });

    it("sums tenantsFail across runs", () => {
      const result = summarizeFailedRuns([
        run({ jobName: "anomaly", tenantsFail: 3 }),
        run({ jobName: "anomaly", tenantsFail: 7 }),
      ]);
      expect(result[0].totalTenantsFailed).toBe(10);
    });

    it("orders by count desc, then jobName asc", () => {
      const result = summarizeFailedRuns([
        run({ jobName: "anomaly" }),
        run({ jobName: "watchlists" }),
        run({ jobName: "anomaly" }),
        run({ jobName: "anomaly" }),
        run({ jobName: "cleanup" }),
      ]);
      expect(result.map((s) => s.jobName)).toEqual([
        "anomaly", // count 3
        "cleanup", // count 1, alphabetical
        "watchlists", // count 1
      ]);
    });

    it("preserves PARTIAL_FAILURE status", () => {
      const result = summarizeFailedRuns([run({ status: "PARTIAL_FAILURE" })]);
      expect(result[0].latestStatus).toBe("PARTIAL_FAILURE");
    });
  });

  describe("formatCronHealthDigestHtml", () => {
    it("empty input → empty string (no email body)", () => {
      expect(formatCronHealthDigestHtml([])).toBe("");
    });

    it("includes total failure count in header", () => {
      const html = formatCronHealthDigestHtml([
        {
          jobName: "watchlists",
          count: 3,
          latestRunId: "r1",
          latestStartedAt: new Date("2026-05-17T10:00:00Z"),
          latestErrorMessage: "DB connection lost",
          latestStatus: "FAILED",
          totalTenantsFailed: 5,
        },
      ]);
      expect(html).toContain("3 cron failures in the last 24 hours");
      expect(html).toContain("watchlists");
    });

    it("escapes HTML in error message to prevent injection", () => {
      const html = formatCronHealthDigestHtml([
        {
          jobName: "anomaly",
          count: 1,
          latestRunId: "r1",
          latestStartedAt: new Date("2026-05-17T10:00:00Z"),
          latestErrorMessage: "<script>alert(1)</script>",
          latestStatus: "FAILED",
          totalTenantsFailed: 0,
        },
      ]);
      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("truncates long error messages to 200 chars", () => {
      const longError = "x".repeat(500);
      const html = formatCronHealthDigestHtml([
        {
          jobName: "anomaly",
          count: 1,
          latestRunId: "r1",
          latestStartedAt: new Date("2026-05-17T10:00:00Z"),
          latestErrorMessage: longError,
          latestStatus: "FAILED",
          totalTenantsFailed: 0,
        },
      ]);
      // 200 x's appear, not 500
      expect(html).toContain("x".repeat(200));
      expect(html).not.toContain("x".repeat(201));
    });

    it("renders FAILED vs PARTIAL_FAILURE badges differently", () => {
      const failed = formatCronHealthDigestHtml([
        {
          jobName: "anomaly",
          count: 1,
          latestRunId: "r1",
          latestStartedAt: new Date(),
          latestErrorMessage: null,
          latestStatus: "FAILED",
          totalTenantsFailed: 0,
        },
      ]);
      const partial = formatCronHealthDigestHtml([
        {
          jobName: "anomaly",
          count: 1,
          latestRunId: "r1",
          latestStartedAt: new Date(),
          latestErrorMessage: null,
          latestStatus: "PARTIAL_FAILURE",
          totalTenantsFailed: 0,
        },
      ]);
      expect(failed).toContain(">FAILED<");
      expect(partial).toContain(">PARTIAL<");
    });

    it("handles missing error message gracefully", () => {
      const html = formatCronHealthDigestHtml([
        {
          jobName: "anomaly",
          count: 1,
          latestRunId: "r1",
          latestStartedAt: new Date(),
          latestErrorMessage: null,
          latestStatus: "FAILED",
          totalTenantsFailed: 0,
        },
      ]);
      expect(html).toContain("no error message");
    });

    it("includes admin dashboard link", () => {
      const html = formatCronHealthDigestHtml([
        {
          jobName: "anomaly",
          count: 1,
          latestRunId: "r1",
          latestStartedAt: new Date(),
          latestErrorMessage: null,
          latestStatus: "FAILED",
          totalTenantsFailed: 0,
        },
      ]);
      expect(html).toContain("admin/cron-runs");
    });

    it("totals across multiple jobs in header", () => {
      const html = formatCronHealthDigestHtml([
        {
          jobName: "anomaly",
          count: 5,
          latestRunId: "r1",
          latestStartedAt: new Date(),
          latestErrorMessage: null,
          latestStatus: "FAILED",
          totalTenantsFailed: 0,
        },
        {
          jobName: "watchlists",
          count: 3,
          latestRunId: "r2",
          latestStartedAt: new Date(),
          latestErrorMessage: null,
          latestStatus: "PARTIAL_FAILURE",
          totalTenantsFailed: 0,
        },
      ]);
      // Total 8 = 5+3
      expect(html).toContain("8 cron failures in the last 24 hours");
    });
  });
});

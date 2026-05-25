import { describe, it, expect } from "vitest";
import {
  aggregateCronHealth,
  CRON_HEALTH_MAX_FAILURE_RATE,
  type CronRunRow,
} from "./aggregateHealth";

function run(jobName: string, status: string, startedAt: Date): CronRunRow {
  return { jobName, status, startedAt };
}

const T0 = new Date("2026-05-26T12:00:00Z");
const T1 = new Date("2026-05-26T13:00:00Z");
const T2 = new Date("2026-05-26T14:00:00Z");

describe("cron/aggregateHealth/aggregateCronHealth", () => {
  describe("ok flag (threshold = 50% failure rate)", () => {
    it("empty runs → ok=false, jobs={}", () => {
      expect(aggregateCronHealth([])).toEqual({ ok: false, jobs: {} });
    });

    it("all success → ok=true", () => {
      const r = aggregateCronHealth([run("cleanup", "SUCCESS", T0)]);
      expect(r.ok).toBe(true);
    });

    it("1 fail out of 4 (25%) → ok=true (below 50%)", () => {
      const runs: CronRunRow[] = [
        run("a", "SUCCESS", T2),
        run("a", "SUCCESS", T1),
        run("a", "FAILED", T1),
        run("a", "SUCCESS", T0),
      ];
      expect(aggregateCronHealth(runs).ok).toBe(true);
    });

    it("2 fail out of 4 (50%) → ok=false (NOT strict less-than)", () => {
      const runs: CronRunRow[] = [
        run("a", "SUCCESS", T2),
        run("a", "FAILED", T1),
        run("a", "SUCCESS", T1),
        run("a", "FAILED", T0),
      ];
      expect(aggregateCronHealth(runs).ok).toBe(false);
    });

    it("3 fail out of 4 (75%) → ok=false", () => {
      const runs: CronRunRow[] = [
        run("a", "FAILED", T2),
        run("a", "FAILED", T1),
        run("a", "SUCCESS", T1),
        run("a", "FAILED", T0),
      ];
      expect(aggregateCronHealth(runs).ok).toBe(false);
    });

    it("all FAILED → ok=false", () => {
      expect(
        aggregateCronHealth([run("a", "FAILED", T0)]).ok,
      ).toBe(false);
    });
  });

  describe("per-job aggregation", () => {
    it("separates jobs by name", () => {
      const r = aggregateCronHealth([
        run("anomaly", "SUCCESS", T2),
        run("cleanup", "SUCCESS", T1),
      ]);
      expect(Object.keys(r.jobs).sort()).toEqual(["anomaly", "cleanup"]);
      expect(r.jobs.anomaly.runs).toBe(1);
      expect(r.jobs.cleanup.runs).toBe(1);
    });

    it("counts runs and failed per job", () => {
      const r = aggregateCronHealth([
        run("anomaly", "SUCCESS", T2),
        run("anomaly", "SUCCESS", T1),
        run("anomaly", "FAILED", T0),
        run("cleanup", "SUCCESS", T2),
      ]);
      expect(r.jobs.anomaly).toEqual({
        runs: 3,
        failed: 1,
        lastRunAt: T2.toISOString(),
      });
      expect(r.jobs.cleanup.failed).toBe(0);
    });

    it("lastRunAt uses first sighting (newest-first input convention)", () => {
      const r = aggregateCronHealth([
        run("anomaly", "SUCCESS", T2), // newest
        run("anomaly", "FAILED", T1),
        run("anomaly", "SUCCESS", T0),
      ]);
      expect(r.jobs.anomaly.lastRunAt).toBe(T2.toISOString());
    });

    it("PARTIAL_FAILURE NOT counted as failed (only FAILED matches)", () => {
      const r = aggregateCronHealth([
        run("anomaly", "PARTIAL_FAILURE", T1),
        run("anomaly", "SUCCESS", T0),
      ]);
      expect(r.jobs.anomaly.failed).toBe(0);
      expect(r.jobs.anomaly.runs).toBe(2);
    });

    it("unknown status NOT counted as failed", () => {
      const r = aggregateCronHealth([
        run("anomaly", "RUNNING", T0),
        run("anomaly", "STARTED", T0),
      ]);
      expect(r.jobs.anomaly.failed).toBe(0);
    });
  });

  describe("cross-job ok computation", () => {
    it("ok considers total across all jobs (not per-job)", () => {
      // anomaly all-fail, cleanup all-pass — combined 50% → ok=false
      const r = aggregateCronHealth([
        run("anomaly", "FAILED", T2),
        run("cleanup", "SUCCESS", T2),
      ]);
      expect(r.ok).toBe(false); // 1/2 = 50%, not strictly < 0.5
    });

    it("3 jobs, 1 failing job mostly succeeding → ok=true", () => {
      const r = aggregateCronHealth([
        run("a", "SUCCESS", T0),
        run("a", "SUCCESS", T0),
        run("b", "SUCCESS", T0),
        run("c", "FAILED", T0),
      ]);
      expect(r.ok).toBe(true); // 1/4 = 25%
    });
  });

  describe("constants", () => {
    it("CRON_HEALTH_MAX_FAILURE_RATE = 0.5 (regression marker)", () => {
      expect(CRON_HEALTH_MAX_FAILURE_RATE).toBe(0.5);
    });
  });
});

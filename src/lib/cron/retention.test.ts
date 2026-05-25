import { describe, it, expect } from "vitest";
import { RETENTION, ONE_DAY_MS, retentionCutoff } from "./retention";

describe("cron/retention RETENTION policy table", () => {
  it("ONE_DAY_MS is exactly 86_400_000 ms", () => {
    expect(ONE_DAY_MS).toBe(24 * 60 * 60 * 1000);
    expect(ONE_DAY_MS).toBe(86_400_000);
  });

  describe("invariants: every value positive integer", () => {
    for (const [key, val] of Object.entries(RETENTION)) {
      it(`${key} is a positive integer`, () => {
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThan(0);
      });
    }
  });

  describe("policy commitments (regression markers)", () => {
    it("Stripe webhook idempotency ≥ 30 days (covers Stripe 72h retry window with margin)", () => {
      expect(RETENTION.processedWebhookDays).toBeGreaterThanOrEqual(30);
    });

    it("Resolved alerts ≥ 180 days (KVKK incident-history requirement)", () => {
      expect(RETENTION.resolvedAlertDays).toBeGreaterThanOrEqual(180);
    });

    it("Notification log ≥ 180 days (delivery audit window matches alert)", () => {
      expect(RETENTION.notificationLogDays).toBeGreaterThanOrEqual(180);
    });

    it("Password reset token expired ≤ 30 days (avoid keeping forever)", () => {
      expect(RETENTION.passwordResetTokenExpiredDays).toBeLessThanOrEqual(30);
    });

    it("Email verification token expired ≤ 90 days", () => {
      expect(RETENTION.emailVerificationTokenExpiredDays).toBeLessThanOrEqual(90);
    });

    it("Cron run history ≥ 30 days (need at least a month for health dashboard)", () => {
      expect(RETENTION.cronRunDays).toBeGreaterThanOrEqual(30);
    });

    it("Anomaly baseline history ≥ 30 days (engine reads last 30 by default)", () => {
      expect(RETENTION.anomalyBaselineDays).toBeGreaterThanOrEqual(30);
    });
  });

  describe("structural invariants", () => {
    it("table has 9 retention keys (no accidental drop / dup)", () => {
      expect(Object.keys(RETENTION)).toHaveLength(9);
    });

    it("all keys end with 'Days' suffix (unit signal)", () => {
      for (const key of Object.keys(RETENTION)) {
        expect(key.endsWith("Days")).toBe(true);
      }
    });

    it("no two keys collide (Set size === Object.keys length)", () => {
      const keys = Object.keys(RETENTION);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});

describe("cron/retention/retentionCutoff", () => {
  it("returns Date `days` days before `now`", () => {
    const now = new Date("2026-05-19T12:00:00Z").getTime();
    const cut = retentionCutoff(7, now);
    expect(cut.toISOString()).toBe("2026-05-12T12:00:00.000Z");
  });

  it("days=0 → same instant as now", () => {
    const now = Date.now();
    const cut = retentionCutoff(0, now);
    expect(cut.getTime()).toBe(now);
  });

  it("days=1 → exactly 86_400_000 ms before now", () => {
    const now = Date.now();
    const cut = retentionCutoff(1, now);
    expect(now - cut.getTime()).toBe(ONE_DAY_MS);
  });

  it("days=90 (anomaly baseline) → 90 days before now", () => {
    const now = Date.now();
    const cut = retentionCutoff(90, now);
    expect(now - cut.getTime()).toBe(90 * ONE_DAY_MS);
  });

  it("default `now` argument uses Date.now() (recent timestamp)", () => {
    const before = Date.now();
    const cut = retentionCutoff(0);
    const after = Date.now();
    expect(cut.getTime()).toBeGreaterThanOrEqual(before);
    expect(cut.getTime()).toBeLessThanOrEqual(after);
  });

  it("returns a Date object (not a number)", () => {
    expect(retentionCutoff(30)).toBeInstanceOf(Date);
  });

  it("fractional days supported (e.g. 0.5 → 12 hours ago)", () => {
    const now = Date.now();
    const cut = retentionCutoff(0.5, now);
    expect(now - cut.getTime()).toBe(0.5 * ONE_DAY_MS);
  });

  it("integration: RETENTION values produce valid past cutoff dates", () => {
    const now = Date.now();
    for (const days of Object.values(RETENTION)) {
      const cut = retentionCutoff(days, now);
      expect(cut.getTime()).toBeLessThan(now);
    }
  });
});

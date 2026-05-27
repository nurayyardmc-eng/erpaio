import { describe, it, expect } from "vitest";
import {
  ALERT_STATUSES,
  ALERT_STATUS_FILTERS,
  ALERT_BULK_UPDATE_STATUSES,
} from "./status";

describe("alerts/status constants", () => {
  it("ALERT_STATUSES has exactly 3 lifecycle stages", () => {
    expect(ALERT_STATUSES).toEqual(["open", "acked", "resolved"]);
  });

  it("ALERT_STATUS_FILTERS is ALERT_STATUSES + 'all' (superset)", () => {
    expect(ALERT_STATUS_FILTERS).toEqual(["open", "acked", "resolved", "all"]);
    for (const s of ALERT_STATUSES) {
      expect(ALERT_STATUS_FILTERS).toContain(s);
    }
    expect(ALERT_STATUS_FILTERS).toContain("all");
  });

  it("ALERT_BULK_UPDATE_STATUSES excludes 'open' (no bulk re-open)", () => {
    expect(ALERT_BULK_UPDATE_STATUSES).toEqual(["acked", "resolved"]);
    expect(ALERT_BULK_UPDATE_STATUSES).not.toContain("open");
  });

  it("ALERT_BULK_UPDATE_STATUSES is subset of ALERT_STATUSES", () => {
    for (const s of ALERT_BULK_UPDATE_STATUSES) {
      expect(ALERT_STATUSES).toContain(s);
    }
  });

  it("'all' is ONLY in filter, not in DB statuses or bulk targets", () => {
    expect(ALERT_STATUSES).not.toContain("all" as never);
    expect(ALERT_BULK_UPDATE_STATUSES).not.toContain("all" as never);
  });
});

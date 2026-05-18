import { describe, it, expect } from "vitest";
import { customMetricToQuery, type CustomMetricRow } from "./customMetrics";

const base: CustomMetricRow = {
  key: "my_kpi",
  label: "My KPI",
  description: "Important metric",
  schedule: "hourly",
  algorithm: "zscore",
  direction: "both",
  configJson: null,
  sql: "SELECT 1 AS metric_value",
  connectionId: "conn123",
};

describe("anomaly/customMetrics", () => {
  it("maps all fields one-to-one", () => {
    const q = customMetricToQuery(base);
    expect(q.key).toBe("my_kpi");
    expect(q.label).toBe("My KPI");
    expect(q.description).toBe("Important metric");
    expect(q.schedule).toBe("hourly");
    expect(q.algorithm).toBe("zscore");
    expect(q.direction).toBe("both");
    expect(q.sql).toBe("SELECT 1 AS metric_value");
    expect(q.connectionId).toBe("conn123");
  });

  it("falls back description → label when null", () => {
    const q = customMetricToQuery({ ...base, description: null });
    expect(q.description).toBe("My KPI");
  });

  it("configJson null → config undefined", () => {
    const q = customMetricToQuery({ ...base, configJson: null });
    expect(q.config).toBeUndefined();
  });

  it("configJson object → config object preserved", () => {
    const cfg = { rules: [{ condition: "gte", value: 10 }] };
    const q = customMetricToQuery({ ...base, configJson: cfg });
    expect(q.config).toEqual(cfg);
  });

  it("configJson array → config undefined (defensive — schema expects object)", () => {
    const q = customMetricToQuery({ ...base, configJson: [1, 2, 3] });
    expect(q.config).toBeUndefined();
  });

  it("configJson primitive → config undefined", () => {
    const q = customMetricToQuery({ ...base, configJson: "not-an-object" });
    expect(q.config).toBeUndefined();
  });

  it("connectionId always propagates (custom metrics MUST have one — FK constraint)", () => {
    const q = customMetricToQuery({ ...base, connectionId: "abc" });
    expect(q.connectionId).toBe("abc");
  });
});

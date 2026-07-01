import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression guard for the transport bug: the anomaly engine must resolve the
// ERP via queryERP (dialect-aware: mssql + postgres + on-prem agent), NOT
// getPool (which throws for anything that is not mssql). The old getPool path
// silently killed all anomaly + custom-metric detection for Postgres/agent
// tenants — and was invisible because no test exercised executeMetricQuery.
const { queryERPMock } = vi.hoisted(() => ({ queryERPMock: vi.fn() }));
vi.mock("@/lib/db/connector", () => ({ queryERP: queryERPMock }));

import { executeMetricQuery } from "./engine";
import type { MetricQuery } from "./queries";

const q: MetricQuery = {
  key: "overdue",
  label: "Vadesi geçen",
  description: "...",
  schedule: "hourly",
  algorithm: "zscore",
  sql: "SELECT COUNT(*) AS metric_value FROM invoices WHERE overdue",
};

describe("anomaly/engine/executeMetricQuery", () => {
  beforeEach(() => queryERPMock.mockReset());

  it("routes through queryERP (not getPool) — works for postgres/agent, not just mssql", async () => {
    queryERPMock.mockResolvedValueOnce([{ metric_value: 42 }]);
    const v = await executeMetricQuery("conn1", q);
    expect(v).toBe(42);
    expect(queryERPMock).toHaveBeenCalledWith("conn1", q.sql);
  });

  it("handles pg string-serialized aggregates (COUNT/SUM arrive as strings)", async () => {
    queryERPMock.mockResolvedValueOnce([{ metric_value: "800" }]);
    expect(await executeMetricQuery("c", q)).toBe(800);
  });

  it("throws when the query returns no rows", async () => {
    queryERPMock.mockResolvedValueOnce([]);
    await expect(executeMetricQuery("c", q)).rejects.toThrow(/no rows or null/);
  });

  it("throws when metric_value is non-numeric", async () => {
    queryERPMock.mockResolvedValueOnce([{ metric_value: "not-a-number" }]);
    await expect(executeMetricQuery("c", q)).rejects.toThrow(/non-numeric/);
  });
});

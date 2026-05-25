import { describe, it, expect } from "vitest";
import { exportFilename, exportFilenameTimestamp } from "./exportFilename";

const FIXED_NOW = new Date("2026-05-26T12:34:56.789Z");

describe("format/exportFilename/exportFilenameTimestamp", () => {
  it("ISO YYYY-MM-DD slice (UTC)", () => {
    expect(exportFilenameTimestamp(FIXED_NOW)).toBe("2026-05-26");
  });

  it("year boundary (Jan 1)", () => {
    expect(exportFilenameTimestamp(new Date("2026-01-01T00:00:00Z"))).toBe(
      "2026-01-01",
    );
  });

  it("year-end (Dec 31)", () => {
    expect(exportFilenameTimestamp(new Date("2026-12-31T23:59:59Z"))).toBe(
      "2026-12-31",
    );
  });

  it("default now arg uses current Date (length = 10)", () => {
    const r = exportFilenameTimestamp();
    expect(r.length).toBe(10);
    expect(r).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("UTC even at TR midnight (matches cron audit dates)", () => {
    // 2026-05-26T03:00:00+03:00 = 2026-05-26T00:00:00Z → "2026-05-26"
    expect(
      exportFilenameTimestamp(new Date("2026-05-26T03:00:00+03:00")),
    ).toBe("2026-05-26");
  });
});

describe("format/exportFilename/exportFilename", () => {
  it("composes erpaio-<slug>-<ts>.<ext>", () => {
    expect(exportFilename("saved-queries", "csv", FIXED_NOW)).toBe(
      "erpaio-saved-queries-2026-05-26.csv",
    );
  });

  it("xlsx extension", () => {
    expect(exportFilename("audit-log", "xlsx", FIXED_NOW)).toBe(
      "erpaio-audit-log-2026-05-26.xlsx",
    );
  });

  it("json extension", () => {
    expect(exportFilename("tenant-export", "json", FIXED_NOW)).toBe(
      "erpaio-tenant-export-2026-05-26.json",
    );
  });

  it("empty slug still composes (defensive)", () => {
    expect(exportFilename("", "csv", FIXED_NOW)).toBe(
      "erpaio--2026-05-26.csv",
    );
  });

  it("slug with hyphens preserved", () => {
    expect(exportFilename("health-scores-by-tenant", "csv", FIXED_NOW)).toBe(
      "erpaio-health-scores-by-tenant-2026-05-26.csv",
    );
  });

  it("default now arg present in output (length consistent)", () => {
    const r = exportFilename("test", "csv");
    expect(r.startsWith("erpaio-test-")).toBe(true);
    expect(r.endsWith(".csv")).toBe(true);
    expect(r.length).toBe("erpaio-test-".length + 10 + ".csv".length);
  });

  it("uppercase extension preserved verbatim (caller responsibility)", () => {
    expect(exportFilename("x", "CSV", FIXED_NOW)).toBe(
      "erpaio-x-2026-05-26.CSV",
    );
  });
});

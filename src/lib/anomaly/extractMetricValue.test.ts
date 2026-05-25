import { describe, it, expect } from "vitest";
import {
  extractMetricValue,
  DEFAULT_METRIC_ALIASES,
  PREVIEW_METRIC_ALIASES,
} from "./extractMetricValue";

describe("anomaly/extractMetricValue (default aliases)", () => {
  it("metric_value present → returns value", () => {
    expect(extractMetricValue({ metric_value: 42 })).toEqual({ ok: true, value: 42 });
  });

  it("metric_value as string number → coerced", () => {
    expect(extractMetricValue({ metric_value: "123.5" })).toEqual({ ok: true, value: 123.5 });
  });

  it("metric_value 0 → ok (not falsy-eliminated)", () => {
    expect(extractMetricValue({ metric_value: 0 })).toEqual({ ok: true, value: 0 });
  });

  it("metric_value negative → ok", () => {
    expect(extractMetricValue({ metric_value: -7 })).toEqual({ ok: true, value: -7 });
  });

  it("missing alias → reason 'missing'", () => {
    expect(extractMetricValue({ value: 5 })).toEqual({ ok: false, reason: "missing" });
    // Default aliases don't include "value".
  });

  it("metric_value null → reason 'missing'", () => {
    expect(extractMetricValue({ metric_value: null })).toEqual({ ok: false, reason: "missing" });
  });

  it("metric_value undefined → reason 'missing'", () => {
    expect(extractMetricValue({ metric_value: undefined })).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("metric_value non-numeric string → reason 'non_numeric'", () => {
    expect(extractMetricValue({ metric_value: "abc" })).toEqual({
      ok: false,
      reason: "non_numeric",
    });
  });

  it("row null → 'missing'", () => {
    expect(extractMetricValue(null)).toEqual({ ok: false, reason: "missing" });
  });

  it("row undefined → 'missing'", () => {
    expect(extractMetricValue(undefined)).toEqual({ ok: false, reason: "missing" });
  });

  it("empty row → 'missing'", () => {
    expect(extractMetricValue({})).toEqual({ ok: false, reason: "missing" });
  });
});

describe("anomaly/extractMetricValue (preview aliases)", () => {
  it("metric_value preferred over value/val", () => {
    expect(
      extractMetricValue(
        { metric_value: 1, value: 2, val: 3 },
        PREVIEW_METRIC_ALIASES,
      ),
    ).toEqual({ ok: true, value: 1 });
  });

  it("metric_value missing → falls back to 'value'", () => {
    expect(
      extractMetricValue({ value: 50, val: 99 }, PREVIEW_METRIC_ALIASES),
    ).toEqual({ ok: true, value: 50 });
  });

  it("value also missing → falls back to 'val'", () => {
    expect(extractMetricValue({ val: 77 }, PREVIEW_METRIC_ALIASES)).toEqual({
      ok: true,
      value: 77,
    });
  });

  it("null in earlier alias skipped, finds later non-null", () => {
    expect(
      extractMetricValue(
        { metric_value: null, value: null, val: 10 },
        PREVIEW_METRIC_ALIASES,
      ),
    ).toEqual({ ok: true, value: 10 });
  });

  it("all 3 aliases missing → 'missing'", () => {
    expect(
      extractMetricValue({ other: 100 }, PREVIEW_METRIC_ALIASES),
    ).toEqual({ ok: false, reason: "missing" });
  });

  it("non-numeric in matched alias → 'non_numeric'", () => {
    expect(
      extractMetricValue({ val: "not-a-number" }, PREVIEW_METRIC_ALIASES),
    ).toEqual({ ok: false, reason: "non_numeric" });
  });
});

describe("anomaly/extractMetricValue constants", () => {
  it("DEFAULT_METRIC_ALIASES is exactly ['metric_value']", () => {
    expect(DEFAULT_METRIC_ALIASES).toEqual(["metric_value"]);
  });

  it("PREVIEW_METRIC_ALIASES includes metric_value first (priority)", () => {
    expect(PREVIEW_METRIC_ALIASES[0]).toBe("metric_value");
    expect(PREVIEW_METRIC_ALIASES).toContain("value");
    expect(PREVIEW_METRIC_ALIASES).toContain("val");
  });
});

import { describe, it, expect } from "vitest";
import { renderAnomalyMessage, localizedAlertDescription } from "./messages";

describe("anomaly/messages/renderAnomalyMessage", () => {
  describe("zscore.insufficientData", () => {
    it("TR variant", () => {
      const m = renderAnomalyMessage("zscore.insufficientData", { label: "satış", sampleSize: 3 }, "tr");
      expect(m).toContain("satış");
      expect(m).toContain("yeterli geçmiş veri yok");
      expect(m).toContain("3");
    });
    it("EN variant", () => {
      const m = renderAnomalyMessage("zscore.insufficientData", { label: "sales", sampleSize: 3 }, "en");
      expect(m).toContain("sales");
      expect(m).toContain("not enough historical data");
      expect(m).toContain("3");
    });
  });

  describe("zscore.anomaly", () => {
    const params = { label: "ciro", current: 5000, mean: 100, zScore: 4.2, pctDeviation: 4800 };
    it("TR spike (positive zScore) uses 'yükseliş'", () => {
      const m = renderAnomalyMessage("zscore.anomaly", params, "tr");
      expect(m).toContain("yükseliş");
      expect(m).toContain("ciro");
    });
    it("EN spike uses 'spike'", () => {
      const m = renderAnomalyMessage("zscore.anomaly", params, "en");
      expect(m).toContain("spike");
      expect(m).toContain("ciro");
      expect(m).toContain("z=4.20");
    });
    it("TR drop (negative zScore) uses 'düşüş'", () => {
      const m = renderAnomalyMessage("zscore.anomaly", { ...params, zScore: -3.5 }, "tr");
      expect(m).toContain("düşüş");
    });
    it("EN drop uses 'drop'", () => {
      const m = renderAnomalyMessage("zscore.anomaly", { ...params, zScore: -3.5 }, "en");
      expect(m).toContain("drop");
    });
  });

  describe("movingAvg.anomaly", () => {
    it("TR rise", () => {
      const m = renderAnomalyMessage("movingAvg.anomaly", { label: "stok", current: 200, avg: 100, pctDeviation: 100 }, "tr");
      expect(m).toContain("artış");
      expect(m).toContain("stok");
    });
    it("EN rise", () => {
      const m = renderAnomalyMessage("movingAvg.anomaly", { label: "stock", current: 200, avg: 100, pctDeviation: 100 }, "en");
      expect(m).toContain("rise");
    });
    it("TR drop", () => {
      const m = renderAnomalyMessage("movingAvg.anomaly", { label: "stok", current: 50, avg: 100, pctDeviation: -50 }, "tr");
      expect(m).toContain("düşüş");
    });
  });

  describe("threshold.exceeded", () => {
    it("TR with unit", () => {
      const m = renderAnomalyMessage("threshold.exceeded", { label: "iade oranı", current: 12, unit: "%", conditionSymbol: ">", ruleValue: 10 }, "tr");
      expect(m).toContain("eşik aşımı");
      expect(m).toContain("%");
      expect(m).toContain(">");
    });
    it("EN with unit", () => {
      const m = renderAnomalyMessage("threshold.exceeded", { label: "return rate", current: 12, unit: "%", conditionSymbol: ">", ruleValue: 10 }, "en");
      expect(m).toContain("threshold exceeded");
    });
    it("no unit → no double-space before condition", () => {
      const m = renderAnomalyMessage("threshold.exceeded", { label: "x", current: 5, unit: "", conditionSymbol: ">", ruleValue: 3 }, "en");
      expect(m).not.toMatch(/ {2,}/);
      expect(m).toContain("5 (>");
    });
  });

  describe("normal.withinRange", () => {
    it("TR", () => {
      const m = renderAnomalyMessage("normal.withinRange", { label: "satış", current: 100, expected: 100 }, "tr");
      expect(m).toContain("normal aralıkta");
    });
    it("EN", () => {
      const m = renderAnomalyMessage("normal.withinRange", { label: "sales", current: 100, expected: 100 }, "en");
      expect(m).toContain("within normal range");
      expect(m).toContain("expected ~100");
    });
  });

  describe("locale fallback", () => {
    it("unknown locale → TR", () => {
      const m = renderAnomalyMessage("zscore.normal", { label: "satış" }, "fr");
      expect(m).toContain("normal seyrinde");
    });
    it("default locale = TR", () => {
      const m = renderAnomalyMessage("zscore.normal", { label: "satış" });
      expect(m).toContain("normal seyrinde");
    });
  });

  describe("unknown key", () => {
    it("returns the label as-is (no crash)", () => {
      const m = renderAnomalyMessage("totally.unknown.key", { label: "X" }, "en");
      expect(m).toBe("X");
    });
  });

  describe("number formatting", () => {
    it("TR uses comma decimal", () => {
      const m = renderAnomalyMessage("zscore.withinRange", { label: "x", current: 1.5 }, "tr");
      expect(m).toContain("1,5");
    });
    it("EN uses dot decimal", () => {
      const m = renderAnomalyMessage("zscore.withinRange", { label: "x", current: 1.5 }, "en");
      expect(m).toContain("1.5");
    });
    it("integers ≥ 1000 drop decimals", () => {
      const m = renderAnomalyMessage("zscore.withinRange", { label: "x", current: 1234 }, "en");
      expect(m).toContain("1,234");
      expect(m).not.toContain(".00");
    });
  });
});

describe("anomaly/messages/localizedAlertDescription", () => {
  it("prefers structured form when available", () => {
    const result = localizedAlertDescription(
      { messageKey: "zscore.normal", messageParams: { label: "Sales" } },
      "Eski TR string",
      "en",
    );
    expect(result).toBe("Sales is normal.");
  });

  it("falls back to stored description when no messageKey", () => {
    const result = localizedAlertDescription(
      { messageParams: { label: "X" } },
      "Stored TR string",
      "en",
    );
    expect(result).toBe("Stored TR string");
  });

  it("empty fallback when evidence is null + no description", () => {
    const result = localizedAlertDescription(null, null, "en");
    expect(result).toBe("");
  });

  it("undefined evidence safe", () => {
    const result = localizedAlertDescription(undefined, "fallback", "en");
    expect(result).toBe("fallback");
  });

  it("uses TR by default", () => {
    const result = localizedAlertDescription(
      { messageKey: "zscore.normal", messageParams: { label: "satış" } },
      null,
    );
    expect(result).toContain("normal seyrinde");
  });
});

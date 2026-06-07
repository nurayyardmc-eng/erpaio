import {
  renderAnomalyMessage,
  type AnomalyMessageKey,
  type AnomalyMessageParams,
} from "./messages";
// Track XXXX: deduped — implementation lives in @/lib/threshold/compare.
import { compareThreshold, thresholdOpSymbol } from "@/lib/threshold/compare";
import { round2 } from "@/lib/format/round";

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: AnomalySeverity;
  score: number;
  /** Rendered TR message — back-compat for storage + tests. */
  message: string;
  /** Feature 3.1 — structured key for locale-aware rendering. */
  messageKey: AnomalyMessageKey;
  /** Feature 3.1 — params for renderAnomalyMessage(). */
  messageParams: AnomalyMessageParams;
  algorithm: "zscore" | "moving_avg" | "threshold";
  context: {
    currentValue: number;
    expectedValue?: number;
    deviation?: number;
    sampleSize?: number;
  };
}

/** Helper: build result with both rendered TR message + structured key. */
function buildResult(
  base: Omit<AnomalyResult, "message"> & { messageKey: AnomalyMessageKey },
): AnomalyResult {
  return {
    ...base,
    message: renderAnomalyMessage(base.messageKey, base.messageParams, "tr"),
  };
}

export interface ZScoreParams {
  current: number;
  history: number[];
  metricLabel: string;
  thresholds?: { low: number; medium: number; high: number; critical: number };
  direction?: "drop" | "spike" | "both";
}

export function detectZScore(params: ZScoreParams): AnomalyResult {
  const {
    current, history, metricLabel,
    thresholds = { low: 1.5, medium: 2, high: 3, critical: 4 },
    direction = "both",
  } = params;

  const sampleSize = history.length;

  if (sampleSize < 5) {
    return buildResult({
      isAnomaly: false, severity: "low", score: 0,
      messageKey: "zscore.insufficientData",
      messageParams: { label: metricLabel, sampleSize },
      algorithm: "zscore",
      context: { currentValue: current, sampleSize },
    });
  }

  const mean = history.reduce((a, b) => a + b, 0) / sampleSize;
  const variance = history.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sampleSize;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    const isAnomaly = current !== mean;
    return buildResult({
      isAnomaly,
      severity: isAnomaly ? "medium" : "low",
      score: 0,
      messageKey: isAnomaly ? "zscore.constantAnomaly" : "zscore.normal",
      messageParams: { label: metricLabel, mean, current },
      algorithm: "zscore",
      context: { currentValue: current, expectedValue: mean, sampleSize },
    });
  }

  const zScore = (current - mean) / stdDev;
  const absZ = Math.abs(zScore);

  if (direction === "drop" && zScore >= 0) {
    return normalResult(metricLabel, current, mean, "zscore", sampleSize);
  }
  if (direction === "spike" && zScore <= 0) {
    return normalResult(metricLabel, current, mean, "zscore", sampleSize);
  }

  let severity: AnomalySeverity = "low";
  let isAnomaly = false;

  if (absZ >= thresholds.critical) { severity = "critical"; isAnomaly = true; }
  else if (absZ >= thresholds.high) { severity = "high"; isAnomaly = true; }
  else if (absZ >= thresholds.medium) { severity = "medium"; isAnomaly = true; }
  else if (absZ >= thresholds.low) { severity = "low"; isAnomaly = true; }

  const pctDeviation = mean !== 0 ? ((current - mean) / mean) * 100 : 0;

  return buildResult({
    isAnomaly, severity,
    score: round2(zScore),
    messageKey: isAnomaly ? "zscore.anomaly" : "zscore.withinRange",
    messageParams: { label: metricLabel, current, mean, zScore, pctDeviation },
    algorithm: "zscore",
    context: {
      currentValue: current,
      expectedValue: round2(mean),
      deviation: round2(pctDeviation),
      sampleSize,
    },
  });
}

export interface MovingAvgParams {
  current: number;
  history: number[];
  metricLabel: string;
  thresholds?: { low: number; medium: number; high: number; critical: number };
  direction?: "drop" | "spike" | "both";
}

export function detectMovingAverage(params: MovingAvgParams): AnomalyResult {
  const {
    current, history, metricLabel,
    thresholds = { low: 15, medium: 25, high: 40, critical: 60 },
    direction = "both",
  } = params;

  if (history.length < 3) {
    return buildResult({
      isAnomaly: false, severity: "low", score: 0,
      messageKey: "movingAvg.insufficientData",
      messageParams: { label: metricLabel },
      algorithm: "moving_avg",
      context: { currentValue: current, sampleSize: history.length },
    });
  }

  const avg = history.reduce((a, b) => a + b, 0) / history.length;

  if (avg === 0) {
    const isAnomaly = current !== 0;
    return buildResult({
      isAnomaly,
      severity: isAnomaly ? "medium" : "low",
      score: 0,
      messageKey: isAnomaly ? "movingAvg.zeroToPositive" : "movingAvg.normalZero",
      messageParams: { label: metricLabel, current },
      algorithm: "moving_avg",
      context: { currentValue: current, expectedValue: 0 },
    });
  }

  const pctDeviation = ((current - avg) / avg) * 100;
  const absDev = Math.abs(pctDeviation);

  if (direction === "drop" && pctDeviation >= 0) {
    return normalResult(metricLabel, current, avg, "moving_avg", history.length);
  }
  if (direction === "spike" && pctDeviation <= 0) {
    return normalResult(metricLabel, current, avg, "moving_avg", history.length);
  }

  let severity: AnomalySeverity = "low";
  let isAnomaly = false;

  if (absDev >= thresholds.critical) { severity = "critical"; isAnomaly = true; }
  else if (absDev >= thresholds.high) { severity = "high"; isAnomaly = true; }
  else if (absDev >= thresholds.medium) { severity = "medium"; isAnomaly = true; }
  else if (absDev >= thresholds.low) { severity = "low"; isAnomaly = true; }

  return buildResult({
    isAnomaly, severity,
    score: round2(pctDeviation),
    messageKey: isAnomaly ? "movingAvg.anomaly" : "movingAvg.withinRange",
    messageParams: { label: metricLabel, current, avg, pctDeviation },
    algorithm: "moving_avg",
    context: {
      currentValue: current,
      expectedValue: round2(avg),
      deviation: round2(pctDeviation),
      sampleSize: history.length,
    },
  });
}

export interface ThresholdParams {
  current: number;
  metricLabel: string;
  unit?: string;
  rules: Array<{
    condition: "lt" | "lte" | "gt" | "gte" | "eq";
    value: number;
    severity: AnomalySeverity;
    message?: string;
  }>;
}

export function detectThreshold(params: ThresholdParams): AnomalyResult {
  const { current, metricLabel, unit = "", rules } = params;

  const severityRank: Record<AnomalySeverity, number> = {
    low: 1, medium: 2, high: 3, critical: 4,
  };
  const sortedRules = [...rules].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity],
  );

  for (const rule of sortedRules) {
    if (matchCondition(current, rule.condition, rule.value)) {
      const conditionSymbol = thresholdOpSymbol(rule.condition);
      const messageParams: AnomalyMessageParams = {
        label: metricLabel, current, unit,
        conditionSymbol, ruleValue: rule.value,
      };
      // Custom override message (rule.message) bypasses i18n — caller's
      // explicit choice. Stored as-is in TR message + key falls back to
      // `threshold.exceeded` so view layer can localize if no override.
      const rendered = rule.message ?? renderAnomalyMessage("threshold.exceeded", messageParams, "tr");
      return {
        isAnomaly: true, severity: rule.severity, score: current,
        message: rendered,
        messageKey: "threshold.exceeded",
        messageParams,
        algorithm: "threshold",
        context: { currentValue: current, expectedValue: rule.value },
      };
    }
  }

  return buildResult({
    isAnomaly: false, severity: "low", score: current,
    messageKey: "threshold.within",
    messageParams: { label: metricLabel, current, unit },
    algorithm: "threshold",
    context: { currentValue: current },
  });
}

function matchCondition(
  value: number,
  condition: ThresholdParams["rules"][0]["condition"],
  threshold: number,
): boolean {
  return compareThreshold(condition, value, threshold);
}

function normalResult(
  label: string, current: number, expected: number,
  alg: AnomalyResult["algorithm"], sampleSize?: number,
): AnomalyResult {
  return buildResult({
    isAnomaly: false, severity: "low", score: 0,
    messageKey: "normal.withinRange",
    messageParams: { label, current, expected },
    algorithm: alg,
    context: {
      currentValue: current,
      expectedValue: round2(expected),
      sampleSize,
    },
  });
}

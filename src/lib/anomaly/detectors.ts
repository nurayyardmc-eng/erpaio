export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: AnomalySeverity;
  score: number;
  message: string;
  algorithm: "zscore" | "moving_avg" | "threshold";
  context: {
    currentValue: number;
    expectedValue?: number;
    deviation?: number;
    sampleSize?: number;
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
    return {
      isAnomaly: false, severity: "low", score: 0,
      message: `${metricLabel} için yeterli geçmiş veri yok (${sampleSize} nokta).`,
      algorithm: "zscore",
      context: { currentValue: current, sampleSize },
    };
  }

  const mean = history.reduce((a, b) => a + b, 0) / sampleSize;
  const variance = history.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sampleSize;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    const isAnomaly = current !== mean;
    return {
      isAnomaly,
      severity: isAnomaly ? "medium" : "low",
      score: 0,
      message: isAnomaly
        ? `${metricLabel} sabit ${mean} idi, şimdi ${current}.`
        : `${metricLabel} normal seyrinde.`,
      algorithm: "zscore",
      context: { currentValue: current, expectedValue: mean, sampleSize },
    };
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

  const directionTr = zScore > 0 ? "yükseliş" : "düşüş";
  const pctDeviation = mean !== 0 ? ((current - mean) / mean) * 100 : 0;

  return {
    isAnomaly, severity,
    score: Number(zScore.toFixed(2)),
    message: isAnomaly
      ? `${metricLabel} olağandışı ${directionTr}: ${formatNumber(current)} (ort: ${formatNumber(mean)}, %${pctDeviation.toFixed(1)} sapma, z=${zScore.toFixed(2)})`
      : `${metricLabel} normal aralıkta: ${formatNumber(current)}`,
    algorithm: "zscore",
    context: {
      currentValue: current,
      expectedValue: Number(mean.toFixed(2)),
      deviation: Number(pctDeviation.toFixed(2)),
      sampleSize,
    },
  };
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
    return {
      isAnomaly: false, severity: "low", score: 0,
      message: `${metricLabel} için yeterli geçmiş veri yok.`,
      algorithm: "moving_avg",
      context: { currentValue: current, sampleSize: history.length },
    };
  }

  const avg = history.reduce((a, b) => a + b, 0) / history.length;

  if (avg === 0) {
    const isAnomaly = current !== 0;
    return {
      isAnomaly,
      severity: isAnomaly ? "medium" : "low",
      score: 0,
      message: isAnomaly
        ? `${metricLabel} sıfırdan ${formatNumber(current)} değerine çıktı.`
        : `${metricLabel} normal.`,
      algorithm: "moving_avg",
      context: { currentValue: current, expectedValue: 0 },
    };
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

  const directionTr = pctDeviation > 0 ? "artış" : "düşüş";

  return {
    isAnomaly, severity,
    score: Number(pctDeviation.toFixed(2)),
    message: isAnomaly
      ? `${metricLabel}: %${absDev.toFixed(1)} ${directionTr} (şu an: ${formatNumber(current)}, ort: ${formatNumber(avg)})`
      : `${metricLabel} ortalama civarında: ${formatNumber(current)}`,
    algorithm: "moving_avg",
    context: {
      currentValue: current,
      expectedValue: Number(avg.toFixed(2)),
      deviation: Number(pctDeviation.toFixed(2)),
      sampleSize: history.length,
    },
  };
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
      const conditionTr = conditionToTr(rule.condition);
      const autoMessage =
        rule.message ??
        `${metricLabel} eşik aşımı: ${formatNumber(current)}${unit ? " " + unit : ""} (${conditionTr} ${formatNumber(rule.value)})`;
      return {
        isAnomaly: true, severity: rule.severity, score: current,
        message: autoMessage, algorithm: "threshold",
        context: { currentValue: current, expectedValue: rule.value },
      };
    }
  }

  return {
    isAnomaly: false, severity: "low", score: current,
    message: `${metricLabel} eşik içinde: ${formatNumber(current)}${unit ? " " + unit : ""}`,
    algorithm: "threshold",
    context: { currentValue: current },
  };
}

function matchCondition(
  value: number,
  condition: ThresholdParams["rules"][0]["condition"],
  threshold: number,
): boolean {
  switch (condition) {
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "eq": return value === threshold;
  }
}

function conditionToTr(c: ThresholdParams["rules"][0]["condition"]): string {
  return { lt: "<", lte: "≤", gt: ">", gte: "≥", eq: "=" }[c];
}

function normalResult(
  label: string, current: number, expected: number,
  alg: AnomalyResult["algorithm"], sampleSize?: number,
): AnomalyResult {
  return {
    isAnomaly: false, severity: "low", score: 0,
    message: `${label} normal aralıkta: ${formatNumber(current)} (beklenen ~${formatNumber(expected)})`,
    algorithm: alg,
    context: {
      currentValue: current,
      expectedValue: Number(expected.toFixed(2)),
      sampleSize,
    },
  };
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2,
  }).format(n);
}

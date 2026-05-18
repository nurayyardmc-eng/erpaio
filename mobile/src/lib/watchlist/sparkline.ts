// SYNC NOTE: src/lib/watchlist/sparkline.ts ile birebir aynı (web twin).
// Mobile vitest run etmediği için pure helper buraya kopyalanır; logic
// değişirse iki dosya birlikte güncellenmeli. Web tarafında 8 test var.

export interface TriggerInput {
  value: number;
  triggeredAt: string;
}

export interface SparklinePoint {
  x: number;
  y: number;
}

export interface SparklineData {
  points: SparklinePoint[];
  thresholdY: number;
  minVal: number;
  maxVal: number;
  hasData: boolean;
}

export function computeSparkline(
  triggers: TriggerInput[],
  thresholdVal: number,
): SparklineData {
  if (triggers.length === 0) {
    return {
      points: [],
      thresholdY: 0.5,
      minVal: 0,
      maxVal: 0,
      hasData: false,
    };
  }

  const sorted = [...triggers].sort(
    (a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime(),
  );

  const times = sorted.map((t) => new Date(t.triggeredAt).getTime());
  const values = sorted.map((t) => t.value);

  const tMin = times[0];
  const tMax = times[times.length - 1];
  const tRange = tMax - tMin;

  const vMinRaw = Math.min(...values, thresholdVal);
  const vMaxRaw = Math.max(...values, thresholdVal);
  const vRange = vMaxRaw - vMinRaw;

  const points: SparklinePoint[] = sorted.map((t, i) => ({
    x: tRange === 0 ? (i === sorted.length - 1 ? 1 : 0) : (times[i] - tMin) / tRange,
    y: vRange === 0 ? 0.5 : (t.value - vMinRaw) / vRange,
  }));

  const thresholdY = vRange === 0 ? 0.5 : (thresholdVal - vMinRaw) / vRange;

  return {
    points,
    thresholdY: Math.max(0, Math.min(1, thresholdY)),
    minVal: Math.min(...values),
    maxVal: Math.max(...values),
    hasData: true,
  };
}

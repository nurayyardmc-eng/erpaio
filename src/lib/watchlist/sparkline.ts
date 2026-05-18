/**
 * Watchlist trigger sparkline — Track XXXX.
 *
 * Trigger geçmişini mini chart için normalize eder. Value-over-time line:
 *  - X = trigger timestamp (en eski → 0, en yeni → 1)
 *  - Y = value (min → 0, max → 1)
 *  - thresholdY: kullanıcının ayarladığı eşik aynı normalized space'te
 *
 * Single-point edge case: timestamp range = 0 → tek nokta x=1 (en sağda).
 * Value range = 0 (hepsi aynı): y = 0.5 (orta).
 * Empty input: points=[], thresholdY clamp to [0,1].
 *
 * Pure function — testable, web+mobile twin import.
 */

export interface TriggerInput {
  value: number;
  triggeredAt: string;
}

export interface SparklinePoint {
  x: number; // 0..1
  y: number; // 0..1
}

export interface SparklineData {
  points: SparklinePoint[];
  thresholdY: number; // 0..1, clamp edilmiş
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

  // Triggers DESC sort gelir (API'den son tetiklenme önce). Sparkline için
  // ASC istiyoruz: en eski sola, en yeni sağa.
  const sorted = [...triggers].sort(
    (a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime(),
  );

  const times = sorted.map((t) => new Date(t.triggeredAt).getTime());
  const values = sorted.map((t) => t.value);

  const tMin = times[0];
  const tMax = times[times.length - 1];
  const tRange = tMax - tMin;

  // Y ekseni için range — threshold dahil edilir ki çizgi görünsün
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

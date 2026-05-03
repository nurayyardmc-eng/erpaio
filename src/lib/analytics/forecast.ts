export interface ForecastPoint {
  index: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface ForecastResult {
  trend: "rising" | "falling" | "flat";
  slope: number;
  intercept: number;
  rmse: number;
  forecast: ForecastPoint[];
  seasonality: { detected: boolean; period?: number };
}

export function linearForecast(values: number[], steps: number): ForecastResult {
  const n = values.length;
  if (n < 3) {
    return {
      trend: "flat",
      slope: 0,
      intercept: values[0] ?? 0,
      rmse: 0,
      forecast: [],
      seasonality: { detected: false },
    };
  }

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    sse += (values[i] - pred) ** 2;
  }
  const rmse = Math.sqrt(sse / n);

  const forecast: ForecastPoint[] = [];
  for (let s = 1; s <= steps; s++) {
    const i = n - 1 + s;
    const predicted = intercept + slope * i;
    const ci = 1.96 * rmse;
    forecast.push({ index: i, predicted, lowerBound: predicted - ci, upperBound: predicted + ci });
  }

  let seasonalityPeriod: number | undefined;
  if (n >= 14) {
    seasonalityPeriod = detectPeriod(values);
  }

  const trendThreshold = Math.abs(yMean) * 0.05;
  const trend: ForecastResult["trend"] =
    Math.abs(slope * n) < trendThreshold
      ? "flat"
      : slope > 0
      ? "rising"
      : "falling";

  return {
    trend,
    slope,
    intercept,
    rmse,
    forecast,
    seasonality: { detected: !!seasonalityPeriod, period: seasonalityPeriod },
  };
}

function detectPeriod(values: number[]): number | undefined {
  const n = values.length;
  let bestPeriod: number | undefined;
  let bestCorr = 0.3;
  for (let p = 2; p <= Math.floor(n / 2); p++) {
    const corr = autocorrelation(values, p);
    if (corr > bestCorr) {
      bestCorr = corr;
      bestPeriod = p;
    }
  }
  return bestPeriod;
}

function autocorrelation(values: number[], lag: number): number {
  const n = values.length;
  if (lag >= n) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n - lag; i++) {
    num += (values[i] - mean) * (values[i + lag] - mean);
  }
  for (let i = 0; i < n; i++) {
    den += (values[i] - mean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

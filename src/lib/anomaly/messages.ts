/**
 * Anomaly message renderer — locale-aware (TR/EN).
 *
 * Feature 3.1 — anomaly detectors emit structured `messageKey` +
 * `messageParams` alongside the legacy TR `message` field. The engine
 * stores the structured form in `alert.evidence.messageKey/Params`;
 * the display layer (alerts page, email/whatsapp formatters) calls
 * `renderAnomalyMessage(key, params, locale)` to produce a localized
 * string.
 *
 * Old alerts in DB (no structured form) still display via the stored
 * TR `description` — see `localizedAlertDescription()` below.
 */

export type AnomalyMessageKey =
  | "zscore.insufficientData"
  | "zscore.constantAnomaly"
  | "zscore.normal"
  | "zscore.anomaly"
  | "zscore.withinRange"
  | "movingAvg.insufficientData"
  | "movingAvg.zeroToPositive"
  | "movingAvg.normalZero"
  | "movingAvg.anomaly"
  | "movingAvg.withinRange"
  | "threshold.exceeded"
  | "threshold.within"
  | "normal.withinRange";

export type AnomalyMessageParams = Record<string, string | number>;

type Locale = "tr" | "en" | string;

function fmt(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", {
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2,
  }).format(n);
}

function p(params: AnomalyMessageParams, k: string): string | number {
  return params[k] ?? "";
}

function n(params: AnomalyMessageParams, k: string): number {
  const v = params[k];
  return typeof v === "number" ? v : 0;
}

/**
 * Render an anomaly message in the requested locale.
 *
 * Unknown locale → TR fallback. Unknown key → safe stringification of
 * `${label}` so callers never crash on enum drift.
 */
export function renderAnomalyMessage(
  key: AnomalyMessageKey | string,
  params: AnomalyMessageParams,
  locale: Locale = "tr",
): string {
  const isEn = locale === "en";
  const label = String(p(params, "label"));

  switch (key) {
    case "zscore.insufficientData":
      return isEn
        ? `${label}: not enough historical data (${p(params, "sampleSize")} points).`
        : `${label} için yeterli geçmiş veri yok (${p(params, "sampleSize")} nokta).`;

    case "zscore.constantAnomaly":
      return isEn
        ? `${label} was constant at ${fmt(n(params, "mean"), locale)}, now ${fmt(n(params, "current"), locale)}.`
        : `${label} sabit ${fmt(n(params, "mean"), locale)} idi, şimdi ${fmt(n(params, "current"), locale)}.`;

    case "zscore.normal":
      return isEn ? `${label} is normal.` : `${label} normal seyrinde.`;

    case "zscore.anomaly": {
      const dirEn = n(params, "zScore") > 0 ? "spike" : "drop";
      const dirTr = n(params, "zScore") > 0 ? "yükseliş" : "düşüş";
      const z = n(params, "zScore").toFixed(2);
      const dev = Math.abs(n(params, "pctDeviation")).toFixed(1);
      return isEn
        ? `${label} unusual ${dirEn}: ${fmt(n(params, "current"), locale)} (avg: ${fmt(n(params, "mean"), locale)}, ${dev}% deviation, z=${z})`
        : `${label} olağandışı ${dirTr}: ${fmt(n(params, "current"), locale)} (ort: ${fmt(n(params, "mean"), locale)}, %${dev} sapma, z=${z})`;
    }

    case "zscore.withinRange":
      return isEn
        ? `${label} within normal range: ${fmt(n(params, "current"), locale)}`
        : `${label} normal aralıkta: ${fmt(n(params, "current"), locale)}`;

    case "movingAvg.insufficientData":
      return isEn
        ? `${label}: not enough historical data.`
        : `${label} için yeterli geçmiş veri yok.`;

    case "movingAvg.zeroToPositive":
      return isEn
        ? `${label} jumped from zero to ${fmt(n(params, "current"), locale)}.`
        : `${label} sıfırdan ${fmt(n(params, "current"), locale)} değerine çıktı.`;

    case "movingAvg.normalZero":
      return isEn ? `${label} normal.` : `${label} normal.`;

    case "movingAvg.anomaly": {
      const dirEn = n(params, "pctDeviation") > 0 ? "rise" : "drop";
      const dirTr = n(params, "pctDeviation") > 0 ? "artış" : "düşüş";
      const dev = Math.abs(n(params, "pctDeviation")).toFixed(1);
      return isEn
        ? `${label}: ${dev}% ${dirEn} (now: ${fmt(n(params, "current"), locale)}, avg: ${fmt(n(params, "avg"), locale)})`
        : `${label}: %${dev} ${dirTr} (şu an: ${fmt(n(params, "current"), locale)}, ort: ${fmt(n(params, "avg"), locale)})`;
    }

    case "movingAvg.withinRange":
      return isEn
        ? `${label} around average: ${fmt(n(params, "current"), locale)}`
        : `${label} ortalama civarında: ${fmt(n(params, "current"), locale)}`;

    case "threshold.exceeded": {
      const unit = p(params, "unit");
      const unitSpace = unit ? ` ${unit}` : "";
      return isEn
        ? `${label} threshold exceeded: ${fmt(n(params, "current"), locale)}${unitSpace} (${p(params, "conditionSymbol")} ${fmt(n(params, "ruleValue"), locale)})`
        : `${label} eşik aşımı: ${fmt(n(params, "current"), locale)}${unitSpace} (${p(params, "conditionSymbol")} ${fmt(n(params, "ruleValue"), locale)})`;
    }

    case "threshold.within": {
      const unit = p(params, "unit");
      const unitSpace = unit ? ` ${unit}` : "";
      return isEn
        ? `${label} within threshold: ${fmt(n(params, "current"), locale)}${unitSpace}`
        : `${label} eşik içinde: ${fmt(n(params, "current"), locale)}${unitSpace}`;
    }

    case "normal.withinRange":
      return isEn
        ? `${label} within normal range: ${fmt(n(params, "current"), locale)} (expected ~${fmt(n(params, "expected"), locale)})`
        : `${label} normal aralıkta: ${fmt(n(params, "current"), locale)} (beklenen ~${fmt(n(params, "expected"), locale)})`;

    default:
      return label;
  }
}

/**
 * Display-time helper: prefer structured key+params from alert.evidence,
 * fall back to stored TR `description` for legacy alerts.
 */
export function localizedAlertDescription(
  evidence: { messageKey?: string; messageParams?: AnomalyMessageParams } | null | undefined,
  fallback: string | null,
  locale: Locale = "tr",
): string {
  if (evidence?.messageKey) {
    return renderAnomalyMessage(evidence.messageKey, evidence.messageParams ?? {}, locale);
  }
  return fallback ?? "";
}

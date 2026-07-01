export type ChartType = "line" | "bar" | "pie" | "none";

export interface ChartHint {
  type: ChartType;
  xColumn?: string;
  yColumns: string[];
  reason: string;
}

const DATE_RX = /^\d{4}[-/]\d{2}[-/]\d{2}/;

export function detectChartHint(
  rows: Record<string, unknown>[],
  columns: string[],
): ChartHint {
  if (rows.length < 2) return { type: "none", yColumns: [], reason: "yetersiz veri" };
  if (rows.length > 500) return { type: "none", yColumns: [], reason: "çok fazla satır (>500)" };

  // A value is "numeric" if it's a JS number OR a plain numeric string — the
  // pg driver serializes bigint/numeric aggregates (COUNT/SUM/AVG) as strings,
  // which would otherwise be misread as category labels and never charted.
  const NUM_RX = /^-?\d+(\.\d+)?$/;
  const isNum = (v: unknown): boolean =>
    typeof v === "number" ? Number.isFinite(v) : typeof v === "string" && NUM_RX.test(v.trim());

  const sample = rows[0];
  const cols = columns.map((c) => {
    const v = sample[c];
    const numeric = isNum(v);
    return {
      name: c,
      isNumeric: numeric,
      isDateLike:
        v instanceof Date || (typeof v === "string" && DATE_RX.test(v)),
      // a numeric string is a metric, not a category label
      isString: typeof v === "string" && !numeric,
    };
  });

  const numericCols = cols.filter((c) => c.isNumeric);
  const dateCol = cols.find((c) => c.isDateLike);
  const stringCol = cols.find((c) => c.isString && !c.isDateLike);

  if (dateCol && numericCols.length > 0 && rows.length <= 100) {
    return {
      type: "line",
      xColumn: dateCol.name,
      yColumns: numericCols.slice(0, 3).map((c) => c.name),
      reason: "tarih + sayı → trend grafiği",
    };
  }

  if (stringCol && numericCols.length > 0 && rows.length <= 30) {
    return {
      type: "bar",
      xColumn: stringCol.name,
      yColumns: numericCols.slice(0, 1).map((c) => c.name),
      reason: "kategori + sayı → bar grafik",
    };
  }

  if (stringCol && numericCols.length === 1 && rows.length <= 10) {
    return {
      type: "pie",
      xColumn: stringCol.name,
      yColumns: numericCols.map((c) => c.name),
      reason: "az kategori + tek sayı → pasta",
    };
  }

  return { type: "none", yColumns: [], reason: "uygun grafik tipi bulunamadı" };
}

/**
 * Pure formatting + math helpers for in-chat MiniChart rendering.
 *
 * Extracted (Track NNNNN) from src/components/MiniChart.tsx so axis labels,
 * pie-slice geometry, and Turkish number locale formatting can be tested
 * without mounting React.
 */

/**
 * Compact axis label: 1.2M / 3.4k / locale-formatted number.
 * Threshold at absolute value so negative thousands also abbreviate.
 */
export function formatN(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(n);
}

export interface PieSliceInput {
  label: string;
  value: number;
}

export interface PieSlice extends PieSliceInput {
  /** Degrees (0–360), starting at top-of-circle when consumer applies -90 offset. */
  start: number;
  end: number;
  /** Fraction of total — useful for legend percentage labels. */
  fraction: number;
}

/**
 * Build cumulative arc slices for a pie chart. Each slice's degree range is
 * proportional to its share of the total. Order preserved from input.
 *
 * Returns empty array when total is 0 (caller renders nothing).
 */
export function pieSlices(values: PieSliceInput[]): PieSlice[] {
  const total = values.reduce((a, b) => a + b.value, 0);
  if (total <= 0) return [];
  return values.reduce<PieSlice[]>((out, v) => {
    const start = out.length > 0 ? out[out.length - 1].end : 0;
    const fraction = v.value / total;
    const end = start + fraction * 360;
    out.push({ ...v, start, end, fraction });
    return out;
  }, []);
}

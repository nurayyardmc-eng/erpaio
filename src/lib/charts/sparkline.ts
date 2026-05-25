/**
 * Pure SVG sparkline geometry — compute polyline points string from a
 * series of numeric values.
 *
 * Extracted (Track CCCCCC) from dashboard/overview/Sparkline component so
 * the y-axis inversion and range normalization can be tested without SVG.
 *
 * Algorithm:
 *  - Map values uniformly across x ∈ [0, w]
 *  - Normalize y by (v - min) / (max - min), inverted (top = high value)
 *  - Constant-series guard: range 0 → all points at y = h (bottom)
 *  - Empty/single-value: returns "" — caller may skip rendering
 *
 * Output is the SVG `points` attribute string ("x,y x,y ..."), 1 decimal.
 */
export function sparklinePoints(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Round a number to 2 decimal places, returning a number (not a string).
 *
 * Mirrors the `Number(x.toFixed(2))` idiom that anomaly/detectors.ts repeated
 * for score / expectedValue / deviation fields. Implemented via toFixed (not
 * Math.round(n*100)/100) to preserve the exact half-to-even rounding of the
 * original call sites.
 *
 *   round2(1.005)  → 1     (toFixed semantics, same as before)
 *   round2(2.345)  → 2.35
 *   round2(-1.239) → -1.24
 */
export function round2(n: number): number {
  return Number(n.toFixed(2));
}

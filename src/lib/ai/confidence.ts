/**
 * Map a 0..1 AI confidence score to a coarse bucket name.
 *
 * Buckets feed Sentry monitoring tags + dashboard groupings — a regression
 * (e.g. swapping "high"/"low") would scramble alert thresholds. Extracted
 * (Track CCCCC) from src/app/api/chat/route.ts so the boundaries are
 * documented + tested in one place.
 *
 * Boundaries (inclusive lower, exclusive upper):
 *   high     [0.95, ∞)
 *   med      [0.70, 0.95)
 *   low      [0.40, 0.70)
 *   very_low (-∞, 0.40)
 *
 * Out-of-range inputs (NaN, > 1, < 0) are accepted — the chat route's
 * upstream parser clamps to [0,1] so values shouldn't escape that, but
 * downstream callers may pass raw model output.
 */
export type ConfidenceBucket = "high" | "med" | "low" | "very_low";

export function confidenceBucket(confidence: number): ConfidenceBucket {
  if (confidence >= 0.95) return "high";
  if (confidence >= 0.7) return "med";
  if (confidence >= 0.4) return "low";
  return "very_low";
}

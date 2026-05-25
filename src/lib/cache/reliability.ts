/**
 * Saved-query reliability score.
 *
 * Track OOOOOO — extracted from src/app/api/saved-queries/route.ts. Used in
 * Saved Queries UI as "Güvenilirlik: %N" badge. A regression (e.g. dividing
 * by successCount alone) would silently misrepresent quality.
 *
 * Returns fraction in [0, 1]:
 *   no attempts (0 success + 0 fail) → 1.0 (optimistic default — newly
 *     cached query hasn't failed, so don't show 0%)
 *   else → success / (success + fail)
 */
export function computeReliability(successCount: number, failCount: number): number {
  const total = successCount + failCount;
  if (total <= 0) return 1;
  return successCount / total;
}

/**
 * NPS (Net Promoter Score) calculation helpers.
 *
 * Track HHHHHHHHHHH — 3 site AYNI formul + bucket classification yapiyordu:
 *   * app/api/nps/route GET (sysadmin platform-wide aggregate)
 *   * app/api/nps/route per-tenant breakdown (loop icinde 3. inline)
 *   * app/api/tenant/nps/route GET (single-tenant aggregate)
 *
 * NPS bucket convention (industry standard 0-10 score):
 *   * 9-10: Promoter
 *   * 7-8: Passive
 *   * 0-6: Detractor
 *
 * Formula: (promoters - detractors) / total * 100, rounded.
 * Range: -100 (all detractors) to +100 (all promoters).
 * Total 0 → 0 (defensive, division-by-zero guard).
 */

export type NpsBucket = "promoter" | "passive" | "detractor";

/** Classify a single 0-10 score into NPS bucket. */
export function npsBucket(score: number): NpsBucket {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

/** Compute NPS score from bucket counts. Rounded to integer. */
export function calcNps(
  promoters: number,
  detractors: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return Math.round(((promoters - detractors) / total) * 100);
}

export interface NpsAggregate {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  nps: number;
}

/** Bucketize an array of scores and compute aggregate NPS. */
export function aggregateNps(scores: ReadonlyArray<number>): NpsAggregate {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const s of scores) {
    const b = npsBucket(s);
    if (b === "promoter") promoters++;
    else if (b === "passive") passives++;
    else detractors++;
  }
  const total = scores.length;
  return { promoters, passives, detractors, total, nps: calcNps(promoters, detractors, total) };
}

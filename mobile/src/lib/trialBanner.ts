/**
 * Trial countdown banner status — mobile sürümü.
 *
 * SYNC NOTE: Web ikizi `src/lib/trial/banner.ts`. Vitest mobile/'i dışlıyor;
 * web tarafında test'lenir. İki dosya birebir aynı kalmalı.
 */

export type TrialUrgency = "info" | "warning" | "danger" | "expired";

export interface TrialBannerStatus {
  urgency: TrialUrgency;
  daysLeft: number;
}

interface TrialBannerInput {
  plan?: string | null | undefined;
  trialEndsAt?: Date | string | null | undefined;
  subscriptionStatus?: string | null | undefined;
}

export function trialBannerStatus(
  input: TrialBannerInput,
  now: Date = new Date(),
): TrialBannerStatus | null {
  if (input.plan !== "starter") return null;
  if (input.subscriptionStatus === "active") return null;
  if (!input.trialEndsAt) return null;

  const target = input.trialEndsAt instanceof Date
    ? input.trialEndsAt
    : new Date(input.trialEndsAt);
  if (Number.isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - now.getTime();
  const dayMs = 24 * 60 * 60_000;
  const daysLeft = Math.ceil(diffMs / dayMs);

  if (daysLeft <= 0) return { urgency: "expired", daysLeft };
  if (daysLeft > 14) return null;
  if (daysLeft <= 3) return { urgency: "danger", daysLeft };
  if (daysLeft <= 7) return { urgency: "warning", daysLeft };
  return { urgency: "info", daysLeft };
}

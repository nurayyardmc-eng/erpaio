/**
 * Trial countdown banner status classifier.
 *
 * Plan "starter" + trialEndsAt set olan tenant'lar için in-app uyarı banner'ı
 * göstermek ne zaman + ne renkte kararını verir. Tüm karar pure helper'da;
 * UI sadece renk + i18n key seçer.
 *
 * Banner kuralları:
 *   - plan !== "starter"           → null (paid plan banner gösterme)
 *   - subscriptionStatus "active"  → null (Stripe ile zaten upgrade etti)
 *   - trialEndsAt yoksa             → null (klasik tenant veya non-trial)
 *   - trialEndsAt > 14 gün ileri    → null (heyecanlandırmaya gerek yok)
 *   - 14 gün → 8 gün arası          → "info"     gri/gümüş
 *   - 7 gün → 4 gün arası           → "warning"  amber
 *   - 3 gün → 0 gün arası           → "danger"   kırmızı
 *   - trialEndsAt geçmiş            → "expired"  kırmızı, kalan gün -N
 *
 * Pure function — DB/network bağımsız, test edilir.
 */

export type TrialUrgency = "info" | "warning" | "danger" | "expired";

export interface TrialBannerStatus {
  urgency: TrialUrgency;
  /** Pozitif → trial bitimine kalan gün; 0 → bugün; negatif → geçmiş gün. */
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
  // Pozitif daysLeft = kalan; negatif = geçmiş.
  const daysLeft = Math.ceil(diffMs / dayMs);

  if (daysLeft <= 0) return { urgency: "expired", daysLeft };
  if (daysLeft > 14) return null;
  if (daysLeft <= 3) return { urgency: "danger", daysLeft };
  if (daysLeft <= 7) return { urgency: "warning", daysLeft };
  return { urgency: "info", daysLeft };
}

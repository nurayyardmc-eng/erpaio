/**
 * Anomaly engine learning loop — false-positive suppression.
 *
 * Kullanıcılar bir alert'i "yanlış alarm" olarak işaretleyebiliyor (MMM);
 * bu modül engine'in bu sinyali okuyup tekrarlayan FP'leri otomatik suppress
 * etmesini sağlar. Mantık:
 *
 *   Tenant'ın aynı `metricKey` üzerinde son `windowDays` (default 30) gün
 *   içinde `threshold` (default 3) ve fazla `falsePositiveAt` set'li alert'i
 *   varsa, yeni anomaly alert OLUŞTURULMAZ. Suppression kararı log'lanır.
 *
 * Pure helper `shouldSuppressByFpCount(count, threshold)` test edilir;
 * gerçek DB query'si engine'de inline (prisma test edilmiyor).
 */

export const FP_SUPPRESS_THRESHOLD = 3;
export const FP_SUPPRESS_WINDOW_DAYS = 30;

/**
 * Pure: aynı metric için tenant'taki FP sayısı eşiği aştıysa true.
 *
 * - count < threshold → false (suppress etme)
 * - count === threshold → true (eşik dahil; "3 FP varsa kes" = ≥3)
 * - count > threshold → true
 * - threshold ≤ 0 → her zaman true (defensive — config bozulsa bile asla
 *   inverted dönmesin; production'da eşik > 0 garantili)
 * - count < 0 → false (anlamsız input — suppress etme, safe default)
 */
export function shouldSuppressByFpCount(count: number, threshold: number = FP_SUPPRESS_THRESHOLD): boolean {
  if (!Number.isFinite(count) || count < 0) return false;
  if (threshold <= 0) return true;
  return count >= threshold;
}

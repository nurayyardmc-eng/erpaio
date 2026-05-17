/**
 * Schema cache age classifier.
 *
 * ERP'nin schema'sı (tablo listesi, kolon türleri) hızlı değişmez ama
 * cache'lediğimiz snapshot bayatladıkça AI'nin SQL üretimi şüpheli olur.
 * Bu modül `SchemaCache.builtAt` timestamp'ini kategorilere ayırır; UI'da
 * renkli "freshness" göstergesi için kullanılır.
 *
 * Pure function — DB/network bağımlılığı yok, test edilir.
 *
 * Eşikler (gün):
 *   ≤ STALE_DAYS         → "fresh"      — yeşil
 *   ≤ VERY_STALE_DAYS    → "stale"      — sarı (re-sync önerilir)
 *   >  VERY_STALE_DAYS   → "very-stale" — kırmızı (kesinlikle re-sync)
 *   null builtAt         → "never"      — gri (hiç sync olmadı)
 */

export const STALE_DAYS = 7;
export const VERY_STALE_DAYS = 30;

export type SchemaAgeStatus = "fresh" | "stale" | "very-stale" | "never";

export function schemaAgeStatus(
  builtAt: Date | string | null | undefined,
  now: Date = new Date(),
): SchemaAgeStatus {
  if (!builtAt) return "never";
  const built = builtAt instanceof Date ? builtAt : new Date(builtAt);
  if (Number.isNaN(built.getTime())) return "never";
  const ageMs = now.getTime() - built.getTime();
  if (ageMs < 0) return "fresh"; // gelecek zaman = clock skew, defensive
  const ageDays = ageMs / (24 * 60 * 60_000);
  if (ageDays <= STALE_DAYS) return "fresh";
  if (ageDays <= VERY_STALE_DAYS) return "stale";
  return "very-stale";
}

/**
 * "X gün önce" formatına çevirir. null/invalid → null (caller "Henüz sync
 * yok" gibi i18n fallback gösterir).
 *
 * 0-23 saat → "saat" cinsinden; 1+ gün → "gün" cinsinden integer floor.
 * Türkçe-friendly: caller i18n template kullanır, sadece sayı + birim döner.
 */
export function schemaAgeRelative(
  builtAt: Date | string | null | undefined,
  now: Date = new Date(),
): { value: number; unit: "hour" | "day" } | null {
  if (!builtAt) return null;
  const built = builtAt instanceof Date ? builtAt : new Date(builtAt);
  if (Number.isNaN(built.getTime())) return null;
  const ageMs = now.getTime() - built.getTime();
  if (ageMs < 0) return { value: 0, unit: "hour" };
  const ageHours = ageMs / (60 * 60_000);
  if (ageHours < 24) return { value: Math.floor(ageHours), unit: "hour" };
  return { value: Math.floor(ageHours / 24), unit: "day" };
}

/**
 * Push notification tap → mobile navigation target.
 *
 * NOTE: bu dosya ESAS olarak mobile için yazıldı. Web side'da kullanılmıyor.
 * Vitest mobile/ klasörünü dışlıyor; bu yüzden helper'ı buraya koyup test
 * ediyoruz. Mobile karşılığı: `mobile/src/lib/notificationRouting.ts` —
 * iki dosya birebir aynı, değişiklik yapılırsa her ikisini güncelle.
 *
 * Server `sendPushToTenant({ data: {...} })` çağırırken hangi alanları
 * gönderiyor: bkz. src/lib/notifications/push.ts → call sites:
 *   - alerts route       : { alertId, severity, type }
 *   - anomaly engine     : { alertId, severity, type: "anomaly" }
 *   - watchlists cron    : { watchlistId }
 *
 * Test ile sağlanan kontratlar:
 *  - alertId varsa → "Bildirimler" tabına git (AlertsScreen)
 *  - watchlistId varsa → "Menü" tabı + Watchlists nested route
 *  - data null / undefined / boş → null (no-op, fallback navigation yok)
 *  - bilinmeyen şekiller → null
 */

export type RoutingTarget =
  | { tab: "Bildirimler" }
  | { tab: "Menü"; nestedRoute: "Watchlists" }
  | null;

export function routeFromNotificationData(data: unknown): RoutingTarget {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  if (typeof d.alertId === "string" && d.alertId.length > 0) {
    return { tab: "Bildirimler" };
  }
  if (typeof d.watchlistId === "string" && d.watchlistId.length > 0) {
    return { tab: "Menü", nestedRoute: "Watchlists" };
  }
  return null;
}

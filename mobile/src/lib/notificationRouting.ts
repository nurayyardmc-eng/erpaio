/**
 * Push notification tap → navigation target eşlemesi.
 *
 * SYNC NOTE: Mobile/ vitest exclude'da; bu helper'ın web ikizi
 * `src/lib/notifications/routing.ts` test'lenir. İki dosya birebir aynı
 * kalmalı — değişiklik yapılırsa her ikisini de güncelle.
 *
 * Server `sendPushToTenant({ data: {...} })` çağırırken hangi alanları
 * gönderiyor: bkz. src/lib/notifications/push.ts → call sites:
 *   - alerts route       : { alertId, severity, type }
 *   - anomaly engine     : { alertId, severity, type: "anomaly" }
 *   - watchlists cron    : { watchlistId }
 *
 * Bu pure function `routeFromNotificationData(data)` her bir veri şeklini
 * tab + nested route'a çevirir. Pure tutuyoruz ki unit test edebilelim
 * (gerçek navigation bağımlılığı olmadan).
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

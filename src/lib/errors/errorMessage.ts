/**
 * Safe error-message extraction for unknown thrown values.
 *
 * Track BBBBBBBBBBB — 6 site AYNI pattern'i tekrar ediyordu:
 *   err instanceof Error ? err.message : String(err)
 *
 * Sites:
 *   * lib/notifications/whatsapp — Twilio send catch
 *   * lib/notifications/email — Resend send catch
 *   * lib/anomaly/engine — alert dispatch catch
 *   * app/api/cron/scheduled-reports — report execution catch
 *   * app/api/cron/anomaly-detection — engine catch
 *   * app/api/health — DB ping catch
 *
 * Niye String(err) yetmiyor: Error objesi icin String(err) `"Error:
 * mesaj"` doner (prefix var). Tek noktada toplandiginda gelecekteki
 * davranis degisikligi (orn. Sentry stack trace ekleme) tek dosyada
 * yapilir.
 *
 * NOT: Stack trace eklenmiyor — log/audit context'inde err objesi
 * tamamen ayri field olarak gecsin (logger.error({ err }, msg)).
 * Bu helper sadece user-facing veya inline string ihtiyaci icin.
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

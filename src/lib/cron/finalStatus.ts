/**
 * CronRun status enum — Prisma DB schema ile birebir.
 *
 * Track SSSSSSSSSSS — admin/cron-runs route inline z.enum + tip
 * annotation'i tekrar ediyordu. Centralized constant + as const +
 * type export ile DB schema'siyla drift onlenir.
 *
 * RUNNING (acquire+finalize arasi) + 3 final status. CronRun.status
 * yalnizca bu 4 degerden birini alir.
 */
export const CRON_STATUSES = ["RUNNING", "SUCCESS", "PARTIAL_FAILURE", "FAILED"] as const;
export type CronStatus = (typeof CRON_STATUSES)[number];

/**
 * Derive cron run final status from failure / success counts.
 *
 * Track QQQQQQQQQQQ — 3 cron route AYNI ternary chain'i kullaniyordu:
 *   * cron/trial-warnings: `errors === 0 ? "SUCCESS" : sent > 0 ? "PARTIAL_FAILURE" : "FAILED"`
 *   * cron/scheduled-reports: `failed === 0 ? "SUCCESS" : executed > 0 ? "PARTIAL_FAILURE" : "FAILED"`
 *   * cron/watchlists: `failed === 0 ? "SUCCESS" : triggered > 0 || failed < watchlists.length ? "PARTIAL_FAILURE" : "FAILED"`
 *
 * Watchlists `triggered > 0 || failed < watchlists.length` ifadesi
 * matematiksel olarak `successCount > 0`'a esit (triggered ancak
 * success path'inde sayilir, dolayisiyla triggered > 0 -> successCount > 0;
 * ayrica failed < length -> successCount > 0). Helper bunlari tek shape'e
 * indirir.
 *
 * Lifecycle:
 *   * failedCount === 0 -> SUCCESS (her sey tikir)
 *   * successCount > 0 -> PARTIAL_FAILURE (en az bir basari, en az bir basarisiz)
 *   * else -> FAILED (sifir basari)
 *
 * Status string'leri CronRun.status enum'i ile birebir uyumlu (Prisma).
 */
export type CronFinalStatus = "SUCCESS" | "PARTIAL_FAILURE" | "FAILED";

export function deriveCronFinalStatus(
  failedCount: number,
  successCount: number,
): CronFinalStatus {
  if (failedCount === 0) return "SUCCESS";
  if (successCount > 0) return "PARTIAL_FAILURE";
  return "FAILED";
}

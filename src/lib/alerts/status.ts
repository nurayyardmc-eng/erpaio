/**
 * Alert status enums — canonical lifecycle stages and filter superset.
 *
 * Track OOOOOOOOOOO — 3 site inline z.enum kullaniyordu:
 *   * api/alerts GET QuerySchema: ["open", "acked", "resolved", "all"]
 *   * api/alerts PATCH PatchSchema: ["open", "acked", "resolved"]
 *   * api/alerts/bulk PostSchema:  ["acked", "resolved"]
 *
 * Lifecycle: open -> acked -> resolved (one-way except admin override).
 * "all" sadece filter superseti — DB'de bu deger asla persistlenmez,
 * sadece UI'da "tum statusler" gostermek icin query param value'su.
 *
 * Bulk update'te "open" yok cunku open transition manuel acklerla
 * tetiklenir; toplu "yeniden ac" akisi UX tasarimda yok.
 */

/** DB'de persistlenen alert.status icin gecerli degerler. */
export const ALERT_STATUSES = ["open", "acked", "resolved"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

/** UI query filter — DB statuslerine "all" eklenmis hali. */
export const ALERT_STATUS_FILTERS = [...ALERT_STATUSES, "all"] as const;
export type AlertStatusFilter = (typeof ALERT_STATUS_FILTERS)[number];

/** Bulk update'te kabul edilen target statuslar (open hariç). */
export const ALERT_BULK_UPDATE_STATUSES = ["acked", "resolved"] as const;
export type AlertBulkUpdateStatus = (typeof ALERT_BULK_UPDATE_STATUSES)[number];

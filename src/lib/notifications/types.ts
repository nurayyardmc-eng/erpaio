/**
 * Notification channel + delivery status enums.
 *
 * Track PPPPPPPPPPP — 2 site IDENTIK z.enum inline kullaniyordu:
 *   * api/admin/notifications GET QuerySchema
 *   * api/me/notification-log GET QuerySchema
 *
 * Channels: outbound notification kanallari (whatsapp/email/push +
 * slack/teams/webhook integrasyonlari). Push, Twilio/Resend gibi
 * external service'ler vs internal Slack/Teams/Webhook ayrimi
 * yapildi.
 *
 * Statuses: NotificationLog.status DB enum'i ile birebir; sent
 * (basarili), failed (provider hatasi), skipped (provider yapilandirilmamis
 * - test/dev'de no-op).
 */

export const NOTIFICATION_CHANNELS = [
  "whatsapp",
  "email",
  "push",
  "slack",
  "teams",
  "webhook",
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["sent", "failed", "skipped"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

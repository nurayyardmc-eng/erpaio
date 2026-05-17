// Notification delivery log helper.
//
// Sender modülleri (whatsapp/email/push/slack/teams/webhook) attempt sonucu
// burada loglar — sysadmin delivery health dashboard'unu doldurur.
//
// recordNotification() best-effort: log fail olursa ana flow bloklamaz,
// console.error ile görünür kalır.

import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "notification-log" });

export type NotificationChannel =
  | "whatsapp"
  | "email"
  | "push"
  | "slack"
  | "teams"
  | "webhook";

export type NotificationStatus = "sent" | "failed" | "skipped";

export interface RecordNotificationInput {
  tenantId: string;
  alertId?: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Best-effort delivery log. Sender'lar her attempt sonrası çağırır.
 * Asla throw etmez — log fail olursa stderr'e düşer.
 */
export async function recordNotification(input: RecordNotificationInput): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        tenantId: input.tenantId,
        alertId: input.alertId ?? null,
        channel: input.channel,
        status: input.status,
        // Email/whatsapp adresi audit için saklı; KVKK md. 7 silinme talebinde
        // tenant cascade ile zaten temizleniyor.
        recipient: input.recipient ?? null,
        error: input.error ? input.error.slice(0, 500) : null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (err) {
    log.error({ err, tenantId: input.tenantId, channel: input.channel }, "recordNotification failed");
    Sentry.captureException(err, {
      tags: { component: "notification-log", channel: input.channel },
      extra: { tenantId: input.tenantId, alertId: input.alertId },
    });
  }
}

/** Recipient'ı sentry-safe formatta kısalt (PII reduction). */
export function maskRecipient(channel: NotificationChannel, recipient: string | null | undefined): string | null {
  if (!recipient) return null;
  if (channel === "email") {
    // user@example.com → u***@example.com
    const [local, domain] = recipient.split("@");
    if (!domain) return recipient;
    return `${local.slice(0, 1)}***@${domain}`;
  }
  if (channel === "whatsapp" || channel === "push") {
    // whatsapp:+9055512345678 → whatsapp:+90555***5678
    // ExponentPushToken[xxx...yyy] → ...[8 char suffix]
    if (recipient.length <= 12) return recipient;
    return `${recipient.slice(0, 8)}***${recipient.slice(-4)}`;
  }
  return recipient;
}

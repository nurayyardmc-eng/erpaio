import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { recordNotification } from "./log";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/**
 * Expo Push API per-request limit. >100 mesaj tek POST'ta gönderirsek
 * Expo "PUSH_TOO_MANY_EXPERIENCE_IDS" döner ve TÜM batch düşer.
 */
export const EXPO_PUSH_BATCH_SIZE = 100;

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
  errors?: { code: string; message: string }[];
}

/**
 * Push notification kategori taksonomisi.
 * - `alerts`: manuel alert oluşturma (POST /api/alerts)
 * - `anomaly`: anomaly detection engine (lib/anomaly/engine.ts)
 * - `watchlists`: watchlist eşik tetikleyici (cron/watchlists)
 *
 * Kullanıcı her kategoriyi ayrı toggle'layabilir (KVKK md. 11 + GDPR Art. 21).
 */
export type PushCategory = "alerts" | "anomaly" | "watchlists";

/**
 * Kategori → User column eşlemesi.
 * Kategori eklerken hem `PushCategory` union'a hem buraya ekle + schema'da
 * `pushPref*` Boolean ekle.
 *
 * Exposed for testing — buildPushTokenWhere helper'ı bunu kullanır.
 */
export const PREF_COLUMN: Record<PushCategory, "pushPrefAlerts" | "pushPrefAnomaly" | "pushPrefWatchlists"> = {
  alerts: "pushPrefAlerts",
  anomaly: "pushPrefAnomaly",
  watchlists: "pushPrefWatchlists",
};

/**
 * PushToken sorgusunun where clause'ını oluşturur. Kategori undefined ise
 * filtre boş → legacy davranış (tüm tokenlar). Kategori varsa ilgili User
 * prefini true olanları filtreler.
 *
 * Exposed for testing — sendPushToTenant production caller'ı.
 */
export function buildPushTokenWhere(tenantId: string, category?: PushCategory) {
  if (!category) return { tenantId };
  return { tenantId, user: { [PREF_COLUMN[category]]: true } };
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  /**
   * Kategori — kullanıcı bu kategoriyi opt-out etmişse cihazına push gitmez.
   * Backwards-compat: undefined → eski davranış (tüm tokenlara gönderir).
   */
  category?: PushCategory;
  data?: Record<string, unknown>;
  channelId?: string;
}

/**
 * Generic array chunker. Test edilebilir, side-effect'siz.
 *
 *   chunkArray([1,2,3,4,5], 2) → [[1,2], [3,4], [5]]
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be positive");
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Tek bir Expo batch'i gönder + sonuçları ayrıştır.
 * Exposed for testing; production caller'ı sendPushToTenant.
 */
export async function sendExpoBatch(
  messages: ExpoMessage[],
  tokens: { token: string }[],
): Promise<{ sent: number; failed: number; invalidTokens: string[]; errors?: unknown }> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });

  const json = (await res.json()) as ExpoPushResponse;

  if (json.errors && json.errors.length > 0) {
    return { sent: 0, failed: tokens.length, invalidTokens: [], errors: json.errors };
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  if (json.data) {
    for (let i = 0; i < json.data.length; i++) {
      const ticket = json.data[i];
      if (ticket.status === "ok") {
        sent++;
      } else {
        failed++;
        if (ticket.details?.error === "DeviceNotRegistered" && tokens[i]) {
          invalidTokens.push(tokens[i].token);
        }
      }
    }
  }

  return { sent, failed, invalidTokens };
}

export async function sendPushToTenant(
  tenantId: string,
  options: PushNotificationOptions,
): Promise<{ sent: number; failed: number }> {
  const log = childLogger({ component: "push", tenantId, category: options.category });

  // Per-user opt-out filtresi: PushToken → User JOIN + pref kolonu = true.
  // Kategori belirtilmemişse legacy davranış: tüm tokenlara gönder.
  const tokens = await prisma.pushToken.findMany({
    where: buildPushTokenWhere(tenantId, options.category),
    select: { id: true, token: true, platform: true },
  });

  if (tokens.length === 0) {
    log.debug({}, "No push tokens for tenant (after pref filter)");
    return { sent: 0, failed: 0 };
  }

  const messages: ExpoMessage[] = tokens.map((t) => ({
    to: t.token,
    title: options.title,
    body: options.body,
    data: options.data,
    sound: "default",
    priority: "high",
    channelId: options.channelId ?? "default",
  }));

  // Expo Push API 100 mesaj/POST limit'i — büyük tenant'ları chunk'la gönder.
  const messageChunks = chunkArray(messages, EXPO_PUSH_BATCH_SIZE);
  const tokenChunks = chunkArray(tokens, EXPO_PUSH_BATCH_SIZE);

  let totalSent = 0;
  let totalFailed = 0;
  const allInvalidTokens: string[] = [];

  for (let i = 0; i < messageChunks.length; i++) {
    try {
      const result = await sendExpoBatch(messageChunks[i], tokenChunks[i]);
      totalSent += result.sent;
      totalFailed += result.failed;
      allInvalidTokens.push(...result.invalidTokens);
      if (result.errors) {
        log.error({ errors: result.errors, chunk: i }, "Expo Push API errors");
        Sentry.captureMessage("Expo Push API errors", {
          level: "warning",
          extra: { errors: result.errors, tenantId, chunk: i },
        });
      }
    } catch (err) {
      log.error({ err, chunk: i }, "Push chunk send failed");
      Sentry.captureException(err, {
        tags: { component: "push" },
        extra: { tenantId, chunk: i },
      });
      totalFailed += tokenChunks[i].length;
    }
  }

  if (allInvalidTokens.length > 0) {
    await prisma.pushToken.deleteMany({ where: { token: { in: allInvalidTokens } } });
    log.info({ count: allInvalidTokens.length }, "Invalidated unregistered push tokens");
  }

  log.info(
    { sent: totalSent, failed: totalFailed, total: tokens.length, chunks: messageChunks.length, title: options.title },
    "Push send",
  );

  // Tek aggregate row — her token için ayrı kayıt notification log'u
  // büyütür ve delivery dashboard'unda gürültü yapar.
  void recordNotification({
    tenantId,
    channel: "push",
    status: totalFailed === 0 && totalSent > 0 ? "sent" : totalSent > 0 ? "failed" : "failed",
    recipient: null, // tenant-wide broadcast, recipient yok
    metadata: {
      total: tokens.length,
      sent: totalSent,
      failed: totalFailed,
      chunks: messageChunks.length,
      category: options.category ?? null,
    },
    error: totalFailed > 0 ? `${totalFailed}/${tokens.length} push delivery failed` : null,
  });

  return { sent: totalSent, failed: totalFailed };
}

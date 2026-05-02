import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

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

export interface PushNotificationOptions {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
}

export async function sendPushToTenant(
  tenantId: string,
  options: PushNotificationOptions,
): Promise<{ sent: number; failed: number }> {
  const log = childLogger({ component: "push", tenantId });

  const tokens = await prisma.pushToken.findMany({
    where: { tenantId },
    select: { id: true, token: true, platform: true },
  });

  if (tokens.length === 0) {
    log.debug({}, "No push tokens for tenant");
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

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    const json = (await res.json()) as ExpoPushResponse;

    if (json.errors && json.errors.length > 0) {
      log.error({ errors: json.errors }, "Expo Push API errors");
      Sentry.captureMessage("Expo Push API errors", { level: "warning", extra: { errors: json.errors, tenantId } });
      failed = tokens.length;
    } else if (json.data) {
      for (let i = 0; i < json.data.length; i++) {
        const ticket = json.data[i];
        if (ticket.status === "ok") {
          sent++;
        } else {
          failed++;
          if (ticket.details?.error === "DeviceNotRegistered") {
            invalidTokens.push(tokens[i].token);
          }
        }
      }
    }

    if (invalidTokens.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
      log.info({ count: invalidTokens.length }, "Invalidated unregistered push tokens");
    }
  } catch (err) {
    log.error({ err }, "Push send failed");
    Sentry.captureException(err, { tags: { component: "push" }, extra: { tenantId } });
    failed = tokens.length;
  }

  log.info({ sent, failed, total: tokens.length, title: options.title }, "Push send");
  return { sent, failed };
}

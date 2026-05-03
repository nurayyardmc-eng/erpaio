import { createHmac } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "webhook" });

export interface WebhookPayload {
  url: string;
  secret?: string | null;
  event: string;
  data: Record<string, unknown>;
}

export async function sendWebhook(payload: WebhookPayload): Promise<{ ok: boolean }> {
  const body = JSON.stringify({
    event: payload.event,
    timestamp: new Date().toISOString(),
    data: payload.data,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ERPAIO-Webhook/1.0",
    "X-ERPAIO-Event": payload.event,
  };

  if (payload.secret) {
    const sig = createHmac("sha256", payload.secret).update(body).digest("hex");
    headers["X-ERPAIO-Signature"] = `sha256=${sig}`;
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(payload.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      log.warn({ status: res.status, event: payload.event }, "Webhook non-2xx");
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    log.error({ err, event: payload.event }, "Webhook failed");
    Sentry.captureException(err, { tags: { component: "webhook" } });
    return { ok: false };
  }
}

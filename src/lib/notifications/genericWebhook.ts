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

// Exported for test (Track LLLL). Pure body/headers builder, no I/O.
export function buildWebhookRequest(payload: Omit<WebhookPayload, "url">, timestamp: string): {
  body: string;
  headers: Record<string, string>;
} {
  const body = JSON.stringify({
    event: payload.event,
    timestamp,
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

  return { body, headers };
}

export async function sendWebhook(payload: WebhookPayload): Promise<{ ok: boolean }> {
  const { body, headers } = buildWebhookRequest(payload, new Date().toISOString());

  const delays = [0, 2000, 8000];
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(payload.url, {
        method: "POST",
        headers: { ...headers, "X-ERPAIO-Attempt": String(attempt + 1) },
        body,
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        if (attempt > 0) log.info({ event: payload.event, attempt }, "Webhook succeeded after retry");
        return { ok: true };
      }
      lastErr = `HTTP ${res.status}`;
      log.warn({ status: res.status, event: payload.event, attempt }, "Webhook non-2xx, will retry");
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        break;
      }
    } catch (err) {
      lastErr = err;
      log.warn({ err, event: payload.event, attempt }, "Webhook attempt failed");
    }
  }

  log.error({ err: lastErr, event: payload.event }, "Webhook failed after 3 attempts");
  Sentry.captureException(lastErr instanceof Error ? lastErr : new Error(String(lastErr)), {
    tags: { component: "webhook" },
    extra: { event: payload.event, url: payload.url },
  });
  return { ok: false };
}

import * as Sentry from "@sentry/nextjs";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "slack" });

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#FF3B30",
  high: "#FF9500",
  medium: "#FFD740",
  low: "#00E5FF",
};

export interface SlackPayload {
  webhookUrl: string;
  severity: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

// Exported for test (Track JJJJ). Pure block-kit builder, no I/O.
export function buildSlackBody(payload: Omit<SlackPayload, "webhookUrl">) {
  const color = SEVERITY_COLORS[payload.severity] ?? "#9AA5B4";
  return {
    attachments: [
      {
        color,
        fallback: `[ERPAIO ${payload.severity.toUpperCase()}] ${payload.title}`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `${emoji(payload.severity)} ${payload.title}` },
          },
          ...(payload.description
            ? [{ type: "section", text: { type: "mrkdwn", text: payload.description } }]
            : []),
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `*Severity:* ${payload.severity.toUpperCase()}` },
              { type: "mrkdwn", text: `*Source:* ERPAIO` },
            ],
          },
        ],
      },
    ],
  };
}

export async function sendSlack(payload: SlackPayload): Promise<{ ok: boolean }> {
  const body = buildSlackBody(payload);

  try {
    const res = await fetch(payload.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      log.warn({ status: res.status }, "Slack webhook non-2xx");
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    log.error({ err }, "Slack webhook failed");
    Sentry.captureException(err, { tags: { component: "slack" } });
    return { ok: false };
  }
}

function emoji(severity: string): string {
  return { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵" }[severity] ?? "⚪";
}

import * as Sentry from "@sentry/nextjs";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "teams" });

const SEVERITY_COLORS: Record<string, string> = {
  critical: "FF3B30",
  high: "FF9500",
  medium: "FFD740",
  low: "00E5FF",
};

export interface TeamsPayload {
  webhookUrl: string;
  severity: string;
  title: string;
  description?: string | null;
}

export async function sendTeams(payload: TeamsPayload): Promise<{ ok: boolean }> {
  const color = SEVERITY_COLORS[payload.severity] ?? "9AA5B4";
  const body = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: color,
    summary: `[ERPAIO ${payload.severity.toUpperCase()}] ${payload.title}`,
    title: `${payload.severity.toUpperCase()} · ${payload.title}`,
    text: payload.description ?? "",
  };

  try {
    const res = await fetch(payload.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      log.warn({ status: res.status }, "Teams webhook non-2xx");
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    log.error({ err }, "Teams webhook failed");
    Sentry.captureException(err, { tags: { component: "teams" } });
    return { ok: false };
  }
}

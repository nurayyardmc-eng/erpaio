import * as Sentry from "@sentry/nextjs";
import { childLogger } from "@/lib/observability/logger";
import { localizedAlertDescription, type AnomalyMessageParams } from "@/lib/anomaly/messages";

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
  /** Feature 6.2 — locale-aware re-render via renderAnomalyMessage. */
  evidence?: { messageKey?: string; messageParams?: AnomalyMessageParams } | null;
  locale?: "tr" | "en" | string;
}

// Exported for test (Track KKKK). Pure MessageCard builder, no I/O.
export function buildTeamsBody(payload: Omit<TeamsPayload, "webhookUrl">) {
  const color = SEVERITY_COLORS[payload.severity] ?? "9AA5B4";
  const locale = payload.locale ?? "tr";
  const body = localizedAlertDescription(payload.evidence ?? null, payload.description ?? null, locale);
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: color,
    summary: `[ERPAIO ${localizedSeverity(payload.severity, locale)}] ${payload.title}`,
    title: `${localizedSeverity(payload.severity, locale)} · ${payload.title}`,
    text: body,
  };
}

/**
 * Localized severity label for the title/summary prefix. EN keeps the
 * universal uppercase code (HIGH/MEDIUM/…) for IT-channel consistency;
 * TR uses Türkçe equivalents (YÜKSEK/ORTA/…) so on-call engineers reading
 * Türkçe Teams channels get a native message.
 */
function localizedSeverity(severity: string, locale: string): string {
  const upper = severity.toUpperCase();
  if (locale === "en") return upper;
  const tr: Record<string, string> = {
    CRITICAL: "KRİTİK",
    HIGH: "YÜKSEK",
    MEDIUM: "ORTA",
    LOW: "DÜŞÜK",
  };
  return tr[upper] ?? upper;
}

export async function sendTeams(payload: TeamsPayload): Promise<{ ok: boolean }> {
  const body = buildTeamsBody(payload);

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

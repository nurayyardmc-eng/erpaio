import twilio from "twilio";
import * as Sentry from "@sentry/nextjs";
import { childLogger } from "@/lib/observability/logger";
import { recordNotification, maskRecipient } from "./log";
import { errorMessage } from "@/lib/errors/errorMessage";
import {
  localizedAlertDescription,
  type AnomalyMessageParams,
} from "@/lib/anomaly/messages";

const log = childLogger({ component: "whatsapp" });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SendOptions {
  to?: string;
  /** Delivery log için — varsa tenant + alert ile log'a yazılır. */
  tenantId?: string;
  alertId?: string;
}

export async function sendWhatsApp(message: string, options: SendOptions = {}): Promise<{ ok: boolean }> {
  const toNumber = options.to ?? process.env.TWILIO_WHATSAPP_TO;

  if (!client) {
    log.warn({}, "Twilio credentials not set; WhatsApp skipped");
    if (options.tenantId) {
      void recordNotification({
        tenantId: options.tenantId,
        alertId: options.alertId,
        channel: "whatsapp",
        status: "skipped",
        recipient: maskRecipient("whatsapp", toNumber),
        error: "Twilio credentials not configured",
      });
    }
    return { ok: false };
  }

  if (!toNumber) {
    log.warn({}, "WhatsApp alıcı numarası tanımlı değil (tenant.whatsappTo veya TWILIO_WHATSAPP_TO)");
    if (options.tenantId) {
      void recordNotification({
        tenantId: options.tenantId,
        alertId: options.alertId,
        channel: "whatsapp",
        status: "skipped",
        error: "Recipient not configured",
      });
    }
    return { ok: false };
  }

  // Misconfigured sender → skip cleanly instead of sending `from: undefined`,
  // which only fails opaquely at the Twilio API.
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    log.warn("TWILIO_WHATSAPP_FROM not configured — skipping WhatsApp send");
    if (options.tenantId) {
      void recordNotification({
        tenantId: options.tenantId,
        alertId: options.alertId,
        channel: "whatsapp",
        status: "skipped",
        error: "Sender not configured",
      });
    }
    return { ok: false };
  }

  try {
    await client.messages.create({
      from,
      to: toNumber,
      body: message,
    });
    log.info({ to: toNumber }, "WhatsApp sent");
    if (options.tenantId) {
      void recordNotification({
        tenantId: options.tenantId,
        alertId: options.alertId,
        channel: "whatsapp",
        status: "sent",
        recipient: maskRecipient("whatsapp", toNumber),
      });
    }
    return { ok: true };
  } catch (err) {
    log.error({ err, to: toNumber }, "WhatsApp send failed");
    Sentry.captureException(err, { tags: { component: "whatsapp" } });
    if (options.tenantId) {
      void recordNotification({
        tenantId: options.tenantId,
        alertId: options.alertId,
        channel: "whatsapp",
        status: "failed",
        recipient: maskRecipient("whatsapp", toNumber),
        error: errorMessage(err),
      });
    }
    return { ok: false };
  }
}

export function formatAlert(
  alert: {
    severity: string;
    title: string;
    description?: string | null;
    /**
     * Feature 6.2 — if present and contains messageKey, the description is
     * re-rendered in `locale` via renderAnomalyMessage. Old alerts without
     * structured evidence fall back to stored TR `description`.
     */
    evidence?: { messageKey?: string; messageParams?: AnomalyMessageParams } | null;
  },
  locale: "tr" | "en" | string = "tr",
): string {
  const emoji: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
  };
  const body = localizedAlertDescription(alert.evidence, alert.description ?? null, locale);
  return `${emoji[alert.severity] ?? "⚪"} *ERPAIO Alert*\n\n*${alert.title}*\n${body}`;
}

const SEVERITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function shouldNotify(
  severity: string,
  minSeverity: string,
): boolean {
  return (SEVERITY_RANK[severity] ?? 0) >= (SEVERITY_RANK[minSeverity] ?? 4);
}

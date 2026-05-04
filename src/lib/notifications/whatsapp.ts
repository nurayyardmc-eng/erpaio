import twilio from "twilio";
import * as Sentry from "@sentry/nextjs";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "whatsapp" });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SendOptions {
  to?: string;
}

export async function sendWhatsApp(message: string, options: SendOptions = {}): Promise<{ ok: boolean }> {
  if (!client) {
    log.warn({}, "Twilio credentials not set; WhatsApp skipped");
    return { ok: false };
  }

  const toNumber = options.to ?? process.env.TWILIO_WHATSAPP_TO;
  if (!toNumber) {
    log.warn({}, "WhatsApp alıcı numarası tanımlı değil (tenant.whatsappTo veya TWILIO_WHATSAPP_TO)");
    return { ok: false };
  }

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to: toNumber,
      body: message,
    });
    log.info({ to: toNumber }, "WhatsApp sent");
    return { ok: true };
  } catch (err) {
    log.error({ err, to: toNumber }, "WhatsApp send failed");
    Sentry.captureException(err, { tags: { component: "whatsapp" } });
    return { ok: false };
  }
}

export function formatAlert(alert: {
  severity: string;
  title: string;
  description?: string | null;
}): string {
  const emoji: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
  };
  return `${emoji[alert.severity] ?? "⚪"} *ERPAIO Alert*\n\n*${alert.title}*\n${alert.description ?? ""}`;
}

const SEVERITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function shouldNotify(
  severity: string,
  minSeverity: string,
): boolean {
  return (SEVERITY_RANK[severity] ?? 0) >= (SEVERITY_RANK[minSeverity] ?? 4);
}

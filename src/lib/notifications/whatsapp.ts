import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export interface SendOptions {
  to?: string;
}

export async function sendWhatsApp(message: string, options: SendOptions = {}): Promise<void> {
  const toNumber = options.to ?? process.env.TWILIO_WHATSAPP_TO;
  if (!toNumber) {
    throw new Error("WhatsApp alıcı numarası tanımlı değil (tenant.whatsappTo veya TWILIO_WHATSAPP_TO).");
  }
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: toNumber,
    body: message,
  });
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

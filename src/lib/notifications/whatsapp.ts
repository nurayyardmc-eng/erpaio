import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendWhatsApp(message: string, to?: string) {
  const toNumber = to ?? process.env.TWILIO_WHATSAPP_TO!;
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

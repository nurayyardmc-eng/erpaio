import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { childLogger } from "@/lib/observability/logger";
import { prisma } from "@/lib/db/prisma";

const log = childLogger({ component: "email" });

const apiKey = process.env.RESEND_API_KEY;
const defaultFrom = process.env.RESEND_FROM ?? "ERPAIO <noreply@erpaio.app>";
const fromDomain = (process.env.RESEND_FROM ?? "noreply@erpaio.app").match(/<?([^>]+@[^>]+)>?/)?.[1]?.split("@")[1] ?? "erpaio.app";

const client = apiKey ? new Resend(apiKey) : null;

const senderCache = new Map<string, { from: string; ts: number }>();
const CACHE_TTL = 5 * 60_000;

async function resolveSenderFor(tenantId: string): Promise<string> {
  const cached = senderCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.from;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { brandingSenderName: true, plan: true },
  }).catch(() => null);

  const senderName = tenant?.brandingSenderName?.trim();
  const from = senderName && tenant?.plan === "enterprise"
    ? `${senderName} <noreply@${fromDomain}>`
    : defaultFrom;

  senderCache.set(tenantId, { from, ts: Date.now() });
  return from;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  tenantId?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ ok: boolean; id?: string }> {
  if (!client) {
    log.warn({}, "Resend API key not set; email skipped");
    return { ok: false };
  }

  const from = options.tenantId ? await resolveSenderFor(options.tenantId) : defaultFrom;

  try {
    const result = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html ?? options.text ?? "",
      text: options.text,
      replyTo: options.replyTo,
    });
    log.info({ to: options.to, id: result.data?.id, from }, "Email sent");
    return { ok: true, id: result.data?.id };
  } catch (err) {
    log.error({ err }, "Email send failed");
    Sentry.captureException(err, { tags: { component: "email" } });
    return { ok: false };
  }
}

export function alertEmailHtml(opts: { severity: string; title: string; description?: string | null }): string {
  const sevColors: Record<string, { fg: string; bg: string }> = {
    critical: { fg: "#DC2626", bg: "#FEE2E2" },
    high: { fg: "#F59E0B", bg: "#FEF3C7" },
    medium: { fg: "#3B82F6", bg: "#DBEAFE" },
    low: { fg: "#475569", bg: "#F3F4F6" },
  };
  const sev = sevColors[opts.severity] ?? sevColors.low;
  return `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px;border-left:4px solid ${sev.fg}">
    <div style="display:inline-block;background:${sev.bg};color:${sev.fg};font-size:11px;letter-spacing:1.5px;padding:4px 10px;border-radius:999px;margin-bottom:16px;font-weight:700">${opts.severity.toUpperCase()} ALERT</div>
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;letter-spacing:-0.3px">${escapeHtml(opts.title)}</h2>
    ${opts.description ? `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0">${escapeHtml(opts.description)}</p>` : ""}
    <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:16px">— ERPAIO</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

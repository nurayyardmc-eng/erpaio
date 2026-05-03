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
  const colors: Record<string, string> = {
    critical: "#FF3B30",
    high: "#FF9500",
    medium: "#FFD740",
    low: "#00E5FF",
  };
  const color = colors[opts.severity] ?? "#9AA5B4";
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#07090F;color:#E8EDF5;font-family:monospace">
  <div style="max-width:560px;margin:0 auto;background:#0C1018;border:1px solid #131A26;border-radius:12px;padding:24px;border-left:4px solid ${color}">
    <div style="color:${color};font-size:11px;letter-spacing:2px;margin-bottom:8px">${opts.severity.toUpperCase()} ALERT</div>
    <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(opts.title)}</h2>
    ${opts.description ? `<p style="color:#9AA5B4;font-size:13px;line-height:1.6">${escapeHtml(opts.description)}</p>` : ""}
    <p style="color:#3A4558;font-size:11px;margin-top:24px">— ERPAIO</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

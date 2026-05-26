import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { sendWhatsApp, formatAlert, shouldNotify } from "@/lib/notifications/whatsapp";
import { sendPushToTenant } from "@/lib/notifications/push";
import { sendEmail, alertEmailHtml } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError } from "@/lib/i18n/server";
import { parseQuery, parseJsonBody } from "@/lib/http/searchParams";
import { zSeverity } from "@/lib/auth/schemas";

const QuerySchema = z.object({
  status: z.enum(["open", "acked", "resolved", "all"]).default("open"),
});

const PostSchema = z.object({
  type: z.string().min(1).max(80),
  severity: zSeverity().default("medium"),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  module: z.string().max(80).optional(),
});

const PatchSchema = z.object({
  id: z.string().min(1).max(48),
  status: z.enum(["open", "acked", "resolved"]),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const alerts = await prisma.alert.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(q.status !== "all" && { status: q.status }),
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return Response.json(alerts);
}

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = await parseJsonBody(req, PostSchema);
  if (body instanceof Response) return body;

  const alert = await prisma.alert.create({
    data: {
      tenantId: session.user.tenantId,
      type: body.type,
      severity: body.severity,
      title: body.title,
      description: body.description,
      module: body.module,
    },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      whatsappTo: true, whatsappEnabled: true,
      emailTo: true, emailEnabled: true,
      alertMinSeverity: true,
    },
  });

  if (tenant && shouldNotify(alert.severity, tenant.alertMinSeverity)) {
    if (tenant.whatsappEnabled) {
      sendWhatsApp(formatAlert(alert), {
        to: tenant.whatsappTo ?? undefined,
        tenantId: session.user.tenantId,
        alertId: alert.id,
      }).catch((err) => {
        const log = childLogger({ component: "alerts", alertId: alert.id });
        log.error({ err, severity: alert.severity }, "WhatsApp send failed");
        Sentry.captureException(err, {
          tags: { component: "alerts", subsystem: "whatsapp" },
          extra: { alertId: alert.id, severity: alert.severity },
        });
      });
    }

    sendPushToTenant(session.user.tenantId, {
      category: "alerts",
      title: `${alert.severity.toUpperCase()} · ${alert.title}`,
      body: alert.description ?? alert.title,
      data: { alertId: alert.id, severity: alert.severity, type: alert.type },
    }).catch((err) => {
      const log = childLogger({ component: "alerts", alertId: alert.id });
      log.error({ err, severity: alert.severity }, "Push send failed");
      Sentry.captureException(err, {
        tags: { component: "alerts", subsystem: "push" },
        extra: { alertId: alert.id, severity: alert.severity },
      });
    });

    if (tenant.emailEnabled && tenant.emailTo) {
      sendEmail({
        to: tenant.emailTo,
        subject: `[ERPAIO ${alert.severity.toUpperCase()}] ${alert.title}`,
        html: alertEmailHtml({ severity: alert.severity, title: alert.title, description: alert.description }),
        tenantId: session.user.tenantId,
        alertId: alert.id,
      }).catch((err) => {
        const log = childLogger({ component: "alerts", alertId: alert.id });
        log.error({ err, severity: alert.severity }, "Alert email send failed");
        Sentry.captureException(err, {
          tags: { component: "alerts", subsystem: "email" },
          extra: { alertId: alert.id, severity: alert.severity },
        });
      });
    }
  }

  return Response.json(alert);
}

export async function PATCH(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  // Atomik tenant-scoped update — başka tenant'ın alert'i id ile bilinse bile güncellenemez.
  const result = await prisma.alert.updateMany({
    where: { id: body.id, tenantId: session.user.tenantId },
    data: { status: body.status },
  });
  if (result.count === 0) return jsonError(req, "api.notFound", 404);

  return Response.json({ ok: true });
}
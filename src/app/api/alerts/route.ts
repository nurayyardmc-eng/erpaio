import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { sendWhatsApp, formatAlert, shouldNotify } from "@/lib/notifications/whatsapp";
import { childLogger } from "@/lib/observability/logger";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";

  const alerts = await prisma.alert.findMany({
    where: { tenantId: session.user.tenantId, status },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return Response.json(alerts);
}

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const body = await req.json();

  const alert = await prisma.alert.create({
    data: {
      tenantId: session.user.tenantId,
      type: body.type,
      severity: body.severity ?? "medium",
      title: body.title,
      description: body.description,
      module: body.module,
    },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { whatsappTo: true, whatsappEnabled: true, alertMinSeverity: true },
  });

  if (
    tenant?.whatsappEnabled &&
    shouldNotify(alert.severity, tenant.alertMinSeverity)
  ) {
    sendWhatsApp(formatAlert(alert), { to: tenant.whatsappTo ?? undefined }).catch((err) => {
      const log = childLogger({ component: "alerts", alertId: alert.id });
      log.error({ err, severity: alert.severity }, "WhatsApp send failed");
      Sentry.captureException(err, {
        tags: { component: "alerts", subsystem: "whatsapp" },
        extra: { alertId: alert.id, severity: alert.severity },
      });
    });
  }

  return Response.json(alert);
}

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { id, status } = await req.json();

  const alert = await prisma.alert.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!alert) return Response.json({ error: "Bulunamadı." }, { status: 404 });

  await prisma.alert.update({ where: { id }, data: { status } });
  return Response.json({ ok: true });
}
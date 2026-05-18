import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";

export const maxDuration = 300;

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (session.user.role !== "owner") {
    return localizedError(req, 403, { tr: "Yalnızca tenant sahibi export alabilir.", en: "Only the tenant owner can export." });
  }

  const tenantId = session.user.tenantId;
  const log = childLogger({ component: "tenant-export", tenantId });

  const [tenant, users, connections, sessions, alerts, baselines, queryCache, annotations, scheduledReports, watchlists, integrations, npsResponses] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, slug: true, plan: true,
        whatsappTo: true, whatsappEnabled: true, emailTo: true, emailEnabled: true,
        alertMinSeverity: true, monthlyTokenBudget: true, monthlyTokensUsed: true,
        trialEndsAt: true, brandingLogoUrl: true, brandingPrimary: true,
        brandingSenderName: true, createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, name: true, role: true, totpEnabled: true, emailVerifiedAt: true, createdAt: true },
    }),
    prisma.erpConnection.findMany({
      where: { tenantId },
      select: { id: true, erpType: true, erpProfile: true, host: true, port: true, dbName: true, username: true, status: true, lastSync: true, createdAt: true },
    }),
    prisma.chatSession.findMany({
      where: { tenantId },
      include: {
        messages: {
          select: { id: true, role: true, content: true, sqlQuery: true, rowCount: true, latencyMs: true, success: true, feedback: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.alert.findMany({ where: { tenantId } }),
    prisma.anomalyBaseline.findMany({ where: { tenantId }, take: 5000, orderBy: { capturedAt: "desc" } }),
    prisma.queryCache.findMany({ where: { tenantId } }),
    prisma.schemaAnnotation.findMany({ where: { tenantId } }),
    prisma.scheduledReport.findMany({ where: { tenantId } }),
    prisma.watchlist.findMany({ where: { tenantId } }),
    prisma.tenantIntegration.findMany({
      where: { tenantId },
      select: { id: true, kind: true, enabled: true, lastSuccessAt: true, lastErrorAt: true, lastError: true, createdAt: true },
    }),
    prisma.npsResponse.findMany({ where: { tenantId } }),
  ]);

  const exportBundle = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      kvkkNotice: "Bu export KVKK md. 11 ve GDPR Art. 20 (data portability) hakkı kapsamındadır. Hassas alanlar (passwordHash, encrypted secrets, push tokens) DAHIL EDILMEMIŞTIR.",
    },
    tenant,
    users,
    connections,
    sessions,
    alerts,
    baselines,
    queryCache,
    annotations,
    scheduledReports,
    watchlists,
    integrations,
    npsResponses,
  };

  const totalMessages = sessions.reduce((acc, s) => acc + s.messages.length, 0);
  log.info({
    sessions: sessions.length,
    messages: totalMessages,
    alerts: alerts.length,
  }, "Tenant data export generated");

  // KVKK md. 13 + GDPR Art. 20 — export her gerçekleştiğinde audit log.
  // Hassas işlem (tüm tenant verisi dışarı) — kim, ne zaman, hangi IP'den.
  await recordActivity({
    userId: session.user.id,
    tenantId,
    email: session.user.email ?? null,
    action: "tenant.export",
    metadata: {
      sessions: sessions.length,
      messages: totalMessages,
      alerts: alerts.length,
      users: users.length,
    },
    ...activityContextFromRequest(req),
  });

  return new Response(JSON.stringify(exportBundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="erpaio-export-${tenantId}-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getAuth } from "@/lib/auth/dual";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";;
import { parseQuery, zNumber } from "@/lib/http/searchParams";
import { isOwnerOrAdmin } from "@/lib/auth/role";
import { ONE_DAY_MS } from "@/lib/time/units";

/**
 * Tenant-scoped NotificationLog — owner/admin son N gün delivery audit
 * trail'ini görür. Sysadmin /api/admin/notifications cross-tenant zaten vardı;
 * bu endpoint tenant scope'lu.
 *
 * KVKK md. 13 işleme faaliyet kaydı + outbound notification transparency.
 * recipient alanı zaten masked save edildi (push tokens hash'i, vb.).
 */
const QuerySchema = z.object({
  limit: zNumber({ min: 1, max: 200, default: 100, int: true }),
  channel: z.enum(["whatsapp", "email", "push", "slack", "teams", "webhook"]).optional(),
  status: z.enum(["sent", "failed", "skipped"]).optional(),
  /** Kaç gün öncesine bakılsın (default 7, max 90 — retention 180 gün ama UI
   *  pratiği 30 yeterli). */
  days: zNumber({ min: 1, max: 90, default: 7, int: true }),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (!isOwnerOrAdmin(session.user.role)) {
    return localizedError(req, 403, {
      tr: "Bu sayfa yalnızca owner / admin rollerine açıktır.",
      en: "This page is only available to owner / admin roles.",
    });
  }

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.ADMIN_READ);
  if (limited) return limited;

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const since = new Date(Date.now() - q.days * ONE_DAY_MS);
  const where: {
    tenantId: string;
    channel?: string;
    status?: string;
    createdAt: { gt: Date };
  } = { tenantId: session.user.tenantId, createdAt: { gt: since } };
  if (q.channel) where.channel = q.channel;
  if (q.status) where.status = q.status;

  const recent = await prisma.notificationLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: q.limit,
    select: {
      id: true,
      alertId: true,
      channel: true,
      status: true,
      recipient: true,
      error: true,
      createdAt: true,
    },
  });

  // Channel × status breakdown (last N days)
  const breakdown = await prisma.notificationLog.groupBy({
    by: ["channel", "status"],
    where: { tenantId: session.user.tenantId, createdAt: { gt: since } },
    _count: { _all: true },
  });

  type ChannelSummary = {
    sent: number;
    failed: number;
    skipped: number;
    total: number;
    successRate: number;
  };
  const summary: Record<string, ChannelSummary> = {};
  for (const row of breakdown) {
    if (!summary[row.channel]) {
      summary[row.channel] = { sent: 0, failed: 0, skipped: 0, total: 0, successRate: 0 };
    }
    const s = summary[row.channel];
    if (row.status === "sent") s.sent += row._count._all;
    else if (row.status === "failed") s.failed += row._count._all;
    else if (row.status === "skipped") s.skipped += row._count._all;
    s.total += row._count._all;
  }
  for (const ch of Object.keys(summary)) {
    const s = summary[ch];
    const attempted = s.sent + s.failed;
    s.successRate = attempted > 0 ? s.sent / attempted : 0;
  }

  return Response.json({
    recent,
    summary,
    days: q.days,
    generatedAt: new Date().toISOString(),
  });
}

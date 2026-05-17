import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { parseQuery, zNumber } from "@/lib/http/searchParams";

const QuerySchema = z.object({
  limit: zNumber({ min: 1, max: 200, default: 100, int: true }),
  action: z.string().min(1).max(80).optional(),
  tenantId: z.string().min(1).max(48).optional(),
  userId: z.string().min(1).max(48).optional(),
});

/**
 * Sysadmin: cross-tenant ActivityLog — KVKK md. 13 + GDPR Art. 30 işleme
 * faaliyet kaydı (kurumsal denetim için). Tenant kullanıcısı kendi log'unu
 * /api/me/activity'den alır.
 */
export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limit = await rateLimit(guard.userId, RATE_LIMITS.ADMIN_READ);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const where: { action?: string; tenantId?: string; userId?: string } = {};
  if (q.action) where.action = q.action;
  if (q.tenantId) where.tenantId = q.tenantId;
  if (q.userId) where.userId = q.userId;

  const activities = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: q.limit,
    select: {
      id: true,
      userId: true,
      tenantId: true,
      email: true,
      action: true,
      target: true,
      metadata: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      tenant: { select: { name: true } },
    },
  });

  // Action breakdown last 24h
  const last24h = new Date(Date.now() - 24 * 60 * 60_000);
  const breakdown = await prisma.activityLog.groupBy({
    by: ["action"],
    where: { createdAt: { gt: last24h } },
    _count: { _all: true },
    orderBy: { _count: { action: "desc" } },
    take: 10,
  });

  return Response.json({
    activities,
    breakdown: breakdown.map((b) => ({ action: b.action, count: b._count._all })),
    generatedAt: new Date().toISOString(),
  });
}

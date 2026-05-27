import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";
import { parseQuery, zNumber } from "@/lib/http/searchParams";
import { daysAgo } from "@/lib/time/units";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationStatus,
} from "@/lib/notifications/types";

const QuerySchema = z.object({
  limit: zNumber({ min: 1, max: 200, default: 100, int: true }),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
});

/**
 * Sysadmin: cross-tenant NotificationLog ile delivery health visibility.
 * Per-channel sent/failed breakdown + son N attempt.
 */
export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limited = await enforceUserRateLimit(req, guard.userId, RATE_LIMITS.ADMIN_READ);
  if (limited) return limited;

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const where: { channel?: NotificationChannel; status?: NotificationStatus } = {};
  if (q.channel) where.channel = q.channel;
  if (q.status) where.status = q.status;

  // Son N attempt — son 24h içindekiler
  const last24h = daysAgo(1);
  const recent = await prisma.notificationLog.findMany({
    where: { ...where, createdAt: { gt: last24h } },
    orderBy: { createdAt: "desc" },
    take: q.limit,
    select: {
      id: true,
      tenantId: true,
      alertId: true,
      channel: true,
      status: true,
      recipient: true,
      error: true,
      metadata: true,
      createdAt: true,
      tenant: { select: { name: true } },
    },
  });

  // Channel × status × last24h breakdown
  const breakdown = await prisma.notificationLog.groupBy({
    by: ["channel", "status"],
    where: { createdAt: { gt: last24h } },
    _count: { _all: true },
  });

  // Re-shape into channel → {sent, failed, skipped, total, successRate}
  const summary: Record<string, { sent: number; failed: number; skipped: number; total: number; successRate: number }> = {};
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
  // Compute success rate
  for (const ch of Object.keys(summary)) {
    const s = summary[ch];
    const attempted = s.sent + s.failed;
    s.successRate = attempted > 0 ? s.sent / attempted : 0;
  }

  return Response.json({
    recent,
    summary,
    generatedAt: new Date().toISOString(),
  });
}

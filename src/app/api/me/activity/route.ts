import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { parseQuery, zNumber } from "@/lib/http/searchParams";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";;

/**
 * KVKK md. 11 + GDPR Art. 15 — kullanıcının kendi hassas işlem geçmişine erişim.
 * Sayfanın sahibi sadece kendi işlemlerini görür. Tenant admin ayrı (audit ekranı).
 */
const QuerySchema = z.object({
  limit: zNumber({ min: 1, max: 200, default: 50, int: true }),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.CONSENTS_READ);
  if (limited) return limited;

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const activities = await prisma.activityLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: q.limit,
  });

  return Response.json({
    activities: activities.map((a) => ({
      id: a.id,
      action: a.action,
      target: a.target,
      metadata: a.metadata,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      createdAt: a.createdAt,
    })),
  });
}

import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { isOwnerOrAdmin } from "@/lib/auth/role";
import { aggregateNps } from "@/lib/nps/calcNps";

/**
 * Tenant-scoped NPS aggregate — Track UUUU. Önceden sysadmin global aggregate
 * (/api/nps GET) vardı, tenant owner'ı kendi org'unun NPS'sini göremiyordu
 * ("ihtiyaç oluştukça eklenir" comment'i route.ts'de). Şimdi tenant owner +
 * admin görür.
 *
 * NPS formula: ((promoter% - detractor%) → -100..+100 ölçeği).
 *  - Promoter: score 9-10
 *  - Passive:  score 7-8
 *  - Detractor: score 0-6
 *
 * Cross-tenant data sızıntısı önlenir: prisma.npsResponse.findMany'de
 * tenantId zorunlu filtre + role gate.
 */
export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  // Role gate: tenant owner ve admin görür (sysadmin de — ama bu endpoint
  // tenant-scope, sysadmin için /api/nps cross-tenant zaten var).
  if (!isOwnerOrAdmin(session.user.role)) {
    return jsonError(req, "api.forbidden", 403);
  }

  const responses = await prisma.npsResponse.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { respondedAt: "desc" },
    take: 100,
    select: {
      score: true,
      comment: true,
      respondedAt: true,
    },
  });

  const { promoters, passives, detractors, total, nps } = aggregateNps(
    responses.map((r) => r.score),
  );

  return Response.json({
    nps,
    breakdown: { promoters, passives, detractors, total },
    responses,
  });
}

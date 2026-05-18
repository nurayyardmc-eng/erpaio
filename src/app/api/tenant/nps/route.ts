import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";

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
  if (session.user.role !== "owner" && session.user.role !== "admin") {
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

  const promoters = responses.filter((r) => r.score >= 9).length;
  const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  const total = responses.length;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  return Response.json({
    nps,
    breakdown: { promoters, passives, detractors, total },
    responses,
  });
}

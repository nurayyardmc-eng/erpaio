import { prisma } from "@/lib/db/prisma";
import { computeHealthScore } from "@/lib/analytics/healthScore";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limited = await enforceUserRateLimit(req, guard.userId, RATE_LIMITS.ADMIN_READ);
  if (limited) return limited;

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, plan: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const scores = await Promise.all(
    tenants.map(async (t) => ({
      tenant: t,
      health: await computeHealthScore(t.id),
    })),
  );

  return Response.json({ tenants: scores });
}

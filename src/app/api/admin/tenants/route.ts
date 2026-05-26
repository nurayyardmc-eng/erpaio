import { prisma } from "@/lib/db/prisma";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limited = await enforceUserRateLimit(req, guard.userId, RATE_LIMITS.ADMIN_READ);
  if (limited) return limited;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      monthlyTokenBudget: true,
      monthlyTokensUsed: true,
      budgetResetAt: true,
      trialEndsAt: true,
      createdAt: true,
      _count: {
        select: { users: true, connections: true, alerts: true, queryCache: true },
      },
    },
  });

  return Response.json({ tenants });
}

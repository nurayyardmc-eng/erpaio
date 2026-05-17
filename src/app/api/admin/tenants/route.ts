import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limit = await rateLimit(guard.userId, RATE_LIMITS.ADMIN_READ);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

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

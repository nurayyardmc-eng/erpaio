import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

async function requireSysAdmin(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return { error: Response.json({ error: "Yetkisiz." }, { status: 401 }) };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSysAdmin: true },
  });
  if (!user?.isSysAdmin) {
    return { error: Response.json({ error: "Yetkisiz (sysadmin gerekli)." }, { status: 403 }) };
  }
  return { ok: true };
}

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

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

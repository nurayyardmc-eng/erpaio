import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { computeHealthScore } from "@/lib/analytics/healthScore";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSysAdmin: true } });
  if (!user?.isSysAdmin) return Response.json({ error: "Sysadmin gerekli." }, { status: 403 });

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

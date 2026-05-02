import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/dual";

export async function GET(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;

  const { user } = result;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      tenant: { select: { id: true, name: true, plan: true } },
    },
  });

  if (!dbUser) return Response.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

  return Response.json({
    user: dbUser,
    authMethod: user.authMethod,
  });
}

import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { getKeyHistory, registerCurrentKey } from "@/lib/crypto/keyRotation";

async function requireSysAdmin(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return { error: Response.json({ error: "Yetkisiz." }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSysAdmin: true } });
  if (!user?.isSysAdmin) return { error: Response.json({ error: "Sysadmin gerekli." }, { status: 403 }) };
  return { ok: true };
}

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  await registerCurrentKey().catch(() => {});
  const history = await getKeyHistory();
  return Response.json({ history });
}

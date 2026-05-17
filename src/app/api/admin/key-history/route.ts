import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { getKeyHistory, registerCurrentKey } from "@/lib/crypto/keyRotation";
import { jsonError, localizedError } from "@/lib/i18n/server";

async function requireSysAdmin(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return { error: jsonError(req, "api.unauthorized", 401) };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSysAdmin: true } });
  if (!user?.isSysAdmin) return { error: localizedError(req, 403, { tr: "Sysadmin gerekli.", en: "Sysadmin required." }) };
  return { ok: true };
}

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  await registerCurrentKey().catch(() => {});
  const history = await getKeyHistory();
  return Response.json({ history });
}

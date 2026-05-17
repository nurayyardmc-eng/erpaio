// Sysadmin gate for admin endpoints.
//
// Usage:
//   const guard = await requireSysAdmin(req);
//   if ("error" in guard) return guard.error;
//   // guard.userId is the validated sysadmin user id

import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";

export type SysAdminGuard =
  | { ok: true; userId: string; tenantId: string }
  | { error: Response };

export async function requireSysAdmin(req: Request): Promise<SysAdminGuard> {
  const session = await getAuth(req);
  if (!session?.user) {
    return { error: jsonError(req, "api.unauthorized", 401) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSysAdmin: true },
  });
  if (!user?.isSysAdmin) {
    return { error: jsonError(req, "api.forbidden", 403) };
  }
  return { ok: true, userId: session.user.id, tenantId: session.user.tenantId };
}

import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";

/**
 * Tek alert detayı — mobile AlertDetailScreen + push deep-link tap için.
 * Tenant-scoped (where userId değil, where tenantId — alert tenant'a ait).
 * Başka tenant'ın alert id'si bilinse bile 404.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await context.params;
  const alert = await prisma.alert.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      description: true,
      module: true,
      evidence: true,
      status: true,
      falsePositiveAt: true,
      createdAt: true,
    },
  });

  if (!alert) return jsonError(req, "api.notFound", 404);
  return Response.json(alert);
}

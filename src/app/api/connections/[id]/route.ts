import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, localizedError } from "@/lib/i18n/server";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await ctx.params;

  // Atomik tenant-scoped delete
  const result = await prisma.erpConnection.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });

  if (result.count === 0) {
    return localizedError(req, 404, { tr: "Bağlantı bulunamadı.", en: "Connection not found." });
  }

  return Response.json({ ok: true });
}

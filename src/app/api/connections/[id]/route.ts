import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { id } = await ctx.params;

  // Atomik tenant-scoped delete
  const result = await prisma.erpConnection.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });

  if (result.count === 0) {
    return Response.json({ error: "Bağlantı bulunamadı." }, { status: 404 });
  }

  return Response.json({ ok: true });
}

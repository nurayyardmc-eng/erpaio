import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { queryERP } from "@/lib/db/connector";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const conn = await prisma.erpConnection.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!conn) {
    return Response.json({ error: "Bulunamadı." }, { status: 404 });
  }

  try {
    const tables = await queryERP(params.id, `
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    await prisma.erpConnection.update({
      where: { id: params.id },
      data: { status: "active", lastSync: new Date() },
    });

    return Response.json({ ok: true, tableCount: tables.length });
  } catch (err: any) {
    await prisma.erpConnection.update({
      where: { id: params.id },
      data: { status: "error" },
    });
    return Response.json({ ok: false, error: "Bağlantı başarısız." }, { status: 503 });
  }
}
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { findOwnedConnection } from "@/lib/db/erpConnection";
import { connectionNotFoundError } from "@/lib/http/searchParams";
import { queryERP } from "@/lib/db/connector";
import { dialectFromErpType } from "@/lib/db/dialect";
import { jsonError, resolveLocale } from "@/lib/i18n/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuth(req);
  if (!session?.user) {
    return jsonError(req, "api.unauthorized", 401);
  }

  const { id } = await params;

  const conn = await findOwnedConnection(id, session.user.tenantId);
  if (!conn) return connectionNotFoundError(req);

  const dialect = dialectFromErpType(conn.erpType);
  const tablesQuery = dialect === "postgres"
    ? `SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = 'public' ORDER BY table_name`
    : `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`;

  try {
    const tables = await queryERP(id, tablesQuery);

    await prisma.erpConnection.update({
      where: { id },
      data: { status: "active", lastSync: new Date() },
    });

    return Response.json({ ok: true, tableCount: tables.length });
  } catch {
    await prisma.erpConnection.update({
      where: { id },
      data: { status: "error" },
    });
    const locale = resolveLocale(req);
    return Response.json({ ok: false, error: locale === "en" ? "Connection failed." : "Bağlantı başarısız." }, { status: 503 });
  }
}

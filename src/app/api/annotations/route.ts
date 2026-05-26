import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { requireOwnerOrAdmin } from "@/lib/auth/role";

const PutSchema = z.object({
  tableName: z.string().min(1).max(128),
  columnName: z.string().max(128).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  hidden: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const annotations = await prisma.schemaAnnotation.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: [{ tableName: "asc" }, { columnName: "asc" }],
  });
  return Response.json({ annotations });
}

export async function PUT(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role, {
    tr: "Yalnızca yönetici düzenleyebilir.",
    en: "Only admins can edit.",
  });
  if (denied) return denied;

  const body = await parseJsonBody(req, PutSchema);
  if (body instanceof Response) return body;

  const { tableName, columnName, description, hidden } = body;

  const annotation = await prisma.schemaAnnotation.upsert({
    where: {
      tenantId_tableName_columnName: {
        tenantId: session.user.tenantId,
        tableName,
        columnName: columnName ?? "",
      },
    },
    create: {
      tenantId: session.user.tenantId,
      tableName,
      columnName: columnName ?? null,
      description: description ?? null,
      hidden: hidden ?? false,
    },
    update: {
      description: description ?? null,
      hidden: hidden ?? false,
    },
  });

  return Response.json({ annotation });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role, {
    tr: "Yalnızca yönetici silebilir.",
    en: "Only admins can delete.",
  });
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const tableName = searchParams.get("tableName");
  const columnName = searchParams.get("columnName") ?? "";
  if (!tableName) return localizedError(req, 400, { tr: "tableName gerekli.", en: "tableName required." });

  await prisma.schemaAnnotation.deleteMany({
    where: { tenantId: session.user.tenantId, tableName, columnName },
  });
  return Response.json({ ok: true });
}

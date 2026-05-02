import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

const PutSchema = z.object({
  tableName: z.string().min(1).max(128),
  columnName: z.string().max(128).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  hidden: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const annotations = await prisma.schemaAnnotation.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: [{ tableName: "asc" }, { columnName: "asc" }],
  });
  return Response.json({ annotations });
}

export async function PUT(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "owner") {
    return Response.json({ error: "Yalnızca yönetici düzenleyebilir." }, { status: 403 });
  }

  const body = PutSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const { tableName, columnName, description, hidden } = body.data;

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
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "owner") {
    return Response.json({ error: "Yalnızca yönetici silebilir." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tableName = searchParams.get("tableName");
  const columnName = searchParams.get("columnName") ?? "";
  if (!tableName) return Response.json({ error: "tableName gerekli." }, { status: 400 });

  await prisma.schemaAnnotation.deleteMany({
    where: { tenantId: session.user.tenantId, tableName, columnName },
  });
  return Response.json({ ok: true });
}

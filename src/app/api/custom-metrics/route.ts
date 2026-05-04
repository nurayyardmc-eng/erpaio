import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { validateSQL } from "@/lib/validators/sql";

const PostSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]{3,40}$/, "Sadece küçük harf, rakam, _"),
  label: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  schedule: z.enum(["hourly", "daily"]),
  algorithm: z.enum(["zscore", "moving_avg", "threshold"]),
  direction: z.enum(["drop", "spike", "both"]).default("both"),
  configJson: z.record(z.string(), z.unknown()).nullable().optional(),
  connectionId: z.string(),
  sql: z.string().min(10).max(5000),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const metrics = await prisma.customMetric.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ metrics });
}

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return Response.json({ error: "Yalnızca admin." }, { status: 403 });
  }

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const { sql } = body.data;
  try {
    validateSQL(sql);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "SQL geçersiz" },
      { status: 400 },
    );
  }

  if (!/SELECT.+\s+(metric_value|value|val)\b/i.test(sql)) {
    return Response.json({
      error: "SQL'de tek satır + 'metric_value' kolonu döndürmeli (örn: SELECT SUM(...) AS metric_value FROM ...)",
    }, { status: 400 });
  }

  const conn = await prisma.erpConnection.findFirst({
    where: { id: body.data.connectionId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!conn) return Response.json({ error: "Bağlantı bulunamadı." }, { status: 404 });

  const metric = await prisma.customMetric.upsert({
    where: { tenantId_key: { tenantId: session.user.tenantId, key: body.data.key } },
    create: {
      tenantId: session.user.tenantId,
      connectionId: body.data.connectionId,
      key: body.data.key,
      label: body.data.label,
      description: body.data.description ?? null,
      schedule: body.data.schedule,
      algorithm: body.data.algorithm,
      direction: body.data.direction,
      configJson: body.data.configJson
        ? (JSON.parse(JSON.stringify(body.data.configJson)) as object)
        : undefined,
      sql,
    },
    update: {
      connectionId: body.data.connectionId,
      label: body.data.label,
      description: body.data.description ?? null,
      schedule: body.data.schedule,
      algorithm: body.data.algorithm,
      direction: body.data.direction,
      configJson: body.data.configJson
        ? (JSON.parse(JSON.stringify(body.data.configJson)) as object)
        : undefined,
      sql,
      enabled: true,
    },
  });

  return Response.json({ metric });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id gerekli." }, { status: 400 });

  await prisma.customMetric.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}

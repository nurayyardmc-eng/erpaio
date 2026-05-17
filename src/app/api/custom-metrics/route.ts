import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { validateSQL } from "@/lib/validators/sql";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";

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
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const metrics = await prisma.customMetric.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ metrics });
}

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return localizedError(req, 403, { tr: "Yalnızca admin.", en: "Admin only." });
  }

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return localizedError(req, 400, { tr: body.error.issues[0]?.message ?? "Geçersiz veri", en: body.error.issues[0]?.message ?? "Invalid data" });

  const { sql } = body.data;
  try {
    validateSQL(sql);
  } catch (err) {
    return localizedError(req, 400, {
      tr: err instanceof Error ? err.message : "SQL geçersiz",
      en: err instanceof Error ? err.message : "Invalid SQL",
    });
  }

  if (!/SELECT.+\s+(metric_value|value|val)\b/i.test(sql)) {
    return localizedError(req, 400, {
      tr: "SQL'de tek satır + 'metric_value' kolonu döndürmeli (örn: SELECT SUM(...) AS metric_value FROM ...)",
      en: "SQL must return a single row with a 'metric_value' column (e.g. SELECT SUM(...) AS metric_value FROM ...)",
    });
  }

  const conn = await prisma.erpConnection.findFirst({
    where: { id: body.data.connectionId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!conn) return localizedError(req, 404, { tr: "Bağlantı bulunamadı.", en: "Connection not found." });

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
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return localizedError(req, 400, { tr: "id gerekli.", en: "id required." });

  await prisma.customMetric.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}

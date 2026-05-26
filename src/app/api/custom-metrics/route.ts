import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { assertOwnedConnection } from "@/lib/db/erpConnection";
import { validateSQL } from "@/lib/validators/sql";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody, getRequiredIdParam } from "@/lib/http/searchParams";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { requireOwnerOrAdmin } from "@/lib/auth/role";

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
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

  const body = await parseJsonBody(req, PostSchema);
  if (body instanceof Response) return body;

  const { sql } = body;
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

  const notFound = await assertOwnedConnection(req, body.connectionId, session.user.tenantId);
  if (notFound) return notFound;

  const metric = await prisma.customMetric.upsert({
    where: { tenantId_key: { tenantId: session.user.tenantId, key: body.key } },
    create: {
      tenantId: session.user.tenantId,
      connectionId: body.connectionId,
      key: body.key,
      label: body.label,
      description: body.description ?? null,
      schedule: body.schedule,
      algorithm: body.algorithm,
      direction: body.direction,
      configJson: body.configJson
        ? (JSON.parse(JSON.stringify(body.configJson)) as object)
        : undefined,
      sql,
    },
    update: {
      connectionId: body.connectionId,
      label: body.label,
      description: body.description ?? null,
      schedule: body.schedule,
      algorithm: body.algorithm,
      direction: body.direction,
      configJson: body.configJson
        ? (JSON.parse(JSON.stringify(body.configJson)) as object)
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

  const idParam = getRequiredIdParam(req);
  if (idParam instanceof Response) return idParam;
  const { id } = idParam;

  await prisma.customMetric.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}

import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { assertOwnedConnection } from "@/lib/db/erpConnection";
import { validateSQL } from "@/lib/validators/sql";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody, getRequiredIdParam } from "@/lib/http/searchParams";
import { toPrismaJson } from "@/lib/db/prismaJson";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { requireOwnerOrAdmin } from "@/lib/auth/role";
import { enforceUserRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

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

  // Feature 5.5 — custom metric create rate limit (20/min per user).
  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.CUSTOM_METRIC_MUTATE);
  if (limited) return limited;

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

  // A "threshold" metric evaluates config.rules; if they're missing/invalid the
  // detector gets an empty rule set and the metric silently never fires. Reject
  // at create time instead of accepting a dead metric.
  if (body.algorithm === "threshold") {
    const RuleSchema = z.object({
      condition: z.enum(["lt", "lte", "gt", "gte", "eq"]),
      value: z.number(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      message: z.string().optional(),
    });
    const rules = (body.configJson as { rules?: unknown } | null | undefined)?.rules;
    if (!z.array(RuleSchema).min(1).safeParse(rules).success) {
      return localizedError(req, 400, {
        tr: "Eşik metriği için configJson.rules en az bir geçerli kural içermeli: { condition: lt|lte|gt|gte|eq, value: sayı, severity: low|medium|high|critical }.",
        en: "A threshold metric needs configJson.rules with ≥1 valid rule: { condition: lt|lte|gt|gte|eq, value: number, severity: low|medium|high|critical }.",
      });
    }
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
      configJson: body.configJson ? toPrismaJson(body.configJson) : undefined,
      sql,
    },
    update: {
      connectionId: body.connectionId,
      label: body.label,
      description: body.description ?? null,
      schedule: body.schedule,
      algorithm: body.algorithm,
      direction: body.direction,
      configJson: body.configJson ? toPrismaJson(body.configJson) : undefined,
      sql,
      enabled: true,
    },
  });

  return Response.json({ metric });
}

const PatchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.CUSTOM_METRIC_MUTATE);
  if (limited) return limited;

  const idParam = getRequiredIdParam(req);
  if (idParam instanceof Response) return idParam;

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  const result = await prisma.customMetric.updateMany({
    where: { id: idParam.id, tenantId: session.user.tenantId },
    data: { enabled: body.enabled },
  });
  if (result.count === 0) {
    return localizedError(req, 404, { tr: "Metrik bulunamadı.", en: "Metric not found." });
  }
  return Response.json({ ok: true, enabled: body.enabled });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  // Feature 5.5 — bulk delete spam protection (20/min per user).
  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.CUSTOM_METRIC_MUTATE);
  if (limited) return limited;

  const idParam = getRequiredIdParam(req);
  if (idParam instanceof Response) return idParam;
  const { id } = idParam;

  await prisma.customMetric.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}

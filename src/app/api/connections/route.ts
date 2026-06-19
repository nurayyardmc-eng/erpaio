import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/crypto/encrypt";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { recordUserActivity } from "@/lib/audit/activity";
import { z } from "zod";
import { ERP_TYPES } from "@/lib/db/erpTypes";
import { enforceUserRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

const Schema = z.object({
  erpType: z.enum(ERP_TYPES),
  host: z.string().min(1),
  port: z.number().default(1433),
  dbName: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) {
    return jsonError(req, "api.unauthorized", 401);
  }

  // Feature 5.5 — connection create rate limit (10/min per user).
  // ERP credentials are encrypted-at-rest; rate limit prevents key probe
  // abuse + accidental bulk dupe inserts during onboarding bugs.
  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.CONNECTION_MUTATE);
  if (limited) return limited;

  const body = await parseJsonBody(req, Schema);
  if (body instanceof Response) return body;

  const profileMap: Record<string, string> = {
    nebim_v3: "nebim_v3",
  };

  const connection = await prisma.erpConnection.create({
    data: {
      tenantId: session.user.tenantId,
      erpType: body.erpType,
      erpProfile: profileMap[body.erpType] ?? null,
      host: body.host,
      port: body.port,
      dbName: body.dbName,
      username: body.username,
      passwordEnc: encrypt(body.password),
      status: "pending",
    },
  });

  // Audit trail — ERP credential ekleme hassas işlem, password değil sadece
  // metadata loglanır
  await recordUserActivity(req, session, {
    action: "integration.update",
    target: connection.id,
    metadata: { erpType: body.erpType, host: body.host, dbName: body.dbName },
  });

  return Response.json({ id: connection.id });
}

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) {
    return jsonError(req, "api.unauthorized", 401);
  }

  const connections = await prisma.erpConnection.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true,
      erpType: true,
      host: true,
      dbName: true,
      status: true,
      connectionMode: true,
      lastSync: true,
      createdAt: true,
      // Schema cache snapshot — UI'da "X tablo · Y gün önce" badge için.
      // RRR'de eklendi; eski client'lar bu field'ı görmezden gelir.
      schemaCache: {
        select: { builtAt: true, tableCount: true },
      },
      // On-prem agent liveness — newest active registration's last poll time.
      agentRegistrations: {
        where: { revoked: false },
        select: { lastSeenAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return Response.json(connections);
}

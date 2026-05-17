import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/crypto/encrypt";
import { jsonError } from "@/lib/i18n/server";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";
import { z } from "zod";

const Schema = z.object({
  erpType: z.enum(["nebim_v3", "sap", "dynamics365", "postgres"]),
  host: z.string().min(1),
  port: z.number().default(1433),
  dbName: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) {
    return jsonError(req, "api.unauthorized", 401);
  }

  const body = await req.json();
  const data = Schema.parse(body);

  const profileMap: Record<string, string> = {
    nebim_v3: "nebim_v3",
  };

  const connection = await prisma.erpConnection.create({
    data: {
      tenantId: session.user.tenantId,
      erpType: data.erpType,
      erpProfile: profileMap[data.erpType] ?? null,
      host: data.host,
      port: data.port,
      dbName: data.dbName,
      username: data.username,
      passwordEnc: encrypt(data.password),
      status: "pending",
    },
  });

  // Audit trail — ERP credential ekleme hassas işlem, password değil sadece
  // metadata loglanır
  const ctx = activityContextFromRequest(req);
  await recordActivity({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email ?? null,
    action: "integration.update",
    target: connection.id,
    metadata: { erpType: data.erpType, host: data.host, dbName: data.dbName },
    ...ctx,
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
      lastSync: true,
      createdAt: true,
    },
  });

  return Response.json(connections);
}

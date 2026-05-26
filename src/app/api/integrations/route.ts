import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/crypto/encrypt";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";
import { requireOwnerOrAdmin } from "@/lib/auth/role";

const PostSchema = z.object({
  kind: z.enum(["slack", "teams", "webhook"]),
  endpoint: z.string().url(),
  secret: z.string().min(8).max(128).optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const integrations = await prisma.tenantIntegration.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true,
      kind: true,
      enabled: true,
      lastSuccessAt: true,
      lastErrorAt: true,
      lastError: true,
      createdAt: true,
    },
  });
  return Response.json({ integrations });
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

  const { kind, endpoint, secret } = body;

  const integration = await prisma.tenantIntegration.upsert({
    where: { tenantId_kind: { tenantId: session.user.tenantId, kind } },
    create: {
      tenantId: session.user.tenantId,
      kind,
      endpointEnc: encrypt(endpoint),
      secretEnc: secret ? encrypt(secret) : null,
      enabled: true,
    },
    update: {
      endpointEnc: encrypt(endpoint),
      secretEnc: secret ? encrypt(secret) : null,
      enabled: true,
      lastError: null,
      lastErrorAt: null,
    },
    select: { id: true, kind: true, enabled: true },
  });

  const ctx = activityContextFromRequest(req);
  await recordActivity({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email ?? null,
    action: "integration.update",
    target: integration.id,
    metadata: { kind },
    ...ctx,
  });

  return Response.json({ integration });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  if (!kind) return localizedError(req, 400, { tr: "kind gerekli.", en: "kind required." });

  await prisma.tenantIntegration.deleteMany({
    where: { tenantId: session.user.tenantId, kind },
  });

  const ctx = activityContextFromRequest(req);
  await recordActivity({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email ?? null,
    action: "integration.update",
    metadata: { kind, deleted: true },
    ...ctx,
  });

  return Response.json({ ok: true });
}

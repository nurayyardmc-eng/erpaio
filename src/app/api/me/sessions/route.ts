import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.user.id, revoked: false },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return Response.json({
    sessions: tokens.map((t) => ({
      ...t,
      isCurrent: session.user.tokenId === t.id,
    })),
  });
}

const DeleteSchema = z.object({ tokenId: z.string() });

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("tokenId");
  const parsed = DeleteSchema.safeParse({ tokenId });
  if (!parsed.success) return localizedError(req, 400, { tr: "tokenId gerekli.", en: "tokenId required." });

  const result = await prisma.apiToken.updateMany({
    where: { id: parsed.data.tokenId, userId: session.user.id },
    data: { revoked: true },
  });

  if (result.count > 0) {
    const ctx = activityContextFromRequest(req);
    await recordActivity({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      email: session.user.email ?? null,
      action: "session.revoke",
      target: parsed.data.tokenId,
      ...ctx,
    });
  }

  return Response.json({ ok: true });
}

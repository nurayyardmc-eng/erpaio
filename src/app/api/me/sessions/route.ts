import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordUserActivity } from "@/lib/audit/activity";
import { parseJsonBody } from "@/lib/http/searchParams";

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

/**
 * API token rename — Track FFFF. Kullanıcı kendi aktif token'larının
 * label'ını "Eski iPhone" / "İş tableti" gibi anlamlı isme çevirebilir.
 * Server name'i sadece UI display amaçlı; auth davranışını etkilemez.
 *
 * Owner-scope: userId match. Başka kullanıcının token'ını yeniden
 * adlandırma sessizce 404 (updateMany count: 0).
 */
const PatchSchema = z.object({
  tokenId: z.string().min(1).max(48),
  name: z.string().min(1).max(80),
});

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  const trimmed = body.name.trim();
  if (!trimmed) {
    return localizedError(req, 400, {
      tr: "İsim boş olamaz.",
      en: "Name cannot be empty.",
    });
  }

  const result = await prisma.apiToken.updateMany({
    where: { id: body.tokenId, userId: session.user.id, revoked: false },
    data: { name: trimmed },
  });

  if (result.count === 0) {
    return localizedError(req, 404, {
      tr: "Oturum bulunamadı.",
      en: "Session not found.",
    });
  }

  await recordUserActivity(req, session, {
    action: "api_token.rename",
    target: body.tokenId,
    metadata: { name: trimmed },
  });

  return Response.json({ ok: true, name: trimmed });
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
    await recordUserActivity(req, session, {
      action: "session.revoke",
      target: parsed.data.tokenId,
    });
  }

  return Response.json({ ok: true });
}

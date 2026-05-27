import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody, savedQueryNotFoundError } from "@/lib/http/searchParams";

/**
 * Saved query pin/unpin toggle — Track EEEE.
 *
 * Tenant-scoped (başka tenant'ın id'si bilinse bile updateMany count: 0).
 * Body {pinned: boolean} idempotent — aynı değeri tekrar set etmek no-op.
 *
 * Rate limit yok — sıklığı kullanıcı tarafından düşük, sıradan UI etkileşimi.
 * Audit yok — pin pozisyonu KVKK değil, sadece UX tercihi.
 */
const BodySchema = z.object({
  pinned: z.boolean(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { id } = await context.params;

  const result = await prisma.queryCache.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data: { pinned: body.pinned },
  });

  if (result.count === 0) {
    return savedQueryNotFoundError(req);
  }

  return Response.json({ ok: true, pinned: body.pinned });
}

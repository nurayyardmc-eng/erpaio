import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/dual";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody, parseQuery } from "@/lib/http/searchParams";
import { jsonError } from "@/lib/i18n/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

const BodySchema = z.object({
  token: z.string().min(8).max(256),
  platform: z.enum(["ios", "android", "web"]),
  deviceName: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const result = await requireAuth(req);
  if ("error" in result) return result.error;
  const { user } = result;

  // Mobile her launch'ta registerForPush çağırıyor — rate limit gerekli
  const limit = await rateLimit(user.id, RATE_LIMITS.PUSH_TOKEN_REGISTER);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { token, platform, deviceName } = body;

  await prisma.pushToken.upsert({
    where: { token },
    create: { userId: user.id, tenantId: user.tenantId, token, platform, deviceName },
    update: { userId: user.id, tenantId: user.tenantId, platform, deviceName, lastSeenAt: new Date() },
  });

  return Response.json({ ok: true });
}

const DeleteQuery = z.object({ token: z.string().min(8).max(256) });

export async function DELETE(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;
  const { user } = result;

  const q = parseQuery(req, DeleteQuery);
  if (q instanceof Response) return q;

  await prisma.pushToken.deleteMany({
    where: { token: q.token, userId: user.id },
  });

  return Response.json({ ok: true });
}

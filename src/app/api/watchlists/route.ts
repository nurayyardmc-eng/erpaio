import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { assertOwnedConnection } from "@/lib/db/erpConnection";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody, getRequiredIdParam } from "@/lib/http/searchParams";
import { jsonError } from "@/lib/i18n/server";
import { THRESHOLD_OPS } from "@/lib/threshold/compare";
import { enforceUserRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

const PostSchema = z.object({
  name: z.string().min(1).max(120),
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  thresholdOp: z.enum(THRESHOLD_OPS),
  thresholdVal: z.number(),
  emailTo: z.string().email().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const watchlists = await prisma.watchlist.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ watchlists });
}

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  // Feature 5.5 — watchlist create rate limit (30/min per user).
  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.WATCHLIST_MUTATE);
  if (limited) return limited;

  const body = await parseJsonBody(req, PostSchema);
  if (body instanceof Response) return body;

  const notFound = await assertOwnedConnection(req, body.connectionId, session.user.tenantId);
  if (notFound) return notFound;

  const watchlist = await prisma.watchlist.create({
    data: {
      ...body,
      emailTo: body.emailTo ?? null,
      tenantId: session.user.tenantId,
      userId: session.user.id,
    },
  });
  return Response.json({ watchlist });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  // Feature 5.5 — bulk delete spam protection (30/min per user).
  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.WATCHLIST_MUTATE);
  if (limited) return limited;

  const idParam = getRequiredIdParam(req);
  if (idParam instanceof Response) return idParam;
  const { id } = idParam;

  await prisma.watchlist.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}

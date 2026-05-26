import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { assertOwnedConnection } from "@/lib/db/erpConnection";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { jsonError, localizedError } from "@/lib/i18n/server";

const PostSchema = z.object({
  name: z.string().min(1).max(120),
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  thresholdOp: z.enum(["lt", "lte", "gt", "gte", "eq"]),
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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return localizedError(req, 400, { tr: "id gerekli.", en: "id required." });

  await prisma.watchlist.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}

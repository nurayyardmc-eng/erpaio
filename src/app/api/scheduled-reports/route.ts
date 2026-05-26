import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { assertOwnedConnection } from "@/lib/db/erpConnection";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody, getRequiredIdParam } from "@/lib/http/searchParams";
import { jsonError } from "@/lib/i18n/server";
import { SCHEDULE_VALUES } from "@/lib/reports/render";

const PostSchema = z.object({
  name: z.string().min(1).max(120),
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  schedule: z.enum(SCHEDULE_VALUES),
  emailTo: z.string().email(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const reports = await prisma.scheduledReport.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ reports });
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

  const report = await prisma.scheduledReport.create({
    data: { ...body, tenantId: session.user.tenantId, userId: session.user.id },
  });
  return Response.json({ report });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const idParam = getRequiredIdParam(req);
  if (idParam instanceof Response) return idParam;
  const { id } = idParam;

  await prisma.scheduledReport.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}

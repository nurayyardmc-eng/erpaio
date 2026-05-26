import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { invalidateAllowlist } from "@/lib/security/ipAllowlist";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordUserActivity } from "@/lib/audit/activity";
import { requireOwnerOrAdmin } from "@/lib/auth/role";
import { parseJsonBody } from "@/lib/http/searchParams";

const CidrSchema = z.string().regex(
  /^\d{1,3}(\.\d{1,3}){3}(\/(?:[0-9]|[12][0-9]|3[0-2]))?$/,
  "Geçerli IPv4 veya CIDR (192.168.0.0/16) olmalı",
);

const PostSchema = z.object({
  cidr: CidrSchema,
  label: z.string().max(80).optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const entries = await prisma.tenantIpAllowlist.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ entries });
}

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

  const body = await parseJsonBody(req, PostSchema);
  if (body instanceof Response) return body;

  const entry = await prisma.tenantIpAllowlist.create({
    data: {
      tenantId: session.user.tenantId,
      cidr: body.cidr,
      label: body.label ?? null,
    },
  });
  invalidateAllowlist(session.user.tenantId);

  await recordUserActivity(req, session, {
    action: "ip_allowlist.add",
    target: entry.id,
    metadata: { cidr: body.cidr, label: body.label ?? null },
  });

  return Response.json({ entry });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return localizedError(req, 400, { tr: "id gerekli.", en: "id required." });

  await prisma.tenantIpAllowlist.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  invalidateAllowlist(session.user.tenantId);

  await recordUserActivity(req, session, {
    action: "ip_allowlist.remove",
    target: id,
  });

  return Response.json({ ok: true });
}

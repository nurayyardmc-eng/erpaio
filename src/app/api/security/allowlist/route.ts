import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { invalidateAllowlist } from "@/lib/security/ipAllowlist";
import { jsonError, localizedError } from "@/lib/i18n/server";

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
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return localizedError(req, 403, { tr: "Yalnızca admin.", en: "Admin only." });
  }

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return localizedError(req, 400, { tr: body.error.issues[0]?.message ?? "Geçersiz veri", en: body.error.issues[0]?.message ?? "Invalid data" });

  const entry = await prisma.tenantIpAllowlist.create({
    data: {
      tenantId: session.user.tenantId,
      cidr: body.data.cidr,
      label: body.data.label ?? null,
    },
  });
  invalidateAllowlist(session.user.tenantId);
  return Response.json({ entry });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return localizedError(req, 403, { tr: "Yalnızca admin.", en: "Admin only." });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return localizedError(req, 400, { tr: "id gerekli.", en: "id required." });

  await prisma.tenantIpAllowlist.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  invalidateAllowlist(session.user.tenantId);
  return Response.json({ ok: true });
}

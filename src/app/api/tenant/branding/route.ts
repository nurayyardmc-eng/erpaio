import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { hasFeature } from "@/lib/plans";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";

const PatchSchema = z.object({
  brandingLogoUrl: z.string().url().nullable().optional(),
  brandingPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  brandingSenderName: z.string().min(1).max(60).nullable().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { plan: true, brandingLogoUrl: true, brandingPrimary: true, brandingSenderName: true },
  });
  if (!tenant) return jsonError(req, "api.notFound", 404);

  return Response.json({
    branding: {
      logoUrl: tenant.brandingLogoUrl,
      primary: tenant.brandingPrimary,
      senderName: tenant.brandingSenderName,
    },
    available: hasFeature(tenant.plan, "white_label"),
  });
}

export async function PATCH(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return localizedError(req, 403, { tr: "Yalnızca admin.", en: "Admin only." });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { plan: true },
  });
  if (!tenant || !hasFeature(tenant.plan, "white_label")) {
    return localizedError(req, 403, { tr: "White-label yalnızca Enterprise planda.", en: "White-label is only available on the Enterprise plan." });
  }

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) return localizedError(req, 400, { tr: body.error.issues[0]?.message ?? "Geçersiz veri", en: body.error.issues[0]?.message ?? "Invalid data" });

  const updated = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: body.data,
    select: { brandingLogoUrl: true, brandingPrimary: true, brandingSenderName: true },
  });
  return Response.json({ branding: updated });
}

import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { hasFeature } from "@/lib/plans";
import { getTenantPlan } from "@/lib/db/getTenantPlan";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { requireOwnerOrAdmin } from "@/lib/auth/role";

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
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

  const plan = await getTenantPlan(session.user.tenantId);
  if (!plan || !hasFeature(plan, "white_label")) {
    return localizedError(req, 403, { tr: "White-label yalnızca Enterprise planda.", en: "White-label is only available on the Enterprise plan." });
  }

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  const updated = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: body,
    select: { brandingLogoUrl: true, brandingPrimary: true, brandingSenderName: true },
  });
  return Response.json({ branding: updated });
}

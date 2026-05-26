import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { recordUserActivity } from "@/lib/audit/activity";
import { requireOwnerOrAdmin } from "@/lib/auth/role";
import { zSeverity } from "@/lib/auth/schemas";

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  whatsappTo: z.string().regex(/^whatsapp:\+?\d{6,15}$/).nullable().optional(),
  whatsappEnabled: z.boolean().optional(),
  emailTo: z.string().email().nullable().optional(),
  emailEnabled: z.boolean().optional(),
  alertMinSeverity: zSeverity().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      whatsappTo: true,
      whatsappEnabled: true,
      emailTo: true,
      emailEnabled: true,
      alertMinSeverity: true,
      // Trial countdown banner için (AAAA). subscriptionStatus null veya
      // "active" değilse banner gösterilir; trialEndsAt ile gün hesaplanır.
      trialEndsAt: true,
      subscriptionStatus: true,
      createdAt: true,
    },
  });

  if (!tenant) return jsonError(req, "api.notFound", 404);
  return Response.json(tenant);
}

export async function PATCH(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role, {
    tr: "Yalnızca yönetici düzenleyebilir.",
    en: "Only admins can edit.",
  });
  if (denied) return denied;

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: body,
    select: {
      id: true,
      name: true,
      whatsappTo: true,
      whatsappEnabled: true,
      emailTo: true,
      emailEnabled: true,
      alertMinSeverity: true,
    },
  });

  // Audit trail — değişen alanların adlarını yaz (PII içerik yok, sadece field names)
  await recordUserActivity(req, session, {
    action: "tenant.update",
    metadata: { fields: Object.keys(body) },
  });

  return Response.json(tenant);
}

import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  whatsappTo: z.string().regex(/^whatsapp:\+?\d{6,15}$/).nullable().optional(),
  whatsappEnabled: z.boolean().optional(),
  emailTo: z.string().email().nullable().optional(),
  emailEnabled: z.boolean().optional(),
  alertMinSeverity: z.enum(["low", "medium", "high", "critical"]).optional(),
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
  if (session.user.role !== "admin" && session.user.role !== "owner") {
    return localizedError(req, 403, { tr: "Yalnızca yönetici düzenleyebilir.", en: "Only admins can edit." });
  }

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) {
    return localizedError(req, 400, { tr: body.error.issues[0]?.message ?? "Geçersiz veri", en: body.error.issues[0]?.message ?? "Invalid data" });
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: body.data,
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
  const ctx = activityContextFromRequest(req);
  await recordActivity({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email ?? null,
    action: "tenant.update",
    metadata: { fields: Object.keys(body.data) },
    ...ctx,
  });

  return Response.json(tenant);
}

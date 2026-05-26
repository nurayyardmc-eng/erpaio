import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { recordUserActivity } from "@/lib/audit/activity";;;

/**
 * Alert false-positive feedback toggle.
 *
 * action="falsePositive" → falsePositiveAt = now, falsePositiveBy = userId
 * action="clear"         → her ikisini null'a
 *
 * Engine learning loop için sinyal kaydı: anomaly engine bu sinyali (tenant
 * içinde aynı metrik tipinde son 30 günde 3+ FP) okuyup baseline suppression
 * yapabilir (gelecek track). İlk fazda sadece veri biriktiriyoruz.
 *
 * Audit hook: action ne olursa olsun activity log'a yazılır
 * (alert.feedback.false_positive | alert.feedback.clear).
 */
const BodySchema = z.object({
  action: z.enum(["falsePositive", "clear"]),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { id } = await context.params;

  const data =
    body.action === "falsePositive"
      ? { falsePositiveAt: new Date(), falsePositiveBy: session.user.id }
      : { falsePositiveAt: null, falsePositiveBy: null };

  // Tenant-scoped updateMany — başka tenant'ın id'si etki etmez.
  const result = await prisma.alert.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data,
  });

  if (result.count === 0) {
    return localizedError(req, 404, {
      tr: "Bildirim bulunamadı.",
      en: "Alert not found.",
    });
  }

  await recordUserActivity(req, session, {
    action: body.action === "falsePositive" ? "alert.feedback.false_positive" : "alert.feedback.clear",
    target: id,
  });

  return Response.json({ ok: true });
}

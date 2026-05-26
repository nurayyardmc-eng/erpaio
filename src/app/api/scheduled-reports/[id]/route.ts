import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { parseJsonBody, noFieldsToUpdateError } from "@/lib/http/searchParams";
import { SCHEDULE_VALUES } from "@/lib/reports/render";

/**
 * Scheduled report partial update — Track KK. Önceden sadece POST + DELETE
 * vardı; schedule değiştirmek için (örn: daily → weekly) sil + baştan
 * oluştur gerekiyordu. Şimdi inline edit + enable/disable toggle.
 *
 * Tenant-scope: id + tenantId atomik check (başka tenant'ın id'si silent 404).
 */
const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  question: z.string().min(1).max(500).optional(),
  schedule: z.enum(SCHEDULE_VALUES).optional(),
  emailTo: z.string().email().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  const { id } = await context.params;

  const data: {
    name?: string;
    question?: string;
    schedule?: string;
    emailTo?: string;
    enabled?: boolean;
  } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.question !== undefined) data.question = body.question;
  if (body.schedule !== undefined) data.schedule = body.schedule;
  if (body.emailTo !== undefined) data.emailTo = body.emailTo;
  if (body.enabled !== undefined) data.enabled = body.enabled;

  if (Object.keys(data).length === 0) return noFieldsToUpdateError(req);

  const result = await prisma.scheduledReport.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data,
  });

  if (result.count === 0) {
    return localizedError(req, 404, {
      tr: "Raporlar bulunamadı.",
      en: "Report not found.",
    });
  }

  const fresh = await prisma.scheduledReport.findUnique({ where: { id } });
  return Response.json({ report: fresh });
}

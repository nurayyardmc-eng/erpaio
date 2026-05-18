import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";

/**
 * Bulk alert state transition — Track JJJJ. Triage akışı: 20+ alert biriken
 * tenant kullanıcısının tek tek "Okundu" tıklamak zorunda kalmadan toplu
 * acked/resolved işaretlemesi için. Tenant-scoped updateMany (başka tenant'ın
 * alert id'leri sessiz drop — count'a yansır).
 *
 * PATCH /api/alerts (single id) korunuyor; bu route opt-in genişleme.
 * Max 100 id/req → 1MB body limit ve DB pressure güvenliği için cap.
 */
const BodySchema = z.object({
  ids: z.array(z.string().min(1).max(48)).min(1).max(100),
  status: z.enum(["acked", "resolved"]),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  // Deduplicate — kullanıcı UI'da yanlışlıkla aynı id'yi iki kez gönderebilir.
  const uniqueIds = Array.from(new Set(body.ids));

  const result = await prisma.alert.updateMany({
    where: {
      id: { in: uniqueIds },
      tenantId: session.user.tenantId,
      // status `open` veya `acked` → `resolved`'a düşürme yine geçerli.
      // Açıkça "all" geçilebilir ama UI sadece açık/acked'i seçilebilir tutuyor.
    },
    data: { status: body.status },
  });

  if (result.count === 0) {
    return localizedError(req, 404, {
      tr: "Güncellenecek alert bulunamadı.",
      en: "No alerts found to update.",
    });
  }

  return Response.json({ count: result.count });
}

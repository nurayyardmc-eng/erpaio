import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { parseJsonBody, noFieldsToUpdateError } from "@/lib/http/searchParams";
import { THRESHOLD_OPS } from "@/lib/threshold/compare";

/**
 * Watchlist partial update — Track GGGG. Önceden sadece create+delete vardı;
 * threshold tweak için kullanıcı delete + recreate yapmak zorundaydı. Şimdi
 * enable/disable toggle ve threshold edit inline yapılabilir.
 *
 * Tenant-scope (başka tenant'ın id'si silent 404). emailTo null'a çekmek
 * için explicit null kabul edilir (undefined → skip).
 */
const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  question: z.string().min(1).max(500).optional(),
  thresholdOp: z.enum(THRESHOLD_OPS).optional(),
  thresholdVal: z.number().optional(),
  emailTo: z.string().email().nullable().optional(),
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

  // Boş PATCH no-op
  const data: {
    name?: string;
    question?: string;
    thresholdOp?: "lt" | "lte" | "gt" | "gte" | "eq";
    thresholdVal?: number;
    emailTo?: string | null;
    enabled?: boolean;
  } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.question !== undefined) data.question = body.question;
  if (body.thresholdOp !== undefined) data.thresholdOp = body.thresholdOp;
  if (body.thresholdVal !== undefined) data.thresholdVal = body.thresholdVal;
  if (body.emailTo !== undefined) data.emailTo = body.emailTo;
  if (body.enabled !== undefined) data.enabled = body.enabled;

  if (Object.keys(data).length === 0) return noFieldsToUpdateError(req);

  const result = await prisma.watchlist.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data,
  });

  if (result.count === 0) {
    return localizedError(req, 404, {
      tr: "Watchlist bulunamadı.",
      en: "Watchlist not found.",
    });
  }

  const fresh = await prisma.watchlist.findUnique({ where: { id } });
  return Response.json({ watchlist: fresh });
}

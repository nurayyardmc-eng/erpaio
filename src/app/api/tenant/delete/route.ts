import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { verifyUserPassword } from "@/lib/auth/verifyUserPassword";
import { userNotFoundError } from "@/lib/http/searchParams";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordConsent, consentContextFromRequest } from "@/lib/auth/consent";
import { requireOwner } from "@/lib/auth/role";

const BodySchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal("HESABIMI SİL"),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwner(req, session.user.role, {
    tr: "Yalnızca tenant sahibi silebilir.",
    en: "Only the tenant owner can delete.",
  });
  if (denied) return denied;

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) {
    return localizedError(req, 400, { tr: "Onay metni 'HESABIMI SİL' olmalı.", en: "Confirmation must be 'HESABIMI SİL'." });
  }

  const verify = await verifyUserPassword(session.user.id, body.data.password);
  if (verify === "not_found") return userNotFoundError(req);
  if (verify === "wrong") return localizedError(req, 401, { tr: "Şifre yanlış.", en: "Incorrect password." });

  const log = childLogger({ component: "tenant-delete", tenantId: session.user.tenantId });
  log.warn({ userId: session.user.id }, "Tenant deletion initiated (KVKK md. 7)");

  // KVKK md. 7: silinme talebini consent log'a yaz (kullanıcı/tenant cascade'den
  // önce kaydet ki history kaybolmasın — userId/tenantId User silindiğinde
  // SetNull olacak, e-mail audit için saklı kalacak).
  const { ipAddress, userAgent } = consentContextFromRequest(req);
  await recordConsent({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email ?? null,
    consentType: "kvkk_signup",
    action: "withdrawn",
    ipAddress,
    userAgent,
    context: "tenant-delete (right-to-erasure)",
  });

  await prisma.tenant.delete({ where: { id: session.user.tenantId } });

  return Response.json({ ok: true, message: "Hesabınız silindi. Veriler kaskat edildi." });
}

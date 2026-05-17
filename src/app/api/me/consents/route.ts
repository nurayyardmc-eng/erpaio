import { getAuth } from "@/lib/auth/dual";
import { jsonError } from "@/lib/i18n/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { listUserConsents } from "@/lib/auth/consent";

/**
 * KVKK md. 11 — kullanıcının kendi onay geçmişine erişim hakkı.
 * GDPR Art. 15 (right of access) ile aynı kapsam.
 */
export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.id, RATE_LIMITS.CONSENTS_READ);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const consents = await listUserConsents(session.user.id);

  return Response.json({
    consents: consents.map((c) => ({
      id: c.id,
      type: c.consentType,
      action: c.action,
      documentVer: c.documentVer,
      context: c.context,
      createdAt: c.createdAt,
    })),
  });
}

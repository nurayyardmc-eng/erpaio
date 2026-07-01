import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { requireOwnerOrAdmin } from "@/lib/auth/role";
import { rateLimit, rateLimited429 } from "@/lib/rateLimit";
import { dispatchAlert } from "@/lib/notifications/integrations";

/**
 * Send a synthetic test alert to the tenant's enabled Slack/Teams/webhook
 * integrations so a user can validate their setup instead of waiting for a
 * real alert to fire. dispatchAlert updates each integration's
 * lastSuccessAt / lastError, which we read back and return so the caller sees
 * per-integration delivery status immediately.
 *
 * Rate-limited per tenant so a test button can't be used to spam a channel.
 */
export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

  const limit = await rateLimit(session.user.tenantId, {
    prefix: "integration-test",
    max: 5,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimited429(req, limit);

  const tenantId = session.user.tenantId;

  const enabled = await prisma.tenantIntegration.count({ where: { tenantId, enabled: true } });
  if (enabled === 0) {
    return localizedError(req, 400, {
      tr: "Etkin entegrasyon yok — önce bir Slack/Teams/webhook ekleyin.",
      en: "No enabled integrations — add a Slack/Teams/webhook first.",
    });
  }

  await dispatchAlert(tenantId, {
    id: "test",
    type: "test",
    severity: "low",
    title: "ERPAIO test bildirimi",
    description: "Bu bir test bildirimidir — entegrasyonunuz çalışıyor.",
    evidence: null,
  });

  // Read back the delivery status dispatchAlert just wrote.
  const integrations = await prisma.tenantIntegration.findMany({
    where: { tenantId, enabled: true },
    select: { id: true, kind: true, lastSuccessAt: true, lastErrorAt: true, lastError: true },
  });

  return Response.json({ tested: integrations.length, integrations });
}

import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { invalidateSchema, getSchema } from "@/lib/cache/schema";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { assertOwnedConnection } from "@/lib/db/erpConnection";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";
import { recordUserActivity } from "@/lib/audit/activity";
import { childLogger } from "@/lib/observability/logger";
import { requireOwnerOrAdmin } from "@/lib/auth/role";

/**
 * Manuel schema cache re-sync. Track RRR'de bağlantı kartında schema age
 * badge eklemiştik; bu endpoint kullanıcının "stale" gördüğünde tek tıkla
 * re-sync tetiklemesini sağlar.
 *
 * Akış:
 *   1. invalidateSchema() — mem cache clear
 *   2. getSchema() — ERP'ye INFORMATION_SCHEMA query, sonuç schemaText'e
 *      yazılır + builtAt yenilenir + (varsa) sample rows + query cache invalidate
 *   3. Yeni schemaCache snapshot'ı response'a döner (UI badge anında güncellenir)
 *
 * Owner/admin gerekir — ERP'ye query yollar, pahalı + non-trivial.
 * Rate limited: 10/saat/user. recordActivity ile audit log'a yazılır.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role, {
    tr: "Yalnızca owner / admin schema sync tetikleyebilir.",
    en: "Only owner / admin can trigger schema sync.",
  });
  if (denied) return denied;

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.CONNECTION_SCHEMA_SYNC);
  if (limited) return limited;

  const { id } = await context.params;

  // Tenant scope kontrolü — başka tenant'ın id'si bilinse bile 404.
  const ownDenied = await assertOwnedConnection(req, id, session.user.tenantId);
  if (ownDenied) return ownDenied;

  const log = childLogger({ component: "schema-sync", connectionId: id, tenantId: session.user.tenantId });
  const startedAt = Date.now();

  try {
    invalidateSchema(id);
    await getSchema(id); // Triggers upsert with new builtAt
  } catch (err) {
    log.error({ err, durationMs: Date.now() - startedAt }, "Schema re-sync failed");
    Sentry.captureException(err, { tags: { component: "schema-sync" }, extra: { connectionId: id } });
    const message = err instanceof Error ? err.message : "Schema sync failed.";
    return localizedError(req, 503, {
      tr: `Schema sync başarısız: ${message}`,
      en: `Schema sync failed: ${message}`,
    });
  }

  // Yeni snapshot'ı dön — UI Y "X tablo · 0 saat önce" göstersin diye.
  const fresh = await prisma.schemaCache.findUnique({
    where: { connectionId: id },
    select: { builtAt: true, tableCount: true },
  });

  log.info({ durationMs: Date.now() - startedAt, tableCount: fresh?.tableCount ?? 0 }, "Schema re-synced");

  await recordUserActivity(req, session, {
    action: "connection.schema.sync",
    target: id,
    metadata: { tableCount: fresh?.tableCount ?? null, durationMs: Date.now() - startedAt },
  });

  return Response.json({ ok: true, schemaCache: fresh });
}

/**
 * Tenant setup completeness score.
 *
 * Track MMMMMMM — dashboard'da progress bar + "next action" hint
 * göstermek için bu endpoint ve lib/tenant/setupScore birlikte
 * kullanılır.
 *
 * Authenticated user'ın kendi tenant'ı için skor çıkarır; sysadmin
 * cross-tenant erişim yapmaz (bu endpoint tenant-scope).
 */
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { computeSetupScore } from "@/lib/tenant/setupScore";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  // Parallel reads — all lightweight count queries against indexed columns.
  const [
    connectionCount,
    messageCount,
    mfaUser,
    integrationCount,
    tenant,
    savedCount,
    watchlistCount,
    teamMemberCount,
  ] = await Promise.all([
    prisma.erpConnection.count({ where: { tenantId, status: "active" } }),
    prisma.chatMessage.count({
      where: { session: { tenantId, userId }, role: "user" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    }),
    prisma.tenantIntegration.count({ where: { tenantId, enabled: true } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappEnabled: true, emailEnabled: true },
    }),
    prisma.queryCache.count({ where: { tenantId, pinned: true } }),
    prisma.watchlist.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, NOT: { role: "owner" } } }),
  ]);

  const hasNotificationChannel =
    integrationCount > 0 ||
    !!tenant?.whatsappEnabled ||
    !!tenant?.emailEnabled;

  const score = computeSetupScore({
    hasActiveConnection: connectionCount > 0,
    hasAtLeastOneChatMessage: messageCount > 0,
    hasMfaEnabled: mfaUser?.totpEnabled ?? false,
    hasNotificationChannel,
    hasSavedQueryOrWatchlist: savedCount > 0 || watchlistCount > 0,
    hasTeamMember: teamMemberCount > 0,
  });

  return Response.json(score, {
    headers: { "Cache-Control": "no-store" },
  });
}

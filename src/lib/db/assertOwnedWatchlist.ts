/**
 * Tenant-scoped Watchlist ownership check.
 *
 * Track MMMMMMMMMMMM — watchlists/[id]/triggers IDENTIK assertion-only
 * lookup yapiyordu:
 *   const watchlist = await prisma.watchlist.findFirst({
 *     where: { id, tenantId: session.user.tenantId },
 *     select: { id: true },
 *   });
 *   if (!watchlist) return watchlistNotFoundError(req);
 *
 * Pattern: assertOwnedConnection (Track ZZZZZZZ) +
 * assertOwnedChatSession (Track AAAAAAAAAAA) ile uyumlu. Caller
 * `const denied = await assertOwnedWatchlist(...); if (denied) return
 * denied;` ile early-exit.
 *
 * SECURITY: tenantId scope; baska tenant'in watchlist id'si bilinse
 * bile null doner -> 404 yansir. Tek noktada bu boundary
 * test-edilebilir + drift-stable.
 */
import { prisma } from "@/lib/db/prisma";
import { watchlistNotFoundError } from "@/lib/http/searchParams";

export async function assertOwnedWatchlist(
  req: Request,
  watchlistId: string,
  tenantId: string,
): Promise<Response | null> {
  const owned = await prisma.watchlist.findFirst({
    where: { id: watchlistId, tenantId },
    select: { id: true },
  });
  if (!owned) return watchlistNotFoundError(req);
  return null;
}

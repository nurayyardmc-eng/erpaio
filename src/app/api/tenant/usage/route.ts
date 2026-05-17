import { getAuth } from "@/lib/auth/dual";
import { jsonError } from "@/lib/i18n/server";
import { getBudgetStatus } from "@/lib/budget";

/**
 * Tenant'ın aylık token usage durumu — settings sayfası ve mobil dashboard kullanır.
 * Tenant-scoped (kullanıcı yalnızca kendi tenant'ının usage'ını görür).
 */
export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const status = await getBudgetStatus(session.user.tenantId);
  if (!status) return jsonError(req, "api.notFound", 404);

  return Response.json({
    used: status.used,
    budget: status.budget,
    remaining: status.remaining,
    percentUsed: status.percentUsed,
    resetsOn: status.resetsOn.toISOString(),
  });
}

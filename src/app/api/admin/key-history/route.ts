import { getKeyHistory, registerCurrentKey } from "@/lib/crypto/keyRotation";
import { jsonError } from "@/lib/i18n/server";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limit = await rateLimit(guard.userId, RATE_LIMITS.ADMIN_READ);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  // Best-effort: encryption key version'unu kayda al, başarısızlık history
  // fetch'i bloklamasın (zaten kayıttaki history bu çağrıdan etkilenmez).
  await registerCurrentKey().catch((err) => {
    console.warn("registerCurrentKey failed in key-history endpoint:", err);
  });
  const history = await getKeyHistory();
  return Response.json({ history });
}

import { getKeyHistory, registerCurrentKey } from "@/lib/crypto/keyRotation";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limited = await enforceUserRateLimit(req, guard.userId, RATE_LIMITS.ADMIN_READ);
  if (limited) return limited;

  // Best-effort: encryption key version'unu kayda al, başarısızlık history
  // fetch'i bloklamasın (zaten kayıttaki history bu çağrıdan etkilenmez).
  await registerCurrentKey().catch((err) => {
    console.warn("registerCurrentKey failed in key-history endpoint:", err);
  });
  const history = await getKeyHistory();
  return Response.json({ history });
}

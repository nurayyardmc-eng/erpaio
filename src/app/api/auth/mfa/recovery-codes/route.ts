import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import {
  generateRecoveryCodes,
  recoveryCodeStatus,
} from "@/lib/auth/recovery";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";;
import { recordUserActivity } from "@/lib/audit/activity";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const status = await recoveryCodeStatus(session.user.id);
  return Response.json(status);
}

/**
 * Generate (or regenerate) recovery codes.
 * Requires MFA to be already enabled — recovery only makes sense if MFA is on.
 * Returns plaintext codes ONCE; never retrievable again.
 */
export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  // Recovery code üretim spam koruması: kullanıcı başına saatte 3
  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.RECOVERY_GEN);
  if (limited) return limited;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true },
  });
  if (!user?.totpEnabled) {
    return localizedError(req, 400, {
      tr: "Önce MFA'yı etkinleştirin.",
      en: "Enable MFA first.",
    });
  }

  const codes = await generateRecoveryCodes(session.user.id);

  await recordUserActivity(req, session, {
    action: "mfa.recovery.regenerate",
    metadata: { count: codes.length },
  });

  return Response.json({ codes });
}

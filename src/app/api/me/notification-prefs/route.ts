import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";
import { jsonError } from "@/lib/i18n/server";
import {
  parseJsonBody,
  userNotFoundError,
  noFieldsToUpdateError,
} from "@/lib/http/searchParams";
import { recordUserActivity } from "@/lib/audit/activity";
import {
  PUSH_PREFS_SELECT,
  mapPushPrefsRow,
  buildPushPrefsUpdate,
} from "@/lib/notifications/push";

/**
 * Per-user push notification opt-in preferences.
 *
 * Kategoriler (push.ts'teki `PushCategory` ile birebir):
 * - alerts: manuel POST /api/alerts
 * - anomaly: anomaly detection
 * - watchlists: watchlist eşik tetikleyici
 *
 * KVKK md. 11 + GDPR Art. 21 — kullanıcı her kategoriden ayrı çıkabilir.
 */

const PrefsResponseSchema = z.object({
  alerts: z.boolean(),
  anomaly: z.boolean(),
  watchlists: z.boolean(),
});

const PatchSchema = z.object({
  alerts: z.boolean().optional(),
  anomaly: z.boolean().optional(),
  watchlists: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.NOTIFICATION_PREFS);
  if (limited) return limited;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: PUSH_PREFS_SELECT,
  });
  if (!user) return userNotFoundError(req);

  return Response.json({
    prefs: PrefsResponseSchema.parse(mapPushPrefsRow(user)),
  });
}

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.NOTIFICATION_PREFS);
  if (limited) return limited;

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  // Sadece gönderilen alanları güncelle — boş PATCH no-op.
  const data = buildPushPrefsUpdate(body);

  if (Object.keys(data).length === 0) return noFieldsToUpdateError(req);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: PUSH_PREFS_SELECT,
  });

  await recordUserActivity(req, session, {
    action: "notification.prefs.update",
    target: session.user.id,
    metadata: data,
  });

  return Response.json({
    prefs: mapPushPrefsRow(user),
  });
}

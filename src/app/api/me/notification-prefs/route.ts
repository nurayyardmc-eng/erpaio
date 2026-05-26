import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { recordUserActivity } from "@/lib/audit/activity";

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

  const limit = await rateLimit(session.user.id, RATE_LIMITS.NOTIFICATION_PREFS);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pushPrefAlerts: true, pushPrefAnomaly: true, pushPrefWatchlists: true },
  });
  if (!user) return localizedError(req, 404, { tr: "Kullanıcı bulunamadı.", en: "User not found." });

  return Response.json({
    prefs: PrefsResponseSchema.parse({
      alerts: user.pushPrefAlerts,
      anomaly: user.pushPrefAnomaly,
      watchlists: user.pushPrefWatchlists,
    }),
  });
}

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.id, RATE_LIMITS.NOTIFICATION_PREFS);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  // Sadece gönderilen alanları güncelle — boş PATCH no-op.
  const data: {
    pushPrefAlerts?: boolean;
    pushPrefAnomaly?: boolean;
    pushPrefWatchlists?: boolean;
  } = {};
  if (body.alerts !== undefined) data.pushPrefAlerts = body.alerts;
  if (body.anomaly !== undefined) data.pushPrefAnomaly = body.anomaly;
  if (body.watchlists !== undefined) data.pushPrefWatchlists = body.watchlists;

  if (Object.keys(data).length === 0) {
    return localizedError(req, 400, {
      tr: "Güncellenecek alan yok.",
      en: "No fields to update.",
    });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { pushPrefAlerts: true, pushPrefAnomaly: true, pushPrefWatchlists: true },
  });

  await recordUserActivity(req, session, {
    action: "notification.prefs.update",
    target: session.user.id,
    metadata: data,
  });

  return Response.json({
    prefs: {
      alerts: user.pushPrefAlerts,
      anomaly: user.pushPrefAnomaly,
      watchlists: user.pushPrefWatchlists,
    },
  });
}

import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { applyFeedback } from "@/lib/cache/queryCache";
import { childLogger } from "@/lib/observability/logger";
import { setSentryUserFromSession } from "@/lib/observability/sentryUser";
import { RATE_LIMITS, rateLimit, rateLimited429 } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { z } from "zod";

const BodySchema = z.object({
  messageId: z.string(),
  feedback: z.union([z.literal(1), z.literal(-1)]),
});

export async function PATCH(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  setSentryUserFromSession(session);

  const limit = await rateLimit(session.user.id, RATE_LIMITS.CHAT_FEEDBACK);
  if (!limit.success) return rateLimited429(req, limit);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { messageId, feedback } = body;
  const tenantId = session.user.tenantId;

  const message = await prisma.chatMessage.findFirst({
    where: {
      id: messageId,
      role: "assistant",
      session: { tenantId },
    },
    select: { id: true, sessionId: true, createdAt: true, sqlQuery: true },
  });

  if (!message) return localizedError(req, 404, { tr: "Mesaj bulunamadı.", en: "Message not found." });

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { feedback },
  });

  const log = childLogger({ component: "chat-feedback", tenantId, messageId });

  // Match the cache row by the exact SQL being rated. This is connection-aware
  // for free (the SQL is dialect/schema-specific) and avoids recomputing the
  // now connection-scoped questionHash, which this route can't do — neither the
  // message nor the session stores a connectionId.
  if (message.sqlQuery) {
    const cacheRow = await prisma.queryCache.findFirst({
      where: { tenantId, sqlQuery: message.sqlQuery },
      select: { id: true },
    });

    if (cacheRow) {
      try {
        await applyFeedback(cacheRow.id, feedback);
        log.info({ event: "feedback_applied", feedback, cacheId: cacheRow.id }, "Feedback applied to cache");
      } catch (err) {
        log.error({ err, event: "feedback_apply_failed" }, "Failed to apply feedback");
        Sentry.captureException(err, {
          tags: { component: "chat-feedback" },
          extra: { messageId, cacheId: cacheRow.id },
        });
      }
    } else {
      log.info({ event: "feedback_no_cache", feedback }, "Feedback recorded but no cache entry");
    }
  }

  return Response.json({ ok: true });
}

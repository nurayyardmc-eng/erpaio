import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { applyFeedback, hashQuestion } from "@/lib/cache/queryCache";
import { childLogger } from "@/lib/observability/logger";
import { setSentryUser } from "@/lib/observability/sentryUser";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError, localizedError, serverMessages } from "@/lib/i18n/server";
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

  setSentryUser({
    id: session.user.id,
    email: session.user.email,
    tenantId: session.user.tenantId,
    role: session.user.role,
  });

  const limit = await rateLimit(session.user.id, RATE_LIMITS.CHAT_FEEDBACK);
  if (!limit.success) {
    return Response.json(
      { error: serverMessages(req).api.rateLimited },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.reset - Date.now()) / 1000)) } },
    );
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return localizedError(req, 400, { tr: body.error.issues[0]?.message ?? "Geçersiz veri", en: body.error.issues[0]?.message ?? "Invalid data" });

  const { messageId, feedback } = body.data;
  const tenantId = session.user.tenantId;

  const message = await prisma.chatMessage.findFirst({
    where: {
      id: messageId,
      role: "assistant",
      session: { tenantId },
    },
    select: { id: true, sessionId: true, createdAt: true },
  });

  if (!message) return localizedError(req, 404, { tr: "Mesaj bulunamadı.", en: "Message not found." });

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { feedback },
  });

  const userMessage = await prisma.chatMessage.findFirst({
    where: {
      sessionId: message.sessionId,
      role: "user",
      createdAt: { lt: message.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });

  const log = childLogger({ component: "chat-feedback", tenantId, messageId });

  if (userMessage) {
    const questionHash = hashQuestion(userMessage.content, tenantId);
    const cacheRow = await prisma.queryCache.findUnique({
      where: { tenantId_questionHash: { tenantId, questionHash } },
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

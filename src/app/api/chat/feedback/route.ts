import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { applyFeedback, hashQuestion } from "@/lib/cache/queryCache";
import { childLogger } from "@/lib/observability/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { z } from "zod";

const BodySchema = z.object({
  messageId: z.string(),
  feedback: z.union([z.literal(1), z.literal(-1)]),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const limit = await rateLimit(session.user.id, RATE_LIMITS.CHAT_FEEDBACK);
  if (!limit.success) {
    return Response.json(
      { error: "Çok fazla feedback." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.reset - Date.now()) / 1000)) } },
    );
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

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

  if (!message) return Response.json({ error: "Mesaj bulunamadı." }, { status: 404 });

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

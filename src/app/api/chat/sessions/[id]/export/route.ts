import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, resolveLocale } from "@/lib/i18n/server";
import {
  chatSessionFilename,
  chatSessionToMarkdown,
  type ChatExportMessage,
} from "@/lib/chat/exportMarkdown";

/**
 * Chat session markdown export — kullanıcı kendi sohbet geçmişini indirir.
 * KVKK md. 15 right to data portability ile uyumlu (kişisel veri taşınabilirlik).
 *
 * tenant + userId scope'lu (kullanıcı sadece KENDİ sohbet session'ını
 * indirebilir, başka kullanıcının tenant'ta olsa bile değil).
 *
 * Locale Accept-Language'dan resolve edilir; markdown role label'ları ve
 * "Oluşturulma:" / "Created:" buna göre seçilir. Content-Disposition header
 * dosya adıyla (slug + date + .md).
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await context.params;

  const chatSession = await prisma.chatSession.findFirst({
    where: { id, tenantId: session.user.tenantId, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chatSession) return jsonError(req, "api.notFound", 404);

  const locale = resolveLocale(req);
  const exportShape = {
    id: chatSession.id,
    title: chatSession.title,
    createdAt: chatSession.createdAt,
    messages: chatSession.messages.map<ChatExportMessage>((m) => ({
      role: m.role,
      content: m.content,
      sqlQuery: m.sqlQuery,
      rowCount: m.rowCount,
      latencyMs: m.latencyMs,
      success: m.success,
      createdAt: m.createdAt,
    })),
  };

  const markdown = chatSessionToMarkdown(exportShape, locale);
  const filename = chatSessionFilename(exportShape);

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

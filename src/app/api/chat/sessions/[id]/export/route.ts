import { getAuth } from "@/lib/auth/dual";
import { jsonError, resolveLocale } from "@/lib/i18n/server";
import { findOwnedChatSessionWithMessages } from "@/lib/chat/findOwnedChatSession";
import {
  chatSessionFilename,
  chatSessionToMarkdown,
  type ChatExportMessage,
} from "@/lib/chat/exportMarkdown";
import { fileDownloadResponse } from "@/lib/http/download";

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

  const chatSession = await findOwnedChatSessionWithMessages(
    id,
    session.user.tenantId,
    session.user.id,
  );
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

  return fileDownloadResponse(markdown, {
    filename,
    contentType: "text/markdown; charset=utf-8",
  });
}

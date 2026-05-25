/**
 * Format DB chat history rows into the Anthropic messages[] shape.
 *
 * Extracted (Track GGGGG) from src/app/api/chat/route.ts:loadConversationHistory
 * so the row → AI message transformation can be unit-tested without Prisma.
 *
 * Contract:
 *  - Input is ordered NEWEST-FIRST (DB query uses `orderBy: createdAt desc`).
 *    The function reverses to chronological order before mapping.
 *  - Failed messages (success: false) are dropped — the model shouldn't see
 *    error replies in history (would confuse it into reproducing the bug).
 *  - Assistant messages with sqlQuery get a summary line "<sql>\n\n(N satır
 *    döndü)" instead of the raw content (more compact prompt + signals
 *    successful execution).
 */
export interface ChatMessageRow {
  role: string;
  content: string;
  sqlQuery: string | null;
  success: boolean;
  rowCount: number | null;
}

export type AiHistoryMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export function formatChatHistoryForAi(
  rowsNewestFirst: ChatMessageRow[],
): AiHistoryMessage[] {
  return [...rowsNewestFirst]
    .reverse()
    .filter((m) => m.success)
    .map((m): AiHistoryMessage => {
      if (m.role === "user") {
        return { role: "user", content: m.content };
      }
      const summary = m.sqlQuery
        ? `${m.sqlQuery}\n\n(${m.rowCount ?? 0} satır döndü)`
        : m.content;
      return { role: "assistant", content: summary };
    });
}

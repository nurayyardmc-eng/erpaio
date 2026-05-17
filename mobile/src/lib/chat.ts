import { api } from "./api";

export interface Connection {
  id: string;
  dbName: string;
  host: string;
  status: string;
  /** Schema cache snapshot — null ise hiç sync olmadı. RRR'de eklendi. */
  schemaCache?: { builtAt: string; tableCount: number } | null;
}

export interface SessionListItem {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  pinned?: boolean;
  archivedAt?: string | null;
}

export interface ServerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlQuery: string | null;
  rowCount: number | null;
  latencyMs: number | null;
  success: boolean;
  feedback: number | null;
  createdAt: string;
}

export interface ChatResponse {
  sql: string;
  results: Record<string, unknown>[];
  columns: string[];
  total: number;
  latencyMs: number;
  sessionId: string;
  messageId?: string;
  cacheHit?: boolean;
}

export async function getConnections(): Promise<Connection[]> {
  return api<Connection[]>("/api/connections");
}

export async function getSessions(): Promise<SessionListItem[]> {
  return api<SessionListItem[]>("/api/chat/sessions");
}

export async function getSession(
  id: string,
): Promise<{ id: string; title: string | null; messages: ServerMessage[] }> {
  return api(`/api/chat/sessions/${id}`);
}

export async function deleteSession(id: string): Promise<void> {
  await api(`/api/chat/sessions/${id}`, { method: "DELETE" });
}

/**
 * Sohbet session'ını markdown formatında export et.
 * Server text/markdown döner; api() raw string'i parse edemeyince string olarak
 * geri verir. KVKK md. 15 / GDPR Art. 20 data portability.
 */
export async function exportSessionMarkdown(id: string): Promise<string> {
  return api<string>(`/api/chat/sessions/${encodeURIComponent(id)}/export`);
}

export async function getSessionsByView(view: "active" | "archived" = "active"): Promise<SessionListItem[]> {
  return api<SessionListItem[]>(`/api/chat/sessions?view=${view}`);
}

export async function patchSession(
  id: string,
  data: { pinned?: boolean; archivedAt?: string | null; title?: string },
): Promise<void> {
  await api(`/api/chat/sessions/${id}`, { method: "PATCH", body: data });
}

export async function sendQuestion(
  connectionId: string,
  question: string,
  sessionId?: string,
): Promise<ChatResponse> {
  return api<ChatResponse>("/api/chat", {
    method: "POST",
    body: { connectionId, question, sessionId },
  });
}

export async function runSql(
  connectionId: string,
  sql: string,
  sessionId?: string,
): Promise<ChatResponse> {
  return api<ChatResponse>("/api/chat/run-sql", {
    method: "POST",
    body: { connectionId, sql, sessionId },
  });
}

export async function sendFeedback(messageId: string, feedback: 1 | -1): Promise<void> {
  await api("/api/chat/feedback", {
    method: "PATCH",
    body: { messageId, feedback },
  });
}

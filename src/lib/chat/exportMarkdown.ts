/**
 * Chat session → Markdown serializer.
 *
 * Kullanıcıların kendi sohbet geçmişlerini indirip arşivlemesi için (KVKK
 * md. 15 right to data portability ile uyumlu — kişisel veri taşınabilirlik).
 * Web download button + mobile Share intent her ikisi de bu HTML/MD'yi
 * üretir.
 *
 * Pure function — DB bağımlılığı yok, test edilir. Boş veya invalid girdi
 * defensive olarak "" döner (caller "boş sohbet" mesajı gösterir).
 */

export interface ChatExportMessage {
  role: "user" | "assistant" | "system" | string;
  content: string;
  sqlQuery?: string | null;
  rowCount?: number | null;
  latencyMs?: number | null;
  success?: boolean;
  createdAt: string | Date;
}

export interface ChatExportSession {
  id?: string;
  title?: string | null;
  createdAt?: string | Date | null;
  messages: ChatExportMessage[];
}

const ROLE_LABEL_TR: Record<string, string> = {
  user: "👤 Kullanıcı",
  assistant: "🤖 ERPAIO",
  system: "ℹ️ Sistem",
};

function fmtDate(d: string | Date | null | undefined, locale: "tr" | "en"): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale === "en" ? "en-US" : "tr-TR");
}

function roleLabel(role: string, locale: "tr" | "en"): string {
  if (locale === "en") {
    if (role === "user") return "👤 User";
    if (role === "assistant") return "🤖 ERPAIO";
    if (role === "system") return "ℹ️ System";
    return role;
  }
  return ROLE_LABEL_TR[role] ?? role;
}

/**
 * Markdown render — boş messages array → empty string.
 *
 * Format:
 *   # {title}
 *   _Oluşturulma: {createdAt}_
 *
 *   ---
 *   ### 👤 Kullanıcı · {createdAt}
 *   {content}
 *
 *   ### 🤖 ERPAIO · {createdAt}
 *   {content}
 *
 *   ```sql
 *   {sqlQuery}
 *   ```
 *
 *   _{rowCount} satır · {latencyMs}ms_
 *   ---
 */
export function chatSessionToMarkdown(
  session: ChatExportSession,
  locale: "tr" | "en" = "tr",
): string {
  if (!session.messages || session.messages.length === 0) return "";

  const lines: string[] = [];
  const title = session.title?.trim() || (locale === "en" ? "Untitled session" : "Adsız sohbet");
  lines.push(`# ${title}`);

  if (session.createdAt) {
    const label = locale === "en" ? "Created" : "Oluşturulma";
    lines.push(`_${label}: ${fmtDate(session.createdAt, locale)}_`);
  }

  for (const msg of session.messages) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(`### ${roleLabel(msg.role, locale)} · ${fmtDate(msg.createdAt, locale)}`);
    lines.push("");
    lines.push(msg.content || "_(boş)_");

    if (msg.sqlQuery && msg.sqlQuery.trim()) {
      lines.push("");
      lines.push("```sql");
      lines.push(msg.sqlQuery.trim());
      lines.push("```");
    }

    const stats: string[] = [];
    if (typeof msg.rowCount === "number") {
      stats.push(`${msg.rowCount} ${locale === "en" ? "rows" : "satır"}`);
    }
    if (typeof msg.latencyMs === "number") stats.push(`${msg.latencyMs}ms`);
    if (msg.success === false) stats.push(locale === "en" ? "FAILED" : "BAŞARISIZ");
    if (stats.length > 0) {
      lines.push("");
      lines.push(`_${stats.join(" · ")}_`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Mobile/web indirme filename pattern. Title temizlenir (slug-like),
 * tarih eklenir, .md uzantısı. Boş title → "chat-session".
 */
export function chatSessionFilename(session: ChatExportSession): string {
  const ts = new Date().toISOString().slice(0, 10);
  const titleSlug = (session.title ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diakritik temizle (Türkçe ç,ğ vs.)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 50);
  const stub = titleSlug || "chat-session";
  return `${stub}-${ts}.md`;
}

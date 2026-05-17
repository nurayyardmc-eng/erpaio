import { describe, it, expect } from "vitest";
import { chatSessionFilename, chatSessionToMarkdown, type ChatExportSession } from "./exportMarkdown";

const baseDate = new Date("2026-05-18T10:00:00Z");

const makeSession = (overrides: Partial<ChatExportSession> = {}): ChatExportSession => ({
  id: "sess_1",
  title: "Satış raporu sorgusu",
  createdAt: baseDate,
  messages: [
    { role: "user", content: "Bugün kaç sipariş geldi?", createdAt: baseDate },
    {
      role: "assistant",
      content: "Bugün toplam 42 sipariş geldi.",
      sqlQuery: "SELECT COUNT(*) FROM orders WHERE order_date = CURRENT_DATE",
      rowCount: 1,
      latencyMs: 350,
      success: true,
      createdAt: baseDate,
    },
  ],
  ...overrides,
});

describe("chat/exportMarkdown", () => {
  describe("chatSessionToMarkdown", () => {
    it("empty messages → empty string", () => {
      expect(chatSessionToMarkdown({ messages: [] })).toBe("");
    });

    it("includes title as H1", () => {
      const md = chatSessionToMarkdown(makeSession());
      expect(md).toContain("# Satış raporu sorgusu");
    });

    it("null title → 'Adsız sohbet' (TR default)", () => {
      const md = chatSessionToMarkdown({ messages: makeSession().messages, title: null });
      expect(md).toContain("# Adsız sohbet");
    });

    it("EN locale → 'Untitled session'", () => {
      const md = chatSessionToMarkdown({ messages: makeSession().messages, title: null }, "en");
      expect(md).toContain("# Untitled session");
    });

    it("includes createdAt timestamp (TR locale)", () => {
      const md = chatSessionToMarkdown(makeSession());
      expect(md).toContain("Oluşturulma:");
    });

    it("EN locale createdAt label", () => {
      const md = chatSessionToMarkdown(makeSession(), "en");
      expect(md).toContain("Created:");
    });

    it("user message renders with role label", () => {
      const md = chatSessionToMarkdown(makeSession());
      expect(md).toContain("👤 Kullanıcı");
      expect(md).toContain("Bugün kaç sipariş geldi?");
    });

    it("assistant message renders with role label", () => {
      const md = chatSessionToMarkdown(makeSession());
      expect(md).toContain("🤖 ERPAIO");
    });

    it("EN locale role labels", () => {
      const md = chatSessionToMarkdown(makeSession(), "en");
      expect(md).toContain("👤 User");
      expect(md).toContain("🤖 ERPAIO");
    });

    it("SQL query rendered as fenced code block", () => {
      const md = chatSessionToMarkdown(makeSession());
      expect(md).toContain("```sql");
      expect(md).toContain("SELECT COUNT(*) FROM orders WHERE order_date = CURRENT_DATE");
      expect(md).toContain("```");
    });

    it("no SQL → no code fence (negative)", () => {
      const md = chatSessionToMarkdown({
        messages: [{ role: "user", content: "merhaba", createdAt: baseDate }],
      });
      expect(md).not.toContain("```sql");
    });

    it("rowCount + latencyMs in stats footer (TR)", () => {
      const md = chatSessionToMarkdown(makeSession());
      expect(md).toContain("1 satır");
      expect(md).toContain("350ms");
    });

    it("rowCount in EN locale uses 'rows'", () => {
      const md = chatSessionToMarkdown(makeSession(), "en");
      expect(md).toContain("1 rows");
    });

    it("failed message shows BAŞARISIZ tag", () => {
      const md = chatSessionToMarkdown({
        messages: [
          {
            role: "assistant",
            content: "Sorgu çalışmadı",
            success: false,
            createdAt: baseDate,
          },
        ],
      });
      expect(md).toContain("BAŞARISIZ");
    });

    it("empty content fallback → _(boş)_", () => {
      const md = chatSessionToMarkdown({
        messages: [{ role: "user", content: "", createdAt: baseDate }],
      });
      expect(md).toContain("_(boş)_");
    });

    it("unknown role passes through", () => {
      const md = chatSessionToMarkdown({
        messages: [{ role: "custom_role", content: "test", createdAt: baseDate }],
      });
      expect(md).toContain("custom_role");
    });

    it("messages separated by horizontal rule (---)", () => {
      const md = chatSessionToMarkdown(makeSession());
      // En az 1 --- (mesajlar arasında ayraç)
      expect((md.match(/^---$/gm) ?? []).length).toBeGreaterThan(0);
    });
  });

  describe("chatSessionFilename", () => {
    it("includes today's date in YYYY-MM-DD format", () => {
      const fn = chatSessionFilename(makeSession());
      expect(fn).toMatch(/\d{4}-\d{2}-\d{2}\.md$/);
    });

    it("slugifies title (lowercase + dashes)", () => {
      const fn = chatSessionFilename(makeSession());
      // "Satış raporu sorgusu" → "sat-raporu-sorgusu" (ş diakritiği temizlenir)
      // Note: Turkish ş has no decomposition pair, so it stays as ş then gets
      // replaced by - in [^a-z0-9]+ regex. Acceptable.
      expect(fn).toMatch(/^[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.md$/);
    });

    it("null title → 'chat-session-{date}.md'", () => {
      const fn = chatSessionFilename({ messages: [], title: null });
      expect(fn).toMatch(/^chat-session-\d{4}-\d{2}-\d{2}\.md$/);
    });

    it("title with only special chars → fallback to 'chat-session'", () => {
      const fn = chatSessionFilename({ messages: [], title: "!!!" });
      expect(fn).toMatch(/^chat-session-\d{4}-\d{2}-\d{2}\.md$/);
    });

    it("very long title gets truncated to ≤ 50 char slug", () => {
      const longTitle = "a".repeat(200);
      const fn = chatSessionFilename({ messages: [], title: longTitle });
      const slug = fn.replace(/-\d{4}-\d{2}-\d{2}\.md$/, "");
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it("filename ends with .md", () => {
      expect(chatSessionFilename(makeSession())).toMatch(/\.md$/);
    });
  });
});

import { describe, it, expect } from "vitest";
import { formatChatHistoryForAi, type ChatMessageRow } from "./chatHistory";

// Test factory — keeps each test focused on what's distinctive.
function row(overrides: Partial<ChatMessageRow>): ChatMessageRow {
  return {
    role: "user",
    content: "default content",
    sqlQuery: null,
    success: true,
    rowCount: null,
    ...overrides,
  };
}

describe("ai/chatHistory/formatChatHistoryForAi", () => {
  it("empty input → empty output", () => {
    expect(formatChatHistoryForAi([])).toEqual([]);
  });

  it("reverses input order (DB newest-first → chronological)", () => {
    const input = [
      row({ content: "third (newest)" }),
      row({ content: "second" }),
      row({ content: "first (oldest)" }),
    ];
    const out = formatChatHistoryForAi(input);
    expect(out.map((m) => m.content)).toEqual([
      "first (oldest)",
      "second",
      "third (newest)",
    ]);
  });

  it("does not mutate input array", () => {
    const input = [row({ content: "a" }), row({ content: "b" })];
    const copy = [...input];
    formatChatHistoryForAi(input);
    expect(input).toEqual(copy);
  });

  it("filters out failed messages (success: false)", () => {
    const input = [
      row({ content: "ok", success: true }),
      row({ content: "failed", success: false }),
      row({ content: "also ok", success: true }),
    ];
    const out = formatChatHistoryForAi(input);
    expect(out.map((m) => m.content)).not.toContain("failed");
    expect(out).toHaveLength(2);
  });

  it("user role → passes content through verbatim", () => {
    const out = formatChatHistoryForAi([
      row({ role: "user", content: "kullanıcı sorusu", sqlQuery: "SELECT 1" }),
    ]);
    expect(out).toEqual([{ role: "user", content: "kullanıcı sorusu" }]);
  });

  // These lead with a user turn (newest-first input) so the formatted assistant
  // turn isn't trimmed by the leading-assistant guard.
  it("assistant with sqlQuery → summary line includes SQL and row count", () => {
    const out = formatChatHistoryForAi([
      row({
        role: "assistant",
        content: "ignored when sqlQuery present",
        sqlQuery: "SELECT * FROM Users",
        rowCount: 42,
      }),
      row({ role: "user", content: "q" }),
    ]);
    expect(out[out.length - 1]).toEqual({
      role: "assistant",
      content: "SELECT * FROM Users\n\n(42 satır döndü)",
    });
  });

  it("assistant with sqlQuery + null rowCount → uses 0", () => {
    const out = formatChatHistoryForAi([
      row({ role: "assistant", sqlQuery: "SELECT 1", rowCount: null }),
      row({ role: "user", content: "q" }),
    ]);
    expect((out[out.length - 1] as { content: string }).content).toContain("(0 satır döndü)");
  });

  it("assistant WITHOUT sqlQuery → falls back to raw content", () => {
    const out = formatChatHistoryForAi([
      row({ role: "assistant", content: "Açıklama metni", sqlQuery: null }),
      row({ role: "user", content: "q" }),
    ]);
    expect(out[out.length - 1]).toEqual({ role: "assistant", content: "Açıklama metni" });
  });

  it("mixed conversation preserves chronological order with mapping", () => {
    // DB order: newest first
    const input = [
      row({ role: "assistant", sqlQuery: "SELECT 2", rowCount: 5 }),  // newest
      row({ role: "user", content: "ikinci soru" }),
      row({ role: "assistant", sqlQuery: "SELECT 1", rowCount: 1 }),
      row({ role: "user", content: "ilk soru" }),                       // oldest
    ];
    const out = formatChatHistoryForAi(input);
    expect(out).toEqual([
      { role: "user", content: "ilk soru" },
      { role: "assistant", content: "SELECT 1\n\n(1 satır döndü)" },
      { role: "user", content: "ikinci soru" },
      { role: "assistant", content: "SELECT 2\n\n(5 satır döndü)" },
    ]);
  });

  it("failed assistant message excluded — does not leak SQL error to model", () => {
    const out = formatChatHistoryForAi([
      row({
        role: "assistant",
        content: "Hata: invalid syntax",
        sqlQuery: "SELECT * FORM Users",
        success: false,
      }),
    ]);
    expect(out).toEqual([]);
  });

  it("failed user message also excluded (consistency)", () => {
    const out = formatChatHistoryForAi([
      row({ role: "user", content: "x", success: false }),
    ]);
    expect(out).toEqual([]);
  });

  it("unknown role treated as assistant branch (defensive)", () => {
    // Catches mis-typed roles in DB — falls through to assistant logic.
    // Lead with a user (newest-first input) so the assistant turn isn't trimmed.
    const out = formatChatHistoryForAi([
      row({ role: "system", content: "weird", sqlQuery: null }),
      row({ role: "user", content: "q" }),
    ]);
    expect(out[out.length - 1].role).toBe("assistant");
  });

  it("rowCount 0 explicitly shown (not null)", () => {
    const out = formatChatHistoryForAi([
      row({ role: "assistant", sqlQuery: "SELECT 1", rowCount: 0 }),
      row({ role: "user", content: "q" }),
    ]);
    expect((out[out.length - 1] as { content: string }).content).toContain("(0 satır döndü)");
  });

  it("very large rowCount preserved (no truncation)", () => {
    const out = formatChatHistoryForAi([
      row({ role: "assistant", sqlQuery: "SELECT 1", rowCount: 1_500_000 }),
      row({ role: "user", content: "q" }),
    ]);
    expect((out[out.length - 1] as { content: string }).content).toContain("(1500000 satır döndü)");
  });

  it("trims leading assistant turns — result never opens with assistant (Anthropic 400)", () => {
    // chronological: assistant, user, assistant → newest-first input reversed
    const out = formatChatHistoryForAi([
      row({ role: "assistant", content: "A2", sqlQuery: "SELECT 2", rowCount: 1 }),
      row({ role: "user", content: "U1" }),
      row({ role: "assistant", content: "A1", sqlQuery: "SELECT 1", rowCount: 1 }),
    ]);
    expect(out[0].role).toBe("user");
    expect(out.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("all-assistant history → empty (never opens with assistant)", () => {
    const out = formatChatHistoryForAi([
      row({ role: "assistant", content: "A2", sqlQuery: "SELECT 2", rowCount: 1 }),
      row({ role: "assistant", content: "A1", sqlQuery: "SELECT 1", rowCount: 1 }),
    ]);
    expect(out).toEqual([]);
  });
});

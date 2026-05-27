import { describe, it, expect, vi, beforeEach } from "vitest";

const { createManyMock } = vi.hoisted(() => ({ createManyMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { chatMessage: { createMany: createManyMock } },
}));

import { persistChatExchange } from "./persistChatExchange";

describe("chat/persistChatExchange", () => {
  beforeEach(() => {
    createManyMock.mockReset();
    createManyMock.mockResolvedValue({ count: 2 });
  });

  it("createMany called once with 2 rows (single round-trip)", async () => {
    await persistChatExchange({
      sessionId: "s1",
      question: "soru",
      sql: "SELECT 1",
      rowCount: 5,
      latencyMs: 100,
    });
    expect(createManyMock).toHaveBeenCalledTimes(1);
    const call = createManyMock.mock.calls[0][0];
    expect(call.data).toHaveLength(2);
  });

  it("first row is user message with question content", async () => {
    await persistChatExchange({
      sessionId: "s1",
      question: "Stoğum nedir?",
      sql: "SELECT stok",
      rowCount: 1,
      latencyMs: 50,
    });
    const call = createManyMock.mock.calls[0][0];
    expect(call.data[0].role).toBe("user");
    expect(call.data[0].content).toBe("Stoğum nedir?");
    expect(call.data[0].sessionId).toBe("s1");
  });

  it("second row is assistant message with sql/rowCount/latencyMs/success", async () => {
    await persistChatExchange({
      sessionId: "s1",
      question: "soru",
      sql: "SELECT total FROM orders",
      rowCount: 42,
      latencyMs: 250,
    });
    const call = createManyMock.mock.calls[0][0];
    expect(call.data[1].role).toBe("assistant");
    expect(call.data[1].content).toBe("SELECT total FROM orders");
    expect(call.data[1].sqlQuery).toBe("SELECT total FROM orders");
    expect(call.data[1].rowCount).toBe(42);
    expect(call.data[1].latencyMs).toBe(250);
    expect(call.data[1].success).toBe(true);
  });

  it("user row does NOT carry sqlQuery / rowCount / latencyMs / success", async () => {
    await persistChatExchange({
      sessionId: "s1",
      question: "soru",
      sql: "SELECT 1",
      rowCount: 0,
      latencyMs: 1,
    });
    const userRow = createManyMock.mock.calls[0][0].data[0];
    expect(userRow.sqlQuery).toBeUndefined();
    expect(userRow.rowCount).toBeUndefined();
    expect(userRow.latencyMs).toBeUndefined();
    expect(userRow.success).toBeUndefined();
  });

  it("both rows reference the SAME sessionId (turn-pair integrity)", async () => {
    await persistChatExchange({
      sessionId: "session-XYZ",
      question: "q",
      sql: "s",
      rowCount: 0,
      latencyMs: 0,
    });
    const data = createManyMock.mock.calls[0][0].data;
    expect(data[0].sessionId).toBe("session-XYZ");
    expect(data[1].sessionId).toBe("session-XYZ");
  });

  it("rowCount 0 + latencyMs 0 still persisted (boundary)", async () => {
    await persistChatExchange({
      sessionId: "s1",
      question: "q",
      sql: "SELECT 1 WHERE 1=0",
      rowCount: 0,
      latencyMs: 0,
    });
    const assistant = createManyMock.mock.calls[0][0].data[1];
    expect(assistant.rowCount).toBe(0);
    expect(assistant.latencyMs).toBe(0);
    expect(assistant.success).toBe(true);
  });
});

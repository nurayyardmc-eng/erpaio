import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { chatMessage: { findFirst: findFirstMock } },
}));

import { findLastSqlForQuestion } from "./findLastSqlForQuestion";

/**
 * Smart mock: dispatch by where.role so tests exercise the real two-step
 * flow (USER lookup → paired ASSISTANT SQL) the way production data behaves.
 */
const TURN_TS = new Date("2026-06-23T10:00:00Z");
function mockTurn(opts: {
  userRow?: { sessionId: string; createdAt: Date } | null;
  assistantRow?: { sqlQuery: string | null } | null;
}) {
  findFirstMock.mockImplementation(async (args: { where: { role: string } }) => {
    if (args.where.role === "user") return opts.userRow ?? null;
    if (args.where.role === "assistant") return opts.assistantRow ?? null;
    return null;
  });
}

describe("chat/findLastSqlForQuestion", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  // The regression that matters: assistant `content` is the SQL, the QUESTION
  // lives on the USER message. Matching the question against a realistic
  // user+assistant pair must resolve the paired SQL. (Old code matched the
  // question against assistant content = SQL → always null → alerts never fired.)
  it("resolves SQL by matching the question on the USER message (paired assistant SQL)", async () => {
    mockTurn({
      userRow: { sessionId: "s1", createdAt: TURN_TS },
      assistantRow: { sqlQuery: "SELECT SUM(amount) FROM orders" },
    });
    const r = await findLastSqlForQuestion("t1", "u1", "Bu ay toplam ciro");
    expect(r).toBe("SELECT SUM(amount) FROM orders");
  });

  it("returns null when the question was never asked (no user message)", async () => {
    mockTurn({ userRow: null });
    const r = await findLastSqlForQuestion("t1", "u1", "hiç sorulmamış soru");
    expect(r).toBeNull();
    // Must not even attempt the assistant lookup.
    expect(findFirstMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when the paired turn has no SQL", async () => {
    mockTurn({
      userRow: { sessionId: "s1", createdAt: TURN_TS },
      assistantRow: null,
    });
    const r = await findLastSqlForQuestion("t1", "u1", "soru");
    expect(r).toBeNull();
  });

  it("scopes the USER lookup to BOTH tenantId AND userId (multi-tenant boundary)", async () => {
    mockTurn({ userRow: null });
    await findLastSqlForQuestion("tenant-X", "user-Y", "soru");
    const userCall = findFirstMock.mock.calls[0][0];
    expect(userCall.where.session).toEqual({ tenantId: "tenant-X", userId: "user-Y" });
    expect(userCall.where.role).toBe("user");
  });

  it("pairs assistant by same session + success + non-null SQL at/after the question", async () => {
    mockTurn({
      userRow: { sessionId: "s9", createdAt: TURN_TS },
      assistantRow: { sqlQuery: "SELECT 1" },
    });
    await findLastSqlForQuestion("t1", "u1", "soru");
    const assistantCall = findFirstMock.mock.calls[1][0];
    expect(assistantCall.where.sessionId).toBe("s9");
    expect(assistantCall.where.role).toBe("assistant");
    expect(assistantCall.where.success).toBe(true);
    expect(assistantCall.where.sqlQuery).toEqual({ not: null });
    expect(assistantCall.where.createdAt).toEqual({ gte: TURN_TS });
    expect(assistantCall.orderBy).toEqual({ createdAt: "asc" });
  });

  it("uses first-50-char prefix for the question content match", async () => {
    mockTurn({ userRow: null });
    await findLastSqlForQuestion("t1", "u1", "a".repeat(100));
    const userCall = findFirstMock.mock.calls[0][0];
    expect(userCall.where.content).toEqual({ contains: "a".repeat(50) });
  });

  it("short question used in full (less than 50 chars)", async () => {
    mockTurn({ userRow: null });
    await findLastSqlForQuestion("t1", "u1", "kısa soru");
    const userCall = findFirstMock.mock.calls[0][0];
    expect(userCall.where.content).toEqual({ contains: "kısa soru" });
  });

  it("picks the most-recent occurrence of the question (USER orderBy createdAt desc)", async () => {
    mockTurn({ userRow: null });
    await findLastSqlForQuestion("t1", "u1", "soru");
    const userCall = findFirstMock.mock.calls[0][0];
    expect(userCall.orderBy).toEqual({ createdAt: "desc" });
  });

  it("assistant lookup selects only sqlQuery (no content/PII leakage)", async () => {
    mockTurn({
      userRow: { sessionId: "s1", createdAt: TURN_TS },
      assistantRow: { sqlQuery: "SELECT 1" },
    });
    await findLastSqlForQuestion("t1", "u1", "soru");
    const assistantCall = findFirstMock.mock.calls[1][0];
    expect(assistantCall.select).toEqual({ sqlQuery: true });
  });
});

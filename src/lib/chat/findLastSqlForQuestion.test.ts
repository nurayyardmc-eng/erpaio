import { describe, it, expect, vi, beforeEach } from "vitest";

const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { chatMessage: { findMany: findManyMock } },
}));

import { findLastSqlForQuestion } from "./findLastSqlForQuestion";

describe("chat/findLastSqlForQuestion", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("returns the most-recent assistant SQL when match exists", async () => {
    findManyMock.mockResolvedValueOnce([{ sqlQuery: "SELECT 1" }]);
    const r = await findLastSqlForQuestion("t1", "u1", "stoğum nedir?");
    expect(r).toBe("SELECT 1");
  });

  it("returns null when no rows match", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const r = await findLastSqlForQuestion("t1", "u1", "soru");
    expect(r).toBeNull();
  });

  it("returns null when row.sqlQuery is null/undefined", async () => {
    findManyMock.mockResolvedValueOnce([{ sqlQuery: null }]);
    const r = await findLastSqlForQuestion("t1", "u1", "soru");
    expect(r).toBeNull();
  });

  it("scopes lookup to BOTH tenantId AND userId (multi-tenant boundary)", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await findLastSqlForQuestion("tenant-X", "user-Y", "soru");
    const call = findManyMock.mock.calls[0][0];
    expect(call.where.session).toEqual({
      tenantId: "tenant-X",
      userId: "user-Y",
    });
  });

  it("filters only successful assistant messages", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await findLastSqlForQuestion("t1", "u1", "soru");
    const call = findManyMock.mock.calls[0][0];
    expect(call.where.role).toBe("assistant");
    expect(call.where.success).toBe(true);
  });

  it("uses first-50-char prefix for content.contains", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const longQuestion = "a".repeat(100);
    await findLastSqlForQuestion("t1", "u1", longQuestion);
    const call = findManyMock.mock.calls[0][0];
    expect(call.where.content).toEqual({ contains: "a".repeat(50) });
  });

  it("short question used in full (less than 50 chars)", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await findLastSqlForQuestion("t1", "u1", "kısa soru");
    const call = findManyMock.mock.calls[0][0];
    expect(call.where.content).toEqual({ contains: "kısa soru" });
  });

  it("orders by createdAt DESC and takes 1 (latest only)", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await findLastSqlForQuestion("t1", "u1", "soru");
    const call = findManyMock.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.take).toBe(1);
  });

  it("selects only sqlQuery (no content/PII leakage)", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await findLastSqlForQuestion("t1", "u1", "soru");
    const call = findManyMock.mock.calls[0][0];
    expect(call.select).toEqual({ sqlQuery: true });
  });
});

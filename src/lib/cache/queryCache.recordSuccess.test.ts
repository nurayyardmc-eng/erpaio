import { describe, it, expect, vi, beforeEach } from "vitest";

const { updateMock, upsertMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    queryCache: {
      update: updateMock,
      upsert: upsertMock,
    },
  },
}));

import { recordSuccess } from "./queryCache";

describe("cache/queryCache/recordSuccess", () => {
  beforeEach(() => {
    updateMock.mockReset();
    upsertMock.mockReset();
  });

  it("cacheHit=true with cacheId → recordOutcome(success) called, returns same id", async () => {
    updateMock.mockResolvedValueOnce({});
    const out = await recordSuccess({
      cacheId: "abc",
      cacheHit: true,
      tenantId: "t1",
      question: "soru",
      sqlQuery: "SELECT 1",
      connectionId: "conn-1",
    });
    expect(out).toBe("abc");
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).not.toHaveBeenCalled();
    // Verify success branch: successCount increment, not failCount
    const updateCall = updateMock.mock.calls[0][0];
    expect(updateCall.data.successCount).toEqual({ increment: 1 });
    expect(updateCall.data.failCount).toBeUndefined();
  });

  it("cacheHit=false → writeCache called, returns new id", async () => {
    upsertMock.mockResolvedValueOnce({ id: "new-cache-id" });
    const out = await recordSuccess({
      cacheId: undefined,
      cacheHit: false,
      tenantId: "t1",
      question: "soru",
      sqlQuery: "SELECT 1",
      connectionId: "conn-1",
    });
    expect(out).toBe("new-cache-id");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("cacheHit=true but cacheId=undefined (defensive) → no-op, returns undefined", async () => {
    const out = await recordSuccess({
      cacheId: undefined,
      cacheHit: true,
      tenantId: "t1",
      question: "soru",
      sqlQuery: "SELECT 1",
      connectionId: "conn-1",
    });
    expect(out).toBeUndefined();
    expect(updateMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("writeCache (cacheHit=false) propagates tenantId + question + sqlQuery", async () => {
    upsertMock.mockResolvedValueOnce({ id: "id" });
    await recordSuccess({
      cacheId: undefined,
      cacheHit: false,
      tenantId: "tenant-X",
      question: "Stoğum nedir?",
      sqlQuery: "SELECT stok FROM ...",
      connectionId: "conn-1",
    });
    const call = upsertMock.mock.calls[0][0];
    expect(call.where.tenantId_questionHash.tenantId).toBe("tenant-X");
    expect(call.create.sqlQuery).toBe("SELECT stok FROM ...");
    expect(call.update.sqlQuery).toBe("SELECT stok FROM ...");
  });

  it("cacheHit=true: never calls upsert (writeCache)", async () => {
    updateMock.mockResolvedValueOnce({});
    await recordSuccess({
      cacheId: "abc",
      cacheHit: true,
      tenantId: "t1",
      question: "soru",
      sqlQuery: "SELECT 1",
      connectionId: "conn-1",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

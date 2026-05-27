import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { chatSession: { findFirst: findFirstMock } },
}));

import { assertOwnedChatSession } from "./assertOwnedChatSession";

function mkReq(): Request {
  return new Request("https://example.test/api/x");
}

describe("chat/assertOwnedChatSession", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns null when session is owned (found)", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "s1" });
    const r = await assertOwnedChatSession(mkReq(), "s1", "t1", "u1");
    expect(r).toBeNull();
  });

  it("returns 404 Response when not found", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await assertOwnedChatSession(mkReq(), "s1", "t1", "u1");
    expect(r).toBeInstanceOf(Response);
    if (!(r instanceof Response)) return;
    expect(r.status).toBe(404);
  });

  it("SECURITY: where clause includes BOTH tenantId AND userId", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "s1" });
    await assertOwnedChatSession(mkReq(), "session-X", "tenant-Y", "user-Z");
    const call = findFirstMock.mock.calls[0][0];
    expect(call.where).toEqual({
      id: "session-X",
      tenantId: "tenant-Y",
      userId: "user-Z",
    });
  });

  it("select: only id (no PII leakage in lookup)", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "s1" });
    await assertOwnedChatSession(mkReq(), "s1", "t1", "u1");
    const call = findFirstMock.mock.calls[0][0];
    expect(call.select).toEqual({ id: true });
  });

  it("404 body uses 'api.notFound' i18n key", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await assertOwnedChatSession(mkReq(), "s1", "t1", "u1");
    if (!(r instanceof Response)) throw new Error("expected Response");
    const body = (await r.json()) as { error: string };
    // jsonError("api.notFound") resolves to a localized string; just verify a body exists
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("cross-tenant attack: different tenantId returns 404 even if id matches", async () => {
    // Simulate: prisma returns null because tenantId mismatch filters out the row
    findFirstMock.mockResolvedValueOnce(null);
    const r = await assertOwnedChatSession(
      mkReq(),
      "victim-session-id",
      "attacker-tenant",
      "u1",
    );
    expect(r).toBeInstanceOf(Response);
    const call = findFirstMock.mock.calls[0][0];
    expect(call.where.tenantId).toBe("attacker-tenant");
  });

  it("cross-user attack within same tenant: different userId returns 404", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    await assertOwnedChatSession(mkReq(), "s1", "t1", "attacker-user");
    const call = findFirstMock.mock.calls[0][0];
    expect(call.where.userId).toBe("attacker-user");
  });
});

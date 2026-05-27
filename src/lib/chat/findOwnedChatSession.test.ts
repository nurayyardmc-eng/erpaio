import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { chatSession: { findFirst: findFirstMock } },
}));

import { findOwnedChatSessionWithMessages } from "./findOwnedChatSession";

describe("chat/findOwnedChatSessionWithMessages", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns ChatSession with messages when found", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "s1",
      title: "Test",
      messages: [{ id: "m1", role: "user", content: "soru" }],
    });
    const r = await findOwnedChatSessionWithMessages("s1", "t1", "u1");
    expect(r).not.toBeNull();
    expect(r?.id).toBe("s1");
    expect(r?.messages).toHaveLength(1);
  });

  it("returns null when not found", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await findOwnedChatSessionWithMessages("nope", "t1", "u1");
    expect(r).toBeNull();
  });

  it("SECURITY: where clause includes id + tenantId + userId", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    await findOwnedChatSessionWithMessages("session-X", "tenant-Y", "user-Z");
    const call = findFirstMock.mock.calls[0][0];
    expect(call.where).toEqual({
      id: "session-X",
      tenantId: "tenant-Y",
      userId: "user-Z",
    });
  });

  it("include: messages ordered by createdAt ASC", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    await findOwnedChatSessionWithMessages("s1", "t1", "u1");
    const call = findFirstMock.mock.calls[0][0];
    expect(call.include).toEqual({
      messages: { orderBy: { createdAt: "asc" } },
    });
  });

  it("cross-tenant attack: tenantId mismatch returns null", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await findOwnedChatSessionWithMessages(
      "victim-session-id",
      "attacker-tenant",
      "u1",
    );
    expect(r).toBeNull();
  });

  it("cross-user same-tenant attack: userId mismatch returns null", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await findOwnedChatSessionWithMessages("s1", "t1", "attacker-user");
    expect(r).toBeNull();
  });
});

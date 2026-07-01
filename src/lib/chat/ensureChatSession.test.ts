import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock, findFirstMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findFirstMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { chatSession: { create: createMock, findFirst: findFirstMock } },
}));

import { ensureChatSession } from "./ensureChatSession";

describe("chat/ensureChatSession", () => {
  beforeEach(() => {
    createMock.mockReset();
    findFirstMock.mockReset();
  });

  it("SECURITY: verifies a supplied sessionId belongs to (tenantId, userId)", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "owned-id" });
    const r = await ensureChatSession("owned-id", "t1", "u1");
    expect(r).toBe("owned-id");
    expect(findFirstMock.mock.calls[0][0].where).toEqual({ id: "owned-id", tenantId: "t1", userId: "u1" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("SECURITY: a foreign/non-owned sessionId is NOT trusted — creates a fresh session", async () => {
    findFirstMock.mockResolvedValueOnce(null); // not owned by this tenant/user
    createMock.mockResolvedValueOnce({ id: "fresh-id" });
    const r = await ensureChatSession("someone-elses-session", "t1", "u1");
    expect(r).toBe("fresh-id");
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0].data).toMatchObject({ tenantId: "t1", userId: "u1" });
  });

  it("sessionId null → creates new session (no ownership lookup)", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    const r = await ensureChatSession(null, "t1", "u1");
    expect(r).toBe("new-id");
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("sessionId undefined → creates new", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    expect(await ensureChatSession(undefined, "t1", "u1")).toBe("new-id");
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("sessionId empty string → creates new (falsy)", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    expect(await ensureChatSession("", "t1", "u1")).toBe("new-id");
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("SECURITY: create data includes both tenantId and userId", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    await ensureChatSession(null, "tenant-X", "user-Y");
    const call = createMock.mock.calls[0][0];
    expect(call.data.tenantId).toBe("tenant-X");
    expect(call.data.userId).toBe("user-Y");
  });

  it("title omitted when not provided (default DB null)", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    await ensureChatSession(null, "t1", "u1");
    expect(createMock.mock.calls[0][0].data.title).toBeUndefined();
  });

  it("title passed through when provided", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    await ensureChatSession(null, "t1", "u1", "Manuel SQL");
    expect(createMock.mock.calls[0][0].data.title).toBe("Manuel SQL");
  });

  it("empty title string treated as missing (omitted from data)", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    await ensureChatSession(null, "t1", "u1", "");
    expect(createMock.mock.calls[0][0].data.title).toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { chatSession: { create: createMock } },
}));

import { ensureChatSession } from "./ensureChatSession";

describe("chat/ensureChatSession", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("returns existing sessionId unchanged, no DB write", async () => {
    const r = await ensureChatSession("existing-id", "t1", "u1");
    expect(r).toBe("existing-id");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("sessionId null → creates new session and returns its id", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    const r = await ensureChatSession(null, "t1", "u1");
    expect(r).toBe("new-id");
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("sessionId undefined → creates new", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    const r = await ensureChatSession(undefined, "t1", "u1");
    expect(r).toBe("new-id");
  });

  it("sessionId empty string → creates new (falsy)", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    const r = await ensureChatSession("", "t1", "u1");
    expect(r).toBe("new-id");
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
    const call = createMock.mock.calls[0][0];
    expect(call.data.title).toBeUndefined();
  });

  it("title passed through when provided", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    await ensureChatSession(null, "t1", "u1", "Manuel SQL");
    const call = createMock.mock.calls[0][0];
    expect(call.data.title).toBe("Manuel SQL");
  });

  it("empty title string treated as missing (omitted from data)", async () => {
    createMock.mockResolvedValueOnce({ id: "new-id" });
    await ensureChatSession(null, "t1", "u1", "");
    const call = createMock.mock.calls[0][0];
    expect(call.data.title).toBeUndefined();
  });
});

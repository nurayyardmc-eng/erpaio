import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const { findUniqueMock } = vi.hoisted(() => ({ findUniqueMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

import { verifyUserPassword } from "./verifyUserPassword";

describe("auth/verifyUserPassword", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns 'not_found' when user does not exist", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const r = await verifyUserPassword("nope", "any");
    expect(r).toBe("not_found");
  });

  it("returns 'ok' when password matches", async () => {
    const hash = await bcrypt.hash("hunter2", 4); // cheap rounds for test
    findUniqueMock.mockResolvedValueOnce({ passwordHash: hash });
    const r = await verifyUserPassword("u1", "hunter2");
    expect(r).toBe("ok");
  });

  it("returns 'wrong' when password does NOT match", async () => {
    const hash = await bcrypt.hash("hunter2", 4);
    findUniqueMock.mockResolvedValueOnce({ passwordHash: hash });
    const r = await verifyUserPassword("u1", "wrong-pw");
    expect(r).toBe("wrong");
  });

  it("lookup scoped to provided userId", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    await verifyUserPassword("user-XYZ", "pw");
    const call = findUniqueMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: "user-XYZ" });
  });

  it("select only passwordHash (no PII leak)", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    await verifyUserPassword("u1", "pw");
    const call = findUniqueMock.mock.calls[0][0];
    expect(call.select).toEqual({ passwordHash: true });
  });

  it("empty password against valid hash → 'wrong' (not 'ok')", async () => {
    const hash = await bcrypt.hash("hunter2", 4);
    findUniqueMock.mockResolvedValueOnce({ passwordHash: hash });
    const r = await verifyUserPassword("u1", "");
    expect(r).toBe("wrong");
  });

  it("case sensitivity preserved (bcrypt is case-sensitive)", async () => {
    const hash = await bcrypt.hash("Hunter2", 4);
    findUniqueMock.mockResolvedValueOnce({ passwordHash: hash });
    expect(await verifyUserPassword("u1", "hunter2")).toBe("wrong");
    findUniqueMock.mockResolvedValueOnce({ passwordHash: hash });
    expect(await verifyUserPassword("u1", "Hunter2")).toBe("ok");
  });
});

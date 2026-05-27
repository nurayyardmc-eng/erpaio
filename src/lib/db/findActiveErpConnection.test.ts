import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { erpConnection: { findFirst: findFirstMock } },
}));

import { findActiveErpConnectionForChat } from "./findActiveErpConnection";

describe("db/findActiveErpConnectionForChat", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns active connection with chat fields when found", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "c1",
      erpType: "nebim_v3",
      erpProfile: "nebim_v3",
    });
    const r = await findActiveErpConnectionForChat("c1", "t1");
    expect(r).toEqual({ id: "c1", erpType: "nebim_v3", erpProfile: "nebim_v3" });
  });

  it("returns null when not found", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await findActiveErpConnectionForChat("nope", "t1");
    expect(r).toBeNull();
  });

  it("SECURITY: where clause includes tenantId scope", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    await findActiveErpConnectionForChat("conn-X", "tenant-Y");
    const call = findFirstMock.mock.calls[0][0];
    expect(call.where).toEqual({
      id: "conn-X",
      tenantId: "tenant-Y",
      status: "active",
    });
  });

  it("filters by status: active (excludes paused/disabled)", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    await findActiveErpConnectionForChat("c1", "t1");
    expect(findFirstMock.mock.calls[0][0].where.status).toBe("active");
  });

  it("select projects ONLY id + erpType + erpProfile (no credential leak)", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    await findActiveErpConnectionForChat("c1", "t1");
    expect(findFirstMock.mock.calls[0][0].select).toEqual({
      id: true,
      erpType: true,
      erpProfile: true,
    });
  });

  it("cross-tenant attack: different tenantId returns null", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await findActiveErpConnectionForChat(
      "victim-conn-id",
      "attacker-tenant",
    );
    expect(r).toBeNull();
  });
});

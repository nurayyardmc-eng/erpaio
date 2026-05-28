import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma BEFORE importing the SUT — the module captures the prisma
// reference at import time.
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    erpConnection: {
      findFirst: vi.fn(),
    },
  },
}));

import { assertOwnedConnection, findOwnedConnection } from "./erpConnection";
import { prisma } from "@/lib/db/prisma";

function mkReq(lang: "tr" | "en" = "tr"): Request {
  return new Request("https://example.test/api/x", {
    headers: { "accept-language": lang },
  });
}

describe("db/erpConnection/assertOwnedConnection", () => {
  beforeEach(() => {
    vi.mocked(prisma.erpConnection.findFirst).mockReset();
  });

  it("returns null when connection exists for tenant", async () => {
    vi.mocked(prisma.erpConnection.findFirst).mockResolvedValueOnce({
      id: "c_1",
      // The helper selects only `id`, but mock can return whatever.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await assertOwnedConnection(mkReq(), "c_1", "tenant_1");
    expect(res).toBeNull();
  });

  it("returns 404 Response when connection missing", async () => {
    vi.mocked(prisma.erpConnection.findFirst).mockResolvedValueOnce(null);
    const res = await assertOwnedConnection(mkReq("tr"), "missing", "tenant_1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(404);
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe("Bağlantı bulunamadı.");
  });

  it("returns 404 with en locale message", async () => {
    vi.mocked(prisma.erpConnection.findFirst).mockResolvedValueOnce(null);
    const res = await assertOwnedConnection(mkReq("en"), "missing", "tenant_1");
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe("Connection not found.");
  });

  it("scopes lookup to tenantId (multi-tenant boundary)", async () => {
    vi.mocked(prisma.erpConnection.findFirst).mockResolvedValueOnce(null);
    await assertOwnedConnection(mkReq(), "c_1", "tenant_X");
    expect(prisma.erpConnection.findFirst).toHaveBeenCalledWith({
      where: { id: "c_1", tenantId: "tenant_X" },
      select: { id: true },
    });
  });
});

describe("db/erpConnection/findOwnedConnection", () => {
  beforeEach(() => {
    vi.mocked(prisma.erpConnection.findFirst).mockReset();
  });

  it("returns full row when connection exists for tenant", async () => {
    vi.mocked(prisma.erpConnection.findFirst).mockResolvedValueOnce({
      id: "c_1",
      erpType: "nebim_v3",
      host: "db.example.com",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await findOwnedConnection("c_1", "tenant_1");
    expect(r).not.toBeNull();
    expect(r?.id).toBe("c_1");
    expect(r?.erpType).toBe("nebim_v3");
  });

  it("returns null when connection not found", async () => {
    vi.mocked(prisma.erpConnection.findFirst).mockResolvedValueOnce(null);
    const r = await findOwnedConnection("missing", "tenant_1");
    expect(r).toBeNull();
  });

  it("SECURITY: where clause includes id + tenantId (no select restriction)", async () => {
    vi.mocked(prisma.erpConnection.findFirst).mockResolvedValueOnce(null);
    await findOwnedConnection("conn-X", "tenant-Y");
    expect(prisma.erpConnection.findFirst).toHaveBeenCalledWith({
      where: { id: "conn-X", tenantId: "tenant-Y" },
    });
  });

  it("cross-tenant attack returns null", async () => {
    vi.mocked(prisma.erpConnection.findFirst).mockResolvedValueOnce(null);
    const r = await findOwnedConnection("victim-conn", "attacker-tenant");
    expect(r).toBeNull();
  });
});

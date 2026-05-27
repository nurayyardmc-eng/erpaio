import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { watchlist: { findFirst: findFirstMock } },
}));

import { assertOwnedWatchlist } from "./assertOwnedWatchlist";

function mkReq(lang: "tr" | "en" = "tr"): Request {
  return new Request("https://example.test/api/x", {
    headers: { "accept-language": lang },
  });
}

describe("db/assertOwnedWatchlist", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns null when watchlist is owned (found)", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "w1" });
    const r = await assertOwnedWatchlist(mkReq(), "w1", "t1");
    expect(r).toBeNull();
  });

  it("returns 404 Response when not found (watchlistNotFoundError)", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await assertOwnedWatchlist(mkReq(), "w1", "t1");
    expect(r).toBeInstanceOf(Response);
    if (!(r instanceof Response)) return;
    expect(r.status).toBe(404);
  });

  it("SECURITY: where clause includes BOTH id AND tenantId", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "w1" });
    await assertOwnedWatchlist(mkReq(), "watchlist-X", "tenant-Y");
    const call = findFirstMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: "watchlist-X", tenantId: "tenant-Y" });
  });

  it("select: only id (no PII leakage)", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "w1" });
    await assertOwnedWatchlist(mkReq(), "w1", "t1");
    const call = findFirstMock.mock.calls[0][0];
    expect(call.select).toEqual({ id: true });
  });

  it("cross-tenant attack: tenantId mismatch returns 404", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await assertOwnedWatchlist(
      mkReq(),
      "victim-watchlist-id",
      "attacker-tenant",
    );
    expect(r).toBeInstanceOf(Response);
    const call = findFirstMock.mock.calls[0][0];
    expect(call.where.tenantId).toBe("attacker-tenant");
  });

  it("404 body uses watchlistNotFoundError wording (TR)", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const r = await assertOwnedWatchlist(mkReq("tr"), "w1", "t1");
    if (!(r instanceof Response)) throw new Error("expected Response");
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe("Watchlist bulunamadı.");
  });
});

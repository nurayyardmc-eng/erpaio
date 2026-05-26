import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextAuth + Prisma BEFORE importing the SUT.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { assertCronAuth, verifyCronAuth } from "./auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

function mkReq(headers: Record<string, string> = {}): NextRequest {
  // NextRequest extends Request; cast via Request constructor for tests.
  return new Request("https://example.test/api/cron/x", { headers }) as unknown as NextRequest;
}

describe("cron/auth", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(prisma.user.findUnique).mockReset();
    process.env.CRON_SECRET = "test-cron-secret-12345678";
  });

  describe("verifyCronAuth", () => {
    it("valid bearer → ok=true", async () => {
      const res = await verifyCronAuth(mkReq({ authorization: "Bearer test-cron-secret-12345678" }));
      expect(res.ok).toBe(true);
    });

    it("wrong bearer → ok=false with reason", async () => {
      const res = await verifyCronAuth(mkReq({ authorization: "Bearer wrong-secret" }));
      expect(res.ok).toBe(false);
      expect(res.reason).toBeTruthy();
    });

    it("no auth header + no session → ok=false", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as never);
      const res = await verifyCronAuth(mkReq());
      expect(res.ok).toBe(false);
    });

    it("no auth header + sysadmin session → ok=true (fallback)", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u_sys" } } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isSysAdmin: true } as any);
      const res = await verifyCronAuth(mkReq());
      expect(res.ok).toBe(true);
    });

    it("no auth header + non-sysadmin session → ok=false", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u_normal" } } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isSysAdmin: false } as any);
      const res = await verifyCronAuth(mkReq());
      expect(res.ok).toBe(false);
    });

    it("bearer reject does NOT fall through to session (leak surface)", async () => {
      // Even if session would be valid, bearer presence locks the path.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u_sys" } } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isSysAdmin: true } as any);
      const res = await verifyCronAuth(mkReq({ authorization: "Bearer wrong" }));
      expect(res.ok).toBe(false);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("assertCronAuth", () => {
    it("valid bearer → null", async () => {
      const res = await assertCronAuth(mkReq({ authorization: "Bearer test-cron-secret-12345678" }));
      expect(res).toBeNull();
    });

    it("invalid bearer → 401 NextResponse with reason body", async () => {
      const res = await assertCronAuth(mkReq({ authorization: "Bearer nope" }));
      expect(res).not.toBeNull();
      expect(res!.status).toBe(401);
      const body = (await res!.json()) as { error: string };
      expect(typeof body.error).toBe("string");
    });

    it("no auth → 401", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as never);
      const res = await assertCronAuth(mkReq());
      expect(res).not.toBeNull();
      expect(res!.status).toBe(401);
    });

    it("requestId arg → x-request-id header in 401", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as never);
      const res = await assertCronAuth(mkReq(), "req_abc123");
      expect(res!.headers.get("x-request-id")).toBe("req_abc123");
    });

    it("no requestId → no x-request-id header", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as never);
      const res = await assertCronAuth(mkReq());
      expect(res!.headers.get("x-request-id")).toBeNull();
    });
  });

  // Restore env via beforeEach which sets CRON_SECRET for each test;
  // originalSecret is captured but vitest cleans process.env between
  // describe blocks. No explicit teardown needed.
  void originalSecret;
});

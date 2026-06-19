import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { agentRegistration: { findUnique, update } },
}));

import { authenticateAgent } from "./auth";
import { hashApiToken } from "@/lib/auth/apiToken";

const TOKEN = "a".repeat(43); // realistic base64url length, >= 16

function reqWith(header?: string): Request {
  return new Request("https://x/api/agent/jobs/next", {
    headers: header ? { authorization: header } : {},
  });
}

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  update.mockResolvedValue({});
});

describe("agent/auth authenticateAgent", () => {
  it("returns null without an Authorization header", async () => {
    expect(await authenticateAgent(reqWith())).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null for a non-Bearer scheme", async () => {
    expect(await authenticateAgent(reqWith(`Basic ${TOKEN}`))).toBeNull();
  });

  it("returns null for a too-short token (no DB hit)", async () => {
    expect(await authenticateAgent(reqWith("Bearer short"))).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("authenticates a valid, non-revoked token and returns its scope", async () => {
    findUnique.mockResolvedValueOnce({
      id: "agent1",
      tenantId: "tenantA",
      connectionId: "conn1",
      revoked: false,
    });
    const agent = await authenticateAgent(reqWith(`Bearer ${TOKEN}`));
    expect(agent).toEqual({ agentId: "agent1", tenantId: "tenantA", connectionId: "conn1" });
    // looked up by the SHA-256 hash, never the raw token
    expect(findUnique.mock.calls[0][0].where.tokenHash).toBe(hashApiToken(TOKEN));
  });

  it("returns null for a revoked registration", async () => {
    findUnique.mockResolvedValueOnce({
      id: "agent1",
      tenantId: "tenantA",
      connectionId: "conn1",
      revoked: true,
    });
    expect(await authenticateAgent(reqWith(`Bearer ${TOKEN}`))).toBeNull();
  });

  it("returns null when the token is unknown", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await authenticateAgent(reqWith(`Bearer ${TOKEN}`))).toBeNull();
  });
});

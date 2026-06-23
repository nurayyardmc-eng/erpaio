import { describe, it, expect, vi, beforeEach } from "vitest";

// Guard/access-control regression tests for POST /api/billing/checkout.
// Covers the early-return branches that gate the (real) payment dispatch:
//   503 when no provider is configured, 401 when unauthenticated,
//   owner-only enforcement. The Stripe/iyzico SDKs are stubbed — these tests
//   intentionally never reach real payment dispatch.

const { getAuth } = vi.hoisted(() => ({ getAuth: vi.fn() }));
vi.mock("@/lib/auth/dual", () => ({ getAuth }));

const { isProviderConfigured, pickProvider, isIyzico, initCheckout } = vi.hoisted(() => ({
  isProviderConfigured: vi.fn(),
  pickProvider: vi.fn(),
  isIyzico: vi.fn(),
  initCheckout: vi.fn(),
}));
vi.mock("@/lib/billing/iyzico", () => ({
  IYZICO_PRICE_IDS: { pro: "ref-pro", enterprise: "ref-ent" },
  initSubscriptionCheckout: initCheckout,
  isIyzicoConfigured: isIyzico,
  isPaymentProviderConfigured: isProviderConfigured,
  pickPaymentProvider: pickProvider,
}));

const { isStripe } = vi.hoisted(() => ({ isStripe: vi.fn() }));
vi.mock("@/lib/billing/stripe", () => ({
  stripe: {},
  PRICE_IDS: { pro: "price_pro", enterprise: "price_ent" },
  isStripeConfigured: isStripe,
}));

const { requireOwner } = vi.hoisted(() => ({ requireOwner: vi.fn() }));
vi.mock("@/lib/auth/role", () => ({ requireOwner }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { tenant: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { POST } from "./route";

function makeReq(body: unknown): Request {
  return new Request("https://erpaio.test/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const OWNER_SESSION = {
  user: { id: "u1", tenantId: "t1", role: "owner", email: "owner@acme.test" },
};

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isProviderConfigured.mockReturnValue(true);
    requireOwner.mockReturnValue(null); // owner allowed by default
    pickProvider.mockReturnValue("stripe");
    isStripe.mockReturnValue(true);
    isIyzico.mockReturnValue(false);
  });

  it("returns 503 when no payment provider is configured (before auth)", async () => {
    isProviderConfigured.mockReturnValue(false);
    const res = await POST(makeReq({ plan: "pro" }));
    expect(res.status).toBe(503);
    expect(getAuth).not.toHaveBeenCalled();
  });

  it("returns 401 when the caller is not authenticated", async () => {
    getAuth.mockResolvedValue(null);
    const res = await POST(makeReq({ plan: "pro" }));
    expect(res.status).toBe(401);
  });

  it("enforces owner-only: a denied requireOwner response short-circuits", async () => {
    getAuth.mockResolvedValue({
      user: { id: "u2", tenantId: "t1", role: "member", email: "member@acme.test" },
    });
    requireOwner.mockReturnValue(new Response(null, { status: 403 }));
    const res = await POST(makeReq({ plan: "pro" }));
    expect(res.status).toBe(403);
    expect(requireOwner).toHaveBeenCalledOnce();
  });

  it("returns 400 on an invalid plan (owner, provider configured)", async () => {
    getAuth.mockResolvedValue(OWNER_SESSION);
    const res = await POST(makeReq({ plan: "ultra" }));
    expect(res.status).toBe(400);
  });
});

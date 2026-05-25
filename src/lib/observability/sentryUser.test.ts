import { describe, it, expect, vi, beforeEach } from "vitest";
import { setSentryUser } from "./sentryUser";

// Mock @sentry/nextjs to capture setUser calls without booting Sentry SDK.
vi.mock("@sentry/nextjs", () => ({
  setUser: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";

describe("observability/sentryUser/setSentryUser", () => {
  beforeEach(() => {
    vi.mocked(Sentry.setUser).mockClear();
  });

  it("forwards id verbatim", () => {
    setSentryUser({ id: "u_123", tenantId: "t_abc" });
    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: "u_123",
      email: undefined,
      tenant_id: "t_abc",
      role: undefined,
    });
  });

  it("renames tenantId → tenant_id (Sentry convention)", () => {
    setSentryUser({ id: "x", tenantId: "tenant_42" });
    const arg = vi.mocked(Sentry.setUser).mock.calls[0][0];
    expect(arg).toHaveProperty("tenant_id", "tenant_42");
    expect(arg).not.toHaveProperty("tenantId");
  });

  it("forwards email when provided", () => {
    setSentryUser({ id: "x", tenantId: "t", email: "u@example.com" });
    const arg = vi.mocked(Sentry.setUser).mock.calls[0][0];
    expect(arg).toHaveProperty("email", "u@example.com");
  });

  it("email null → undefined (Sentry omits null fields)", () => {
    setSentryUser({ id: "x", tenantId: "t", email: null });
    const arg = vi.mocked(Sentry.setUser).mock.calls[0][0];
    expect(arg).toHaveProperty("email", undefined);
  });

  it("email undefined → undefined", () => {
    setSentryUser({ id: "x", tenantId: "t" });
    const arg = vi.mocked(Sentry.setUser).mock.calls[0][0];
    expect(arg).toHaveProperty("email", undefined);
  });

  it("role optional — omitted call still works", () => {
    setSentryUser({ id: "x", tenantId: "t" });
    const arg = vi.mocked(Sentry.setUser).mock.calls[0][0];
    expect(arg).toHaveProperty("role", undefined);
  });

  it("role forwarded when present", () => {
    setSentryUser({ id: "x", tenantId: "t", role: "admin" });
    const arg = vi.mocked(Sentry.setUser).mock.calls[0][0];
    expect(arg).toHaveProperty("role", "admin");
  });

  it("calls Sentry.setUser exactly once per invocation", () => {
    setSentryUser({ id: "x", tenantId: "t" });
    expect(Sentry.setUser).toHaveBeenCalledTimes(1);
    setSentryUser({ id: "y", tenantId: "t2" });
    expect(Sentry.setUser).toHaveBeenCalledTimes(2);
  });
});

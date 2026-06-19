import { describe, it, expect } from "vitest";
import { isAgentOnline } from "./online";

describe("agent/online isAgentOnline", () => {
  const now = 1_000_000_000_000;

  it("false for null/undefined/empty/invalid lastSeenAt", () => {
    expect(isAgentOnline(null, 120_000, now)).toBe(false);
    expect(isAgentOnline(undefined, 120_000, now)).toBe(false);
    expect(isAgentOnline("", 120_000, now)).toBe(false);
    expect(isAgentOnline("not-a-date", 120_000, now)).toBe(false);
  });

  it("true when seen within the window", () => {
    const seen = new Date(now - 30_000).toISOString();
    expect(isAgentOnline(seen, 120_000, now)).toBe(true);
  });

  it("false when seen outside the window", () => {
    const seen = new Date(now - 200_000).toISOString();
    expect(isAgentOnline(seen, 120_000, now)).toBe(false);
  });
});

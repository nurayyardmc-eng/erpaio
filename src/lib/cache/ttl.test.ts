import { describe, it, expect } from "vitest";
import { isFresh } from "./ttl";

describe("cache/ttl isFresh", () => {
  const TTL = 5 * 60_000; // 5 min

  it("fresh just after write", () => {
    expect(isFresh(1000, TTL, 1000)).toBe(true);
  });

  it("fresh within the window", () => {
    expect(isFresh(0, TTL, TTL - 1)).toBe(true);
  });

  it("stale exactly at the boundary (exclusive, matches original `<`)", () => {
    expect(isFresh(0, TTL, TTL)).toBe(false);
  });

  it("stale past the window", () => {
    expect(isFresh(0, TTL, TTL + 1)).toBe(false);
  });

  it("future ts (clock skew) is treated as fresh", () => {
    expect(isFresh(2000, TTL, 1000)).toBe(true);
  });

  it("defaults now to Date.now() — a just-written entry is fresh", () => {
    expect(isFresh(Date.now(), TTL)).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { randomSlugSuffix } from "./randomSlugSuffix";

describe("auth/randomSlugSuffix", () => {
  it("returns string of exactly requested length", () => {
    expect(randomSlugSuffix(4)).toHaveLength(4);
    expect(randomSlugSuffix(6)).toHaveLength(6);
    expect(randomSlugSuffix(1)).toHaveLength(1);
  });

  it("length 0 → empty string", () => {
    expect(randomSlugSuffix(0)).toBe("");
  });

  it("negative length → empty string", () => {
    expect(randomSlugSuffix(-5)).toBe("");
  });

  it("output is base36 [a-z0-9]", () => {
    for (let i = 0; i < 50; i++) {
      const r = randomSlugSuffix(8);
      expect(r).toMatch(/^[a-z0-9]+$/);
    }
  });

  it("supports lengths beyond a single Math.random() chunk (>11 chars)", () => {
    const r = randomSlugSuffix(30);
    expect(r).toHaveLength(30);
    expect(r).toMatch(/^[a-z0-9]+$/);
  });

  it("returns different values on repeated calls (non-deterministic)", () => {
    const samples = new Set<string>();
    for (let i = 0; i < 20; i++) samples.add(randomSlugSuffix(8));
    // Astronomically unlikely to collide on 20 8-char base36 samples
    expect(samples.size).toBeGreaterThan(15);
  });

  it("typical slug suffix length 4 still alphanumeric", () => {
    const r = randomSlugSuffix(4);
    expect(r).toMatch(/^[a-z0-9]{4}$/);
  });

  it("typical fallback length 6 still alphanumeric", () => {
    const r = randomSlugSuffix(6);
    expect(r).toMatch(/^[a-z0-9]{6}$/);
  });

  it("very large length completes (not infinite loop)", () => {
    const r = randomSlugSuffix(200);
    expect(r).toHaveLength(200);
  });
});

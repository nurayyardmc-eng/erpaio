import { describe, it, expect } from "vitest";
import {
  estimateChatTokens,
  CHARS_PER_TOKEN,
  OUTPUT_ALLOWANCE,
  DEFAULT_CONTEXT_CHARS,
  MIN_ESTIMATE,
} from "./estimate";

describe("lib/budget/estimate/estimateChatTokens", () => {
  it("uses DEFAULT_CONTEXT_CHARS when contextChars omitted", () => {
    const got = estimateChatTokens({ questionChars: 0 });
    const expected = OUTPUT_ALLOWANCE + Math.ceil(DEFAULT_CONTEXT_CHARS / CHARS_PER_TOKEN);
    expect(got).toBe(expected);
  });

  it("scales up with question length", () => {
    const short = estimateChatTokens({ questionChars: 20 });
    const long = estimateChatTokens({ questionChars: 4000 });
    expect(long).toBeGreaterThan(short);
  });

  it("scales up with explicit context size", () => {
    const small = estimateChatTokens({ questionChars: 50, contextChars: 1000 });
    const big = estimateChatTokens({ questionChars: 50, contextChars: 40_000 });
    expect(big).toBeGreaterThan(small);
  });

  it("never returns below MIN_ESTIMATE", () => {
    const got = estimateChatTokens({ questionChars: 0, contextChars: 0 });
    expect(got).toBe(MIN_ESTIMATE);
  });

  it("computes input tokens at CHARS_PER_TOKEN ratio", () => {
    const got = estimateChatTokens({ questionChars: 400, contextChars: 0 });
    // 400/4 = 100 input tokens + 1500 output = 1600 → floored to MIN_ESTIMATE
    expect(got).toBe(MIN_ESTIMATE);
    const got2 = estimateChatTokens({ questionChars: 40_000, contextChars: 0 });
    expect(got2).toBe(OUTPUT_ALLOWANCE + 10_000);
  });

  it("treats negative inputs as zero (defensive)", () => {
    const got = estimateChatTokens({ questionChars: -100, contextChars: -5 });
    expect(got).toBe(MIN_ESTIMATE);
  });

  it("typical question stays in a sane band (≈ old 5000 magic number)", () => {
    const got = estimateChatTokens({ questionChars: 80 });
    // 12000+80 = 12080 /4 = 3020 + 1500 = 4520
    expect(got).toBeGreaterThan(4000);
    expect(got).toBeLessThan(6000);
  });

  it("is deterministic", () => {
    const a = estimateChatTokens({ questionChars: 123, contextChars: 9999 });
    const b = estimateChatTokens({ questionChars: 123, contextChars: 9999 });
    expect(a).toBe(b);
  });
});

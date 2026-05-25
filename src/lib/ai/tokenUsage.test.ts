import { describe, it, expect } from "vitest";
import { calculateBillableTokens, isPromptCacheHit } from "./tokenUsage";

describe("ai/tokenUsage/calculateBillableTokens", () => {
  it("simple input + output, no cache", () => {
    expect(
      calculateBillableTokens({ input_tokens: 100, output_tokens: 50 }),
    ).toBe(150);
  });

  it("includes cache_creation_input_tokens in total (billable)", () => {
    expect(
      calculateBillableTokens({
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 200,
      }),
    ).toBe(350);
  });

  it("EXCLUDES cache_read_input_tokens (billing optimization contract)", () => {
    const usage = {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 5000,
    };
    expect(calculateBillableTokens(usage)).toBe(150);
  });

  it("missing cache_creation field defaults to 0", () => {
    expect(
      calculateBillableTokens({ input_tokens: 10, output_tokens: 5 }),
    ).toBe(15);
  });

  it("cache_creation explicitly 0 treated same as missing", () => {
    expect(
      calculateBillableTokens({
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: 0,
      }),
    ).toBe(15);
  });

  it("realistic prompt-cache-hit scenario: small input + large cache_read excluded", () => {
    // First request: created cache (charged). This one is a cache-read hit.
    const usage = {
      input_tokens: 50,   // only the user message; system prompt came from cache
      output_tokens: 200,
      cache_read_input_tokens: 4500,
      cache_creation_input_tokens: 0,
    };
    expect(calculateBillableTokens(usage)).toBe(250);
  });

  it("cache creation + cache read in same turn — only creation counted", () => {
    const usage = {
      input_tokens: 50,
      output_tokens: 100,
      cache_creation_input_tokens: 4000,
      cache_read_input_tokens: 500,
    };
    expect(calculateBillableTokens(usage)).toBe(4150);
  });

  it("zero output (unusual but possible) → input + cache only", () => {
    expect(
      calculateBillableTokens({
        input_tokens: 100,
        output_tokens: 0,
        cache_creation_input_tokens: 50,
      }),
    ).toBe(150);
  });

  it("very large numbers don't overflow Number safe range", () => {
    expect(
      calculateBillableTokens({
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 1_000_000,
      }),
    ).toBe(3_000_000);
  });
});

describe("ai/tokenUsage/isPromptCacheHit", () => {
  it("cache_read > 0 → true", () => {
    expect(
      isPromptCacheHit({
        input_tokens: 1,
        output_tokens: 1,
        cache_read_input_tokens: 100,
      }),
    ).toBe(true);
  });

  it("cache_read === 0 → false (field present but no actual hit)", () => {
    expect(
      isPromptCacheHit({
        input_tokens: 1,
        output_tokens: 1,
        cache_read_input_tokens: 0,
      }),
    ).toBe(false);
  });

  it("cache_read undefined → false", () => {
    expect(isPromptCacheHit({ input_tokens: 1, output_tokens: 1 })).toBe(false);
  });

  it("cache_creation alone (no read) → false (creation isn't a 'hit')", () => {
    expect(
      isPromptCacheHit({
        input_tokens: 1,
        output_tokens: 1,
        cache_creation_input_tokens: 1000,
      }),
    ).toBe(false);
  });

  it("typeof guard rejects non-number values defensively", () => {
    // Anthropic SDK shouldn't emit this, but TS type allows undefined only.
    // We accept any unknown by virtue of the typeof check.
    expect(
      isPromptCacheHit({
        input_tokens: 1,
        output_tokens: 1,
        cache_read_input_tokens: undefined,
      }),
    ).toBe(false);
  });
});

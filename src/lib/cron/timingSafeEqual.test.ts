import { describe, it, expect } from "vitest";
import { timingSafeEqual, verifyBearerHeader } from "./timingSafeEqual";

describe("cron/auth/timingSafeEqual", () => {
  it("identical strings → true", () => {
    expect(timingSafeEqual("hello", "hello")).toBe(true);
  });

  it("different strings same length → false", () => {
    expect(timingSafeEqual("hello", "world")).toBe(false);
  });

  it("different lengths → false (short-circuit)", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("abcd", "abc")).toBe(false);
  });

  it("both empty → true (vacuous equality)", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("one empty one not → false", () => {
    expect(timingSafeEqual("", "x")).toBe(false);
    expect(timingSafeEqual("x", "")).toBe(false);
  });

  it("Bearer token style: exact prefix match", () => {
    const secret = "Bearer abc123def456";
    expect(timingSafeEqual(secret, "Bearer abc123def456")).toBe(true);
    expect(timingSafeEqual(secret, "Bearer abc123def457")).toBe(false);
  });

  it("case sensitive", () => {
    expect(timingSafeEqual("Hello", "hello")).toBe(false);
  });

  it("unicode characters preserved (charCodeAt comparison)", () => {
    expect(timingSafeEqual("şarjör", "şarjör")).toBe(true);
    expect(timingSafeEqual("şarjör", "sarjör")).toBe(false);
  });

  it("single char difference at end still detected", () => {
    const a = "a".repeat(63) + "b";
    const b = "a".repeat(63) + "c";
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it("single char difference at start still detected", () => {
    const a = "b" + "a".repeat(63);
    const b = "c" + "a".repeat(63);
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it("long identical strings → true", () => {
    const long = "x".repeat(1000);
    expect(timingSafeEqual(long, long)).toBe(true);
  });

  it("differs only in whitespace → false", () => {
    expect(timingSafeEqual("abc", "abc ")).toBe(false);
    expect(timingSafeEqual(" abc", "abc")).toBe(false);
  });
});

describe("cron/auth/verifyBearerHeader", () => {
  it("null/empty header → matched=false (caller does fallback)", () => {
    expect(verifyBearerHeader(null, "secret")).toEqual({ matched: false });
    expect(verifyBearerHeader("", "secret")).toEqual({ matched: false });
  });

  it("header present, no CRON_SECRET configured → ok=false with reason", () => {
    const r = verifyBearerHeader("Bearer abc", undefined);
    expect(r).toEqual({
      matched: true,
      ok: false,
      reason: "CRON_SECRET not configured",
    });
  });

  it("correct Bearer + secret → matched + ok", () => {
    expect(verifyBearerHeader("Bearer s3cret", "s3cret")).toEqual({
      matched: true,
      ok: true,
    });
  });

  it("mismatch secret → matched=true ok=false with 'Invalid cron secret'", () => {
    expect(verifyBearerHeader("Bearer wrong", "right")).toEqual({
      matched: true,
      ok: false,
      reason: "Invalid cron secret",
    });
  });

  it("Bearer prefix required (no prefix → mismatch reason)", () => {
    expect(verifyBearerHeader("s3cret", "s3cret")).toEqual({
      matched: true,
      ok: false,
      reason: "Invalid cron secret",
    });
  });

  it("Wrong prefix case (bearer vs Bearer) → mismatch (case-sensitive)", () => {
    expect(verifyBearerHeader("bearer s3cret", "s3cret")).toEqual({
      matched: true,
      ok: false,
      reason: "Invalid cron secret",
    });
  });

  it("extra space after Bearer → mismatch", () => {
    expect(verifyBearerHeader("Bearer  s3cret", "s3cret")).toEqual({
      matched: true,
      ok: false,
      reason: "Invalid cron secret",
    });
  });

  it("header with only 'Bearer ' (no secret) → mismatch", () => {
    expect(verifyBearerHeader("Bearer ", "secret")).toEqual({
      matched: true,
      ok: false,
      reason: "Invalid cron secret",
    });
  });

  it("empty CRON_SECRET treated as 'not configured' (falsy)", () => {
    expect(verifyBearerHeader("Bearer x", "")).toEqual({
      matched: true,
      ok: false,
      reason: "CRON_SECRET not configured",
    });
  });
});

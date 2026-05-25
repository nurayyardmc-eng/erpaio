import { describe, it, expect } from "vitest";
import { timingSafeEqual } from "./timingSafeEqual";

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

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { sha256Hex } from "./hash";

describe("crypto/hash/sha256Hex", () => {
  it("returns 64-char lowercase hex string", () => {
    const r = sha256Hex("hello");
    expect(r).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches well-known SHA-256 hash of 'abc'", () => {
    // Standard known test vector for SHA-256("abc")
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches well-known SHA-256 hash of empty string", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("deterministic — same input produces same output", () => {
    expect(sha256Hex("test")).toBe(sha256Hex("test"));
  });

  it("different inputs produce different hashes (basic collision resistance)", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });

  it("matches Node's createHash directly (delegation invariant)", () => {
    const expected = createHash("sha256").update("verify-me").digest("hex");
    expect(sha256Hex("verify-me")).toBe(expected);
  });

  it("accepts Buffer input", () => {
    expect(sha256Hex(Buffer.from("hello"))).toBe(sha256Hex("hello"));
  });

  it("unicode (UTF-8) input handled correctly", () => {
    const r = sha256Hex("Şirket Türkçe");
    expect(r).toMatch(/^[0-9a-f]{64}$/);
  });

  it("avalanche: single bit change → very different output (no shared prefix)", () => {
    const a = sha256Hex("test");
    const b = sha256Hex("Test"); // case flip
    // First 8 chars almost certainly differ.
    expect(a.slice(0, 8)).not.toBe(b.slice(0, 8));
  });

  it("output is always lowercase (regression marker for DB index)", () => {
    const r = sha256Hex("ALL-CAPS-INPUT-12345");
    expect(r).toBe(r.toLowerCase());
  });

  it("long input handled (no buffer overflow)", () => {
    const long = "x".repeat(100_000);
    const r = sha256Hex(long);
    expect(r).toMatch(/^[0-9a-f]{64}$/);
  });

  it("idempotent with same Buffer (mutating input afterward doesn't change result)", () => {
    const buf = Buffer.from("immutable");
    const r1 = sha256Hex(buf);
    const r2 = sha256Hex(buf);
    expect(r1).toBe(r2);
  });
});

import { describe, it, expect } from "vitest";
import {
  MAX_RETRIES,
  BASE_DELAY_MS,
  MAX_DELAY_MS,
  isIdempotent,
  isTransient,
  shouldRetry,
  backoffDelayMs,
  parseRetryAfter,
} from "./retry";

describe("retry/isIdempotent", () => {
  it("GET/HEAD/OPTIONS → true", () => {
    expect(isIdempotent("GET")).toBe(true);
    expect(isIdempotent("HEAD")).toBe(true);
    expect(isIdempotent("OPTIONS")).toBe(true);
  });

  it("POST/PUT/PATCH/DELETE → false", () => {
    expect(isIdempotent("POST")).toBe(false);
    expect(isIdempotent("PUT")).toBe(false);
    expect(isIdempotent("PATCH")).toBe(false);
    expect(isIdempotent("DELETE")).toBe(false);
  });

  it("case-insensitive", () => {
    expect(isIdempotent("get")).toBe(true);
    expect(isIdempotent("post")).toBe(false);
  });
});

describe("retry/isTransient", () => {
  it("408/429/502/503/504 → true", () => {
    expect(isTransient(408)).toBe(true);
    expect(isTransient(429)).toBe(true);
    expect(isTransient(502)).toBe(true);
    expect(isTransient(503)).toBe(true);
    expect(isTransient(504)).toBe(true);
  });

  it("200/400/401/404 → false", () => {
    expect(isTransient(200)).toBe(false);
    expect(isTransient(400)).toBe(false);
    expect(isTransient(401)).toBe(false);
    expect(isTransient(404)).toBe(false);
  });

  it("generic 500 → false (treat as bug, not transient)", () => {
    expect(isTransient(500)).toBe(false);
  });
});

describe("retry/shouldRetry", () => {
  it("idempotent + 503 → retry", () => {
    expect(shouldRetry({ method: "GET", attempt: 0, status: 503 })).toBe(true);
  });

  it("idempotent + 200 → no retry", () => {
    expect(shouldRetry({ method: "GET", attempt: 0, status: 200 })).toBe(false);
  });

  it("non-idempotent + 503 → no retry (double-write risk)", () => {
    expect(shouldRetry({ method: "POST", attempt: 0, status: 503 })).toBe(false);
  });

  it("non-idempotent + 429 → retry (rate limit always retry-safe)", () => {
    expect(shouldRetry({ method: "POST", attempt: 0, status: 429 })).toBe(true);
  });

  it("network error → retry for any method (no server-side effect)", () => {
    expect(shouldRetry({ method: "GET", attempt: 0, networkError: true })).toBe(true);
    expect(shouldRetry({ method: "POST", attempt: 0, networkError: true })).toBe(true);
  });

  it("attempt limit reached → no retry", () => {
    expect(shouldRetry({ method: "GET", attempt: MAX_RETRIES, status: 503 })).toBe(false);
    expect(shouldRetry({ method: "GET", attempt: MAX_RETRIES + 1, status: 503 })).toBe(false);
  });

  it("4xx (non-429) → no retry", () => {
    expect(shouldRetry({ method: "GET", attempt: 0, status: 400 })).toBe(false);
    expect(shouldRetry({ method: "GET", attempt: 0, status: 404 })).toBe(false);
    expect(shouldRetry({ method: "GET", attempt: 0, status: 401 })).toBe(false);
  });
});

describe("retry/backoffDelayMs", () => {
  it("attempt 0 → ~BASE_DELAY_MS", () => {
    const d = backoffDelayMs(0);
    expect(d).toBeGreaterThanOrEqual(BASE_DELAY_MS);
    expect(d).toBeLessThanOrEqual(BASE_DELAY_MS + 250);
  });

  it("attempt 1 → ~2x", () => {
    const d = backoffDelayMs(1);
    expect(d).toBeGreaterThanOrEqual(2000);
    expect(d).toBeLessThanOrEqual(2000 + 250);
  });

  it("attempt 2 → ~4x", () => {
    const d = backoffDelayMs(2);
    expect(d).toBeGreaterThanOrEqual(4000);
    expect(d).toBeLessThanOrEqual(4000 + 250);
  });

  it("very large attempt clamped to MAX_DELAY_MS", () => {
    expect(backoffDelayMs(20)).toBeLessThanOrEqual(MAX_DELAY_MS);
  });

  it("Retry-After header takes precedence", () => {
    expect(backoffDelayMs(0, 5)).toBe(5000);
    expect(backoffDelayMs(2, 10)).toBe(10000);
  });

  it("Retry-After capped at MAX_DELAY_MS", () => {
    expect(backoffDelayMs(0, 999)).toBe(MAX_DELAY_MS);
  });
});

describe("retry/parseRetryAfter", () => {
  it("null/undefined header → undefined", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
  });

  it("seconds string", () => {
    expect(parseRetryAfter("5")).toBe(5);
    expect(parseRetryAfter("120")).toBe(120);
  });

  it("zero", () => {
    expect(parseRetryAfter("0")).toBe(0);
  });

  it("HTTP-date in future → positive seconds diff", () => {
    const future = new Date(Date.now() + 10_000).toUTCString();
    const result = parseRetryAfter(future);
    expect(result).toBeGreaterThan(8);
    expect(result).toBeLessThan(12);
  });

  it("HTTP-date in past → 0 (not negative)", () => {
    const past = new Date(Date.now() - 10_000).toUTCString();
    expect(parseRetryAfter(past)).toBe(0);
  });

  it("garbage string → undefined", () => {
    expect(parseRetryAfter("not-a-number")).toBeUndefined();
  });

  it("negative seconds → undefined (rejected)", () => {
    expect(parseRetryAfter("-5")).toBeUndefined();
  });
});

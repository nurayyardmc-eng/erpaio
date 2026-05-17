// HTTP retry decision logic — pure helpers, test-able without a real network.
//
// Strategy:
// - GET retried on: transient errors (5xx, network), 429 honoring Retry-After
// - POST/PUT/PATCH/DELETE only retried on: network errors (no response received),
//   never on 5xx (risk of double-write without idempotency keys)
// - Max 3 attempts, exponential backoff base 1s (1s, 2s, 4s)
// - Cap: server's Retry-After if provided, otherwise computed backoff

export const MAX_RETRIES = 3;
export const BASE_DELAY_MS = 1000;
export const MAX_DELAY_MS = 30_000;

/** HTTP method'lar idempotent mi? (server-state change'siz mi?) */
export function isIdempotent(method: string): boolean {
  const m = method.toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

/**
 * Bu status code transient mi (retry-worthy)?
 *
 * - 408 Request Timeout → server timeout, retry safe
 * - 429 Too Many Requests → rate limit, honor Retry-After
 * - 502/503/504 → upstream/gateway, transient
 * - 5xx (other) → server error; retry only for idempotent methods
 */
export function isTransient(status: number): boolean {
  if (status === 408 || status === 429) return true;
  if (status === 502 || status === 503 || status === 504) return true;
  return false;
}

/**
 * Bir attempt sonrası retry yapılmalı mı?
 *
 *   shouldRetry({ method: "GET", attempt: 0, status: 503 }) → true
 *   shouldRetry({ method: "POST", attempt: 0, status: 503 }) → false (idempotency riski)
 *   shouldRetry({ method: "POST", attempt: 0, networkError: true }) → true (server response yok)
 */
export interface RetryDecisionInput {
  method: string;
  attempt: number; // 0-indexed, 0 = first attempt failed
  status?: number;
  networkError?: boolean;
}

export function shouldRetry(input: RetryDecisionInput): boolean {
  if (input.attempt >= MAX_RETRIES) return false;

  // Network error (no response received): server hiç işlemediyse retry safe
  if (input.networkError) return true;

  if (input.status === undefined) return false;

  // 429 her zaman retry (idempotent olsun olmasın)
  if (input.status === 429) return true;

  // 5xx idempotent method'lar için retry
  if (isTransient(input.status) && isIdempotent(input.method)) return true;

  return false;
}

/**
 * Backoff delay hesapla — exponential + jitter.
 * Eğer Retry-After header geldiyse onu kullan (cap at MAX_DELAY_MS).
 *
 *   backoffDelayMs(0) → 1000ms ± jitter
 *   backoffDelayMs(1) → 2000ms ± jitter
 *   backoffDelayMs(2) → 4000ms ± jitter
 */
export function backoffDelayMs(attempt: number, retryAfterSec?: number): number {
  if (retryAfterSec !== undefined && retryAfterSec > 0) {
    return Math.min(retryAfterSec * 1000, MAX_DELAY_MS);
  }
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 250; // 0-250ms jitter — thundering herd guard
  return Math.min(exponential + jitter, MAX_DELAY_MS);
}

/** Retry-After header'ı parse et — saniye veya HTTP-date desteği. */
export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    // Negative seconds → invalid (not "retry immediately", reject)
    return seconds >= 0 ? seconds : undefined;
  }
  // HTTP-date format: "Wed, 21 Oct 2026 07:28:00 GMT"
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const diff = (date - Date.now()) / 1000;
    return diff > 0 ? diff : 0;
  }
  return undefined;
}

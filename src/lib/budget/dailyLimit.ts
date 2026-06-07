// Sprint P16 — daily token cost kill-switch.
//
// The monthly budget (lib/budget) caps total spend, but a single runaway
// day (a loop, an abusive script) could burn the whole month in hours.
// This adds a SECOND, finer safety net: a per-tenant daily token cap. When
// the day's estimated usage would exceed the cap, chat requests are
// rejected with 402 (the P12 upsell surfaces it gracefully) until the
// rolling day resets.
//
// Storage: a daily-keyed counter in Upstash (INCRBY + 25h EXPIRE) with an
// in-memory fallback, reusing the rate-limit module's shared Redis client.
// The DECISION + KEY logic is pure and unit-tested; only the I/O wrapper
// touches Redis.

import { sharedRedis } from "@/lib/rateLimit";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "daily-token-limit" });

/** Default daily cap; override with DAILY_TOKEN_CAP (0/unset → use default). */
export const DEFAULT_DAILY_TOKEN_CAP = 1_000_000;

export function dailyTokenCap(): number {
  const raw = Number.parseInt(process.env.DAILY_TOKEN_CAP ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_TOKEN_CAP;
}

/** Pure: would (usedToday + estimate) cross the cap? */
export function exceedsDailyCap(usedToday: number, estimate: number, cap: number): boolean {
  return usedToday + estimate > cap;
}

/** Pure: UTC-day-scoped Redis key, e.g. "daily-tok:tenant1:2026-05-31". */
export function dailyKey(tenantId: string, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return `daily-tok:${tenantId}:${day}`;
}

// In-memory fallback: { key → { count, expiresAt } }. Per-instance only,
// good enough when Upstash isn't configured (dev/preview).
const memory = new Map<string, { count: number; expiresAt: number }>();
const DAY_MS = 25 * 60 * 60 * 1000; // 25h so the key outlives the UTC day

function memGet(key: string): number {
  const e = memory.get(key);
  if (!e || e.expiresAt < Date.now()) {
    memory.delete(key);
    return 0;
  }
  return e.count;
}

function memAdd(key: string, tokens: number): void {
  const e = memory.get(key);
  if (!e || e.expiresAt < Date.now()) {
    memory.set(key, { count: tokens, expiresAt: Date.now() + DAY_MS });
    return;
  }
  e.count += tokens;
}

/**
 * Pre-flight daily-cap check. Returns ok, or a rejection with the TR
 * reason for budgetExhaustedError. Best-effort: a storage error fails OPEN
 * (allow) so the kill-switch never becomes an outage.
 */
export async function checkDailyTokenLimit(
  tenantId: string,
  estimate: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const cap = dailyTokenCap();
  const key = dailyKey(tenantId);
  try {
    const used = sharedRedis ? Number((await sharedRedis.get<number>(key)) ?? 0) : memGet(key);
    if (exceedsDailyCap(used, estimate, cap)) {
      return {
        ok: false,
        reason: "Günlük token limitiniz doldu. Güvenlik için günlük kullanım sınırlıdır; yarın otomatik sıfırlanır.",
      };
    }
    return { ok: true };
  } catch (err) {
    log.error({ err, tenantId }, "daily limit check failed — failing open");
    return { ok: true };
  }
}

/** Record actual tokens against today's bucket (fire-and-forget upstream). */
export async function recordDailyTokens(tenantId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  const key = dailyKey(tenantId);
  try {
    if (sharedRedis) {
      await sharedRedis.incrby(key, tokens);
      await sharedRedis.expire(key, 90_000); // 25h in seconds
    } else {
      memAdd(key, tokens);
    }
  } catch (err) {
    log.error({ err, tenantId, tokens }, "recordDailyTokens failed");
  }
}

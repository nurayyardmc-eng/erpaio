import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "rate-limit" });

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

let warned = false;
function warnFallbackOnce() {
  if (warned || hasUpstash) return;
  warned = true;
  log.warn(
    {},
    "Upstash env yok — rate limit in-memory fallback'a düştü (per-instance). Production scale için Vercel KV/Upstash entegrasyonu önerilir.",
  );
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(key: string, max: number, windowMs: number): {
  success: boolean;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    if (memoryStore.size > 10_000) {
      for (const [k, v] of memoryStore) {
        if (v.resetAt < now) memoryStore.delete(k);
      }
    }
    return { success: true, remaining: max - 1, reset: now + windowMs };
  }

  if (entry.count >= max) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: max - entry.count, reset: entry.resetAt };
}

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(prefix: string, max: number, windowMs: number): Ratelimit {
  const key = `${prefix}:${max}:${windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
      prefix: `erpaio:${prefix}`,
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

export interface LimitConfig {
  prefix: string;
  max: number;
  windowMs: number;
}

export interface LimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function rateLimit(identifier: string, config: LimitConfig): Promise<LimitResult> {
  if (hasUpstash && redis) {
    const limiter = getUpstashLimiter(config.prefix, config.max, config.windowMs);
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  }
  warnFallbackOnce();
  return inMemoryLimit(`${config.prefix}:${identifier}`, config.max, config.windowMs);
}

export const RATE_LIMITS = {
  CHAT: { prefix: "chat", max: 30, windowMs: 60_000 },
  CHAT_FEEDBACK: { prefix: "chat-fb", max: 60, windowMs: 60_000 },
  ALERT_CREATE: { prefix: "alert", max: 100, windowMs: 60_000 },
  CONNECTION_TEST: { prefix: "conn-test", max: 10, windowMs: 60_000 },
  // --- Auth & security-critical (IP-based unless noted) ---
  RESET_PASSWORD: { prefix: "reset-pwd", max: 5, windowMs: 60 * 60_000 }, // 5/saat
  VERIFY_EMAIL: { prefix: "verify-em", max: 10, windowMs: 60 * 60_000 }, // 10/saat
  MFA_SETUP: { prefix: "mfa-setup", max: 5, windowMs: 60 * 60_000 }, // 5/saat / user
  MFA_VERIFY: { prefix: "mfa-verify", max: 10, windowMs: 5 * 60_000 }, // 10/5dk / user (brute force)
  RECOVERY_GEN: { prefix: "rec-gen", max: 3, windowMs: 60 * 60_000 }, // 3/saat / user
  PASSWORD_CHANGE: { prefix: "pwd-change", max: 5, windowMs: 60 * 60_000 }, // 5/saat / user
  CONSENTS_READ: { prefix: "consents", max: 30, windowMs: 60_000 }, // 30/dk / user
  ADMIN_READ: { prefix: "admin-r", max: 60, windowMs: 60_000 }, // 60/dk / sysadmin
  ADMIN_WRITE: { prefix: "admin-w", max: 20, windowMs: 60_000 }, // 20/dk / sysadmin
} as const;

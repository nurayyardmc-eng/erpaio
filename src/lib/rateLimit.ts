import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { childLogger } from "@/lib/observability/logger";
import { ONE_HOUR_MS } from "@/lib/time/units";
import { extractClientIp } from "@/lib/http/clientIp";
import { jsonError } from "@/lib/i18n/server";

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
  CHAT_FOLLOW_UPS: { prefix: "follow-ups", max: 30, windowMs: 60_000 },
  CHAT_EXPLAIN: { prefix: "explain", max: 20, windowMs: 60_000 },
  ALERT_CREATE: { prefix: "alert", max: 100, windowMs: 60_000 },
  CONNECTION_TEST: { prefix: "conn-test", max: 10, windowMs: 60_000 },
  CONNECTION_SCHEMA_SYNC: { prefix: "conn-sync", max: 10, windowMs: ONE_HOUR_MS }, // 10/saat / user — re-sync ERP query'leri pahalı
  // --- Auth & security-critical (IP-based unless noted) ---
  RESET_PASSWORD: { prefix: "reset-pwd", max: 5, windowMs: ONE_HOUR_MS }, // 5/saat
  VERIFY_EMAIL: { prefix: "verify-em", max: 10, windowMs: ONE_HOUR_MS }, // 10/saat
  VERIFY_EMAIL_RESEND: { prefix: "verify-resend", max: 3, windowMs: ONE_HOUR_MS }, // 3/saat / user
  MFA_SETUP: { prefix: "mfa-setup", max: 5, windowMs: ONE_HOUR_MS }, // 5/saat / user
  MFA_VERIFY: { prefix: "mfa-verify", max: 10, windowMs: 5 * 60_000 }, // 10/5dk / user (brute force)
  RECOVERY_GEN: { prefix: "rec-gen", max: 3, windowMs: ONE_HOUR_MS }, // 3/saat / user
  PASSWORD_CHANGE: { prefix: "pwd-change", max: 5, windowMs: ONE_HOUR_MS }, // 5/saat / user
  EMAIL_CHANGE_REQUEST: { prefix: "email-chg", max: 3, windowMs: ONE_HOUR_MS }, // 3/saat / user — spam koruma; verify token ayrı IP-based
  CONSENTS_READ: { prefix: "consents", max: 30, windowMs: 60_000 }, // 30/dk / user
  PUSH_TOKEN_REGISTER: { prefix: "push-reg", max: 10, windowMs: 60_000 }, // 10/dk / user (mobile launch'larda yeniden register'ı kapsar)
  NOTIFICATION_PREFS: { prefix: "notif-pref", max: 30, windowMs: 60_000 }, // 30/dk / user (GET ve PATCH ortak; UI toggle spam'i için bolca pay var)
  ADMIN_READ: { prefix: "admin-r", max: 60, windowMs: 60_000 }, // 60/dk / sysadmin
  ADMIN_WRITE: { prefix: "admin-w", max: 20, windowMs: 60_000 }, // 20/dk / sysadmin
} as const;

/**
 * IP-based rate limit gate — extractClientIp + rateLimit + 429 wrap'i
 * tek satira indirir.
 *
 * Track BBBBBBBB — 5 auth route'da IDENTIK 3-satirlik pattern vardi:
 *   const ip = extractClientIp(req);
 *   const limit = await rateLimit(ip, CONFIG);
 *   if (!limit.success) return jsonError(req, "api.rateLimited", 429);
 *
 * Helper signature checkBodySize / parseJsonBody ile uyumlu: pass →
 * null, deny → Response. Mobile-login gibi custom Retry-After header
 * isteyen siteler manuel cağırmaya devam edebilir.
 */
export async function enforceIpRateLimit(
  req: Request,
  config: { prefix: string; max: number; windowMs: number },
): Promise<Response | null> {
  const ip = extractClientIp(req);
  const limit = await rateLimit(ip, config);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);
  return null;
}

/**
 * User-scoped rate limit gate — auth'lu endpoint'ler icin.
 *
 * Track CCCCCCCC — 11 endpoint'te IDENTIK 2-satirlik pattern vardi:
 *   const limit = await rateLimit(session.user.id, RATE_LIMITS.X);
 *   if (!limit.success) return jsonError(req, "api.rateLimited", 429);
 *
 * Helper signature enforceIpRateLimit ile uyumlu (pass → null, deny →
 * Response). Identifier IP yerine userId — kullanici-bazli quota
 * (mobile launch'larda push token re-register burst'unu absorbe etmek
 * gibi).
 */
export async function enforceUserRateLimit(
  req: Request,
  userId: string,
  config: { prefix: string; max: number; windowMs: number },
): Promise<Response | null> {
  const limit = await rateLimit(userId, config);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);
  return null;
}

/**
 * 429 Response with Retry-After + (optionally) X-RateLimit-* headers,
 * shared body shape across chat/auth routes that need a custom retry
 * hint (Retry-After in seconds = (limit.reset - now) / 1000).
 *
 * Track HHHHHHHH — 4 site IDENTIK Math.ceil((limit.reset - Date.now()) /
 * 1000) hesabini inline yapiyordu. Single source ile birim degisiklik
 * (örn: milisaniye, RFC HTTP-date) tek yerde.
 *
 * `includeRateLimitInfo: true` ile X-RateLimit-Remaining + -Reset
 * header'lari ekleniyor (chat/route giderken bunlari da yolluyor).
 */
import { serverMessages } from "@/lib/i18n/server";

export function retryAfterSeconds(reset: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((reset - now) / 1000));
}

export function rateLimited429(
  req: Request,
  limit: { reset: number; remaining: number },
  opts: { includeRateLimitInfo?: boolean } = {},
): Response {
  const headers: Record<string, string> = {
    "Retry-After": String(retryAfterSeconds(limit.reset)),
  };
  if (opts.includeRateLimitInfo) {
    headers["X-RateLimit-Remaining"] = String(limit.remaining);
    headers["X-RateLimit-Reset"] = String(limit.reset);
  }
  return Response.json(
    { error: serverMessages(req).api.rateLimited },
    { status: 429, headers },
  );
}

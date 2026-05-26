/**
 * SSR-safe localStorage wrappers.
 *
 * Track KKKKKKKK — 3 component (SetupChecklist, NpsPrompt, CookieConsent)
 * IDENTIK `typeof window === "undefined"` guard pattern'i kullaniyordu:
 *
 *   if (typeof window === "undefined") return false;
 *   return localStorage.getItem(KEY);
 *
 * Sorunlar:
 *   - SSR guard yapilmazsa hydration mismatch / RuntimeError
 *   - localStorage.setItem `QuotaExceededError` throw eder (private
 *     browsing, dolu disk) — guard yapan component crash etmesin
 *   - JSON.parse / Number() coercion her yerde tekrar ediliyor
 *
 * Helper'lar SSR'da `null` / no-op, throw'lari swallow eder.
 */

/** Get raw string value, null if missing or SSR. */
export function safeLocalGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Set raw string value, silent no-op on SSR or quota errors. */
export function safeLocalSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // QuotaExceededError or SecurityError (private browsing) — caller
    // doesn't need to know; we treat localStorage as best-effort.
  }
}

/** Remove key, silent no-op on SSR. */
export function safeLocalRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Get + JSON.parse, null on missing or parse error.
 * Caller must validate the shape — this only handles the storage I/O.
 */
export function safeLocalGetJson<T>(key: string): T | null {
  const raw = safeLocalGet(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** JSON.stringify + set. Silent no-op on SSR or serialization error. */
export function safeLocalSetJson(key: string, value: unknown): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return;
  }
  safeLocalSet(key, serialized);
}

/** Get + Number() coercion, null on missing / NaN. */
export function safeLocalGetNumber(key: string): number | null {
  const raw = safeLocalGet(key);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

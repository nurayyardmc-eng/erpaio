/**
 * In-memory TTL freshness check for the `{ ts }`-stamped Map caches
 * (cache/annotations, cache/schema, cache/sampleRows, security/ipAllowlist,
 * notifications/email — each stored `{ ...data, ts: Date.now() }` and tested
 * `Date.now() - entry.ts < TTL`).
 *
 * Returns true while the entry is younger than `ttlMs`. Boundary is exclusive
 * (age == ttlMs is stale), matching the original `<` comparison exactly. Pure;
 * `now` is injectable for deterministic tests.
 */
export function isFresh(ts: number, ttlMs: number, now: number = Date.now()): boolean {
  return now - ts < ttlMs;
}

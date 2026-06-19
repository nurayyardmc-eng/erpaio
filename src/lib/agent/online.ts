// An agent is "online" if it polled (lastSeenAt) within the recency window.
// Kept as a pure helper so the dashboard can call it during render without
// tripping react-hooks/purity (Date.now lives here, not in the component).

const ONLINE_WINDOW_MS = 120_000; // 2 min — covers the ~1s poll + jitter/backoff

export function isAgentOnline(
  lastSeenAt: string | null | undefined,
  windowMs: number = ONLINE_WINDOW_MS,
  nowMs: number = Date.now(),
): boolean {
  if (!lastSeenAt) return false;
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return false;
  return nowMs - seen < windowMs;
}

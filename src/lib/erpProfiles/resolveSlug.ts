/**
 * Pick the ERP profile slug to load for a given connection.
 *
 * Connections may have an explicit `erpProfile` (preferred). When null, fall
 * back to the legacy heuristic: `erpType === "nebim_v3"` implies the Nebim
 * profile (early connections didn't set erpProfile separately).
 *
 * Track LLLLL — DRY across three call sites that had the same ternary inline:
 *   - api/chat/route.ts
 *   - api/chat/stream/route.ts
 *   - api/embeddings/build/route.ts
 *
 * Returns null when no profile applies (custom / unknown ERP types).
 */
export function resolveProfileSlug(
  erpType: string | null | undefined,
  erpProfile: string | null | undefined,
): string | null {
  if (erpProfile) return erpProfile;
  if (erpType === "nebim_v3") return "nebim_v3";
  return null;
}

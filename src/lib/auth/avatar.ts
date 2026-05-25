/**
 * Avatar upload validation helpers.
 *
 * Track KKKKKK — extracted from src/app/api/me/route.ts.
 *
 * Avatars are stored as base64 data URLs ("data:image/<type>;base64,<...>").
 * The route accepts these directly (max 500 KB) and saves to User.avatarBase64.
 *
 * A naive endsWith check would let "data:image/svg+xml,<script>..." through
 * (no base64) — but the existing prefix check `data:image/` is intentionally
 * permissive for JPEG/PNG/WebP/GIF. We document it and add tests.
 */

/**
 * Quick prefix check matching the route's existing accept logic.
 * Returns true for null (caller may interpret as "no change"). Returns false
 * for non-data-url strings — those should be rejected before writing to DB.
 */
export function isValidAvatarDataUrl(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true; // "no change"
  if (value === "") return true; // explicit clear
  return value.startsWith("data:image/");
}

/**
 * Pick the audit action name based on changed-field set.
 *
 * Spec:
 *   - ONLY avatar changed → "profile.avatar.update" (more specific event)
 *   - anything else (name alone, or name + avatar)  → "profile.update"
 *
 * Helps Sentry/audit dashboard differentiate avatar-only updates (high
 * frequency) from real profile edits.
 */
export function pickProfileUpdateAction(
  changedFields: readonly string[],
): "profile.avatar.update" | "profile.update" {
  if (changedFields.length === 1 && changedFields[0] === "avatar") {
    return "profile.avatar.update";
  }
  return "profile.update";
}

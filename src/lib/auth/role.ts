/**
 * Role-gate helpers for admin-only mutations.
 *
 * Track XXXXXX — same `role !== "owner" && role !== "admin"` inline pattern
 * appeared in 10+ API routes and 2 dashboard pages. Centralizing prevents
 * a regression where a new role name (e.g. "operator") gets added without
 * updating every gate.
 *
 * Role taxonomy (matches Prisma User.role):
 *   - owner   : tenant creator, full control (incl. delete tenant)
 *   - admin   : tenant management (team, integrations, settings)
 *   - viewer  : read-only (default for accept-invite)
 */
export type Role = "owner" | "admin" | "viewer" | string;

/** True when role can perform team/settings/integration mutations. */
export function isOwnerOrAdmin(role: Role | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** True ONLY for the tenant owner. Use for irreversible actions (delete, transfer). */
export function isOwner(role: Role | null | undefined): boolean {
  return role === "owner";
}

import { localizedError } from "@/lib/i18n/server";

/**
 * Role gate for write/admin actions — returns null when allowed, a
 * localized 403 Response when denied.
 *
 * Track SSSSSSS — extracted from 9 API routes that all had the identical
 * `if (!isOwnerOrAdmin(...)) return localizedError(req, 403, { tr:
 * "Yalnızca admin.", en: "Admin only." })` block. Routes with custom
 * wording (e.g. "Yalnızca yönetici düzenleyebilir.") still inline the
 * check + their own message — pass them via the optional `texts` arg if
 * needed.
 *
 * Usage:
 *   const denied = requireOwnerOrAdmin(req, session.user.role);
 *   if (denied) return denied;
 *
 * The early-return shape mirrors checkBodySize / parseJsonBody, which
 * keeps the route handlers' control flow uniform.
 */
const DEFAULT_DENY_ADMIN = { tr: "Yalnızca admin.", en: "Admin only." } as const;

export function requireOwnerOrAdmin(
  req: Request,
  role: Role | null | undefined,
  texts: { tr: string; en: string } = DEFAULT_DENY_ADMIN,
): Response | null {
  if (isOwnerOrAdmin(role)) return null;
  return localizedError(req, 403, texts);
}

/**
 * Owner-only gate — returns null when allowed, localized 403 when denied.
 *
 * Track TTTTTTT — parallel to requireOwnerOrAdmin for irreversible /
 * billing actions (delete tenant, plan change, export, role transfer).
 * 5 sites had the inline `if (!isOwner(role)) return localizedError(req,
 * 403, { tr: "Yalnızca tenant sahibi...", en: "Only the tenant
 * owner..." })` pattern with varying suffix copy. Each site provides its
 * own `texts` arg because the action verb is part of the deny message.
 */
const DEFAULT_DENY_OWNER = {
  tr: "Yalnızca tenant sahibi.",
  en: "Only the tenant owner.",
} as const;

export function requireOwner(
  req: Request,
  role: Role | null | undefined,
  texts: { tr: string; en: string } = DEFAULT_DENY_OWNER,
): Response | null {
  if (isOwner(role)) return null;
  return localizedError(req, 403, texts);
}

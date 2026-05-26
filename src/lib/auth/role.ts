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

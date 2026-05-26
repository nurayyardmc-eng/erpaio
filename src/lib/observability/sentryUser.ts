import * as Sentry from "@sentry/nextjs";

export interface SentryUserContext {
  id: string;
  email?: string | null;
  tenantId: string;
  role?: string;
}

export function setSentryUser(user: SentryUserContext): void {
  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    tenant_id: user.tenantId,
    role: user.role,
  });
}

/**
 * Convenience wrapper for auth'lu route handler'lar — session shape'inden
 * Sentry user'i kurar.
 *
 * Track XXXXXXX — 4 chat route'da IDENTIK 5-satirlik blok vardi:
 *   setSentryUser({
 *     id: session.user.id,
 *     email: session.user.email,
 *     tenantId: session.user.tenantId,
 *     role: session.user.role,
 *   });
 *
 * Session shape sabit (lib/auth/dual.AuthedUser); helper'i type-safe
 * yapip yeni endpoint'lerin tek satira inmesini sagliyor.
 */
export interface SentryActor {
  user: {
    id: string;
    email?: string | null;
    tenantId: string;
    role?: string;
  };
}

export function setSentryUserFromSession(session: SentryActor): void {
  setSentryUser({
    id: session.user.id,
    email: session.user.email,
    tenantId: session.user.tenantId,
    role: session.user.role,
  });
}

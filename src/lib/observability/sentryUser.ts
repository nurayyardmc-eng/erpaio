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

// Append-only activity audit log for sensitive account mutations.
//
// Bir endpoint hassas bir değişiklik yapıyorsa (şifre/profil/MFA/oturum)
// `recordActivity()` çağırır — KVKK md. 13 + GDPR Art. 30 işleme faaliyet
// kaydı kapsamı. Kullanıcı silinse de userId/tenantId SetNull, email saklı.

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { requestContext } from "@/lib/http/clientIp";

/** Standardized action names — yeni eklerken buraya yaz. */
export type ActivityAction =
  | "profile.update"
  | "profile.avatar.update"
  | "password.change"
  | "password.reset"
  | "mfa.enable"
  | "mfa.disable"
  | "mfa.recovery.regenerate"
  | "mfa.recovery.consume"
  | "session.revoke"
  | "tenant.update"
  | "tenant.branding.update"
  | "tenant.delete"
  | "team.invite"
  | "team.member.remove"
  | "team.role.change"
  | "integration.update"
  | "ip_allowlist.add"
  | "ip_allowlist.remove"
  | "api_token.create"
  | "api_token.revoke"
  | "api_token.rename"
  | "notification.prefs.update"
  | "push_token.revoke"
  | "alert.feedback.false_positive"
  | "alert.feedback.clear"
  | "connection.schema.sync"
  | "email.change.request"
  | "email.change.complete"
  | "tenant.export";

export interface RecordActivityInput {
  userId?: string | null;
  tenantId?: string | null;
  email?: string | null;
  action: ActivityAction;
  target?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Best-effort append. Audit failure ana flow'u bloklamaz.
 * Production'da Sentry'ye düşer (logger üzerinden).
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        tenantId: input.tenantId ?? null,
        email: input.email ?? null,
        action: input.action,
        target: input.target ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error("recordActivity failed:", e);
  }
}

/**
 * IP + UA helper — backward-compat alias for `requestContext`.
 * Track AAAAAAAA: implementation moved to lib/http/clientIp to eliminate
 * exact-duplicate with consentContextFromRequest.
 */
export const activityContextFromRequest = requestContext;

/**
 * Convenience wrapper — auth'lu route'lar için recordActivity'nin tipik
 * boilerplate'ini tek bir cağrıya inerler.
 *
 * Track VVVVVVV — 15+ route'da identik şu blok vardı:
 *   const ctx = activityContextFromRequest(req);
 *   await recordActivity({
 *     userId: session.user.id,
 *     tenantId: session.user.tenantId,
 *     email: session.user.email ?? null,
 *     action, target, metadata,
 *     ...ctx,
 *   });
 *
 * Helper inline pattern'i 1 cağrıya indirir. Best-effort semantic'i
 * korunur — başarısızlık ana flow'u bloklamaz.
 */
export interface RecordUserActivityInput {
  action: ActivityAction;
  target?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ActivityActor {
  user: {
    id: string;
    tenantId: string;
    email?: string | null;
  };
}

export async function recordUserActivity(
  req: Request,
  session: ActivityActor,
  input: RecordUserActivityInput,
): Promise<void> {
  await recordActivity({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email ?? null,
    action: input.action,
    target: input.target ?? null,
    metadata: input.metadata ?? null,
    ...activityContextFromRequest(req),
  });
}

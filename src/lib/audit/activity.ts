// Append-only activity audit log for sensitive account mutations.
//
// Bir endpoint hassas bir değişiklik yapıyorsa (şifre/profil/MFA/oturum)
// `recordActivity()` çağırır — KVKK md. 13 + GDPR Art. 30 işleme faaliyet
// kaydı kapsamı. Kullanıcı silinse de userId/tenantId SetNull, email saklı.

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

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

/** IP + UA helper — call site responsibility'sini sade tutar. */
export function activityContextFromRequest(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  return { ipAddress, userAgent };
}

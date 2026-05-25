// KVKK / GDPR consent log helpers.
//
// Tüm onay (granted) / red / geri alma (withdrawn) işlemleri append-only olarak
// ConsentLog'a yazılır. User silinse bile email + tenantId korunur; retention
// için tablo silinmemeli — md. 7 + denetim dengesini bu sağlar.

import { prisma } from "@/lib/db/prisma";
import { extractClientIp } from "@/lib/http/clientIp";

export type ConsentType =
  | "kvkk_signup"
  | "kvkk_marketing"
  | "kvkk_cookies"
  | "terms"
  | "privacy";

export type ConsentAction = "granted" | "withdrawn";

export interface RecordConsentInput {
  userId?: string | null;
  tenantId?: string | null;
  email?: string | null;
  consentType: ConsentType;
  action: ConsentAction;
  documentVer?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  context?: string | null;
}

/** Append a consent event. Always succeeds; never throws on FK errors (best-effort). */
export async function recordConsent(input: RecordConsentInput): Promise<void> {
  try {
    await prisma.consentLog.create({
      data: {
        userId: input.userId ?? null,
        tenantId: input.tenantId ?? null,
        email: input.email ?? null,
        consentType: input.consentType,
        action: input.action,
        documentVer: input.documentVer ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        context: input.context ?? null,
      },
    });
  } catch (e) {
    // Consent log failure should NEVER block the main flow.
    // Logged via stderr; observability/logger ekosistemi ayrı.
    console.error("recordConsent failed:", e);
  }
}

/** Extract IP + UA from a Request — call site responsibility, kept here for reuse. */
export function consentContextFromRequest(req: Request): { ipAddress: string; userAgent: string } {
  const ipAddress = extractClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  return { ipAddress, userAgent };
}

/** List consent events for a user — used by KVKK md. 11 (bilgi talep) export. */
export async function listUserConsents(userId: string) {
  return prisma.consentLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Lookup tenant's plan (starter/pro/enterprise) by id.
 *
 * Track NNNNNNNNNNNN — 2 site IDENTIK lookup yapiyordu:
 *   prisma.tenant.findUnique({
 *     where: { id: session.user.tenantId },
 *     select: { plan: true },
 *   });
 *
 * Sites:
 *   * auth/mfa/setup (feature gate check)
 *   * tenant/branding PATCH (white_label feature gate)
 *
 * Helper plan string'i veya null (tenant bulunmadi) doner; caller
 * `hasFeature(plan, "X")` ile gate kontrolu yapar.
 *
 * NOT: team/invite + tenant/branding GET ekstra field'lar (name,
 * _count, brandingLogoUrl vb.) cekiyor — onlar bu helper'i kullanmadi,
 * intentional (her birinin kendi shape'i var).
 */
import { prisma } from "@/lib/db/prisma";

export async function getTenantPlan(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  return tenant?.plan ?? null;
}

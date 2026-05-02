import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "budget" });

export async function checkAndConsume(
  tenantId: string,
  estimatedTokens: number,
): Promise<{ ok: true } | { ok: false; reason: string; remaining: number }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { monthlyTokenBudget: true, monthlyTokensUsed: true, budgetResetAt: true },
  });
  if (!tenant) return { ok: false, reason: "tenant not found", remaining: 0 };

  const now = new Date();
  const resetAge = now.getTime() - tenant.budgetResetAt.getTime();
  if (resetAge > 30 * 24 * 60 * 60_000) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { monthlyTokensUsed: 0, budgetResetAt: now },
    });
    log.info({ tenantId }, "Token budget auto-reset (>30d)");
    return { ok: true };
  }

  const remaining = tenant.monthlyTokenBudget - tenant.monthlyTokensUsed;
  if (remaining < estimatedTokens) {
    return {
      ok: false,
      reason: "Aylık token bütçesi doldu. Plan yükseltin veya bekleyin.",
      remaining,
    };
  }
  return { ok: true };
}

export async function recordUsage(tenantId: string, tokens: number): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { monthlyTokensUsed: { increment: tokens } },
  }).catch(() => {});
}

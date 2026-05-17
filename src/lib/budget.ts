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
  await prisma.tenant
    .update({
      where: { id: tenantId },
      data: { monthlyTokensUsed: { increment: tokens } },
    })
    .catch((err) => {
      // Best-effort — counter update'i ana flow'u bloklamasın, ama görünür kalsın
      log.error({ err, tenantId, tokens }, "recordUsage failed");
    });
}

/** Mevcut tenant'ın usage durumu — UI ve API için ortak shape. */
export interface BudgetStatus {
  used: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  resetAt: Date;
  /** budgetResetAt + 30 gün */
  resetsOn: Date;
}

/**
 * Pure computation — tenant fields → BudgetStatus.
 * Side-effect'siz, test edilebilir.
 */
export function computeBudgetStatus(input: {
  monthlyTokensUsed: number;
  monthlyTokenBudget: number;
  budgetResetAt: Date;
}): BudgetStatus {
  const used = input.monthlyTokensUsed;
  const budget = input.monthlyTokenBudget;
  const remaining = Math.max(0, budget - used);
  const percentUsed = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
  const resetsOn = new Date(input.budgetResetAt.getTime() + 30 * 24 * 60 * 60_000);
  return { used, budget, remaining, percentUsed, resetAt: input.budgetResetAt, resetsOn };
}

export async function getBudgetStatus(tenantId: string): Promise<BudgetStatus | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { monthlyTokenBudget: true, monthlyTokensUsed: true, budgetResetAt: true },
  });
  if (!tenant) return null;
  return computeBudgetStatus(tenant);
}

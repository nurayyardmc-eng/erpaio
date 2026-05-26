import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { ONE_DAY_MS } from "@/lib/time/units";

const log = childLogger({ component: "budget" });

/**
 * Pre-flight budget check.
 *
 * RACE WINDOW: SELECT → caller's AI call → recordUsage(). Concurrent in-flight
 * requests can all pass the check before any of them records usage, leading
 * to over-spend bounded by `concurrent_reqs × estimatedTokens`. Per-tenant
 * concurrency is rate-limited (CHAT: 30/min), so worst case ≈ 150k tokens
 * over a 2M monthly budget (7%). Accepted trade-off vs. user-facing UX of
 * pre-flight rejection. recordUsage() uses atomic increment so the counter
 * itself never loses writes.
 */
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
  if (resetAge > 30 * ONE_DAY_MS) {
    // Atomik reset — başka concurrent request reset'i tekrarlamasın
    await prisma.tenant.updateMany({
      where: { id: tenantId, budgetResetAt: tenant.budgetResetAt },
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
  const resetsOn = new Date(input.budgetResetAt.getTime() + 30 * ONE_DAY_MS);
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

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { childLogger } from "@/lib/observability/logger";

export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limited = await enforceUserRateLimit(req, guard.userId, RATE_LIMITS.ADMIN_READ);
  if (limited) return limited;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      monthlyTokenBudget: true,
      monthlyTokensUsed: true,
      budgetResetAt: true,
      trialEndsAt: true,
      createdAt: true,
      _count: {
        select: { users: true, connections: true, alerts: true, queryCache: true },
      },
    },
  });

  return Response.json({ tenants });
}

// Sprint F.2 — sysadmin-only mutation. Allows promoting a tenant's plan,
// resetting the token meter (zero out monthlyTokensUsed), or raising/
// lowering the token budget. Every change is audit-logged. Hard-coded
// allowlist on which columns can be touched — never allow free-form
// writes to the tenant table from a route.
const PatchSchema = z.object({
  id: z.string().min(1),
  plan: z.enum(["starter", "pro", "enterprise"]).optional(),
  monthlyTokenBudget: z.number().int().positive().max(100_000_000).optional(),
  resetTokensUsed: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  const log = childLogger({ component: "admin-tenants-patch", sysadminUserId: guard.userId });
  const data: Record<string, unknown> = {};
  if (body.plan) data.plan = body.plan;
  if (body.monthlyTokenBudget) data.monthlyTokenBudget = body.monthlyTokenBudget;
  if (body.resetTokensUsed) {
    data.monthlyTokensUsed = 0;
    data.budgetResetAt = new Date();
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No supported fields supplied." }, { status: 400 });
  }

  try {
    const updated = await prisma.tenant.update({
      where: { id: body.id },
      data,
      select: {
        id: true,
        plan: true,
        monthlyTokenBudget: true,
        monthlyTokensUsed: true,
        budgetResetAt: true,
      },
    });
    log.warn(
      { tenantId: body.id, changes: Object.keys(data) },
      "Sysadmin mutated tenant configuration",
    );
    return Response.json({ ok: true, tenant: updated });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Tenant not found." }, { status: 404 });
    }
    throw err;
  }
}

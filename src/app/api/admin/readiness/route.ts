/**
 * Production readiness endpoint — sysadmin only.
 *
 * Track KKKKKKK — admin dashboard fetches this to render the "Setup checklist"
 * widget showing which production env vars are configured.
 *
 * Returns the same shape as src/lib/productionReadiness.getReadinessReport()
 * — see that module for level/check semantics.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { getReadinessReport } from "@/lib/productionReadiness";

export async function GET(req: NextRequest) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const report = getReadinessReport();
  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}

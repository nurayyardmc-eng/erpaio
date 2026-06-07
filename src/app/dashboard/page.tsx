import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * /dashboard entry point — onboarding-aware router.
 *
 * Feature 8.0:
 *   - No connection yet            → /dashboard/connections (Wizard)
 *   - Connection but no chat yet   → /dashboard/overview   (SetupChecklist visible)
 *   - Returning user (has chatted) → /dashboard/chat       (normal entry)
 *
 * Previously the second branch sent users directly to /chat where the
 * SetupChecklist isn't mounted, so users completed Step 1 (connection)
 * and never saw the remaining onboarding steps (notifications, watchlist,
 * MFA, team invite). Routing through /overview surfaces the checklist
 * right after the first connection lands.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = (session.user as { tenantId?: string }).tenantId;
  const userId = (session.user as { id?: string }).id;
  if (!tenantId || !userId) redirect("/dashboard/chat");

  const [connectionCount, chatCount] = await Promise.all([
    prisma.erpConnection.count({ where: { tenantId } }),
    prisma.chatMessage.count({
      where: { session: { tenantId, userId }, role: "user" },
    }),
  ]);

  // Growth #1 — Sandbox-first onboarding. A brand-new user (no connection)
  // sees the value sandbox BEFORE the ERP-credential wall. Once they've
  // seen it (erpaio_sandbox_seen cookie, set by the sandbox page), the
  // next /dashboard entry sends them on to the connection wizard so they
  // aren't looped back into the sandbox.
  if (connectionCount === 0) {
    const cookieStore = await cookies();
    const sawSandbox = cookieStore.get("erpaio_sandbox_seen")?.value === "1";
    redirect(sawSandbox ? "/dashboard/connections" : "/dashboard/sandbox");
  }
  if (chatCount === 0) {
    redirect("/dashboard/overview");
  }
  redirect("/dashboard/chat");
}

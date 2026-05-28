import { redirect } from "next/navigation";
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

  if (connectionCount === 0) {
    redirect("/dashboard/connections");
  }
  if (chatCount === 0) {
    redirect("/dashboard/overview");
  }
  redirect("/dashboard/chat");
}

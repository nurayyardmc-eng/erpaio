import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Yeni kullanıcı onboarding: bağlantısı yoksa connections sayfasına yönlendir.
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (tenantId) {
    const connectionCount = await prisma.erpConnection.count({
      where: { tenantId },
    });
    if (connectionCount === 0) {
      redirect("/dashboard/connections");
    }
  }

  redirect("/dashboard/chat");
}

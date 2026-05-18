import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import CommandPalette from "@/components/CommandPalette";
import HelpFab from "@/components/HelpFab";
import TrialBanner from "@/components/TrialBanner";
import { colors } from "@/lib/theme";

// I18nProvider root layout'tan geliyor — burada wrap'lemiyoruz.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg }}>
      <DashboardSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <DashboardHeader email={session.user?.email ?? ""} name={session.user?.name} />
        {/* Trial countdown banner (AAAA) — null render olur >14 gün veya paid plan'da. */}
        <TrialBanner />
        <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          {children}
        </main>
      </div>
      <CommandPalette />
      <HelpFab />
    </div>
  );
}

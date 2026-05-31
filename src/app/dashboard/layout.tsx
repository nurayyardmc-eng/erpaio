import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import CommandPalette from "@/components/CommandPalette";
import HelpFab from "@/components/HelpFab";
import NpsPrompt from "@/components/NpsPrompt";
import TrialBanner from "@/components/TrialBanner";
import WelcomeWizard from "@/components/WelcomeWizard";
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
        <DashboardFooter />
      </div>
      <CommandPalette />
      <HelpFab />
      {/* Track SSSS — NPS prompt (90gün cool-down + 30s delay). Önceden dead code
          olarak duruyordu; layout'a mount edildi. localStorage gating'i kendisi yapar. */}
      <NpsPrompt />
      {/* Feature 4.1 — first-run welcome wizard (only shows when setup score == 0
          + not previously dismissed). Self-gates via API + localStorage. */}
      <WelcomeWizard />
    </div>
  );
}

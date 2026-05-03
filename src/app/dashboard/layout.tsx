import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import UserMenu from "@/components/UserMenu";
import { colors } from "@/lib/theme";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg }}>
      <DashboardSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          background: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          minHeight: 56,
        }}>
          <UserMenu email={session.user?.email ?? ""} name={session.user?.name} />
        </header>
        <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}


import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07090F",
      fontFamily: "monospace",
      color: "#E8EDF5",
      padding: 40,
    }}>
      <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
      <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Dashboard</h1>
      <p style={{ color: "#3A4558", fontSize: 12, marginBottom: 32 }}>Hoş geldin, {session.user?.email}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 600 }}>
        {[
          { href: "/dashboard/overview", label: "Anlık Metrikler", desc: "Pre-computed dashboard", color: "#FFD740" },
          { href: "/dashboard/connections", label: "ERP Bağlantıları", desc: "Nebim V3 bağlantısı ekle", color: "#00E5FF" },
          { href: "/dashboard/chat", label: "Soru Sor", desc: "Türkçe soru → SQL → Cevap", color: "#B388FF" },
          { href: "/dashboard/alerts", label: "Bildirimler", desc: "Anomali ve uyarılar", color: "#FF6B6B" },
          { href: "/dashboard/annotations", label: "Şema Açıklamaları", desc: "Tablo/kolon notları (admin)", color: "#FF9500" },
          { href: "/dashboard/settings", label: "Ayarlar", desc: "Hesap ve tercihler", color: "#69FF47" },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "#0C1018",
              border: `1px solid ${item.color}25`,
              borderRadius: 10,
              padding: 20,
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: item.color, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "#3A4558" }}>{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
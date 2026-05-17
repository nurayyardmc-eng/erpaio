"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MessageSquare,
  BarChart3,
  Database,
  Bell,
  Bookmark,
  Send,
  Eye,
  TrendingUp,
  FileText,
  ScrollText,
  Users,
  Shield,
  Settings as SettingsIcon,
  Plus,
  LogOut,
} from "lucide-react";
import { colors } from "@/lib/theme";

interface Cmd {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  action: () => void;
  group: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Cmd[] = [
    { id: "chat", label: "Sohbet", Icon: MessageSquare, group: "Git", action: () => router.push("/dashboard/chat") },
    { id: "overview", label: "Anlık Metrikler", Icon: BarChart3, group: "Git", action: () => router.push("/dashboard/overview") },
    { id: "saved", label: "Kayıtlı Sorgular", Icon: Bookmark, group: "Git", action: () => router.push("/dashboard/saved") },
    { id: "alerts", label: "Bildirimler", Icon: Bell, group: "Git", action: () => router.push("/dashboard/alerts") },
    { id: "connections", label: "ERP Bağlantıları", Icon: Database, group: "Git", action: () => router.push("/dashboard/connections") },
    { id: "annotations", label: "Şema Açıklamaları", Icon: FileText, group: "Git", action: () => router.push("/dashboard/annotations") },
    { id: "watchlists", label: "Watchlists", Icon: Eye, group: "Git", action: () => router.push("/dashboard/watchlists") },
    { id: "insights", label: "Şema Analizi", Icon: TrendingUp, group: "Git", action: () => router.push("/dashboard/insights") },
    { id: "reports", label: "Planlı Raporlar", Icon: Send, group: "Git", action: () => router.push("/dashboard/scheduled-reports") },
    { id: "audit", label: "Aktivite Logu", Icon: ScrollText, group: "Git", action: () => router.push("/dashboard/audit") },
    { id: "team", label: "Takım", Icon: Users, group: "Git", action: () => router.push("/dashboard/team") },
    { id: "security", label: "Güvenlik", Icon: Shield, group: "Git", action: () => router.push("/dashboard/security") },
    { id: "settings", label: "Ayarlar", Icon: SettingsIcon, group: "Git", action: () => router.push("/dashboard/settings") },
    { id: "new-chat", label: "Yeni Sohbet Başlat", Icon: Plus, group: "Aksiyon", action: () => { router.push("/dashboard/chat"); window.location.reload(); } },
    { id: "logout", label: "Çıkış Yap", Icon: LogOut, group: "Aksiyon", action: async () => {
      try {
        const csrfRes = await fetch("/api/auth/csrf");
        const { csrfToken } = await csrfRes.json();
        await fetch("/api/auth/signout", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ csrfToken, callbackUrl: "/" }),
        });
      } catch {}
      // Hard navigation after sign-out — intentionally mutating window.location is the standard pattern.
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = "/";
    }},
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        filtered[active].action();
        setOpen(false);
        setQuery("");
        setActive(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, active, filtered]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // Reset palette state when it closes; intentional sync with `open` prop transitions.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setActive(0);
    }
  }, [open]);

  if (!open) return null;

  const groups = filtered.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.group] = acc[c.group] || []).push(c);
    return acc;
  }, {});

  let runningIndex = -1;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.4)",
        backdropFilter: "blur(4px)",
        zIndex: 10001,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          margin: "0 16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "70vh",
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <Search size={18} color={colors.textMuted} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder="Komut veya sayfa ara…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 15,
              color: colors.text,
              background: "transparent",
            }}
          />
          <span style={{
            fontSize: 11,
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
            padding: "2px 6px",
            borderRadius: 4,
            fontFamily: "ui-monospace, Menlo, Monaco, monospace",
          }}>
            esc
          </span>
        </div>

        <div style={{ overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px 20px", textAlign: "center", color: colors.textMuted, fontSize: 14 }}>
              Sonuç bulunamadı.
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 11,
                color: colors.textSubtle,
                padding: "8px 12px 6px",
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}>
                {group}
              </div>
              {items.map((c) => {
                runningIndex++;
                const isActive = runningIndex === active;
                return (
                  <button
                    key={c.id}
                    onClick={() => { c.action(); setOpen(false); }}
                    onMouseEnter={() => setActive(runningIndex)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      background: isActive ? colors.bgSubtle : "transparent",
                      border: "none",
                      borderRadius: 8,
                      color: colors.text,
                      fontSize: 14,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <c.Icon size={16} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{
          padding: "10px 20px",
          borderTop: `1px solid ${colors.border}`,
          fontSize: 11,
          color: colors.textSubtle,
          display: "flex",
          gap: 16,
          background: colors.bgSubtle,
        }}>
          <span>↑↓ gez</span>
          <span>↵ seç</span>
          <span>esc çık</span>
        </div>
      </div>
    </div>
  );
}

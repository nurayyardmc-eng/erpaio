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
import { filterCommands, groupByCategory } from "@/lib/command-palette/filter";
import { useI18n } from "@/lib/i18n/context";

interface Cmd {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  action: () => void;
  group: string;
}

export default function CommandPalette() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const goGroup = t.commandPalette.groupGo;
  const actionGroup = t.commandPalette.groupAction;
  const commands: Cmd[] = [
    { id: "chat", label: t.commandPalette.cmdChat, Icon: MessageSquare, group: goGroup, action: () => router.push("/dashboard/chat") },
    { id: "overview", label: t.commandPalette.cmdOverview, Icon: BarChart3, group: goGroup, action: () => router.push("/dashboard/overview") },
    { id: "saved", label: t.commandPalette.cmdSaved, Icon: Bookmark, group: goGroup, action: () => router.push("/dashboard/saved") },
    { id: "alerts", label: t.commandPalette.cmdAlerts, Icon: Bell, group: goGroup, action: () => router.push("/dashboard/alerts") },
    { id: "connections", label: t.commandPalette.cmdConnections, Icon: Database, group: goGroup, action: () => router.push("/dashboard/connections") },
    { id: "annotations", label: t.commandPalette.cmdAnnotations, Icon: FileText, group: goGroup, action: () => router.push("/dashboard/annotations") },
    { id: "watchlists", label: t.commandPalette.cmdWatchlists, Icon: Eye, group: goGroup, action: () => router.push("/dashboard/watchlists") },
    { id: "insights", label: t.commandPalette.cmdInsights, Icon: TrendingUp, group: goGroup, action: () => router.push("/dashboard/insights") },
    { id: "reports", label: t.commandPalette.cmdReports, Icon: Send, group: goGroup, action: () => router.push("/dashboard/scheduled-reports") },
    { id: "audit", label: t.commandPalette.cmdAudit, Icon: ScrollText, group: goGroup, action: () => router.push("/dashboard/audit") },
    { id: "team", label: t.commandPalette.cmdTeam, Icon: Users, group: goGroup, action: () => router.push("/dashboard/team") },
    { id: "security", label: t.commandPalette.cmdSecurity, Icon: Shield, group: goGroup, action: () => router.push("/dashboard/security") },
    { id: "settings", label: t.commandPalette.cmdSettings, Icon: SettingsIcon, group: goGroup, action: () => router.push("/dashboard/settings") },
    { id: "new-chat", label: t.commandPalette.cmdNewChat, Icon: Plus, group: actionGroup, action: () => { router.push("/dashboard/chat"); window.location.reload(); } },
    { id: "logout", label: t.commandPalette.cmdLogout, Icon: LogOut, group: actionGroup, action: async () => {
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

  const filtered = filterCommands(commands, query);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      // Sprint C.1 — trap Tab inside the palette. Only the search input is
      // focusable, so Tab from it would leak focus to the page beneath the
      // backdrop. Keep focus on the input.
      if (e.key === "Tab") {
        e.preventDefault();
        inputRef.current?.focus();
      }
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

  const groups = groupByCategory(filtered);

  let runningIndex = -1;

  return (
    <div
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={t.commandPalette.placeholder}
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
          background: colors.card,
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
            placeholder={t.commandPalette.placeholder}
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
            {t.commandPalette.escLabel}
          </span>
        </div>

        <div style={{ overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px 20px", textAlign: "center", color: colors.textMuted, fontSize: 14 }}>
              {t.commandPalette.noResults}
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
          <span>{t.commandPalette.hintNavigate}</span>
          <span>{t.commandPalette.hintSelect}</span>
          <span>{t.commandPalette.hintEsc}</span>
        </div>
      </div>
    </div>
  );
}

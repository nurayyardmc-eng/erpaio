"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { HelpCircle, X, BookOpen, MessageCircle, Activity, Mail, Sparkles } from "lucide-react";
import { colors } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/context";

export default function HelpFab() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="help-fab" style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 50,
    }}>
      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          bottom: "calc(100% + 12px)",
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          width: 280,
          padding: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
          animation: "fadeIn 0.15s ease",
        }}>
          <div style={{
            padding: "8px 12px 12px",
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 2 }}>
              {t.helpFab.title}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              {t.helpFab.subtitle}
            </div>
          </div>
          <FabLink Icon={BookOpen} label={t.helpFab.centerLabel} desc={t.helpFab.centerDesc} href="/help" onClick={() => setOpen(false)} />
          <FabLink Icon={Sparkles} label={t.helpFab.paletteLabel} desc={t.helpFab.paletteDesc} onClick={() => {
            setOpen(false);
            setTimeout(() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }, 100);
          }} />
          <FabLink Icon={MessageCircle} label={t.helpFab.emailLabel} desc={t.helpFab.emailDesc} href="mailto:support@erpaio.com" onClick={() => setOpen(false)} />
          <FabLink Icon={Activity} label={t.helpFab.statusLabel} desc={t.helpFab.statusDesc} href="/status" onClick={() => setOpen(false)} />
          <FabLink Icon={Mail} label={t.helpFab.demoLabel} desc={t.helpFab.demoDesc} href="mailto:demo@erpaio.com" onClick={() => setOpen(false)} />
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? t.helpFab.closeAria : t.helpFab.openAria}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: colors.text,
          color: colors.bg,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.06)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {open ? <X size={20} /> : <HelpCircle size={20} />}
      </button>
    </div>
  );
}

function FabLink({ Icon, label, desc, href, onClick }: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  desc: string;
  href?: string;
  onClick: () => void;
}) {
  const inner = (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 12px",
      borderRadius: 8,
      cursor: "pointer",
      transition: "background 0.15s ease",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = colors.bgSubtle}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <Icon size={18} color={colors.textMuted} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{label}</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{desc}</div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} onClick={onClick} style={{ textDecoration: "none", display: "block" }}>{inner}</Link>;
  }
  return <button onClick={onClick} style={{ all: "unset", display: "block", width: "100%" }}>{inner}</button>;
}

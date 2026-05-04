"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, Shield, HelpCircle } from "lucide-react";
import { colors } from "@/lib/theme";

async function manualSignOut() {
  try {
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: "/" }),
    });
  } catch {
    // ignore — redirect anyway
  }
  window.location.href = "/";
}

interface UserMenuProps {
  email: string;
  name?: string | null;
}

export default function UserMenu({ email, name }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [liveName, setLiveName] = useState<string | null>(null);
  const [liveEmail, setLiveEmail] = useState<string | null>(null);
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

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setAvatar(d?.user?.avatarBase64 ?? null);
        setLiveName(d?.user?.name ?? null);
        setLiveEmail(d?.user?.email ?? null);
      })
      .catch(() => {});
  }, []);

  const displayName = liveName ?? name ?? "";
  const displayEmail = liveEmail ?? email;
  const initials = (displayName || displayEmail).split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "transparent",
          border: `1px solid ${colors.border}`,
          borderRadius: 999,
          padding: "6px 14px 6px 6px",
          cursor: "pointer",
        }}
      >
        <span style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          overflow: "hidden",
          background: avatar ? "transparent" : colors.brand,
          color: colors.textInverse,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
        }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </span>
        <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>
          {displayName || displayEmail.split("@")[0]}
        </span>
        <ChevronDown size={14} color={colors.textMuted} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 8px)",
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          minWidth: 220,
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          overflow: "hidden",
          zIndex: 100,
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{displayName || displayEmail.split("@")[0]}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{displayEmail}</div>
          </div>

          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            style={menuItemStyle}
          >
            <Settings size={15} color={colors.textMuted} />
            Ayarlar
          </Link>
          <Link
            href="/dashboard/security"
            onClick={() => setOpen(false)}
            style={menuItemStyle}
          >
            <Shield size={15} color={colors.textMuted} />
            Güvenlik
          </Link>
          <Link
            href="/help"
            onClick={() => setOpen(false)}
            style={menuItemStyle}
          >
            <HelpCircle size={15} color={colors.textMuted} />
            Yardım
          </Link>

          <button
            onClick={manualSignOut}
            style={{
              ...menuItemStyle,
              border: "none",
              borderTop: `1px solid ${colors.border}`,
              width: "100%",
              background: "transparent",
              color: colors.error,
              textAlign: "left",
            }}
          >
            <LogOut size={15} color={colors.error} />
            Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  fontSize: 14,
  color: colors.text,
  cursor: "pointer",
  textDecoration: "none",
};

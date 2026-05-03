"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { colors } from "@/lib/theme";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancel = false;
    const fetchCount = async () => {
      try {
        const r = await fetch("/api/alerts?status=open");
        if (!r.ok) return;
        const data = await r.json();
        if (!cancel) setCount(Array.isArray(data) ? data.length : 0);
      } catch {
        // ignore
      }
    };
    fetchCount();
    const t = setInterval(fetchCount, 60_000);
    return () => { cancel = true; clearInterval(t); };
  }, []);

  return (
    <Link
      href="/dashboard/alerts"
      aria-label={`Bildirimler${count > 0 ? ` (${count} yeni)` : ""}`}
      style={{
        position: "relative",
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        color: colors.textMuted,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
      }}
    >
      <Bell size={16} />
      {count > 0 && (
        <span style={{
          position: "absolute",
          top: -4,
          right: -4,
          minWidth: 18,
          height: 18,
          padding: "0 5px",
          background: "#EF4444",
          color: "#FFFFFF",
          borderRadius: 9,
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `2px solid ${colors.bg}`,
        }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

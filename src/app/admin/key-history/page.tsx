"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatTimestamp } from "@/lib/format/time";

interface KeyEntry {
  version: number;
  active: boolean;
  rotatedAt: string | null;
  createdAt: string;
}

export default function KeyHistoryPage() {
  const [history, setHistory] = useState<KeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/key-history")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setHistory(d.history ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Hata");
        setLoading(false);
      });
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 40 }}>
        <h1 style={{ fontSize: 18, color: "#EF4444" }}>⊘ {error}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>Bu sayfa yalnızca sistem yöneticilerine açıktır.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <Link href="/admin" style={{ color: "#737373", fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← Admin
      </Link>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · ENCRYPTION KEYS</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>Encryption Key Rotation</h1>
      <p style={{ color: "#94A3B8", fontSize: 12, marginBottom: 24 }}>
        AES-256-GCM master key history. Yeni ENCRYPTION_KEY ortam değişkeniyle deploy
        edilince otomatik kaydedilir. Sadece SHA-256 hash saklanır, plaintext asla.
      </p>

      <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B40", borderRadius: 10, padding: 16, marginBottom: 24, fontSize: 12, color: "#92400E" }}>
        ⚠ <strong>Önemli:</strong> Key rotation sonrası eski şifrelenmiş verilerin (ERP passwords, TOTP secrets)
        yeniden şifrelenmesi için ayrı bir migration job çalıştırılmalı. Yoksa decrypt başarısız olur.
      </div>

      {loading ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Yükleniyor...</div>
      ) : history.length === 0 ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Henüz key kaydı yok.</div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={th}>Version</th>
                <th style={th}>Durum</th>
                <th style={th}>Oluşturuldu</th>
                <th style={th}>Rotated</th>
              </tr>
            </thead>
            <tbody>
              {history.map((k) => (
                <tr key={k.version} style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <td style={td}><code style={{ fontWeight: 700 }}>v{k.version}</code></td>
                  <td style={td}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 100,
                      background: k.active ? "#D1FAE5" : "#F3F4F6",
                      color: k.active ? "#10B981" : "#737373",
                      fontWeight: 600,
                      fontSize: 10,
                      letterSpacing: 1,
                    }}>{k.active ? "AKTİF" : "ROTATED"}</span>
                  </td>
                  <td style={td}>{formatTimestamp(k.createdAt)}</td>
                  <td style={td}>{k.rotatedAt ? formatTimestamp(k.rotatedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
  fontWeight: 600,
  fontSize: 11,
  color: "#475569",
  letterSpacing: 0.5,
  textTransform: "uppercase",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
  fontSize: 13,
  color: "#0F172A",
};

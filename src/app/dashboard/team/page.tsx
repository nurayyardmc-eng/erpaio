"use client";
import { useEffect, useState } from "react";

interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  totpEnabled: boolean;
  createdAt: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "admin">("viewer");
  const [inviting, setInviting] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = () => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setInvitations(d.invitations ?? []);
        setLoading(false);
      });
  };

  useEffect(refresh, []);
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "err", msg: data.error || "Hata" });
      } else {
        setStatus({ kind: "ok", msg: "Davet gönderildi." });
        setInviteEmail("");
        refresh();
      }
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (userId: string, role: string) => {
    await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    refresh();
  };

  const removeUser = async (userId: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğine emin misin?")) return;
    await fetch(`/api/team?userId=${userId}`, { method: "DELETE" });
    refresh();
  };

  const cancelInvite = async (id: string) => {
    await fetch(`/api/team?invitationId=${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#1A2B47", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · TAKIM</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>Takım Yönetimi</h1>

      <div style={card}>
        <h2 style={sectionTitle}>Yeni Kullanıcı Davet Et</h2>
        <form onSubmit={sendInvite} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={label}>EMAIL</label>
            <input
              required type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={input}
            />
          </div>
          <div>
            <label style={label}>ROL</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "viewer" | "admin")} style={input}>
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button type="submit" disabled={inviting} style={btnPrimary}>
            {inviting ? "Gönderiliyor..." : "Davet Et"}
          </button>
        </form>
        {status && (
          <div style={{ marginTop: 8, fontSize: 11, color: status.kind === "ok" ? "#10B981" : "#EF4444" }}>{status.msg}</div>
        )}
      </div>

      {invitations.length > 0 && (
        <div style={card}>
          <h2 style={sectionTitle}>Bekleyen Davetler ({invitations.length})</h2>
          {invitations.map((inv) => (
            <div key={inv.id} style={row}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#0F172A", fontSize: 12 }}>{inv.email}</div>
                <div style={{ color: "#475569", fontSize: 10 }}>
                  {inv.role} · {new Date(inv.expiresAt).toLocaleDateString("tr-TR")} tarihinde sona erer
                </div>
              </div>
              <button onClick={() => cancelInvite(inv.id)} style={btnDanger}>İptal</button>
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <h2 style={sectionTitle}>Kullanıcılar ({users.length})</h2>
        {loading && <div style={{ color: "#94A3B8" }}>Yükleniyor...</div>}
        {users.map((u) => (
          <div key={u.id} style={row}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#0F172A", fontSize: 12 }}>
                {u.email} {u.totpEnabled && <span style={{ color: "#10B981", fontSize: 9, marginLeft: 6 }}>🔒 MFA</span>}
              </div>
              <div style={{ color: "#475569", fontSize: 10 }}>
                {u.name ?? "—"} · {new Date(u.createdAt).toLocaleDateString("tr-TR")}
              </div>
            </div>
            <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} style={{ ...input, width: "auto", marginRight: 8 }}>
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
            {u.role !== "owner" && (
              <button onClick={() => removeUser(u.id)} style={btnDanger}>Sil</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
  maxWidth: 700,
};
const sectionTitle: React.CSSProperties = { fontSize: 13, color: "#1A2B47", marginBottom: 14, fontWeight: 600 };
const label: React.CSSProperties = { color: "#94A3B8", fontSize: 9, letterSpacing: 1, display: "block", marginBottom: 4 };
const input: React.CSSProperties = {
  width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6,
  padding: "8px 10px", color: "#0F172A", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
};
const row: React.CSSProperties = {
  display: "flex", alignItems: "center", padding: "10px 0",
  borderBottom: "1px solid #E5E7EB", gap: 8,
};
const btnPrimary: React.CSSProperties = {
  background: "#1A2B4718", border: "1px solid #1A2B4740", borderRadius: 6,
  padding: "8px 16px", color: "#1A2B47", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
const btnDanger: React.CSSProperties = {
  background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 4, padding: "4px 10px", color: "#EF4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
};

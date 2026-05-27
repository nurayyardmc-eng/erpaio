"use client";
import { confirmDialog } from "@/components/Confirm";
import ErrorState from "@/components/ErrorState";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { formatDate } from "@/lib/format/time";
import { postJson, patchJson } from "@/lib/http/clientFetch";

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
  const { t } = useI18n();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "admin">("viewer");
  const [inviting, setInviting] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(false);
    fetch("/api/team")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setUsers(d.users ?? []);
        setInvitations(d.invitations ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  // Mount-only fetch of team members + invitations; refresh hydrates state asynchronously.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(refresh, []);
  useEffect(() => {
    if (!status) return;
    const tm = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(tm);
  }, [status]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await postJson("/api/team/invite", { email: inviteEmail, role: inviteRole });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "err", msg: data.error || t.common.error });
      } else {
        setStatus({ kind: "ok", msg: t.team.successInvited });
        setInviteEmail("");
        refresh();
      }
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (userId: string, role: string) => {
    await patchJson("/api/team", { userId, role });
    refresh();
  };

  const removeUser = async (userId: string) => {
    const _ok = await confirmDialog({ title: t.team.deleteUserConfirmTitle, message: t.team.deleteUserConfirmMessage, confirmLabel: t.team.deleteConfirmYes, destructive: true }); if (!_ok) return;
    await fetch(`/api/team?userId=${userId}`, { method: "DELETE" });
    refresh();
  };

  const cancelInvite = async (id: string) => {
    await fetch(`/api/team?invitationId=${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.team.breadcrumb}</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>{t.team.title}</h1>

      <div style={card}>
        <h2 style={sectionTitle}>{t.team.inviteSection}</h2>
        <form onSubmit={sendInvite} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={label}>{t.team.fieldEmail}</label>
            <input
              required type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={input}
            />
          </div>
          <div>
            <label style={label}>{t.team.fieldRole}</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "viewer" | "admin")} style={input}>
              <option value="viewer">{t.team.roleViewer}</option>
              <option value="admin">{t.team.roleAdmin}</option>
            </select>
          </div>
          <button type="submit" disabled={inviting} style={btnPrimary}>
            {inviting ? t.team.submitting : t.team.submit}
          </button>
        </form>
        {status && (
          <div style={{ marginTop: 8, fontSize: 11, color: status.kind === "ok" ? "#10B981" : "#EF4444" }}>{status.msg}</div>
        )}
      </div>

      {error && (
        <div style={{ maxWidth: 700, marginBottom: 16 }}>
          <ErrorState onRetry={refresh} />
        </div>
      )}

      {!error && invitations.length > 0 && (
        <div style={card}>
          <h2 style={sectionTitle}>{t.team.pendingTitle} ({invitations.length})</h2>
          {invitations.map((inv) => (
            <div key={inv.id} style={row}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#0F172A", fontSize: 12 }}>{inv.email}</div>
                <div style={{ color: "#475569", fontSize: 10 }}>
                  {inv.role} · {formatDate(inv.expiresAt)}{t.team.expiresOnSuffix}
                </div>
              </div>
              <button onClick={() => cancelInvite(inv.id)} style={btnDanger}>{t.team.cancelInvite}</button>
            </div>
          ))}
        </div>
      )}

      {!error && (
      <div style={card}>
        <h2 style={sectionTitle}>{t.team.usersTitle} ({users.length})</h2>
        {loading && <div className="skeleton" style={{ height: 16, borderRadius: 8, width: 200 }} />}
        {users.map((u) => (
          <div key={u.id} style={row}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#0F172A", fontSize: 12 }}>
                {u.email} {u.totpEnabled && <span style={{ color: "#10B981", fontSize: 10, marginLeft: 8, fontWeight: 600, letterSpacing: 0.5 }}>{t.team.mfaBadge}</span>}
              </div>
              <div style={{ color: "#475569", fontSize: 10 }}>
                {u.name ?? "—"} · {formatDate(u.createdAt)}
              </div>
            </div>
            <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} style={{ ...input, width: "auto", marginRight: 8 }}>
              <option value="viewer">{t.team.roleViewer}</option>
              <option value="admin">{t.team.roleAdmin}</option>
              <option value="owner">{t.team.roleOwner}</option>
            </select>
            {u.role !== "owner" && (
              <button onClick={() => removeUser(u.id)} style={btnDanger}>{t.team.delete}</button>
            )}
          </div>
        ))}
      </div>
      )}
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
const sectionTitle: React.CSSProperties = { fontSize: 13, color: "#0A0A0A", marginBottom: 14, fontWeight: 600 };
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
  background: "#0A0A0A18", border: "1px solid #0A0A0A40", borderRadius: 6,
  padding: "8px 16px", color: "#0A0A0A", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
const btnDanger: React.CSSProperties = {
  background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 4, padding: "4px 10px", color: "#EF4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
};

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Pin, PinOff } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface SavedQuery {
  id: string;
  question: string;
  sqlQuery: string;
  successCount: number;
  failCount: number;
  reliability: number;
  pinned?: boolean;
  lastUsedAt: string;
}

export default function SavedQueriesPage() {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    fetch("/api/saved-queries")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setQueries(d.queries ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    // Mount-only initial fetch; load() hydrates state asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  // Track EEEE — pin/unpin optimistic update + API call.
  const togglePin = async (q: SavedQuery, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextPinned = !q.pinned;
    // Optimistic: state'i hemen güncelle + listede yeniden sırala.
    setQueries((prev) => {
      const updated = prev.map((p) => (p.id === q.id ? { ...p, pinned: nextPinned } : p));
      // Pinned desc + lastUsedAt desc — server'ın orderBy'ı ile uyumlu.
      return updated.sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      });
    });
    try {
      const res = await fetch(`/api/saved-queries/${encodeURIComponent(q.id)}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      if (!res.ok) throw new Error("Pin failed");
    } catch {
      // Revert on failure
      setQueries((prev) =>
        prev.map((p) => (p.id === q.id ? { ...p, pinned: q.pinned } : p)),
      );
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · KAYITLI SORGULAR</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Sık Kullanılan Sorgular</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 600 }}>
        En az 2 kez başarıyla çalıştırılan sorgular. Tıklayarak chat&apos;te yeniden çalıştırabilirsiniz. Sık kullandığınızı pinleyebilirsiniz.
      </p>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState onRetry={load} />}

      {!loading && !error && queries.length === 0 && (
        <EmptyState
          icon={<Bookmark size={28} />}
          title="Henüz kayıtlı sorgu yok"
          description="Sohbette sorduğunuz başarılı sorgular otomatik olarak cache'e yazılır. Buradan tekrar erişebilirsiniz."
        />
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {queries.map((q) => (
          <div
            key={q.id}
            style={{
              background: "#FFFFFF",
              border: `1px solid ${q.pinned ? "#F59E0B" : "#E5E7EB"}`,
              borderRadius: 10,
              padding: 16,
              position: "relative",
            }}
          >
            <Link
              href={`/dashboard/chat?prefill=${encodeURIComponent(q.question)}`}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                {q.pinned && <Pin size={12} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />}
                <div style={{ color: "#0F172A", fontSize: 13, fontWeight: q.pinned ? 600 : 400, flex: 1 }}>{q.question}</div>
              </div>
              <pre style={{
                background: "#060A12", borderRadius: 6, padding: 8,
                color: "#8EC8E8", fontSize: 10, margin: "8px 0",
                whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden",
              }}>{q.sqlQuery}</pre>
              <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#94A3B8" }}>
                <span style={{ color: q.reliability > 0.9 ? "#10B981" : q.reliability > 0.7 ? "#F59E0B" : "#EF4444" }}>
                  Güvenilirlik: %{(q.reliability * 100).toFixed(0)}
                </span>
                <span>·</span>
                <span>{q.successCount} başarılı / {q.failCount} hata</span>
                <span>·</span>
                <span>Son: {new Date(q.lastUsedAt).toLocaleDateString("tr-TR")}</span>
              </div>
            </Link>
            <button
              onClick={(e) => togglePin(q, e)}
              title={q.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
              aria-label={q.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: 6,
                color: q.pinned ? "#F59E0B" : "#94A3B8",
                display: "flex",
                alignItems: "center",
              }}
            >
              {q.pinned ? <Pin size={16} fill="currentColor" /> : <PinOff size={16} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

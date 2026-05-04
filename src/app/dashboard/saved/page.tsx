"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface SavedQuery {
  id: string;
  question: string;
  sqlQuery: string;
  successCount: number;
  failCount: number;
  reliability: number;
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
    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · KAYITLI SORGULAR</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Sık Kullanılan Sorgular</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 600 }}>
        En az 2 kez başarıyla çalıştırılan sorgular. Tıklayarak chat&apos;te yeniden çalıştırabilirsiniz.
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
          <Link
            key={q.id}
            href={`/dashboard/chat?prefill=${encodeURIComponent(q.question)}`}
            style={{ textDecoration: "none" }}
          >
            <div style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              padding: 16,
              cursor: "pointer",
            }}>
              <div style={{ color: "#0F172A", fontSize: 13, marginBottom: 6 }}>{q.question}</div>
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
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    fetch("/api/saved-queries")
      .then((r) => r.json())
      .then((d) => {
        setQueries(d.queries ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", color: "#E8EDF5", fontFamily: "monospace", padding: 40 }}>
      <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · KAYITLI SORGULAR</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Sık Kullanılan Sorgular</h1>
      <p style={{ color: "#3A4558", fontSize: 11, marginBottom: 24, maxWidth: 600 }}>
        En az 2 kez başarıyla çalıştırılan sorgular. Tıklayarak chat&apos;te yeniden çalıştırabilirsiniz.
      </p>

      {loading && <div style={{ color: "#3A4558" }}>Yükleniyor...</div>}

      {!loading && queries.length === 0 && (
        <div style={{ color: "#3A4558", fontSize: 12 }}>Henüz kayıtlı sorgu yok. Chat&apos;te sorduğunuz sorular cache&apos;e yazılır.</div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {queries.map((q) => (
          <Link
            key={q.id}
            href={`/dashboard/chat?prefill=${encodeURIComponent(q.question)}`}
            style={{ textDecoration: "none" }}
          >
            <div style={{
              background: "#0C1018",
              border: "1px solid #131A26",
              borderRadius: 10,
              padding: 16,
              cursor: "pointer",
            }}>
              <div style={{ color: "#E8EDF5", fontSize: 13, marginBottom: 6 }}>{q.question}</div>
              <pre style={{
                background: "#060A12", borderRadius: 6, padding: 8,
                color: "#8EC8E8", fontSize: 10, margin: "8px 0",
                whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden",
              }}>{q.sqlQuery}</pre>
              <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#3A4558" }}>
                <span style={{ color: q.reliability > 0.9 ? "#69FF47" : q.reliability > 0.7 ? "#FFD740" : "#FF6B6B" }}>
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

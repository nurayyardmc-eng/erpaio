"use client";
import { useEffect, useState } from "react";

interface Connection { id: string; dbName: string; status: string; erpProfile: string | null; erpType: string }
interface InferredFk { fromTable: string; fromColumn: string; toTable: string; toColumn: string; occurrences: number }
interface CustomItem { type: "table" | "column"; table: string; column?: string; dataType?: string; reason: string }
interface InsightsResp { inferredForeignKeys: InferredFk[]; customItems: CustomItem[] }

export default function InsightsPage() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<InsightsResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/connections").then(r => r.json()).then((cs: Connection[]) => {
      const active = cs.filter(c => c.status === "active");
      setConns(active);
      if (active.length > 0) setSelected(active[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/erp-insights?connectionId=${selected}`)
      .then(r => r.json())
      .then((d: InsightsResp) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selected]);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#1A2B47", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · INSIGHTS</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>ERP Şema Analizi</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        Başarılı sorgulardan otomatik öğrenilen ilişkiler + profile dışı (müşteri özel) tablolar/kolonlar.
        Bu bilgileri annotation'larla profile'a kalıcı ekleyebilirsiniz.
      </p>

      {conns.length > 0 && (
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 10px", color: "#0F172A", fontSize: 11, fontFamily: "inherit", marginBottom: 24 }}
        >
          {conns.map(c => <option key={c.id} value={c.id}>{c.dbName}</option>)}
        </select>
      )}

      {loading && <div style={{ color: "#94A3B8" }}>Analiz ediliyor...</div>}

      {data && (
        <>
          <Section title={`Çıkarılmış İlişkiler (${data.inferredForeignKeys.length})`} desc="Başarılı sorgularınızdan tespit edilen JOIN pattern'leri. 3+ kez görünen ilişkiler güvenilir.">
            {data.inferredForeignKeys.length === 0 && (
              <div style={{ color: "#94A3B8", fontSize: 12 }}>Yeterli veri yok. 10+ farklı sorgu sorduktan sonra tekrar bakın.</div>
            )}
            {data.inferredForeignKeys.slice(0, 25).map((fk, i) => (
              <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, padding: 10, marginBottom: 6, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8EC8E8" }}>
                  {fk.fromTable}.{fk.fromColumn} = {fk.toTable}.{fk.toColumn}
                </span>
                <span style={{ color: "#9C8AFF" }}>{fk.occurrences}× kullanım</span>
              </div>
            ))}
          </Section>

          <Section title={`Profile Dışı Tablo / Kolon (${data.customItems.length})`} desc="Müşteri-özgü olabilir. Annotation'larla açıklama ekleyin → Claude doğru kullanır.">
            {data.customItems.length === 0 && (
              <div style={{ color: "#94A3B8", fontSize: 12 }}>Tüm tablolar/kolonlar profile ile eşleşiyor.</div>
            )}
            {data.customItems.slice(0, 50).map((c, i) => (
              <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, padding: 10, marginBottom: 6, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: c.type === "table" ? "#F59E0B" : "#F59E0B" }}>
                    {c.type === "table" ? "📋" : "🔹"} {c.table}{c.column ? `.${c.column}` : ""}
                    {c.dataType && <span style={{ color: "#94A3B8", marginLeft: 8 }}>({c.dataType})</span>}
                  </div>
                  <div style={{ color: "#475569", fontSize: 9, marginTop: 2 }}>{c.reason}</div>
                </div>
                <a
                  href={`/dashboard/annotations?prefill_table=${encodeURIComponent(c.table)}${c.column ? `&prefill_column=${encodeURIComponent(c.column)}` : ""}`}
                  style={{ background: "#1A2B4718", border: "1px solid #1A2B4740", borderRadius: 4, padding: "3px 10px", color: "#1A2B47", fontSize: 10, textDecoration: "none" }}
                >
                  Annotation ekle
                </a>
              </div>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32, maxWidth: 760 }}>
      <h2 style={{ fontSize: 14, color: "#1A2B47", marginBottom: 4 }}>{title}</h2>
      <p style={{ color: "#94A3B8", fontSize: 10, marginBottom: 12 }}>{desc}</p>
      {children}
    </section>
  );
}

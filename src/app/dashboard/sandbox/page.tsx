"use client";
// Sprint P8 — demo sandbox.
//
// Lets a user experience the core loop (natural-language question →
// generated read-only SQL → result) on a built-in sample retail dataset
// BEFORE connecting their own ERP. No real AI call / no DB — canned
// scenarios with a staged reveal, so activation isn't gated on having
// credentials ready. Dashboard-themed (TR-only, matches overview/admin).
//
// Distinct from the landing AiDemoPreview (which uses landing.css tokens
// not loaded here); this is the in-app, dashboard-styled equivalent with
// a prominent "connect your ERP" conversion CTA.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Database, Play, ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics/track";

interface Scenario {
  q: string;
  sql: string;
  answer: string;
  head: string[];
  rows: string[][];
}

const SCENARIOS: Scenario[] = [
  {
    q: "Bu ay en çok satan 5 ürün",
    sql: "SELECT p.name, SUM(oi.qty) AS adet, SUM(oi.qty * oi.price) AS ciro\nFROM order_items oi\nJOIN products p ON p.id = oi.product_id\nJOIN orders o  ON o.id = oi.order_id\nWHERE o.created_at >= date_trunc('month', now())\nGROUP BY p.name\nORDER BY ciro DESC\nLIMIT 5;",
    answer: "Bu ay en çok ciro getiren ürün Deri Ceket (₺340K). İlk 5 ürün toplam cironun %46'sını oluşturuyor.",
    head: ["Ürün", "Adet", "Ciro"],
    rows: [
      ["Deri Ceket", "1.240", "₺340K"],
      ["Kaşmir Kazak", "1.980", "₺295K"],
      ["Trençkot", "820", "₺248K"],
      ["İpek Gömlek", "1.450", "₺190K"],
      ["Yün Pantolon", "1.100", "₺155K"],
    ],
  },
  {
    q: "İstanbul deposunda stoğu azalan ürünler",
    sql: "SELECT sku, stock, reorder_point\nFROM inventory\nWHERE warehouse = 'IST'\n  AND stock < reorder_point\nORDER BY stock ASC\nLIMIT 5;",
    answer: "İstanbul deposunda 12 ürün yeniden sipariş noktasının altında. En acil: SKU-4821 (3 kaldı), SKU-1190 (5 kaldı).",
    head: ["SKU", "Stok", "Sipariş Noktası"],
    rows: [
      ["SKU-4821", "3", "25"],
      ["SKU-1190", "5", "20"],
      ["SKU-2277", "6", "15"],
      ["SKU-0934", "8", "30"],
      ["SKU-7715", "9", "18"],
    ],
  },
  {
    q: "Geçen aya göre ciro değişimi",
    sql: "SELECT date_trunc('month', o.created_at) AS ay, SUM(o.total) AS ciro\nFROM orders o\nWHERE o.created_at >= now() - interval '2 months'\nGROUP BY 1\nORDER BY 1;",
    answer: "Bu ayki ciro ₺3,84M — geçen aya göre %12 artış. Artışın ana kaynağı dış giyim kategorisi (+%21).",
    head: ["Ay", "Ciro", "Değişim"],
    rows: [
      ["Geçen ay", "₺3,43M", "—"],
      ["Bu ay", "₺3,84M", "+%12"],
    ],
  },
];

type Phase = "idle" | "running" | "sql" | "done";

export default function SandboxPage() {
  const [active, setActive] = useState<Scenario>(SCENARIOS[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function run(scenario: Scenario) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setActive(scenario);
    setPhase("running");
    // Funnel step 4 — activation signal (post-signup sample query).
    track("ai_demo_run", { source: "sandbox" });
    timers.current.push(setTimeout(() => setPhase("sql"), 700));
    timers.current.push(setTimeout(() => setPhase("done"), 1400));
  }

  const showSql = phase === "sql" || phase === "done";
  const showAnswer = phase === "done";

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>DEMO SANDBOX</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Bağlanmadan deneyin</h1>
      <p style={{ color: "#94A3B8", fontSize: 12, marginBottom: 8, maxWidth: 620, lineHeight: 1.6 }}>
        Örnek bir perakende veri seti üzerinde ERPAIO&apos;nun nasıl çalıştığını görün. Bir soru seçin;
        sistem salt-okunur SQL üretip sonucu açıklasın. Hazır olduğunuzda kendi ERP&apos;nizi bağlayın.
      </p>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#0369A1", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 100, padding: "4px 12px", marginBottom: 24 }}>
        <Database size={12} /> Örnek veri — gerçek ERP bağlantısı yok
      </div>

      {/* Sample question chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {SCENARIOS.map((s) => {
          const isActive = active.q === s.q;
          return (
            <button
              key={s.q}
              onClick={() => run(s)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                padding: "8px 14px",
                borderRadius: 100,
                border: `1px solid ${isActive ? "#0A0A0A" : "#E5E7EB"}`,
                background: isActive ? "#0A0A0A" : "#FFFFFF",
                color: isActive ? "#FAFAF8" : "#475569",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Play size={12} /> {s.q}
            </button>
          );
        })}
      </div>

      {/* Output */}
      {phase !== "idle" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: 20, maxWidth: 760 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
            Üretilen SQL
          </div>
          <pre style={{ margin: 0, padding: 16, background: "#0A0A0A", color: "#E6E6E6", borderRadius: 10, fontSize: 13, lineHeight: 1.55, fontFamily: "'JetBrains Mono', monospace", overflowX: "auto", opacity: showSql ? 1 : 0.4, transition: "opacity .3s ease" }}>
            <code>{showSql ? active.sql : "…"}</code>
          </pre>

          <div style={{ marginTop: 20, opacity: showAnswer ? 1 : 0.3, transition: "opacity .3s ease" }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
              Asistan Yanıtı
            </div>
            {showAnswer ? (
              <>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "#0F172A", margin: "0 0 16px" }}>{active.answer}</p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {active.head.map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #E5E7EB", color: "#94A3B8", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (
                          <td key={j} style={{ padding: "8px 10px", borderBottom: "1px solid #F1F5F9", color: j === 0 ? "#0F172A" : "#475569", fontFamily: j === 0 ? "inherit" : "'JetBrains Mono', monospace" }}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "#94A3B8", margin: 0 }}>Düşünüyor…</p>
            )}
          </div>
        </div>
      )}

      {/* Conversion CTA */}
      <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/dashboard/connections"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0A0A0A", color: "#FAFAF8", borderRadius: 100, padding: "10px 22px", fontSize: 14, fontWeight: 500, textDecoration: "none" }}
        >
          Kendi ERP&apos;nizi bağlayın <ArrowRight size={16} />
        </Link>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>Salt-okunur, AES-256-GCM şifreli, kurulum 2 dakika.</span>
      </div>
    </div>
  );
}

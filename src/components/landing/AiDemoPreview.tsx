"use client";
// Sprint G.3 — interactive AI demo preview.
//
// Proves the product's core loop (Türkçe/natural-language question →
// generated SQL → grounded agent answer) right on the landing page,
// WITHOUT calling the real Anthropic API (no cost, no auth, no data
// leakage). Responses are canned scenarios with a staged reveal that
// mimics the real "thinking → SQL → answer" cadence.
//
// Client component (local state + timers). Styling uses landing design
// tokens + inline styles — this repo does not compile Tailwind utility
// classes (no `@import "tailwindcss"` directive), so we match the rest
// of the landing instead of emitting dead utility class names.

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/landing/locale";
import { track } from "@/lib/analytics/track";

interface Scenario {
  q: string;
  sql: string;
  answer: string;
  rows: { cells: string[] }[];
}

interface DemoCopy {
  label: string;
  title: string;
  desc: string;
  inputPlaceholder: string;
  runLabel: string;
  runningLabel: string;
  tryLabel: string;
  sqlLabel: string;
  agentLabel: string;
  tableHead: string[];
  disclaimer: string;
  scenarios: Scenario[];
}

const COPY: Record<Locale, DemoCopy> = {
  en: {
    label: "Live Demo",
    title: "Ask in plain language. Get grounded answers.",
    desc: "Type a question the way you'd ask a colleague. ERPAIO generates read-only SQL and explains the result.",
    inputPlaceholder: "e.g. Which products are below reorder point in Istanbul?",
    runLabel: "Run",
    runningLabel: "Thinking…",
    tryLabel: "Try:",
    sqlLabel: "Generated SQL",
    agentLabel: "Agent Response",
    tableHead: ["SKU", "Stock", "Reorder"],
    disclaimer: "Simulated demo — no live ERP connection. Real answers cite your own data.",
    scenarios: [
      {
        q: "Which products are below reorder point in Istanbul?",
        sql: "SELECT sku, stock, reorder_point\nFROM inventory\nWHERE warehouse = 'IST'\n  AND stock < reorder_point\nORDER BY stock ASC;",
        answer: "12 products are below their reorder point in the Istanbul warehouse. The most urgent: SKU-4821 (3 left), SKU-1190 (5 left), SKU-2277 (6 left). Combined reorder volume ≈ 480 units.",
        rows: [
          { cells: ["SKU-4821", "3", "25"] },
          { cells: ["SKU-1190", "5", "20"] },
          { cells: ["SKU-2277", "6", "15"] },
        ],
      },
      {
        q: "Top 3 customers by revenue last month",
        sql: "SELECT c.name, SUM(o.total) AS revenue\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.created_at >= date_trunc('month', now()) - interval '1 month'\n  AND o.created_at <  date_trunc('month', now())\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 3;",
        answer: "Last month's top customers: Perakende Co. (₺1.24M), Tekstil A.Ş. (₺890K) and Mavi Lojistik (₺610K). Together they account for 38% of total revenue.",
        rows: [
          { cells: ["Perakende Co.", "₺1.24M", "—"] },
          { cells: ["Tekstil A.Ş.", "₺890K", "—"] },
          { cells: ["Mavi Lojistik", "₺610K", "—"] },
        ],
      },
    ],
  },
  tr: {
    label: "Canlı Demo",
    title: "Günlük dille sor. Dayanaklı cevap al.",
    desc: "Bir meslektaşına sorar gibi yaz. ERPAIO salt-okunur SQL üretir ve sonucu açıklar.",
    inputPlaceholder: "örn. İstanbul'da yeniden sipariş noktasının altındaki ürünler hangileri?",
    runLabel: "Çalıştır",
    runningLabel: "Düşünüyor…",
    tryLabel: "Dene:",
    sqlLabel: "Üretilen SQL",
    agentLabel: "Asistan Yanıtı",
    tableHead: ["SKU", "Stok", "Sipariş Noktası"],
    disclaimer: "Simüle demo — canlı ERP bağlantısı yok. Gerçek cevaplar kendi verinize atıf yapar.",
    scenarios: [
      {
        q: "İstanbul'da yeniden sipariş noktasının altındaki ürünler hangileri?",
        sql: "SELECT sku, stock, reorder_point\nFROM inventory\nWHERE warehouse = 'IST'\n  AND stock < reorder_point\nORDER BY stock ASC;",
        answer: "İstanbul deposunda 12 ürün yeniden sipariş noktasının altında. En acil olanlar: SKU-4821 (3 kaldı), SKU-1190 (5 kaldı), SKU-2277 (6 kaldı). Toplam sipariş hacmi ≈ 480 adet.",
        rows: [
          { cells: ["SKU-4821", "3", "25"] },
          { cells: ["SKU-1190", "5", "20"] },
          { cells: ["SKU-2277", "6", "15"] },
        ],
      },
      {
        q: "Geçen ay ciroya göre ilk 3 müşteri",
        sql: "SELECT c.name, SUM(o.total) AS revenue\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.created_at >= date_trunc('month', now()) - interval '1 month'\n  AND o.created_at <  date_trunc('month', now())\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 3;",
        answer: "Geçen ayın en yüksek cirolu müşterileri: Perakende Co. (₺1.24M), Tekstil A.Ş. (₺890K) ve Mavi Lojistik (₺610K). Bu üçü toplam cironun %38'ini oluşturuyor.",
        rows: [
          { cells: ["Perakende Co.", "₺1.24M", "—"] },
          { cells: ["Tekstil A.Ş.", "₺890K", "—"] },
          { cells: ["Mavi Lojistik", "₺610K", "—"] },
        ],
      },
    ],
  },
  ar: {
    label: "عرض حي",
    title: "اسأل بلغة بسيطة. احصل على إجابات موثّقة.",
    desc: "اكتب سؤالك كما تسأل زميلًا. يولّد ERPAIO استعلام SQL للقراءة فقط ويشرح النتيجة.",
    inputPlaceholder: "مثال: ما المنتجات تحت نقطة إعادة الطلب في إسطنبول؟",
    runLabel: "تشغيل",
    runningLabel: "يفكّر…",
    tryLabel: "جرّب:",
    sqlLabel: "SQL المُولّد",
    agentLabel: "رد المساعد",
    tableHead: ["SKU", "المخزون", "نقطة الطلب"],
    disclaimer: "عرض مُحاكى — لا يوجد اتصال ERP حي. الإجابات الحقيقية تستند إلى بياناتك.",
    scenarios: [
      {
        q: "ما المنتجات تحت نقطة إعادة الطلب في إسطنبول؟",
        sql: "SELECT sku, stock, reorder_point\nFROM inventory\nWHERE warehouse = 'IST'\n  AND stock < reorder_point\nORDER BY stock ASC;",
        answer: "يوجد 12 منتجًا تحت نقطة إعادة الطلب في مستودع إسطنبول. الأكثر إلحاحًا: SKU-4821 (تبقّى 3)، SKU-1190 (تبقّى 5)، SKU-2277 (تبقّى 6). إجمالي حجم الطلب ≈ 480 وحدة.",
        rows: [
          { cells: ["SKU-4821", "3", "25"] },
          { cells: ["SKU-1190", "5", "20"] },
          { cells: ["SKU-2277", "6", "15"] },
        ],
      },
      {
        q: "أعلى 3 عملاء حسب الإيراد الشهر الماضي",
        sql: "SELECT c.name, SUM(o.total) AS revenue\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.created_at >= date_trunc('month', now()) - interval '1 month'\n  AND o.created_at <  date_trunc('month', now())\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 3;",
        answer: "أعلى العملاء الشهر الماضي: Perakende Co. (₺1.24M)، Tekstil A.Ş. (₺890K)، Mavi Lojistik (₺610K). يشكّلون معًا 38% من إجمالي الإيراد.",
        rows: [
          { cells: ["Perakende Co.", "₺1.24M", "—"] },
          { cells: ["Tekstil A.Ş.", "₺890K", "—"] },
          { cells: ["Mavi Lojistik", "₺610K", "—"] },
        ],
      },
    ],
  },
};

type Phase = "idle" | "running" | "sql" | "done";

export function AiDemoPreview({ locale = "en" }: { locale?: Locale }) {
  const t = COPY[locale];
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [active, setActive] = useState<Scenario>(t.scenarios[0]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear pending timers on unmount so a staged reveal can't setState
  // after the component is gone.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function pickScenario(question: string): Scenario {
    const q = question.trim().toLowerCase();
    if (!q) return t.scenarios[0];
    // Naive intent match: revenue/customer keywords → scenario 2, else
    // the inventory scenario. Good enough to feel responsive for a demo.
    const revenueHit = /(revenue|customer|cunto|müşteri|ciro|إيراد|عملاء)/.test(q);
    return revenueHit ? t.scenarios[1] : t.scenarios[0];
  }

  function start(scenario: Scenario, source: "input" | "chip") {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setActive(scenario);
    setPhase("running");
    track("ai_demo_run", { source, locale });
    timers.current.push(setTimeout(() => setPhase("sql"), 850));
    timers.current.push(setTimeout(() => setPhase("done"), 1650));
  }

  function run() {
    start(pickScenario(input), "input");
  }

  function runWith(question: string) {
    setInput(question);
    start(pickScenario(question), "chip");
  }

  const showSql = phase === "sql" || phase === "done";
  const showAnswer = phase === "done";
  const running = phase === "running";

  return (
    <section id="ai-demo" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
        <div className="section-label">{t.label}</div>
        <div className="section-title">{t.title}</div>
        <div className="section-desc" style={{ margin: "20px auto 0" }}>
          {t.desc}
        </div>

        {/* Input row */}
        <div
          style={{
            marginTop: 44,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder={t.inputPlaceholder}
            aria-label={t.inputPlaceholder}
            style={{
              flex: "1 1 420px",
              minWidth: 0,
              padding: "14px 18px",
              fontSize: 14,
              fontFamily: "inherit",
              color: "var(--text)",
              background: "var(--bg-alt)",
              border: "1px solid var(--border)",
              borderRadius: 100,
              outline: "none",
            }}
          />
          <button
            onClick={run}
            disabled={running}
            className="btn-primary"
            style={{ minWidth: 130, opacity: running ? 0.6 : 1, cursor: running ? "wait" : "pointer" }}
          >
            {running ? t.runningLabel : t.runLabel}
          </button>
        </div>

        {/* Suggestion chips */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 1,
            }}
          >
            {t.tryLabel}
          </span>
          {t.scenarios.map((s) => (
            <button
              key={s.q}
              onClick={() => runWith(s.q)}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 100,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
                maxWidth: 320,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.q}
            </button>
          ))}
        </div>

        {/* Output panel */}
        {phase !== "idle" && (
          <div
            className="elevated"
            style={{
              marginTop: 36,
              textAlign: "start",
              background: "var(--bg-alt)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 20,
              direction: locale === "ar" ? "rtl" : "ltr",
            }}
          >
            {/* SQL block */}
            <div style={{ opacity: showSql ? 1 : 0.35, transition: "opacity .3s ease" }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                  fontFamily: "'JetBrains Mono',monospace",
                  marginBottom: 8,
                }}
              >
                {t.sqlLabel}
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  background: "var(--bg-dark)",
                  color: "#E6E6E6",
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.55,
                  fontFamily: "'JetBrains Mono',monospace",
                  overflowX: "auto",
                  direction: "ltr",
                  textAlign: "left",
                }}
              >
                <code>{showSql ? active.sql : "…"}</code>
              </pre>
            </div>

            {/* Agent response */}
            <div
              style={{
                marginTop: 20,
                opacity: showAnswer ? 1 : 0.3,
                transition: "opacity .3s ease",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                  fontFamily: "'JetBrains Mono',monospace",
                  marginBottom: 8,
                }}
              >
                {t.agentLabel}
              </div>
              {showAnswer ? (
                <>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text)", margin: "0 0 16px" }}>
                    {active.answer}
                  </p>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        {t.tableHead.map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: locale === "ar" ? "right" : "left",
                              padding: "8px 10px",
                              borderBottom: "1px solid var(--border)",
                              color: "var(--text-secondary)",
                              fontWeight: 600,
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: 11,
                              letterSpacing: 1,
                              textTransform: "uppercase",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {active.rows.map((r, i) => (
                        <tr key={i}>
                          {r.cells.map((c, j) => (
                            <td
                              key={j}
                              style={{
                                padding: "8px 10px",
                                borderBottom: "1px solid var(--border)",
                                color: j === 0 ? "var(--text)" : "var(--text-secondary)",
                                fontFamily: j === 0 ? "'JetBrains Mono',monospace" : "inherit",
                              }}
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
                  {t.runningLabel}
                </p>
              )}
            </div>
          </div>
        )}

        <p style={{ marginTop: 18, fontSize: 12, color: "var(--text-secondary)", opacity: 0.8 }}>
          {t.disclaimer}
        </p>
      </div>
    </section>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { downloadXlsx } from "@/lib/export/xlsx";
import { detectChartHint, type ChartHint } from "@/lib/charts/detect";
import MiniChart from "@/components/MiniChart";

interface Connection {
  id: string;
  dbName: string;
  status: string;
}

interface ChatSessionListItem {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
}

interface AssistantSuccessMsg {
  role: "assistant";
  status: "success";
  sql: string;
  results: Record<string, unknown>[];
  columns: string[];
  total: number;
  latencyMs: number;
  messageId?: string;
  cacheHit?: boolean;
  feedback: 1 | -1 | null;
  editing?: boolean;
  editedSql?: string;
  chartHint?: ChartHint;
  followUps?: string[];
  explanation?: string;
  explainLoading?: boolean;
  question?: string;
}

interface AssistantLoadingMsg { role: "assistant"; status: "loading" }
interface AssistantErrorMsg { role: "assistant"; status: "error"; content: string }
interface AssistantConfirmMsg {
  role: "assistant";
  status: "confirm";
  question: string;
  sql: string;
  confidence: number;
  explanation: string;
  ambiguity: string | null;
}
interface UserMsg { role: "user"; content: string }
type Msg = UserMsg | AssistantLoadingMsg | AssistantErrorMsg | AssistantSuccessMsg | AssistantConfirmMsg;

export default function ChatPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConn, setSelectedConn] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatSessionListItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data: Connection[]) => {
        const active = data.filter((c) => c.status === "active");
        setConnections(active);
        if (active.length > 0) setSelectedConn(active[0].id);
      });
    refreshHistory();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const prefill = params.get("prefill");
      if (prefill) {
        setInput(prefill);
        const url = new URL(window.location.href);
        url.searchParams.delete("prefill");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const refreshHistory = async () => {
    const r = await fetch("/api/chat/sessions");
    if (r.ok) setHistory(await r.json());
  };

  const newSession = () => {
    setMessages([]);
    setSessionId(null);
    setInput("");
  };

  const loadSession = async (id: string) => {
    const r = await fetch(`/api/chat/sessions/${id}`);
    if (!r.ok) return;
    const data = await r.json();
    setSessionId(id);
    const restored: Msg[] = [];
    for (const m of data.messages) {
      if (m.role === "user") {
        restored.push({ role: "user", content: m.content });
      } else if (m.role === "assistant" && m.success && m.sqlQuery) {
        restored.push({
          role: "assistant",
          status: "success",
          sql: m.sqlQuery,
          results: [],
          columns: [],
          total: m.rowCount ?? 0,
          latencyMs: m.latencyMs ?? 0,
          messageId: m.id,
          feedback: m.feedback as 1 | -1 | null,
        });
      }
    }
    setMessages(restored);
    setHistoryOpen(false);
  };

  const submitFeedback = async (idx: number, messageId: string, value: 1 | -1) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === idx && m.role === "assistant" && m.status === "success"
          ? { ...m, feedback: value }
          : m,
      ),
    );
    try {
      await fetch("/api/chat/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, feedback: value }),
      });
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === idx && m.role === "assistant" && m.status === "success"
            ? { ...m, feedback: null }
            : m,
        ),
      );
    }
  };

  const exportCsv = (msg: AssistantSuccessMsg) => {
    if (msg.results.length === 0) return;
    const csv = rowsToCsv(msg.results, msg.columns);
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadCsv(`erpaio-${ts}.csv`, csv);
  };

  const exportXlsx = (msg: AssistantSuccessMsg) => {
    if (msg.results.length === 0) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadXlsx(`erpaio-${ts}.xlsx`, msg.results, msg.columns);
  };

  const fetchExplain = async (idx: number, msg: AssistantSuccessMsg) => {
    if (!msg.question) return;
    setMessages((prev) =>
      prev.map((m, i) =>
        i === idx && m.role === "assistant" && m.status === "success"
          ? { ...m, explainLoading: true }
          : m,
      ),
    );
    try {
      const res = await fetch("/api/chat/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: msg.question,
          sql: msg.sql,
          topRows: msg.results.slice(0, 10),
          totalRows: msg.total,
        }),
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m, i) =>
          i === idx && m.role === "assistant" && m.status === "success"
            ? { ...m, explanation: data.explanation || "", explainLoading: false }
            : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === idx && m.role === "assistant" && m.status === "success"
            ? { ...m, explainLoading: false }
            : m,
        ),
      );
    }
  };

  const fetchFollowUps = async (sql: string, rowCount: number, question: string) => {
    try {
      const res = await fetch("/api/chat/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sql, rowCount }),
      });
      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setMessages((prev) => {
          const lastIdx = prev.findLastIndex((m) => m.role === "assistant" && m.status === "success");
          if (lastIdx === -1) return prev;
          return prev.map((m, i) =>
            i === lastIdx && m.role === "assistant" && m.status === "success"
              ? { ...m, followUps: data.suggestions }
              : m,
          );
        });
      }
    } catch {
      // ignore
    }
  };

  const startEdit = (idx: number) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === idx && m.role === "assistant" && m.status === "success"
          ? { ...m, editing: true, editedSql: m.sql }
          : m,
      ),
    );
  };

  const cancelEdit = (idx: number) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === idx && m.role === "assistant" && m.status === "success"
          ? { ...m, editing: false, editedSql: undefined }
          : m,
      ),
    );
  };

  const runEditedSql = async (idx: number) => {
    const target = messages[idx];
    if (target?.role !== "assistant" || target.status !== "success" || !target.editedSql) return;
    const sql = target.editedSql;

    setMessages((prev) =>
      prev.map((m, i) => (i === idx && m.role === "assistant" && m.status === "success"
        ? { ...m, editing: false, editedSql: undefined }
        : m)),
    );

    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", status: "loading" }]);

    try {
      const res = await fetch("/api/chat/run-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, connectionId: selectedConn, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.sessionId) setSessionId(data.sessionId);

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          status: "success",
          sql: data.sql,
          results: data.results,
          columns: data.columns,
          total: data.total,
          latencyMs: data.latencyMs,
          messageId: data.messageId,
          cacheHit: false,
          feedback: null,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", status: "error", content: err instanceof Error ? err.message : "SQL hatası." },
      ]);
    } finally {
      setLoading(false);
      refreshHistory();
    }
  };

  const runQuestion = async (question: string, forceRun = false) => {
    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", status: "loading" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, connectionId: selectedConn, sessionId, forceRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.sessionId) setSessionId(data.sessionId);

      if (data.needsConfirmation) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            status: "confirm",
            question,
            sql: data.sql,
            confidence: data.confidence,
            explanation: data.explanation,
            ambiguity: data.ambiguity,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          status: "success",
          sql: data.sql,
          results: data.results,
          columns: data.columns,
          total: data.total,
          latencyMs: data.latencyMs,
          messageId: data.messageId,
          cacheHit: data.cacheHit,
          feedback: null,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", status: "error", content: err instanceof Error ? err.message : "Hata." },
      ]);
    } finally {
      setLoading(false);
      refreshHistory();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !selectedConn) return;
    const question = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    await runQuestion(question);
  };

  const confirmAndRun = async (idx: number, question: string) => {
    setMessages((prev) => prev.filter((_, i) => i !== idx));
    await runQuestion(question, true);
  };

  const cancelConfirm = (idx: number) => {
    setMessages((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", fontFamily: "monospace", color: "#E8EDF5", display: "flex" }}>
      {/* Sidebar */}
      <aside style={{
        width: historyOpen ? 240 : 0,
        transition: "width 0.15s",
        overflow: "hidden",
        borderRight: historyOpen ? "1px solid #131A26" : "none",
        background: "#0A0D14",
      }}>
        <div style={{ padding: 12, borderBottom: "1px solid #131A26", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 9, color: "#3A4558", letterSpacing: 2 }}>GEÇMİŞ</div>
          <button onClick={newSession} title="Yeni sohbet" style={iconBtn}>+</button>
        </div>
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 50px)" }}>
          {history.length === 0 && <div style={{ color: "#3A4558", fontSize: 11, padding: 12 }}>Henüz sohbet yok.</div>}
          {history.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: s.id === sessionId ? "#131A26" : "transparent",
                border: "none",
                borderBottom: "1px solid #0F141C",
                color: "#E8EDF5",
                fontFamily: "monospace",
                fontSize: 11,
                cursor: "pointer",
                lineHeight: 1.4,
              }}
            >
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
              <div style={{ fontSize: 9, color: "#3A4558", marginTop: 2 }}>{s.messageCount} mesaj · {new Date(s.createdAt).toLocaleDateString("tr-TR")}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #131A26", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setHistoryOpen((v) => !v)} title="Geçmiş" style={iconBtn}>☰</button>
            <div>
              <div style={{ fontSize: 9, color: "#00E5FF", letterSpacing: 3 }}>ERPAIO · CHAT</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Veritabanına Sor</div>
            </div>
          </div>
          {connections.length > 0 && (
            <select
              value={selectedConn}
              onChange={(e) => setSelectedConn(e.target.value)}
              style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 6, padding: "6px 10px", color: "#E8EDF5", fontSize: 11, fontFamily: "monospace" }}
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.dbName}</option>
              ))}
            </select>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 60 }}>
              <div style={{ fontSize: 11, color: "#3A4558", marginBottom: 16 }}>Örnek sorular:</div>
              {["Toplam kaç ürün var?", "En son 10 siparişi göster", "Bu ay kaç satış yapıldı?"].map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  style={{ display: "block", margin: "8px auto", background: "#0C1018", border: "1px solid #131A26", borderRadius: 6, padding: "8px 16px", color: "#00E5FF", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "user" ? (
                <div style={{ background: "#00E5FF18", border: "1px solid #00E5FF30", borderRadius: 8, padding: "10px 14px", maxWidth: "70%", fontSize: 13 }}>
                  {msg.content}
                </div>
              ) : (
                <div style={{ maxWidth: "85%", width: "100%" }}>
                  {msg.status === "loading" && <div style={{ color: "#3A4558", fontSize: 12 }}>SQL üretiliyor...</div>}
                  {msg.status === "error" && (
                    <div style={{ background: "#FF6B6B18", border: "1px solid #FF6B6B30", borderRadius: 8, padding: "10px 14px", color: "#FF6B6B", fontSize: 12 }}>
                      ❌ {msg.content}
                    </div>
                  )}
                  {msg.status === "confirm" && (
                    <div style={{ background: "#FF950018", border: "1px solid #FF950040", borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 9, color: "#FF9500", letterSpacing: 2, marginBottom: 8 }}>
                        ⚠ ONAY GEREKİYOR · CONFIDENCE %{Math.round(msg.confidence * 100)}
                      </div>
                      {msg.ambiguity && (
                        <div style={{ color: "#FFD740", fontSize: 12, marginBottom: 10 }}>
                          {msg.ambiguity}
                        </div>
                      )}
                      {msg.explanation && (
                        <div style={{ color: "#9AA5B4", fontSize: 11, marginBottom: 10, fontStyle: "italic" }}>
                          {msg.explanation}
                        </div>
                      )}
                      <pre style={{ margin: 0, fontSize: 11, color: "#8EC8E8", whiteSpace: "pre-wrap", background: "#060A12", padding: 10, borderRadius: 6 }}>{msg.sql}</pre>
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => confirmAndRun(i, msg.question)}
                          style={{ background: "#69FF4720", border: "1px solid #69FF47", borderRadius: 4, padding: "6px 14px", color: "#69FF47", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}
                        >
                          Çalıştır
                        </button>
                        <button
                          onClick={() => cancelConfirm(i)}
                          style={{ background: "transparent", border: "1px solid #131A26", borderRadius: 4, padding: "6px 14px", color: "#9AA5B4", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  )}
                  {msg.status === "success" && (
                    <div>
                      <div style={{ background: "#060A12", border: "1px solid #131A26", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: 9, color: "#3A4558", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                          <span>SQL · {msg.latencyMs}ms · {msg.total} satır</span>
                          {msg.cacheHit && (
                            <span style={{ color: "#9C8AFF", border: "1px solid #9C8AFF40", borderRadius: 4, padding: "1px 6px", fontSize: 8, letterSpacing: 1 }}>
                              ⚡ CACHED
                            </span>
                          )}
                          <span style={{ flex: 1 }} />
                          {!msg.editing && (
                            <button onClick={() => startEdit(i)} title="Düzenle" style={iconBtnSmall}>✎</button>
                          )}
                          {msg.results.length > 0 && (
                            <>
                              <button onClick={() => exportCsv(msg)} title="CSV indir" style={iconBtnSmall}>📥 CSV</button>
                              <button onClick={() => exportXlsx(msg)} title="Excel indir" style={iconBtnSmall}>📊 XLSX</button>
                              {!msg.explanation && msg.question && (
                                <button
                                  onClick={() => fetchExplain(i, msg)}
                                  disabled={msg.explainLoading}
                                  title="AI yorumu"
                                  style={iconBtnSmall}
                                >
                                  {msg.explainLoading ? "..." : "🤖 Açıkla"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {msg.editing ? (
                          <div>
                            <textarea
                              value={msg.editedSql ?? ""}
                              onChange={(e) =>
                                setMessages((prev) =>
                                  prev.map((m, j) =>
                                    j === i && m.role === "assistant" && m.status === "success"
                                      ? { ...m, editedSql: e.target.value }
                                      : m,
                                  ),
                                )
                              }
                              rows={Math.min(20, (msg.editedSql?.split("\n").length ?? 1) + 1)}
                              style={{ width: "100%", background: "#07090F", border: "1px solid #00E5FF40", borderRadius: 6, padding: 10, color: "#8EC8E8", fontSize: 11, fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" }}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <button onClick={() => runEditedSql(i)} disabled={loading} style={{ background: "#69FF4720", border: "1px solid #69FF47", borderRadius: 4, padding: "4px 10px", color: "#69FF47", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
                                Çalıştır
                              </button>
                              <button onClick={() => cancelEdit(i)} style={{ background: "transparent", border: "1px solid #131A26", borderRadius: 4, padding: "4px 10px", color: "#3A4558", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
                                İptal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <pre style={{ margin: 0, fontSize: 11, color: "#8EC8E8", whiteSpace: "pre-wrap" }}>{msg.sql}</pre>
                        )}
                      </div>
                      {msg.results?.length > 0 && (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                              <tr>
                                {msg.columns.map((col) => (
                                  <th key={col} style={{ padding: "6px 10px", textAlign: "left", color: "#00E5FF", borderBottom: "1px solid #131A26", whiteSpace: "nowrap" }}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.results.slice(0, 50).map((row, ri) => (
                                <tr key={ri} style={{ borderBottom: "1px solid #0C1018" }}>
                                  {msg.columns.map((col) => (
                                    <td key={col} style={{ padding: "6px 10px", color: "#9AA5B4" }}>{String(row[col] ?? "")}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {msg.explanation && (
                        <div style={{ background: "#9C8AFF15", border: "1px solid #9C8AFF40", borderRadius: 8, padding: 12, marginTop: 8 }}>
                          <div style={{ fontSize: 9, color: "#9C8AFF", letterSpacing: 2, marginBottom: 6 }}>🤖 AI YORUMU</div>
                          <div style={{ fontSize: 12, color: "#E8EDF5", lineHeight: 1.6 }}>{msg.explanation}</div>
                        </div>
                      )}

                      {msg.chartHint && msg.chartHint.type !== "none" && (
                        <MiniChart hint={msg.chartHint} rows={msg.results} />
                      )}

                      {msg.followUps && msg.followUps.length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 9, color: "#3A4558", marginRight: 4, alignSelf: "center" }}>İLGİLİ:</span>
                          {msg.followUps.map((fu, fi) => (
                            <button
                              key={fi}
                              onClick={() => setInput(fu)}
                              style={{
                                background: "#0C1018",
                                border: "1px solid #131A26",
                                borderRadius: 12,
                                padding: "3px 10px",
                                color: "#9C8AFF",
                                fontSize: 10,
                                cursor: "pointer",
                                fontFamily: "monospace",
                              }}
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.messageId && (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", fontSize: 10 }}>
                          <span style={{ color: "#3A4558", marginRight: 4 }}>Faydalı mı?</span>
                          <button
                            onClick={() => submitFeedback(i, msg.messageId!, 1)}
                            disabled={msg.feedback !== null}
                            aria-label="thumbs-up"
                            style={{
                              background: msg.feedback === 1 ? "#69FF4720" : "transparent",
                              border: `1px solid ${msg.feedback === 1 ? "#69FF47" : "#131A26"}`,
                              borderRadius: 4,
                              padding: "2px 8px",
                              color: msg.feedback === 1 ? "#69FF47" : "#3A4558",
                              cursor: msg.feedback !== null ? "default" : "pointer",
                              opacity: msg.feedback === -1 ? 0.3 : 1,
                              fontFamily: "monospace",
                              fontSize: 10,
                            }}
                          >
                            👍
                          </button>
                          <button
                            onClick={() => submitFeedback(i, msg.messageId!, -1)}
                            disabled={msg.feedback !== null}
                            aria-label="thumbs-down"
                            style={{
                              background: msg.feedback === -1 ? "#FF6B6B20" : "transparent",
                              border: `1px solid ${msg.feedback === -1 ? "#FF6B6B" : "#131A26"}`,
                              borderRadius: 4,
                              padding: "2px 8px",
                              color: msg.feedback === -1 ? "#FF6B6B" : "#3A4558",
                              cursor: msg.feedback !== null ? "default" : "pointer",
                              opacity: msg.feedback === 1 ? 0.3 : 1,
                              fontFamily: "monospace",
                              fontSize: 10,
                            }}
                          >
                            👎
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: 16, borderTop: "1px solid #131A26", display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={selectedConn ? "Nebim veritabanınıza Türkçe sorular sorabilirsiniz..." : "Önce bir ERP bağlantısı ekleyin..."}
            disabled={loading || !selectedConn}
            style={{ flex: 1, background: "#0C1018", border: "1px solid #131A26", borderRadius: 8, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, fontFamily: "monospace", outline: "none" }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !selectedConn}
            style={{ background: "#00E5FF18", border: "1px solid #00E5FF40", borderRadius: 8, padding: "10px 20px", color: "#00E5FF", fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}
          >
            {loading ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #131A26",
  borderRadius: 4,
  width: 28,
  height: 28,
  color: "#9AA5B4",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "monospace",
};

const iconBtnSmall: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #131A26",
  borderRadius: 3,
  padding: "1px 6px",
  color: "#3A4558",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "monospace",
};

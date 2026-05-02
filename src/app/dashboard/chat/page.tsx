"use client";
import { useState, useEffect, useRef } from "react";

export default function ChatPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConn, setSelectedConn] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data) => {
        const active = data.filter((c: any) => c.status === "active");
        setConnections(active);
        if (active.length > 0) setSelectedConn(active[0].id);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submitFeedback = async (idx: number, messageId: string, value: 1 | -1) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, feedback: value } : m)),
    );
    try {
      await fetch("/api/chat/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, feedback: value }),
      });
    } catch {
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, feedback: null } : m)),
      );
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !selectedConn) return;
    const question = input;
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setMessages((prev) => [...prev, { role: "assistant", status: "loading" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, connectionId: selectedConn, sessionId }),
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
          cacheHit: data.cacheHit,
          feedback: null as 1 | -1 | null,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", status: "error", content: err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", fontFamily: "monospace", color: "#E8EDF5", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #131A26", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, color: "#00E5FF", letterSpacing: 3 }}>ERPAIO · CHAT</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Veritabanına Sor</div>
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
              <button key={q} onClick={() => { setInput(q); }}
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
                {msg.status === "loading" && (
                  <div style={{ color: "#3A4558", fontSize: 12 }}>SQL üretiliyor...</div>
                )}
                {msg.status === "error" && (
                  <div style={{ background: "#FF6B6B18", border: "1px solid #FF6B6B30", borderRadius: 8, padding: "10px 14px", color: "#FF6B6B", fontSize: 12 }}>
                    ❌ {msg.content}
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
                      </div>
                      <pre style={{ margin: 0, fontSize: 11, color: "#8EC8E8", whiteSpace: "pre-wrap" }}>{msg.sql}</pre>
                    </div>
                    {msg.results?.length > 0 && (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead>
                            <tr>
                              {msg.columns.map((col: string) => (
                                <th key={col} style={{ padding: "6px 10px", textAlign: "left", color: "#00E5FF", borderBottom: "1px solid #131A26", whiteSpace: "nowrap" }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.results.slice(0, 50).map((row: any, ri: number) => (
                              <tr key={ri} style={{ borderBottom: "1px solid #0C1018" }}>
                                {msg.columns.map((col: string) => (
                                  <td key={col} style={{ padding: "6px 10px", color: "#9AA5B4" }}>{String(row[col] ?? "")}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {msg.messageId && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", fontSize: 10 }}>
                        <span style={{ color: "#3A4558", marginRight: 4 }}>Faydalı mı?</span>
                        <button
                          onClick={() => submitFeedback(i, msg.messageId, 1)}
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
                          onClick={() => submitFeedback(i, msg.messageId, -1)}
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
  );
}
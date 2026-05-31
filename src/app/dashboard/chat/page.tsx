"use client";
import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Zap,
  Pencil,
  Copy,
  Download,
  FileSpreadsheet,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  PanelLeftOpen,
  PanelLeftClose,
  MoreHorizontal,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format/time";
import { downloadXlsx } from "@/lib/export/xlsx";
import { type ChartHint } from "@/lib/charts/detect";
import MiniChart from "@/components/MiniChart";
import { confirmDialog } from "@/components/Confirm";
import { showToast } from "@/components/Toaster";
import { useI18n } from "@/lib/i18n/context";
import { postJson, patchJson } from "@/lib/http/clientFetch";
import { sliceHighlight } from "@/lib/chat/highlight";
import { erpSuggestedQuestions } from "@/lib/chat/erpSuggestedQuestions";
import type { ErpType } from "@/lib/db/erpTypes";

interface Connection {
  id: string;
  dbName: string;
  status: string;
  /** Feature 1.2: ERP-spesifik suggested question chips için. */
  erpType?: string;
}

interface ChatSessionListItem {
  id: string;
  title: string;
  messageCount: number;
  pinned: boolean;
  archivedAt: string | null;
  createdAt: string;
}

interface ChatSearchHit {
  id: string;
  title: string | null;
  createdAt: string;
  archivedAt: string | null;
  messageCount: number;
  matchType: "title" | "body";
  snippet: string | null;
  matchStart: number;
  matchLength: number;
}

/**
 * Snippet'te eşleşen kısımı bold + amber background ile vurgular.
 * Pure slicing → @/lib/chat/highlight (Track WWWWW).
 */
function renderHighlightedSnippet(text: string, matchStart: number, matchLength: number): React.ReactNode {
  const { before, match, after } = sliceHighlight(text, matchStart, matchLength);
  if (!match) return text;
  return (
    <>
      {before}
      <mark style={{ background: "#FEF3C7", color: "#0A0A0A", padding: "0 2px", borderRadius: 2 }}>{match}</mark>
      {after}
    </>
  );
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
  const { t } = useI18n();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConn, setSelectedConn] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatSessionListItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyView, setHistoryView] = useState<"active" | "archived">("active");
  // Chat history search (UUU). Boş query → normal liste; >=2 char → search mode.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<ChatSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const n = d?.user?.name?.trim() || d?.user?.email?.split("@")[0] || "";
        setUserName(n);
      })
      .catch(() => {});
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data: Connection[]) => {
        const active = data.filter((c) => c.status === "active");
        setConnections(active);
        if (active.length > 0) setSelectedConn(active[0].id);
      });

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

  // Debounced search effect — query >=2 char → /api/chat/sessions/search.
  // Boş veya tek char → search hits temizle (normal liste görünür).
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchHits([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const handle = setTimeout(() => {
      const qs = new URLSearchParams({ q: trimmed, limit: "20" });
      fetch(`/api/chat/sessions/search?${qs.toString()}`)
        .then(async (r) => (r.ok ? r.json() : { results: [] }))
        .then((d: { results: ChatSearchHit[] }) => {
          setSearchHits(d.results ?? []);
          setSearchLoading(false);
        })
        .catch(() => {
          setSearchHits([]);
          setSearchLoading(false);
        });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const refreshHistory = async (view: "active" | "archived" = historyView) => {
    const r = await fetch(`/api/chat/sessions?view=${view}`);
    if (r.ok) setHistory(await r.json());
  };

  useEffect(() => {
    refreshHistory(historyView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyView]);

  const togglePin = async (id: string, pinned: boolean) => {
    setOpenMenu(null);
    const r = await patchJson(`/api/chat/sessions/${id}`, { pinned: !pinned });
    if (r.ok) {
      showToast(pinned ? t.chat.pinToastOff : t.chat.pinToastOn);
      refreshHistory();
    } else {
      showToast(t.chat.actionFailed, "error");
    }
  };

  const toggleArchive = async (id: string, isArchived: boolean) => {
    setOpenMenu(null);
    const r = await patchJson(`/api/chat/sessions/${id}`, { archived: !isArchived });
    if (r.ok) {
      showToast(isArchived ? t.chat.archiveToastOff : t.chat.archiveToastOn);
      if (sessionId === id) {
        setSessionId(null);
        setMessages([]);
      }
      refreshHistory();
    } else {
      showToast(t.chat.actionFailed, "error");
    }
  };

  const deleteSession = async (id: string, title: string) => {
    setOpenMenu(null);
    const ok = await confirmDialog({
      title: t.chat.deleteConfirmTitle,
      message: `${t.chat.deleteConfirmMessagePrefix}${title}${t.chat.deleteConfirmMessageSuffix}`,
      confirmLabel: t.chat.deleteConfirmYes,
      cancelLabel: t.chat.deleteConfirmCancel,
      destructive: true,
    });
    if (!ok) return;

    const r = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    if (r.ok) {
      showToast(t.chat.deletedToast);
      if (sessionId === id) {
        setSessionId(null);
        setMessages([]);
      }
      refreshHistory();
    } else {
      showToast(t.chat.deleteFailedToast, "error");
    }
  };

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handler = () => setOpenMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenu]);

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
      await patchJson("/api/chat/feedback", { messageId, feedback: value });
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

  const exportXlsx = async (msg: AssistantSuccessMsg) => {
    if (msg.results.length === 0) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    // xlsx lazy-loaded — first click takes ~200ms for chunk fetch, then cached.
    await downloadXlsx(`erpaio-${ts}.xlsx`, msg.results, msg.columns);
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
      const res = await postJson("/api/chat/explain", {
        question: msg.question,
        sql: msg.sql,
        topRows: msg.results.slice(0, 10),
        totalRows: msg.total,
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
      const res = await postJson("/api/chat/run-sql", { sql, connectionId: selectedConn, sessionId });
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
        { role: "assistant", status: "error", content: err instanceof Error ? err.message : t.chat.genericSqlError },
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
      const res = await postJson("/api/chat", {
        question,
        connectionId: selectedConn,
        sessionId: sessionId ?? undefined,
        forceRun,
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
        { role: "assistant", status: "error", content: err instanceof Error ? err.message : t.chat.genericRunError },
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
    <div style={{ height: "calc(100vh - 56px)", background: "#FAFAF8", fontFamily: "inherit", color: "#0A0A0A", display: "flex" }}>
      {/* Sidebar — sohbet geçmişi. Mobile: kayan overlay (fixed + z-index)
          so the 260px panel doesn't squeeze the chat area on small screens. */}
      {historyOpen && (
        <div
          className="chat-history-backdrop"
          onClick={() => setHistoryOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={historyOpen ? "chat-history-aside open" : "chat-history-aside"}
        style={{
          width: historyOpen ? 260 : 0,
          transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          borderRight: historyOpen ? "1px solid rgba(10,10,10,0.08)" : "none",
          background: "#FFFFFF",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(10,10,10,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#737373", letterSpacing: 2, fontWeight: 600, textTransform: "uppercase" }}>{t.chat.historyTitle}</div>
          <button
            onClick={newSession}
            title={t.chat.newChatTitle}
            aria-label={t.chat.newChatAria}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#0A0A0A",
              color: "#FAFAF8",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >+</button>
        </div>

        {/* Sohbet arama (UUU) — query >=2 char olduğunda search mode'a geç. */}
        <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(10,10,10,0.06)" }}>
          <div style={{ position: "relative" }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.chat.searchPlaceholder}
              aria-label={t.chat.searchAria}
              style={{
                width: "100%",
                padding: "6px 28px 6px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid rgba(10,10,10,0.12)",
                background: "#FFFFFF",
                color: "#0A0A0A",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label={t.chat.searchClear}
                style={{
                  position: "absolute",
                  right: 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "2px 6px",
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Aktif / Arşiv toggle (search mode'da gizli) */}
        {!searchQuery.trim() && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(10,10,10,0.06)", display: "flex", gap: 4 }}>
          {(["active", "archived"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setHistoryView(v)}
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: "none",
                background: historyView === v ? "rgba(10,10,10,0.06)" : "transparent",
                color: historyView === v ? "#0A0A0A" : "#737373",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {v === "active" ? t.chat.tabActive : t.chat.tabArchived}
            </button>
          ))}
        </div>
        )}

        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 156px)", padding: "8px" }}>
          {/* Search results mode (UUU). Query >=2 char olduğunda hits dolar. */}
          {searchQuery.trim().length >= 2 && (
            <>
              {searchLoading && (
                <div style={{ color: "#737373", fontSize: 13, padding: "20px 12px", textAlign: "center" }}>
                  {t.chat.searchSearching}
                </div>
              )}
              {!searchLoading && searchHits.length === 0 && (
                <div style={{ color: "#737373", fontSize: 13, padding: "20px 12px", textAlign: "center" }}>
                  {t.chat.searchEmpty}
                </div>
              )}
              {!searchLoading && searchHits.map((h) => {
                const isCurrent = h.id === sessionId;
                return (
                  <button
                    key={h.id}
                    onClick={() => { loadSession(h.id); setSearchQuery(""); }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      background: isCurrent ? "rgba(10,10,10,0.06)" : "transparent",
                      border: "none",
                      borderRadius: 8,
                      marginBottom: 2,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      color: "#0A0A0A",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500 }}>
                      {h.title ?? t.chat.untitledSession}
                      {h.matchType === "title" && (
                        <span style={{ fontSize: 9, color: "#0A0A0A", background: "#FEF3C7", padding: "1px 5px", borderRadius: 3, letterSpacing: 0.5 }}>
                          {t.chat.searchMatchTitle}
                        </span>
                      )}
                    </div>
                    {h.snippet && (
                      <div style={{ fontSize: 11, color: "#525252", marginTop: 4, lineHeight: 1.4 }}>
                        {renderHighlightedSnippet(h.snippet, h.matchStart, h.matchLength)}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>
                      {h.messageCount} {t.chat.messagesSuffix} · {formatDate(h.createdAt)}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Normal history list — search mode değilse */}
          {searchQuery.trim().length < 2 && history.length === 0 && (
            <div style={{ color: "#737373", fontSize: 13, padding: "20px 12px", textAlign: "center" }}>
              {historyView === "active" ? t.chat.emptyActive : t.chat.emptyArchived}
            </div>
          )}
          {searchQuery.trim().length < 2 && history.map((s) => {
            const isArchived = !!s.archivedAt;
            const isActive = s.id === sessionId;
            return (
              <div
                key={s.id}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "stretch",
                  background: isActive ? "rgba(10,10,10,0.06)" : "transparent",
                  borderRadius: 8,
                  marginBottom: 2,
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(10,10,10,0.03)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <button
                  onClick={() => loadSession(s.id)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    padding: "10px 4px 10px 12px",
                    background: "transparent",
                    border: "none",
                    color: "#0A0A0A",
                    fontFamily: "inherit",
                    fontSize: 13,
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                    {s.pinned && <Pin size={11} color="#737373" style={{ flexShrink: 0 }} />}
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isActive ? 500 : 400 }}>
                      {s.title}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>
                    {s.messageCount} {t.chat.messagesSuffix} · {formatDate(s.createdAt)}
                  </div>
                </button>

                {/* Kebab menu trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(openMenu === s.id ? null : s.id);
                  }}
                  className="session-menu-trigger"
                  aria-label={t.chat.sessionMenuAria}
                  style={{
                    width: 28,
                    minWidth: 28,
                    background: "transparent",
                    border: "none",
                    color: "#737373",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    marginRight: 4,
                    opacity: openMenu === s.id ? 1 : undefined,
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {openMenu === s.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 4,
                      marginTop: 4,
                      background: "#FFFFFF",
                      border: "1px solid rgba(10,10,10,0.08)",
                      borderRadius: 10,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      zIndex: 50,
                      minWidth: 180,
                      overflow: "hidden",
                      padding: 4,
                    }}
                  >
                    {!isArchived && (
                      <button
                        onClick={() => togglePin(s.id, s.pinned)}
                        style={menuItemStyle}
                      >
                        {s.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                        {s.pinned ? t.chat.unpin : t.chat.pin}
                      </button>
                    )}
                    <button
                      onClick={() => toggleArchive(s.id, isArchived)}
                      style={menuItemStyle}
                    >
                      {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                      {isArchived ? t.chat.unarchive : t.chat.archive}
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenu(null);
                        // Browser auth cookie included; Content-Disposition triggers download.
                        window.location.assign(`/api/chat/sessions/${encodeURIComponent(s.id)}/export`);
                      }}
                      style={menuItemStyle}
                      title={t.chat.exportMdTitle}
                    >
                      <Download size={14} />
                      {t.chat.exportMd}
                    </button>
                    <div style={{ height: 1, background: "rgba(10,10,10,0.06)", margin: "4px 0" }} />
                    <button
                      onClick={() => deleteSession(s.id, s.title)}
                      style={{ ...menuItemStyle, color: "#EF4444" }}
                    >
                      <Trash2 size={14} />
                      {t.chat.delete}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(10,10,10,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFFFFF",
          minHeight: 56,
        }}>
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            title={historyOpen ? t.chat.historyClose : t.chat.historyOpen}
            aria-label={historyOpen ? t.chat.historyClose : t.chat.historyOpen}
            className="hide-mobile"
            style={{
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 8,
              color: "#525252",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(10,10,10,0.05)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            {historyOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          {connections.length > 0 && (
            <select
              value={selectedConn}
              onChange={(e) => setSelectedConn(e.target.value)}
              style={{
                background: "#FAFAF8",
                border: "1px solid rgba(10,10,10,0.08)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#0A0A0A",
                fontSize: 13,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
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
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60%",
              textAlign: "center",
              padding: "0 24px",
            }}>
              <div style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontSize: "clamp(28px, 5vw, 44px)",
                fontWeight: 400,
                letterSpacing: -1,
                color: "#0A0A0A",
                marginBottom: 16,
                lineHeight: 1.2,
              }}>
                {userName ? <>{t.chat.greetingPrefix}<em style={{ fontStyle: "italic" }}>{userName}</em>{t.chat.greetingSuffix}</> : t.chat.greetingFallback}
              </div>
              <p style={{ color: "#525252", fontSize: 15, margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
                {selectedConn
                  ? t.chat.introWithConn
                  : t.chat.introWithoutConn}
              </p>
              {!selectedConn && connections.length === 0 && (
                <a
                  href="/dashboard/connections"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 24,
                    background: "#0A0A0A",
                    color: "#FAFAF8",
                    padding: "14px 28px",
                    borderRadius: 100,
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  {t.chat.addErpConnectionCta}
                </a>
              )}
              {/* Track HH — onboarding suggested questions. Connection var ama
                  ilk soru sorulmamış: kullanıcı boş ekrana bakıp ne yazacağını
                  bilmiyor. Suggested prompt chips bir tık deneme akışı.
                  Feature 1.2 — chip listesi seçili ERP'ye göre değişir
                  (Nebim/D365/SAP/Postgres farklı sektör soruları). */}
              {selectedConn && (
                <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 640 }}>
                  <span style={{ fontSize: 11, color: "#94A3B8", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, width: "100%", marginBottom: 4 }}>
                    {t.chat.suggestedLabel}
                  </span>
                  {erpSuggestedQuestions(
                    connections.find((c) => c.id === selectedConn)?.erpType as ErpType | undefined,
                  ).map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 100,
                        padding: "8px 16px",
                        color: "#0A0A0A",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "user" ? (
                <div style={{ background: "#0A0A0A18", border: "1px solid #0A0A0A30", borderRadius: 8, padding: "10px 14px", maxWidth: "70%", fontSize: 13 }}>
                  {msg.content}
                </div>
              ) : (
                <div style={{ maxWidth: "85%", width: "100%" }}>
                  {msg.status === "loading" && <div style={{ color: "#94A3B8", fontSize: 12 }}>{t.chat.sqlGenerating}</div>}
                  {msg.status === "error" && (
                    <div style={{ background: "#FEE2E2", border: "1px solid #EF444430", borderRadius: 8, padding: "10px 14px", color: "#EF4444", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={16} /> {msg.content}
                    </div>
                  )}
                  {msg.status === "confirm" && (
                    <div style={{ background: "#F59E0B18", border: "1px solid #F59E0B40", borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#F59E0B", letterSpacing: 1, marginBottom: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={14} /> {t.chat.confirmNeeded}{Math.round(msg.confidence * 100)}
                      </div>
                      {msg.ambiguity && (
                        <div style={{ color: "#F59E0B", fontSize: 12, marginBottom: 10 }}>
                          {msg.ambiguity}
                        </div>
                      )}
                      {msg.explanation && (
                        <div style={{ color: "#475569", fontSize: 11, marginBottom: 10, fontStyle: "italic" }}>
                          {msg.explanation}
                        </div>
                      )}
                      <pre style={{ margin: 0, fontSize: 11, color: "#8EC8E8", whiteSpace: "pre-wrap", background: "#060A12", padding: 10, borderRadius: 6 }}>{msg.sql}</pre>
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => confirmAndRun(i, msg.question)}
                          style={{ background: "#10B98120", border: "1px solid #10B981", borderRadius: 4, padding: "6px 14px", color: "#10B981", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {t.chat.runConfirmed}
                        </button>
                        <button
                          onClick={() => cancelConfirm(i)}
                          style={{ background: "transparent", border: "1px solid #E5E7EB", borderRadius: 4, padding: "6px 14px", color: "#475569", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {t.chat.cancelConfirmed}
                        </button>
                      </div>
                    </div>
                  )}
                  {msg.status === "success" && (
                    <div>
                      <div style={{ background: "#060A12", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: 9, color: "#94A3B8", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                          <span>SQL · {msg.latencyMs}ms · {msg.total} {t.chat.sqlMetaRowsSuffix}</span>
                          {msg.cacheHit && (
                            <span style={{ color: "#9C8AFF", border: "1px solid #9C8AFF40", borderRadius: 4, padding: "1px 6px", fontSize: 9, letterSpacing: 1, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <Zap size={9} strokeWidth={2.5} /> {t.chat.cachedBadge}
                            </span>
                          )}
                          <span style={{ flex: 1 }} />
                          {!msg.editing && (
                            <>
                              <button onClick={() => startEdit(i)} title={t.chat.editSqlTitle} aria-label={t.chat.editSqlAria} style={iconBtnSmall}>
                                <Pencil size={12} />
                              </button>
                              {/* Track SS — copy SQL to clipboard. */}
                              <button
                                onClick={() => {
                                  void navigator.clipboard.writeText(msg.sql).then(() => {
                                    showToast(t.chat.copyToast, "success");
                                  }).catch(() => {
                                    showToast(t.common.error, "error");
                                  });
                                }}
                                title={t.chat.copyTitle}
                                aria-label={t.chat.copyAria}
                                style={iconBtnSmall}
                              >
                                <Copy size={12} />
                              </button>
                            </>
                          )}
                          {msg.results.length > 0 && (
                            <>
                              <button onClick={() => exportCsv(msg)} title={t.chat.csvDownloadTitle} aria-label={t.chat.csvDownloadAria} style={{ ...iconBtnSmall, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Download size={12} /> CSV
                              </button>
                              <button onClick={() => exportXlsx(msg)} title={t.chat.xlsxDownloadTitle} aria-label={t.chat.xlsxDownloadAria} style={{ ...iconBtnSmall, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <FileSpreadsheet size={12} /> XLSX
                              </button>
                              {!msg.explanation && msg.question && (
                                <button
                                  onClick={() => fetchExplain(i, msg)}
                                  disabled={msg.explainLoading}
                                  title={t.chat.explainTitle} aria-label={t.chat.explainAria}
                                  style={{ ...iconBtnSmall, display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Sparkles size={12} />
                                  {msg.explainLoading ? "..." : t.chat.explainLabel}
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
                              style={{ width: "100%", background: "#F9FAFB", border: "1px solid #0A0A0A40", borderRadius: 6, padding: 10, color: "#8EC8E8", fontSize: 11, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <button onClick={() => runEditedSql(i)} disabled={loading} style={{ background: "#10B98120", border: "1px solid #10B981", borderRadius: 4, padding: "4px 10px", color: "#10B981", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                                {t.chat.runEditedSql}
                              </button>
                              <button onClick={() => cancelEdit(i)} style={{ background: "transparent", border: "1px solid #E5E7EB", borderRadius: 4, padding: "4px 10px", color: "#94A3B8", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                                {t.chat.cancelEditSql}
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
                                  <th key={col} style={{ padding: "6px 10px", textAlign: "left", color: "#0A0A0A", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap" }}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.results.slice(0, 50).map((row, ri) => (
                                <tr key={ri} style={{ borderBottom: "1px solid #FFFFFF" }}>
                                  {msg.columns.map((col) => (
                                    <td key={col} style={{ padding: "6px 10px", color: "#475569" }}>{String(row[col] ?? "")}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {msg.explanation && (
                        <div style={{ background: "#9C8AFF15", border: "1px solid #9C8AFF40", borderRadius: 8, padding: 12, marginTop: 8 }}>
                          <div style={{ fontSize: 9, color: "#9C8AFF", letterSpacing: 2, marginBottom: 6 }}>{t.chat.aiExplanationLabel}</div>
                          <div style={{ fontSize: 12, color: "#0F172A", lineHeight: 1.6 }}>{msg.explanation}</div>
                        </div>
                      )}

                      {msg.chartHint && msg.chartHint.type !== "none" && (
                        <MiniChart hint={msg.chartHint} rows={msg.results} />
                      )}

                      {msg.followUps && msg.followUps.length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 9, color: "#94A3B8", marginRight: 4, alignSelf: "center" }}>{t.chat.relatedLabel}</span>
                          {msg.followUps.map((fu, fi) => (
                            <button
                              key={fi}
                              onClick={() => setInput(fu)}
                              style={{
                                background: "#FFFFFF",
                                border: "1px solid #E5E7EB",
                                borderRadius: 12,
                                padding: "3px 10px",
                                color: "#9C8AFF",
                                fontSize: 10,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.messageId && (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", fontSize: 10 }}>
                          <span style={{ color: "#94A3B8", marginRight: 4 }}>{t.chat.feedbackPrompt}</span>
                          <button
                            onClick={() => submitFeedback(i, msg.messageId!, 1)}
                            disabled={msg.feedback !== null}
                            aria-label={t.chat.feedbackHelpfulAria}
                            style={{
                              background: msg.feedback === 1 ? "#D1FAE5" : "transparent",
                              border: `1px solid ${msg.feedback === 1 ? "#10B981" : "#E5E7EB"}`,
                              borderRadius: 6,
                              padding: "4px 8px",
                              color: msg.feedback === 1 ? "#10B981" : "#94A3B8",
                              cursor: msg.feedback !== null ? "default" : "pointer",
                              opacity: msg.feedback === -1 ? 0.3 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            onClick={() => submitFeedback(i, msg.messageId!, -1)}
                            disabled={msg.feedback !== null}
                            aria-label={t.chat.feedbackUnhelpfulAria}
                            style={{
                              background: msg.feedback === -1 ? "#FEE2E2" : "transparent",
                              border: `1px solid ${msg.feedback === -1 ? "#EF4444" : "#E5E7EB"}`,
                              borderRadius: 6,
                              padding: "4px 8px",
                              color: msg.feedback === -1 ? "#EF4444" : "#94A3B8",
                              cursor: msg.feedback !== null ? "default" : "pointer",
                              opacity: msg.feedback === 1 ? 0.3 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <ThumbsDown size={13} />
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

        {/* Input — sticky + safe area */}
        <div className="safe-bottom" style={{
          padding: "12px 16px",
          borderTop: "1px solid #E5E7EB",
          display: "flex",
          gap: 10,
          background: "#FFFFFF",
          position: "sticky",
          bottom: 0,
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={selectedConn ? t.chat.inputPlaceholderReady : t.chat.inputPlaceholderNoConn}
            disabled={loading || !selectedConn}
            style={{ flex: 1, background: "#FAFAF8", border: "1px solid #E5E7EB", borderRadius: 100, padding: "12px 18px", color: "#0A0A0A", fontSize: 14, fontFamily: "inherit", outline: "none" }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !selectedConn}
            style={{ background: "#0A0A0A", border: "none", borderRadius: 100, padding: "0 24px", color: "#FAFAF8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", minWidth: 64 }}
          >
            {loading ? t.chat.sendingButton : t.chat.sendButton}
          </button>
        </div>
      </div>
    </div>
  );
}

const iconBtnSmall: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #E5E7EB",
  borderRadius: 3,
  padding: "1px 6px",
  color: "#94A3B8",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  color: "#0A0A0A",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
};

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import {
  getConnections,
  getSession,
  runSql,
  sendFeedback,
  sendQuestion,
  type ChatResponse,
  type Connection,
} from "../lib/chat";
import { shareCsv } from "../lib/share";
import { colors, font, radius, spacing } from "../lib/theme";
import type { ChatStackParamList } from "./SessionsScreen";

interface UserMsg { role: "user"; content: string }
interface LoadingMsg { role: "assistant"; status: "loading" }
interface ErrorMsg { role: "assistant"; status: "error"; content: string }
interface SuccessMsg {
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
}
type Msg = UserMsg | LoadingMsg | ErrorMsg | SuccessMsg;

interface Props {
  route: RouteProp<ChatStackParamList, "Chat">;
  navigation: NativeStackNavigationProp<ChatStackParamList, "Chat">;
}

export default function ChatScreen({ route, navigation }: Props) {
  const initialSessionId = route.params?.sessionId;
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const connQuery = useQuery({ queryKey: ["connections"], queryFn: getConnections });
  const [selectedConn, setSelectedConn] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedConn && connQuery.data) {
      const active = connQuery.data.find((c) => c.status === "active") ?? connQuery.data[0];
      if (active) setSelectedConn(active.id);
    }
  }, [connQuery.data, selectedConn]);

  useEffect(() => {
    if (!initialSessionId) return;
    void (async () => {
      try {
        const s = await getSession(initialSessionId);
        const restored: Msg[] = [];
        for (const m of s.messages) {
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
              feedback: m.feedback === 1 || m.feedback === -1 ? (m.feedback as 1 | -1) : null,
            });
          }
        }
        setMessages(restored);
      } catch {
        // ignore
      }
    })();
  }, [initialSessionId]);

  const send = async () => {
    if (!input.trim() || loading || !selectedConn) return;
    const question = input.trim();
    setInput("");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", status: "loading" },
    ]);
    try {
      const data: ChatResponse = await sendQuestion(selectedConn, question, sessionId);
      if (!sessionId) setSessionId(data.sessionId);
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
    } catch (e) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", status: "error", content: e instanceof Error ? e.message : "Hata." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
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

  const runEdited = async (idx: number) => {
    const target = messages[idx];
    if (target?.role !== "assistant" || target.status !== "success" || !target.editedSql) return;
    if (!selectedConn) return;
    const sql = target.editedSql;
    setMessages((prev) =>
      prev.map((m, i) =>
        i === idx && m.role === "assistant" && m.status === "success"
          ? { ...m, editing: false, editedSql: undefined }
          : m,
      ),
    );
    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", status: "loading" }]);
    try {
      const data = await runSql(selectedConn, sql, sessionId);
      if (!sessionId) setSessionId(data.sessionId);
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
    } catch (e) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", status: "error", content: e instanceof Error ? e.message : "SQL hatası." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const shareResult = async (msg: SuccessMsg) => {
    if (msg.results.length === 0) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    await shareCsv(`erpaio-${ts}.csv`, msg.results, msg.columns).catch(() => {});
  };

  const submitFeedback = async (idx: number, messageId: string, value: 1 | -1) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx && m.role === "assistant" && m.status === "success" ? { ...m, feedback: value } : m)),
    );
    try {
      await sendFeedback(messageId, value);
    } catch {
      setMessages((prev) =>
        prev.map((m, i) => (i === idx && m.role === "assistant" && m.status === "success" ? { ...m, feedback: null } : m)),
      );
    }
  };

  const renderMessage = ({ item, index }: { item: Msg; index: number }) =>
    item.role === "user" ? (
      <View style={[styles.msgRow, styles.userRow]}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.content}</Text>
        </View>
      </View>
    ) : item.status === "loading" ? (
      <View style={styles.msgRow}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.dimText}>SQL üretiliyor...</Text>
      </View>
    ) : item.status === "error" ? (
      <View style={[styles.msgRow, styles.errorBubble]}>
        <Text style={styles.errorText}>{item.content}</Text>
      </View>
    ) : (
      <View style={styles.msgRow}>
        <View style={styles.sqlBlock}>
          <View style={styles.sqlHeader}>
            <Text style={styles.dimText}>
              SQL · {item.latencyMs}ms · {item.total} satır
            </Text>
            {item.cacheHit && (
              <View style={styles.cachedBadge}>
                <Text style={styles.cachedText}>⚡ CACHED</Text>
              </View>
            )}
          </View>
          {item.editing ? (
            <View>
              <TextInput
                value={item.editedSql ?? ""}
                onChangeText={(t) =>
                  setMessages((prev) =>
                    prev.map((m, i) =>
                      i === index && m.role === "assistant" && m.status === "success"
                        ? { ...m, editedSql: t }
                        : m,
                    ),
                  )
                }
                multiline
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.accentBorder,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: spacing(2),
                  color: "#8EC8E8",
                  fontFamily: font,
                  fontSize: 11,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
              <View style={{ flexDirection: "row", gap: spacing(2), marginTop: spacing(1.5) }}>
                <TouchableOpacity
                  onPress={() => runEdited(index)}
                  disabled={loading}
                  style={{ backgroundColor: "rgba(105,255,71,0.15)", borderColor: colors.success, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing(3), paddingVertical: spacing(1) }}
                >
                  <Text style={{ color: colors.success, fontFamily: font, fontSize: 11 }}>Çalıştır</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => cancelEdit(index)} style={{ borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing(3), paddingVertical: spacing(1) }}>
                  <Text style={{ color: colors.textMuted, fontFamily: font, fontSize: 11 }}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sqlText}>{item.sql}</Text>
              <View style={{ flexDirection: "row", gap: spacing(2), marginTop: spacing(1.5) }}>
                <TouchableOpacity onPress={() => startEdit(index)} style={iconBtnStyle}>
                  <Text style={iconTextStyle}>Düzenle</Text>
                </TouchableOpacity>
                {item.results.length > 0 && (
                  <TouchableOpacity onPress={() => shareResult(item)} style={iconBtnStyle}>
                    <Text style={iconTextStyle}>Paylaş</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {item.results.length > 0 && (
          <>
            <ScrollView horizontal style={styles.tableScroll} showsHorizontalScrollIndicator>
              <View>
                <View style={styles.tableHeader}>
                  {item.columns.map((c) => (
                    <Text key={c} style={[styles.tableCell, styles.tableHeaderCell]}>
                      {c}
                    </Text>
                  ))}
                </View>
                {item.results.slice(0, 50).map((row, ri) => (
                  <View key={ri} style={styles.tableRow}>
                    {item.columns.map((c) => (
                      <Text key={c} style={styles.tableCell} numberOfLines={1}>
                        {String(row[c] ?? "")}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
            {item.results.length > 50 && (
              <Text style={styles.rowLimitNote}>
                {item.results.length} satırdan ilk 50&apos;si gösteriliyor.
                {item.total && item.total > item.results.length
                  ? ` (Toplam ${item.total})`
                  : ""}
                {" "}Tamamı için CSV/Excel olarak paylaşın.
              </Text>
            )}
          </>
        )}

        {item.messageId && (
          <View style={styles.feedbackRow}>
            <Text style={styles.dimText}>Faydalı mı?</Text>
            <TouchableOpacity
              disabled={item.feedback !== null}
              onPress={() => submitFeedback(index, item.messageId!, 1)}
              style={[
                styles.feedbackBtn,
                item.feedback === 1 && { borderColor: colors.success, backgroundColor: colors.successSoft },
                item.feedback === -1 && { opacity: 0.3 },
              ]}
            >
              <Text style={{
                color: item.feedback === 1 ? colors.success : colors.textMuted,
                fontSize: 12,
                fontWeight: "500",
                fontFamily: font,
              }}>
                Evet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={item.feedback !== null}
              onPress={() => submitFeedback(index, item.messageId!, -1)}
              style={[
                styles.feedbackBtn,
                item.feedback === -1 && { borderColor: colors.error, backgroundColor: colors.errorSoft },
                item.feedback === 1 && { opacity: 0.3 },
              ]}
            >
              <Text style={{
                color: item.feedback === -1 ? colors.error : colors.textMuted,
                fontSize: 12,
                fontWeight: "500",
                fontFamily: font,
              }}>
                Hayır
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );

  const activeConns = (connQuery.data ?? []).filter((c) => c.status === "active");

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Geçmiş</Text>
        </TouchableOpacity>
        {activeConns.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {activeConns.map((c: Connection) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedConn(c.id)}
                style={[styles.connChip, selectedConn === c.id && styles.connChipActive]}
              >
                <Text style={[styles.connChipText, selectedConn === c.id && styles.connChipTextActive]}>
                  {c.dbName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => `m-${i}`}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: spacing(3), paddingBottom: spacing(8), flexGrow: 1 }}
        ListEmptyComponent={
          selectedConn ? (
            <Text style={styles.placeholder}>
              Veritabanına bir Türkçe soru yaz, SQL üretip cevap getireceğim.
            </Text>
          ) : (
            <View style={{ alignItems: "center", paddingTop: spacing(10), gap: spacing(3) }}>
              <Text style={styles.placeholder}>
                Sorgu yapmak için önce bir ERP bağlantısı ekleyin.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Tab navigator parent → Menü tab → Connections screen
                  const parent = navigation.getParent() as { navigate: (name: string, params?: unknown) => void } | undefined;
                  parent?.navigate("Menü", { screen: "Connections" });
                }}
                style={{
                  backgroundColor: colors.brand,
                  paddingHorizontal: spacing(5),
                  paddingVertical: spacing(2.5),
                  borderRadius: radius.full,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: colors.textInverse, fontFamily: font, fontSize: 14, fontWeight: "600" }}>
                  ERP Bağlantısı Ekle →
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={selectedConn ? "Soru yaz..." : "Bağlantı yok"}
          placeholderTextColor={colors.textDim}
          editable={!loading && !!selectedConn}
          style={styles.input}
          multiline
          onSubmitEditing={send}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!input.trim() || loading || !selectedConn}
          style={[styles.sendBtn, (!input.trim() || loading || !selectedConn) && { opacity: 0.4 }]}
        >
          <Text style={styles.sendBtnText}>{loading ? "..." : "→"}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: spacing(3),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  backText: { color: colors.brand, fontFamily: font, fontSize: 13, fontWeight: "500" },
  connChip: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    marginRight: spacing(2),
  },
  connChipActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  connChipText: { color: colors.textMuted, fontFamily: font, fontSize: 11, fontWeight: "500" },
  connChipTextActive: { color: colors.textInverse },
  msgRow: { marginBottom: spacing(3) },
  userRow: { alignItems: "flex-end" },
  userBubble: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing(2.5),
    maxWidth: "85%",
  },
  userText: { color: colors.textInverse, fontFamily: font, fontSize: 14 },
  dimText: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  errorBubble: {
    backgroundColor: colors.errorSoft,
    borderColor: "rgba(239,68,68,0.2)",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(2.5),
  },
  errorText: { color: colors.error, fontFamily: font, fontSize: 13, fontWeight: "500" },
  sqlBlock: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(2.5),
    marginBottom: spacing(2),
  },
  sqlHeader: { flexDirection: "row", alignItems: "center", gap: spacing(2), marginBottom: spacing(1.5) },
  cachedBadge: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, paddingHorizontal: spacing(1.5), paddingVertical: 2 },
  cachedText: { color: colors.accent, fontFamily: font, fontSize: 9, letterSpacing: 1, fontWeight: "600" },
  sqlText: { color: colors.text, fontFamily: font, fontSize: 12, lineHeight: 18 },
  tableScroll: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.card },
  tableHeader: { flexDirection: "row", backgroundColor: colors.bgSubtle },
  tableRow: { flexDirection: "row", borderTopColor: colors.border, borderTopWidth: 1 },
  tableCell: {
    color: colors.text,
    fontFamily: font,
    fontSize: 12,
    padding: spacing(2),
    minWidth: 100,
    maxWidth: 200,
  },
  tableHeaderCell: { color: colors.textMuted, fontWeight: "600", fontSize: 11 },
  rowLimitNote: {
    color: colors.textDim,
    fontFamily: font,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: spacing(1),
    paddingHorizontal: spacing(1),
  },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: spacing(2), marginTop: spacing(2) },
  feedbackBtn: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
  },
  placeholder: { color: colors.textDim, fontFamily: font, fontSize: 12, textAlign: "center", marginTop: spacing(10) },
  inputBar: {
    flexDirection: "row",
    padding: spacing(3),
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing(2),
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(2.5),
    color: colors.text,
    fontFamily: font,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingHorizontal: spacing(4),
    justifyContent: "center",
  },
  sendBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 18, fontWeight: "600" },
});

const iconBtnStyle = {
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: radius.sm,
  paddingHorizontal: spacing(2),
  paddingVertical: spacing(1),
};
const iconTextStyle = { color: colors.textDim, fontFamily: font, fontSize: 10 };

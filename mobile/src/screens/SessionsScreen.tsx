import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSession,
  exportSessionMarkdown,
  getSessionsByView,
  patchSession,
  searchChatSessions,
  type ChatSearchResult,
  type SessionListItem,
} from "../lib/chat";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type ChatStackParamList = {
  Sessions: undefined;
  Chat: { sessionId?: string; title?: string };
};

interface Props {
  navigation: NativeStackNavigationProp<ChatStackParamList, "Sessions">;
}

/**
 * Search snippet'ini React node olarak render eder: eşleşen aralık bold +
 * background highlight. matchStart -1 ise düz text döner. RN'de <mark> yok,
 * inline <Text> styling kullanıyoruz.
 */
function renderHighlightedSnippetText(
  text: string,
  matchStart: number,
  matchLength: number,
): React.ReactNode {
  if (matchStart < 0 || matchLength <= 0) return text;
  const before = text.slice(0, matchStart);
  const match = text.slice(matchStart, matchStart + matchLength);
  const after = text.slice(matchStart + matchLength);
  return (
    <>
      {before}
      <Text style={searchHighlightStyle}>{match}</Text>
      {after}
    </>
  );
}

const searchHighlightStyle = {
  backgroundColor: "#FEF3C7",
  color: "#0A0A0A",
  fontWeight: "700" as const,
};

export default function SessionsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [view, setView] = useState<"active" | "archived">("active");
  const [menuFor, setMenuFor] = useState<SessionListItem | null>(null);
  // Chat history search (UUU). 2+ char query → search mode'da liste değişir.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<ChatSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const queryClient = useQueryClient();

  // Debounced search effect.
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchHits([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const handle = setTimeout(() => {
      searchChatSessions(trimmed, 20)
        .then((d) => {
          setSearchHits(d.results);
          setSearchLoading(false);
        })
        .catch(() => {
          setSearchHits([]);
          setSearchLoading(false);
        });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const sessionsQuery = useQuery({
    queryKey: ["sessions", view],
    queryFn: () => getSessionsByView(view),
  });

  // sessionsQuery.refetch is stable from react-query; depending on `view`
  // is enough to retrigger when the user switches tabs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { sessionsQuery.refetch(); }, [view]));

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof patchSession>[1] }) => patchSession(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const onPin = (s: SessionListItem) => {
    setMenuFor(null);
    patchMutation.mutate(
      { id: s.id, data: { pinned: !s.pinned } },
      { onSuccess: () => showToast(s.pinned ? t.sessions.unpin : t.sessions.pin, "success") },
    );
  };

  const onArchive = (s: SessionListItem) => {
    setMenuFor(null);
    const archived = !!s.archivedAt;
    patchMutation.mutate(
      { id: s.id, data: { archivedAt: archived ? null : new Date().toISOString() } },
      { onSuccess: () => showToast(archived ? t.sessions.unarchive : t.sessions.archive, "success") },
    );
  };

  const onDelete = async (s: SessionListItem) => {
    setMenuFor(null);
    const ok = await confirmDialog({
      title: t.sessions.deleteConfirmTitle,
      message: `${t.sessions.deleteConfirmMessagePrefix}${s.title ?? t.sessions.untitled}${t.sessions.deleteConfirmMessageSuffix}`,
      confirmLabel: t.sessions.deleteConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(s.id, { onSuccess: () => showToast(t.sessions.deleteOk, "success") });
  };

  const onExport = async (s: SessionListItem) => {
    setMenuFor(null);
    try {
      const markdown = await exportSessionMarkdown(s.id);
      if (!markdown) {
        showToast(t.sessions.exportEmpty, "error");
        return;
      }
      await Share.share({
        message: markdown,
        title: s.title ?? t.sessions.untitled,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.sessions.exportFailed;
      showToast(msg, "error");
    }
  };

  const renderItem = ({ item }: { item: SessionListItem }) => (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => navigation.navigate("Chat", { sessionId: item.id, title: item.title })}
        style={{ flex: 1 }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {item.pinned && <Text style={styles.pinIcon}>★</Text>}
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <Text style={styles.rowMeta}>
          {item.messageCount} mesaj · {new Date(item.createdAt).toLocaleDateString("tr-TR")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMenuFor(item)}
        style={styles.menuBtn}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={t.sessions.title}
      >
        <Text style={styles.menuDots}>⋯</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ERPAIO · CHAT</Text>
          <Text style={styles.title}>{t.sessions.title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Chat", {})}
          style={styles.newButton}
          activeOpacity={0.85}
        >
          <Text style={styles.newButtonText}>+ {t.common.save === "Save" ? "New" : "Yeni"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t.sessions.searchPlaceholder}
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t.sessions.searchAria}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            accessibilityLabel={t.sessions.searchClear}
            style={styles.searchClearBtn}
          >
            <Text style={styles.searchClearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active/Archived chips — search mode'da gizlenir */}
      {searchQuery.trim().length < 2 && (
        <View style={styles.filterRow}>
          {(["active", "archived"] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              style={[styles.filterChip, view === v && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, view === v && styles.filterTextActive]}>
                {v === "active" ? t.sessions.tabActive : t.sessions.tabArchived}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {searchQuery.trim().length >= 2 ? (
        // Search mode — UUU
        searchLoading ? (
          <View style={{ padding: spacing(4) }}>
            <SkeletonList count={3} height={70} gap={8} />
          </View>
        ) : (
          <FlatList
            data={searchHits}
            keyExtractor={(h) => h.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  navigation.navigate("Chat", { sessionId: item.id, title: item.title ?? undefined });
                }}
                style={styles.row}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(1) }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title ?? t.sessions.untitled}
                    </Text>
                    {item.matchType === "title" && (
                      <View style={styles.searchBadge}>
                        <Text style={styles.searchBadgeText}>{t.sessions.searchMatchTitle}</Text>
                      </View>
                    )}
                  </View>
                  {item.snippet && (
                    <Text style={styles.searchSnippet} numberOfLines={2}>
                      {renderHighlightedSnippetText(item.snippet, item.matchStart, item.matchLength)}
                    </Text>
                  )}
                  <Text style={styles.rowMeta}>
                    {item.messageCount} mesaj · {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <EmptyState title={t.sessions.searchEmpty} description={t.sessions.searchEmptyDesc} />
            }
            contentContainerStyle={{ paddingVertical: spacing(1), paddingBottom: 200, flexGrow: 1 }}
          />
        )
      ) : sessionsQuery.isLoading ? (
        <View style={{ padding: spacing(4) }}>
          <SkeletonList count={5} height={64} gap={8} />
        </View>
      ) : sessionsQuery.isError ? (
        <View style={{ padding: spacing(4) }}>
          <ErrorState onRetry={() => sessionsQuery.refetch()} />
        </View>
      ) : (
        <FlatList
          data={sessionsQuery.data ?? []}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              title={view === "active" ? t.sessions.emptyActive : t.sessions.emptyArchived}
              description={view === "active" ? t.sessions.emptyActive : t.sessions.emptyArchived}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={sessionsQuery.isRefetching}
              onRefresh={() => sessionsQuery.refetch()}
              tintColor={colors.brand}
            />
          }
          contentContainerStyle={{ paddingVertical: spacing(1), paddingBottom: 200, flexGrow: 1 }}
        />
      )}

      {/* Action sheet modal — pin/archive/delete */}
      {menuFor && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setMenuFor(null)}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setMenuFor(null)}
          >
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{menuFor.title ?? t.sessions.untitled}</Text>
              <TouchableOpacity onPress={() => onPin(menuFor)} style={styles.sheetItem} activeOpacity={0.6}>
                <Text style={styles.sheetText}>{menuFor.pinned ? t.sessions.unpin : t.sessions.pin}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onArchive(menuFor)} style={styles.sheetItem} activeOpacity={0.6}>
                <Text style={styles.sheetText}>{menuFor.archivedAt ? t.sessions.unarchive : t.sessions.archive}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onExport(menuFor)} style={styles.sheetItem} activeOpacity={0.6}>
                <Text style={styles.sheetText}>{t.sessions.exportMd}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(menuFor)} style={styles.sheetItem} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.error }]}>{t.sessions.delete}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuFor(null)} style={[styles.sheetItem, styles.sheetCancel]} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.textMuted }]}>{t.common.cancel}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: spacing(5),
    paddingBottom: spacing(3),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fontSerif,
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: -0.5,
  },
  newButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  newButtonText: { color: colors.textInverse, fontFamily: font, fontSize: 13, fontWeight: "600" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    position: "relative",
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    color: colors.text,
    fontFamily: font,
    fontSize: 13,
  },
  searchClearBtn: {
    position: "absolute",
    right: spacing(6),
    padding: spacing(1),
  },
  searchClearText: { color: colors.textMuted, fontSize: 18, fontWeight: "300" },
  searchBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing(1.5),
    paddingVertical: 1,
    borderRadius: 3,
  },
  searchBadgeText: {
    color: "#0A0A0A",
    fontFamily: font,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  searchSnippet: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing(2),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  filterChipActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  filterText: { color: colors.textMuted, fontFamily: font, fontSize: 12, fontWeight: "500" },
  filterTextActive: { color: colors.textInverse },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(5),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  rowTitle: {
    color: colors.text,
    fontFamily: font,
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  rowMeta: { color: colors.textSubtle, fontFamily: font, fontSize: 12, marginTop: 4 },
  pinIcon: { color: colors.warning, fontSize: 14 },
  menuBtn: {
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
  },
  menuDots: { color: colors.textMuted, fontSize: 22, fontWeight: "300" },

  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,10,10,0.4)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 36,
  },
  sheetTitle: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  sheetItem: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(4),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  sheetCancel: { borderBottomWidth: 0, marginTop: spacing(2) },
  sheetText: {
    color: colors.text,
    fontFamily: font,
    fontSize: 16,
    fontWeight: "500",
  },
});

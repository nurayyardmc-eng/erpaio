import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSession, getSessionsByView, patchSession, type SessionListItem } from "../lib/chat";
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

export default function SessionsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [view, setView] = useState<"active" | "archived">("active");
  const [menuFor, setMenuFor] = useState<SessionListItem | null>(null);
  const queryClient = useQueryClient();

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

      {sessionsQuery.isLoading ? (
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

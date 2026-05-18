import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSavedQuery, getSavedQueries, pinSavedQuery, type SavedQuery } from "../lib/dashboard";
import { shareJson } from "../lib/share";
import { confirmDialog } from "../components/Confirm";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "Saved">;
}

export default function SavedScreen({ navigation }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["saved-queries"], queryFn: getSavedQueries });

  /**
   * Tıklanan saved query'yi Chat tab'ına prefill ederek götür.
   * MoreStack → parent (Tabs) → "Sohbet" tab → Chat screen. KKK push-deep-link
   * pattern'ı ile aynı navigate hierarchy.
   */
  const rerun = (item: SavedQuery) => {
    const parent = navigation.getParent() as
      | { navigate: (name: string, params?: unknown) => void }
      | undefined;
    if (!parent) {
      showToast(t.common.error, "error");
      return;
    }
    parent.navigate("Sohbet", {
      screen: "Chat",
      params: { prefillQuestion: item.question },
    });
  };

  // Track EEEE — pin/unpin toggle (long-press). Optimistic update +
  // server sırasında local state'i hemen değiştir, fail'de revert.
  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => pinSavedQuery(id, pinned),
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["saved-queries"] });
      const prev = queryClient.getQueryData<{ queries: SavedQuery[] }>(["saved-queries"]);
      if (prev) {
        const updated = prev.queries.map((p) => (p.id === id ? { ...p, pinned } : p));
        // Sort: pinned desc + lastUsedAt desc — server orderBy ile uyumlu.
        updated.sort((a, b) => {
          if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
        });
        queryClient.setQueryData(["saved-queries"], { queries: updated });
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["saved-queries"], ctx.prev);
      showToast(t.saved.pinFailedToast, "error");
    },
    onSuccess: (_d, { pinned }) => {
      showToast(pinned ? t.saved.pinnedToast : t.saved.unpinnedToast, "success");
    },
  });

  const onLongPress = (item: SavedQuery) => {
    pinMutation.mutate({ id: item.id, pinned: !item.pinned });
  };

  // Track KKK — saved query delete.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSavedQuery(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["saved-queries"] });
      const prev = queryClient.getQueryData<{ queries: SavedQuery[] }>(["saved-queries"]);
      queryClient.setQueryData<{ queries: SavedQuery[] }>(["saved-queries"], (old) => ({
        queries: (old?.queries ?? []).filter((q) => q.id !== id),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["saved-queries"], ctx.prev);
      showToast(t.saved.deleteFailedToast, "error");
    },
    onSuccess: () => showToast(t.saved.deletedToast, "success"),
  });

  const onDelete = async (item: SavedQuery) => {
    const ok = await confirmDialog({
      title: t.saved.deleteConfirmTitle,
      message: `"${item.question}"${t.saved.deleteConfirmMessageSuffix}`,
      confirmLabel: t.saved.deleteConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(item.id);
  };

  const renderItem = ({ item }: { item: SavedQuery }) => (
    <View style={{ position: "relative" }}>
      <TouchableOpacity
        onPress={() => onDelete(item)}
        style={styles.deleteCornerBtn}
        activeOpacity={0.6}
        accessibilityLabel={t.saved.deleteBtnA11y}
      >
        <Text style={styles.deleteCornerBtnText}>×</Text>
      </TouchableOpacity>
    <TouchableOpacity
      onPress={() => rerun(item)}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.7}
      style={[styles.card, item.pinned && styles.cardPinned]}
      accessibilityRole="button"
      accessibilityLabel={`${t.saved.rerunBtn}: ${item.question}`}
    >
      <View style={styles.headerRow}>
        {item.pinned && (
          <View style={styles.pinBadge}>
            <Text style={styles.pinBadgeText}>📌 {t.saved.pinnedLabel}</Text>
          </View>
        )}
        <Text style={[styles.question, item.pinned && { fontWeight: "700", flex: 1 }]}>
          {item.question}
        </Text>
      </View>
      <View style={styles.sqlBox}>
        <Text style={styles.sqlText} numberOfLines={3}>{item.sqlQuery}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: item.reliability > 0.9 ? colors.success : item.reliability > 0.7 ? colors.warning : colors.error }]}>
          %{(item.reliability * 100).toFixed(0)}{t.saved.reliabilitySuffix}
        </Text>
        <Text style={styles.meta}>·</Text>
        <Text style={styles.meta}>{item.successCount} {t.saved.successLabel} / {item.failCount} {t.saved.failLabel}</Text>
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.timestamp}>{t.saved.lastUsedLabel}{new Date(item.lastUsedAt).toLocaleDateString("tr-TR")}</Text>
        <Text style={styles.rerunHint}>
          {item.pinned ? t.saved.longPressUnpinHint : t.saved.longPressPinHint}
        </Text>
      </View>
    </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.saved.brand}
        title={t.saved.title}
        description={t.saved.description}
        onBack={() => navigation.goBack()}
        right={
          (q.data?.queries.length ?? 0) > 0 ? (
            <TouchableOpacity
              onPress={async () => {
                /* Track EEE — saved queries share (XX mobile parity). */
                const ts = new Date().toISOString().slice(0, 10);
                try {
                  await shareJson(`erpaio-saved-queries-${ts}.json`, {
                    count: q.data!.queries.length,
                    queries: q.data!.queries,
                  });
                } catch {
                  showToast(t.common.error, "error");
                }
              }}
              style={styles.exportBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.exportBtnText}>↓</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={3} height={140} gap={10} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.queries ?? []}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing(5), paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title={t.saved.emptyTitle}
              description={t.saved.emptyDesc}
            />
          }
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  exportBtn: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  exportBtnText: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "700" },
  deleteCornerBtn: {
    position: "absolute",
    top: spacing(2),
    right: spacing(2),
    padding: spacing(1),
    zIndex: 10,
  },
  deleteCornerBtnText: { color: colors.textSubtle, fontFamily: font, fontSize: 18, fontWeight: "300" },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  cardPinned: {
    borderColor: colors.warning,
    borderWidth: 1.5,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2), marginBottom: spacing(2), flexWrap: "wrap" },
  pinBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  pinBadgeText: { color: colors.warning, fontFamily: font, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  question: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "500", marginBottom: spacing(2) },
  sqlBox: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    padding: spacing(2.5),
    marginBottom: spacing(2),
  },
  sqlText: { color: colors.text, fontFamily: fontMono, fontSize: 11, lineHeight: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), marginBottom: spacing(1) },
  meta: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing(0.5),
  },
  rerunHint: {
    color: colors.brand,
    fontFamily: font,
    fontSize: 11,
    fontWeight: "600",
  },
});

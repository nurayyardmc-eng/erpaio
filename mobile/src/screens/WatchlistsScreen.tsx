import { FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteWatchlist, getWatchlists, updateWatchlist, type Watchlist } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import { apiErrorMessage } from "../lib/apiError";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Watchlists">; }

const OP_LABEL: Record<string, string> = { lt: "<", lte: "≤", gt: ">", gte: "≥", eq: "=" };

export default function WatchlistsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["watchlists"], queryFn: getWatchlists });
  const [menuFor, setMenuFor] = useState<Watchlist | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      showToast(t.watchlists.deletedToast, "success");
    },
    onError: (e: Error) => showToast(apiErrorMessage(e, t), "error"),
  });

  // Track GGGG — enable/disable toggle. Optimistic update + invalidate.
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateWatchlist(id, { enabled }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      showToast(vars.enabled ? t.watchlists.enabledToast : t.watchlists.disabledToast, "success");
    },
    onError: (e: Error) => showToast(apiErrorMessage(e, t), "error"),
  });

  const onDelete = async (w: Watchlist) => {
    setMenuFor(null);
    const ok = await confirmDialog({
      title: t.watchlists.deleteConfirmTitle,
      message: `"${w.name}"${t.watchlists.deleteConfirmMessageSuffix}`,
      confirmLabel: t.watchlists.deleteConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(w.id);
  };

  const onToggle = (w: Watchlist) => {
    setMenuFor(null);
    toggleMutation.mutate({ id: w.id, enabled: !w.enabled });
  };

  const onEdit = (w: Watchlist) => {
    setMenuFor(null);
    navigation.navigate("WatchlistForm", { editWatchlist: w });
  };

  const renderItem = ({ item }: { item: Watchlist }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: spacing(1.5) }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.name}>{item.name}</Text>
            {!item.enabled && <Text style={styles.disabled}>{t.watchlists.disabledSuffix}</Text>}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setMenuFor(item)}
          style={styles.menuBtn}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={t.watchlists.menuA11y}
        >
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.question}>{item.question}</Text>
      <Text style={styles.threshold}>
        {t.watchlists.thresholdLabel}{OP_LABEL[item.thresholdOp] ?? item.thresholdOp} {item.thresholdVal}
        {item.lastValue !== null ? `${t.watchlists.lastValueLabel}${item.lastValue}` : ""}
      </Text>
      {item.lastCheckedAt && (
        <Text style={styles.timestamp}>{t.watchlists.lastCheckedLabel}{new Date(item.lastCheckedAt).toLocaleString("tr-TR")}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.watchlists.brand}
        title={t.watchlists.title}
        description={t.watchlists.description}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate("WatchlistForm")}
            style={styles.addBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t.watchlists.addA11y}
          >
            <Text style={styles.addBtnText}>{t.watchlists.addLabel}</Text>
          </TouchableOpacity>
        }
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={3} height={120} gap={10} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.watchlists ?? []}
          keyExtractor={(w) => w.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing(5), paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title={t.watchlists.emptyTitle}
              description={t.watchlists.emptyDesc}
            />
          }
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}

      {menuFor && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setMenuFor(null)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuFor(null)}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{menuFor.name}</Text>
              <TouchableOpacity
                onPress={() => onEdit(menuFor)}
                style={styles.sheetItem}
                activeOpacity={0.6}
              >
                <Text style={styles.sheetText}>{t.watchlists.editBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onToggle(menuFor)}
                style={styles.sheetItem}
                activeOpacity={0.6}
                disabled={toggleMutation.isPending}
              >
                <Text style={styles.sheetText}>
                  {menuFor.enabled ? t.watchlists.disableBtn : t.watchlists.enableBtn}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(menuFor)} style={styles.sheetItem} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.error }]}>{t.common.delete}</Text>
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
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing(4), marginBottom: spacing(3) },
  name: { color: colors.text, fontFamily: font, fontSize: 15, fontWeight: "600" },
  disabled: { color: colors.textSubtle, fontFamily: font, fontSize: 11, marginLeft: spacing(1) },
  question: { color: colors.textMuted, fontFamily: font, fontSize: 13, lineHeight: 19, marginBottom: spacing(1.5) },
  threshold: { color: colors.text, fontFamily: font, fontSize: 12, fontWeight: "500", marginBottom: 4 },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  addBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    marginLeft: spacing(2),
  },
  addBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 13, fontWeight: "600" },
  menuBtn: { paddingHorizontal: spacing(2), paddingVertical: spacing(1) },
  menuDots: { color: colors.textMuted, fontSize: 22, fontWeight: "300" },

  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,10,10,0.4)" },
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
  sheetText: { color: colors.text, fontFamily: font, fontSize: 16, fontWeight: "500" },
});

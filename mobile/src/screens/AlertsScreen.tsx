import { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acknowledgeAlert, bulkUpdateAlerts, getAlerts, type Alert } from "../lib/alerts";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { showToast } from "../components/Toast";
import TrialBanner from "../components/TrialBanner";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AlertsStackParamList } from "./AlertsStackNav";

interface Props {
  navigation: NativeStackNavigationProp<AlertsStackParamList, "AlertsList">;
}

const SEVERITY_COLOR: Record<Alert["severity"], string> = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#F59E0B",
  low: "#737373",
};

export default function AlertsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const severityLabel = (s: Alert["severity"]) => {
    switch (s) {
      case "critical": return t.alerts.sevCritical;
      case "high": return t.alerts.sevHigh;
      case "medium": return t.alerts.sevMedium;
      case "low": return t.alerts.sevLow;
    }
  };
  const [filter, setFilter] = useState<"open" | "acked">("open");
  // Track KKKK — selection mode (long-press başlatır). Filter değişince temizlenir.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ["alerts", filter],
    queryFn: () => getAlerts(filter),
  });

  useFocusEffect(
    useCallback(() => {
      alertsQuery.refetch();
    }, [filter]),
  );

  const ackMutation = useMutation({
    mutationFn: (id: string) => acknowledgeAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: "acked" | "resolved" }) =>
      bulkUpdateAlerts(ids, status),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setSelected(new Set());
      const msg = vars.status === "acked"
        ? t.alerts.bulkSuccessAcked(data.count)
        : t.alerts.bulkSuccessResolved(data.count);
      showToast(msg, "success");
    },
    onError: () => showToast(t.alerts.bulkErrorToast, "error"),
  });

  const onLongPressItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const onTapItem = (item: Alert) => {
    if (selectionMode) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    } else {
      navigation.navigate("AlertDetail", { id: item.id });
    }
  };

  const switchFilter = (k: "open" | "acked") => {
    setSelected(new Set());
    setFilter(k);
  };

  const renderAlert = ({ item }: { item: Alert }) => {
    const sevColor = SEVERITY_COLOR[item.severity] ?? SEVERITY_COLOR.low;
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        onPress={() => onTapItem(item)}
        onLongPress={() => onLongPressItem(item.id)}
        delayLongPress={350}
        activeOpacity={0.7}
        style={[
          styles.card,
          { borderLeftColor: sevColor },
          isSelected && styles.cardSelected,
        ]}
        accessibilityRole="button"
        accessibilityState={selectionMode ? { selected: isSelected } : undefined}
        accessibilityHint={selectionMode ? t.alerts.selectToggleHint : t.alerts.selectHint}
      >
        <View style={styles.row}>
          {selectionMode && (
            <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
              {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
          )}
          <View style={[styles.sevBadge, { backgroundColor: `${sevColor}1A` }]}>
            <Text style={[styles.sevText, { color: sevColor }]}>{severityLabel(item.severity)}</Text>
          </View>
          {item.module && <Text style={styles.module}>{item.module}</Text>}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        {item.description && <Text style={styles.desc}>{item.description}</Text>}
        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
          {filter === "open" && !selectionMode && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); ackMutation.mutate(item.id); }}
              disabled={ackMutation.isPending}
              style={styles.ackBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.ackBtnText}>{t.alerts.ackBtn}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      {/* Track RRRR — trial banner Alerts tab'da da. */}
      <TrialBanner />
      <View style={styles.header}>
        <Text style={styles.brand}>{t.alerts.brand}</Text>
        <Text style={styles.headerTitle}>{t.alerts.title}</Text>
        <View style={styles.tabs}>
          {(["open", "acked"] as const).map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => switchFilter(k)}
              style={[styles.tab, filter === k && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, filter === k && styles.tabTextActive]}>
                {k === "open" ? t.alerts.tabOpen : t.alerts.tabAcked}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {alertsQuery.isLoading ? (
        <View style={{ padding: spacing(4) }}>
          <SkeletonList count={3} height={100} gap={10} />
        </View>
      ) : alertsQuery.isError ? (
        <View style={{ padding: spacing(4) }}>
          <ErrorState onRetry={() => alertsQuery.refetch()} />
        </View>
      ) : (
        <FlatList
          data={alertsQuery.data ?? []}
          keyExtractor={(a) => a.id}
          renderItem={renderAlert}
          contentContainerStyle={{ padding: spacing(4), flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title={filter === "open" ? t.alerts.emptyOpenTitle : t.alerts.emptyAckedTitle}
              description={filter === "open" ? t.alerts.emptyOpenDesc : t.alerts.emptyAckedDesc}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={alertsQuery.isRefetching}
              onRefresh={() => alertsQuery.refetch()}
              tintColor={colors.brand}
            />
          }
        />
      )}

      {selectionMode && (
        <View style={styles.actionBar}>
          <Text style={styles.actionBarCount}>{selected.size}{t.alerts.bulkSelectedSuffix}</Text>
          <View style={styles.actionBarBtns}>
            {filter === "open" && (
              <TouchableOpacity
                onPress={() => bulkMutation.mutate({ ids: Array.from(selected), status: "acked" })}
                disabled={bulkMutation.isPending}
                style={[styles.actionBtn, bulkMutation.isPending && { opacity: 0.5 }]}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>{t.alerts.bulkAck}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => bulkMutation.mutate({ ids: Array.from(selected), status: "resolved" })}
              disabled={bulkMutation.isPending}
              style={[styles.actionBtn, bulkMutation.isPending && { opacity: 0.5 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>{t.alerts.bulkResolve}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelected(new Set())}
              disabled={bulkMutation.isPending}
              style={styles.actionBtnSecondary}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnSecondaryText}>{t.alerts.bulkCancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(5),
    paddingBottom: spacing(4),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  brand: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.text,
    fontFamily: fontSerif,
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: -0.5,
    marginBottom: spacing(3),
  },
  tabs: { flexDirection: "row", gap: spacing(2) },
  tab: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  tabActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  tabText: { color: colors.textMuted, fontFamily: font, fontSize: 12, fontWeight: "500" },
  tabTextActive: { color: colors.textInverse },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  sevBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  sevText: { fontFamily: font, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  module: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  title: {
    color: colors.text,
    fontFamily: font,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: spacing(1),
  },
  desc: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 13,
    marginBottom: spacing(2),
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  ackBtn: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(1.5),
  },
  ackBtnText: { color: colors.text, fontFamily: font, fontSize: 12, fontWeight: "500" },
  cardSelected: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.brand,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  checkboxTick: { color: colors.textInverse, fontSize: 14, fontWeight: "700" },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing(3),
    paddingBottom: spacing(5),
    paddingHorizontal: spacing(5),
    backgroundColor: colors.text,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionBarCount: {
    color: colors.textInverse,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "600",
  },
  actionBarBtns: { flexDirection: "row", gap: spacing(2) },
  actionBtn: {
    backgroundColor: colors.textInverse,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
  },
  actionBtnText: { color: colors.text, fontFamily: font, fontSize: 12, fontWeight: "600" },
  actionBtnSecondary: {
    borderColor: colors.textInverse,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
  },
  actionBtnSecondaryText: { color: colors.textInverse, fontFamily: font, fontSize: 12, fontWeight: "500" },
});

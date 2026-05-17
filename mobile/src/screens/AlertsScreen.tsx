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
import { acknowledgeAlert, getAlerts, type Alert } from "../lib/alerts";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AlertsStackParamList } from "./AlertsStackNav";

interface Props {
  navigation: NativeStackNavigationProp<AlertsStackParamList, "AlertsList">;
}

const SEVERITY: Record<Alert["severity"], { color: string; label: string }> = {
  critical: { color: "#EF4444", label: "KRİTİK" },
  high: { color: "#F59E0B", label: "YÜKSEK" },
  medium: { color: "#F59E0B", label: "ORTA" },
  low: { color: "#737373", label: "DÜŞÜK" },
};

export default function AlertsScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<"open" | "acked">("open");
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

  const renderAlert = ({ item }: { item: Alert }) => {
    const sev = SEVERITY[item.severity] ?? SEVERITY.low;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("AlertDetail", { id: item.id })}
        activeOpacity={0.7}
        style={[styles.card, { borderLeftColor: sev.color }]}
      >
        <View style={styles.row}>
          <View style={[styles.sevBadge, { backgroundColor: `${sev.color}1A` }]}>
            <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
          </View>
          {item.module && <Text style={styles.module}>{item.module}</Text>}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        {item.description && <Text style={styles.desc}>{item.description}</Text>}
        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleString("tr-TR")}
          </Text>
          {filter === "open" && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); ackMutation.mutate(item.id); }}
              disabled={ackMutation.isPending}
              style={styles.ackBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.ackBtnText}>Okundu</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>ERPAIO · BİLDİRİMLER</Text>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <View style={styles.tabs}>
          {(["open", "acked"] as const).map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => setFilter(k)}
              style={[styles.tab, filter === k && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, filter === k && styles.tabTextActive]}>
                {k === "open" ? "Açık" : "Okundu"}
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
              title={filter === "open" ? "Açık bildirim yok" : "Okundu bildirim yok"}
              description={
                filter === "open"
                  ? "Anomaly detector saatlik çalışıyor. Önemli olaylar burada gözükür."
                  : "Henüz okuduğun bildirim yok."
              }
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
});

import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import { colors, font, radius, spacing } from "../lib/theme";

const SEVERITY: Record<Alert["severity"], { color: string; label: string }> = {
  critical: { color: "#FF3B30", label: "CRITICAL" },
  high: { color: "#FF9500", label: "HIGH" },
  medium: { color: "#FFD740", label: "MEDIUM" },
  low: { color: "#00E5FF", label: "LOW" },
};

export default function AlertsScreen() {
  const [filter, setFilter] = useState<"open" | "acknowledged">("open");
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
      <View style={[styles.card, { borderLeftColor: sev.color }]}>
        <View style={styles.row}>
          <View style={[styles.sevBadge, { backgroundColor: `${sev.color}30`, borderColor: sev.color }]}>
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
              onPress={() => ackMutation.mutate(item.id)}
              disabled={ackMutation.isPending}
              style={styles.ackBtn}
            >
              <Text style={styles.ackBtnText}>Okundu</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>ERPAIO · BİLDİRİMLER</Text>
        <View style={styles.tabs}>
          {(["open", "acknowledged"] as const).map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => setFilter(k)}
              style={[styles.tab, filter === k && styles.tabActive]}
            >
              <Text style={[styles.tabText, filter === k && styles.tabTextActive]}>
                {k === "open" ? "Açık" : "Okundu"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {alertsQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing(8) }} />
      ) : alertsQuery.isError ? (
        <Text style={styles.error}>Yüklenemedi: {(alertsQuery.error as Error).message}</Text>
      ) : (
        <FlatList
          data={alertsQuery.data ?? []}
          keyExtractor={(a) => a.id}
          renderItem={renderAlert}
          contentContainerStyle={{ padding: spacing(3) }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {filter === "open" ? "✅ Açık bildirim yok." : "Okundu bildirim yok."}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={alertsQuery.isRefetching}
              onRefresh={() => alertsQuery.refetch()}
              tintColor={colors.accent}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing(3), borderBottomColor: colors.border, borderBottomWidth: 1 },
  brand: { color: colors.accent, fontFamily: font, fontSize: 9, letterSpacing: 3, marginBottom: spacing(2) },
  tabs: { flexDirection: "row", gap: spacing(2) },
  tab: { paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), borderColor: colors.border, borderWidth: 1, borderRadius: radius.md },
  tabActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  tabText: { color: colors.textMuted, fontFamily: font, fontSize: 11 },
  tabTextActive: { color: colors.accent },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: radius.lg,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(2), marginBottom: spacing(1) },
  sevBadge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing(1.5), paddingVertical: 1 },
  sevText: { fontFamily: font, fontSize: 9, letterSpacing: 1 },
  module: { color: colors.textDim, fontFamily: font, fontSize: 9 },
  title: { color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "600", marginBottom: spacing(1) },
  desc: { color: colors.textMuted, fontFamily: font, fontSize: 11, marginBottom: spacing(1.5) },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing(1) },
  timestamp: { color: colors.textDim, fontFamily: font, fontSize: 10 },
  ackBtn: { backgroundColor: colors.borderSoft, borderColor: colors.borderSoft, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing(3), paddingVertical: spacing(1) },
  ackBtnText: { color: colors.textMuted, fontFamily: font, fontSize: 10 },
  empty: { color: colors.textDim, fontFamily: font, fontSize: 12, textAlign: "center", marginTop: spacing(10) },
  error: { color: colors.danger, fontFamily: font, fontSize: 12, textAlign: "center", marginTop: spacing(8), paddingHorizontal: spacing(4) },
});

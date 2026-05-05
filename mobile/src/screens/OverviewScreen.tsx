import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getMetrics } from "../lib/dashboard";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import ErrorState from "../components/ErrorState";
import Skeleton from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Overview">; }

export default function OverviewScreen({ navigation }: Props) {
  const q = useQuery({ queryKey: ["metrics"], queryFn: getMetrics });

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand="ERPAIO · METRİKLER"
        title="Anlık Metrikler"
        description="Son 24 saat ve hafta özeti."
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing(5), paddingBottom: 200 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
      >
        {q.isLoading ? (
          <View style={{ gap: spacing(2) }}>
            <Skeleton height={120} borderRadius={12} />
            <Skeleton height={120} borderRadius={12} />
            <Skeleton height={120} borderRadius={12} />
          </View>
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : q.data ? (
          <View style={styles.grid}>
            <Stat label="Bugün Sorgu" value={q.data.todayQueries.toString()} />
            <Stat label="Bu Hafta" value={q.data.weekQueries.toString()} />
            <Stat label="Cache Hit" value={`%${(q.data.cacheHitRate * 100).toFixed(0)}`} />
            <Stat label="Ort. Latency" value={`${q.data.avgLatencyMs}ms`} />
            <Stat label="Aktif Bağlantı" value={q.data.activeConnections.toString()} />
            <Stat label="Açık Bildirim" value={q.data.openAlerts.toString()} accent={q.data.openAlerts > 0 ? colors.warning : undefined} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(3),
  },
  statCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    minWidth: "46%",
    flexGrow: 1,
  },
  statLabel: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: spacing(2),
  },
  statValue: {
    color: colors.text,
    fontFamily: fontSerif,
    fontSize: 28,
    fontWeight: "400",
    letterSpacing: -1,
  },
});

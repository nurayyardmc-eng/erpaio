import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getWatchlists, type Watchlist } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Watchlists">; }

const OP_LABEL: Record<string, string> = { lt: "<", lte: "≤", gt: ">", gte: "≥", eq: "=" };

export default function WatchlistsScreen({ navigation }: Props) {
  const q = useQuery({ queryKey: ["watchlists"], queryFn: getWatchlists });

  const renderItem = ({ item }: { item: Watchlist }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing(1.5) }}>
        <Text style={styles.name}>{item.name}</Text>
        {!item.enabled && <Text style={styles.disabled}>· devre dışı</Text>}
      </View>
      <Text style={styles.question}>{item.question}</Text>
      <Text style={styles.threshold}>
        Eşik: {OP_LABEL[item.thresholdOp] ?? item.thresholdOp} {item.thresholdVal}
        {item.lastValue !== null ? ` · son değer: ${item.lastValue}` : ""}
      </Text>
      {item.lastCheckedAt && (
        <Text style={styles.timestamp}>Son kontrol: {new Date(item.lastCheckedAt).toLocaleString("tr-TR")}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand="ERPAIO · WATCHLIST"
        title="Watchlists"
        description="Eşik değer aşıldığında otomatik email uyarısı."
        onBack={() => navigation.goBack()}
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
          ListEmptyComponent={<EmptyState title="Watchlist yok" description="Web'den ekleyebilirsin." />}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing(4), marginBottom: spacing(3) },
  name: { color: colors.text, fontFamily: font, fontSize: 15, fontWeight: "600", flex: 1 },
  disabled: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  question: { color: colors.textMuted, fontFamily: font, fontSize: 13, lineHeight: 19, marginBottom: spacing(1.5) },
  threshold: { color: colors.text, fontFamily: font, fontSize: 12, fontWeight: "500", marginBottom: 4 },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
});

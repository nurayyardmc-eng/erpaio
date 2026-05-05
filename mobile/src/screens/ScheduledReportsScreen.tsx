import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getScheduledReports, type ScheduledReport } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "ScheduledReports">; }

const SCHEDULE_LABEL: Record<string, string> = {
  hourly: "Saatlik",
  daily_06: "Günlük 06:00",
  daily_18: "Günlük 18:00",
  weekly_monday: "Haftalık (Pazartesi)",
  monthly_first: "Aylık (1.gün)",
};

export default function ScheduledReportsScreen({ navigation }: Props) {
  const q = useQuery({ queryKey: ["scheduled-reports"], queryFn: getScheduledReports });

  const renderItem = ({ item }: { item: ScheduledReport }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing(1.5) }}>
        <Text style={styles.name}>{item.name}</Text>
        {!item.enabled && <Text style={styles.disabled}>· devre dışı</Text>}
      </View>
      <Text style={styles.question}>{item.question}</Text>
      <Text style={styles.meta}>{SCHEDULE_LABEL[item.schedule] ?? item.schedule} · {item.emailTo}</Text>
      {item.lastRunAt && (
        <Text style={styles.timestamp}>Son çalışma: {new Date(item.lastRunAt).toLocaleString("tr-TR")}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        brand="ERPAIO · RAPORLAR"
        title="Planlı Raporlar"
        description="Otomatik email gönderilen periyodik raporlar."
        onBack={() => navigation.goBack()}
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={3} height={120} gap={10} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.reports ?? []}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing(5), paddingBottom: spacing(40), flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title="Planlı rapor yok" description="Web'den ekleyebilirsin." />}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing(4), marginBottom: spacing(3) },
  name: { color: colors.text, fontFamily: font, fontSize: 15, fontWeight: "600", flex: 1 },
  disabled: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  question: { color: colors.textMuted, fontFamily: font, fontSize: 13, lineHeight: 19, marginBottom: spacing(1.5) },
  meta: { color: colors.text, fontFamily: font, fontSize: 12, marginBottom: 4 },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
});

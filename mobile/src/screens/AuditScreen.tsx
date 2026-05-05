import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getAudit, type AuditEntry } from "../lib/dashboard";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Audit">; }

export default function AuditScreen({ navigation }: Props) {
  const q = useQuery({ queryKey: ["audit"], queryFn: () => getAudit(50) });

  const renderItem = ({ item }: { item: AuditEntry }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.action}>{item.action}</Text>
        <Text style={styles.resource}>{item.resource}</Text>
        <Text style={styles.meta}>
          {item.user?.email ?? "system"} · {new Date(item.createdAt).toLocaleString("tr-TR")}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        brand="ERPAIO · AUDIT"
        title="Aktivite Logu"
        description="Son 50 tenant aktivitesi (login, query, settings change)."
        onBack={() => navigation.goBack()}
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={6} height={60} gap={6} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.entries ?? []}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: spacing(20), flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title="Henüz aktivite yok" description="Kullanıcı aktiviteleri burada görünür." />}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(5),
    backgroundColor: colors.card,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  action: { color: colors.text, fontFamily: fontMono, fontSize: 12, fontWeight: "600", marginBottom: 2 },
  resource: { color: colors.textMuted, fontFamily: font, fontSize: 12, marginBottom: 4 },
  meta: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
});

import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getConnections, type ErpConnection } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "Connections">;
}

export default function ConnectionsScreen({ navigation }: Props) {
  const q = useQuery({ queryKey: ["dash-connections"], queryFn: getConnections });

  const renderItem = ({ item }: { item: ErpConnection }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing(2) }}>
        <Text style={styles.dbName}>{item.dbName}</Text>
        <View style={[styles.statusBadge, item.status === "active" ? styles.statusActive : styles.statusError]}>
          <Text style={[styles.statusText, item.status === "active" ? styles.statusActiveText : styles.statusErrorText]}>
            {item.status === "active" ? "AKTİF" : "HATA"}
          </Text>
        </View>
      </View>
      <Text style={styles.host}>{item.host}:{item.port}</Text>
      <Text style={styles.meta}>{item.erpType} {item.erpProfile ? `· ${item.erpProfile}` : ""}</Text>
      {item.lastSchemaSyncAt && (
        <Text style={styles.meta}>
          Son şema senkronu: {new Date(item.lastSchemaSyncAt).toLocaleString("tr-TR")}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        brand="ERPAIO · BAĞLANTILAR"
        title="ERP Bağlantıları"
        description="Veritabanı bağlantıları read-only. Yeni eklemek için web dashboard kullanın."
        onBack={() => navigation.goBack()}
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={3} height={100} gap={10} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing(5), paddingBottom: spacing(20), flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title="Henüz bağlantı yok"
              description="ERP bağlantısı eklemek için web dashboard'a gidin: erpaio.vercel.app"
            />
          }
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  dbName: { color: colors.text, fontFamily: font, fontSize: 16, fontWeight: "600", flex: 1 },
  statusBadge: { paddingHorizontal: spacing(2), paddingVertical: 3, borderRadius: radius.sm },
  statusActive: { backgroundColor: colors.successSoft },
  statusError: { backgroundColor: colors.errorSoft },
  statusText: { fontFamily: font, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  statusActiveText: { color: colors.success },
  statusErrorText: { color: colors.error },
  host: { color: colors.text, fontFamily: font, fontSize: 13, marginBottom: 2 },
  meta: { color: colors.textSubtle, fontFamily: font, fontSize: 12, marginTop: 2 },
});

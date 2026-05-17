import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getSavedQueries, type SavedQuery } from "../lib/dashboard";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "Saved">;
}

export default function SavedScreen({ navigation }: Props) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["saved-queries"], queryFn: getSavedQueries });

  const renderItem = ({ item }: { item: SavedQuery }) => (
    <View style={styles.card}>
      <Text style={styles.question}>{item.question}</Text>
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
      <Text style={styles.timestamp}>{t.saved.lastUsedLabel}{new Date(item.lastUsedAt).toLocaleDateString("tr-TR")}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.saved.brand}
        title={t.saved.title}
        description={t.saved.description}
        onBack={() => navigation.goBack()}
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
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
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
});

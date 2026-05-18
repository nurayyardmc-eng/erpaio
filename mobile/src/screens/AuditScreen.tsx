import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getAudit, type AuditEntry } from "../lib/dashboard";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { showToast } from "../components/Toast";
import { shareJson } from "../lib/share";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Audit">; }

export default function AuditScreen({ navigation }: Props) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["audit"], queryFn: () => getAudit(50) });

  const renderItem = ({ item }: { item: AuditEntry }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.action}>{item.action}</Text>
        <Text style={styles.resource}>{item.resource}</Text>
        <Text style={styles.meta}>
          {item.user?.email ?? t.audit.systemUser} · {new Date(item.createdAt).toLocaleString("tr-TR")}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.audit.brand}
        title={t.audit.title}
        description={t.audit.description}
        onBack={() => navigation.goBack()}
        right={
          (q.data?.entries.length ?? 0) > 0 ? (
            <TouchableOpacity
              onPress={async () => {
                /* Track FFF — audit log share. */
                const ts = new Date().toISOString().slice(0, 10);
                try {
                  await shareJson(`erpaio-audit-${ts}.json`, {
                    count: q.data!.entries.length,
                    entries: q.data!.entries,
                  });
                } catch {
                  showToast(t.common.error, "error");
                }
              }}
              style={styles.exportBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.exportBtnText}>↓</Text>
            </TouchableOpacity>
          ) : null
        }
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
          contentContainerStyle={{ paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title={t.audit.emptyTitle} description={t.audit.emptyDesc} />}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  exportBtn: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  exportBtnText: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "700" },
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

import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getMySlowQueries, type SlowQueryRow } from "../lib/dashboard";
import { getMe } from "../lib/auth";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "SlowQueries">; }

export default function SlowQueriesScreen({ navigation }: Props) {
  const { t, locale } = useI18n();
  const [minMs, setMinMs] = useState(0);

  const meQuery = useQuery({ queryKey: ["me-role-slowq"], queryFn: getMe });
  const isOwnerOrAdmin =
    meQuery.data?.user.role === "owner" || meQuery.data?.user.role === "admin";

  // Owner/admin değilse API çağırma — 403 alacağımıza UI'da net mesaj göster.
  const q = useQuery({
    queryKey: ["me-slow-queries", minMs],
    queryFn: () => getMySlowQueries({ minMs }),
    enabled: isOwnerOrAdmin,
  });

  const presets: { label: string; v: number }[] = [
    { label: t.slowQueries.presetAll, v: 0 },
    { label: t.slowQueries.preset5s, v: 5_000 },
    { label: t.slowQueries.preset10s, v: 10_000 },
    { label: t.slowQueries.preset30s, v: 30_000 },
  ];

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(locale === "en" ? "en-US" : "tr-TR");

  const renderItem = ({ item }: { item: SlowQueryRow }) => {
    const slowColor = item.durationMs > 10_000 ? colors.error : item.durationMs > 5_000 ? colors.warning : colors.text;
    return (
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2), marginBottom: 4, flexWrap: "wrap" }}>
            <Text style={[styles.duration, { color: slowColor }]}>
              {(item.durationMs / 1000).toFixed(2)}s
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.ok ? colors.successSoft : colors.errorSoft },
              ]}
            >
              <Text style={[styles.statusText, { color: item.ok ? colors.success : colors.error }]}>
                {item.ok ? t.slowQueries.resultOk : t.slowQueries.resultFail}
              </Text>
            </View>
            {item.connection && (
              <Text style={styles.erpText}>
                {item.connection.erpType} · {item.connection.host}
              </Text>
            )}
          </View>
          <Text style={styles.sqlSnippet} selectable numberOfLines={3}>
            {item.sqlSnippet}
          </Text>
          <Text style={styles.timestamp}>{fmtDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.slowQueries.brand}
        title={t.slowQueries.title}
        description={t.slowQueries.description}
        onBack={() => navigation.goBack()}
      />

      {!isOwnerOrAdmin && !meQuery.isLoading ? (
        <View style={styles.ownerOnlyBox}>
          <Text style={styles.ownerOnlyText}>{t.slowQueries.ownerOnly}</Text>
        </View>
      ) : (
        <>
          {/* 24h summary card */}
          {q.data?.summary && (
            <View style={styles.summaryCard}>
              {q.data.summary.count === 0 ? (
                <Text style={styles.summaryEmpty}>{t.slowQueries.summary24hEmpty}</Text>
              ) : (
                <Text style={styles.summaryText}>
                  {t.slowQueries.summary24hPrefix}
                  <Text style={styles.summaryBold}>{q.data.summary.count}</Text>
                  {t.slowQueries.summary24hSeparator}
                  <Text style={styles.summaryBold}>{(q.data.summary.maxMs / 1000).toFixed(1)}s</Text>
                  {" · "}
                  {t.slowQueries.summary24hAvgPrefix}
                  {(q.data.summary.avgMs / 1000).toFixed(1)}s
                </Text>
              )}
            </View>
          )}

          {/* Filter chips */}
          <View style={styles.chipRow}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p.v}
                onPress={() => setMinMs(p.v)}
                style={[styles.chip, minMs === p.v && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, minMs === p.v && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {q.isLoading ? (
            <View style={{ padding: spacing(5) }}>
              <SkeletonList count={5} height={80} gap={6} />
            </View>
          ) : q.isError ? (
            <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
          ) : (
            <FlatList
              data={q.data?.rows ?? []}
              keyExtractor={(r) => r.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 200, flexGrow: 1 }}
              ListEmptyComponent={<EmptyState title={t.slowQueries.emptyFiltered} />}
              refreshControl={
                <RefreshControl
                  refreshing={q.isRefetching}
                  onRefresh={() => q.refetch()}
                  tintColor={colors.brand}
                />
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  summaryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginHorizontal: spacing(4),
    marginTop: spacing(3),
    padding: spacing(3.5),
  },
  summaryText: { color: colors.text, fontFamily: font, fontSize: 13, lineHeight: 19 },
  summaryBold: { fontWeight: "700" },
  summaryEmpty: { color: colors.textMuted, fontFamily: font, fontSize: 13 },
  chipRow: {
    flexDirection: "row",
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
    paddingBottom: spacing(2),
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  chipText: { color: colors.textMuted, fontFamily: font, fontSize: 12, fontWeight: "500" },
  chipTextActive: { color: colors.textInverse },
  row: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(5),
    backgroundColor: colors.card,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  duration: { fontFamily: font, fontSize: 14, fontWeight: "700" },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  statusText: { fontFamily: font, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  erpText: { color: colors.textSubtle, fontFamily: fontMono, fontSize: 11 },
  sqlSnippet: {
    color: colors.textMuted,
    fontFamily: fontMono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  ownerOnlyBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing(3),
    margin: spacing(4),
  },
  ownerOnlyText: { color: colors.warning, fontFamily: font, fontSize: 13, lineHeight: 18, fontStyle: "italic" },
});

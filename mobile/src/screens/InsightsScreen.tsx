import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getConnections, getInsights } from "../lib/dashboard";
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

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "Insights">;
}

export default function InsightsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [connId, setConnId] = useState<string | null>(null);

  const connsQuery = useQuery({ queryKey: ["connections"], queryFn: getConnections });

  // Default-pick first active connection when data loads. Guarded by !connId
  // so it runs at most once per mount; no cascading re-render risk.
  useEffect(() => {
    if (!connId && connsQuery.data) {
      const active = connsQuery.data.filter((c) => c.status === "active");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (active[0]) setConnId(active[0].id);
    }
  }, [connsQuery.data, connId]);

  const insightsQuery = useQuery({
    queryKey: ["insights", connId],
    queryFn: () => getInsights(connId!),
    enabled: !!connId,
  });

  const activeConns = (connsQuery.data ?? []).filter((c) => c.status === "active");

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.insights.brand}
        title={t.insights.title}
        description={t.insights.description}
        onBack={() => navigation.goBack()}
        right={
          insightsQuery.data && (
            (insightsQuery.data.inferredForeignKeys.length > 0 ||
              insightsQuery.data.customItems.length > 0) ? (
              <TouchableOpacity
                onPress={async () => {
                  /* Track LLL — insights share (schema audit / FK migration). */
                  const ts = new Date().toISOString().slice(0, 10);
                  try {
                    await shareJson(`erpaio-insights-${ts}.json`, {
                      connectionId: connId,
                      inferredForeignKeys: insightsQuery.data!.inferredForeignKeys,
                      customItems: insightsQuery.data!.customItems,
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
          )
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(5), paddingBottom: 200 }}>
        {connsQuery.isError ? (
          <ErrorState onRetry={() => connsQuery.refetch()} />
        ) : activeConns.length === 0 ? (
          <EmptyState title={t.insights.noActiveConnTitle} description={t.insights.noActiveConnDesc} />
        ) : !insightsQuery.data ? (
          <SkeletonList count={4} height={60} gap={8} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {t.insights.sectionInferredFK} ({insightsQuery.data.inferredForeignKeys.length})
            </Text>
            <Text style={styles.sectionDesc}>
              {t.insights.sectionInferredFKDesc}
            </Text>
            {insightsQuery.data.inferredForeignKeys.length === 0 ? (
              <Text style={styles.muted}>{t.insights.inferredFKEmpty}</Text>
            ) : (
              insightsQuery.data.inferredForeignKeys.slice(0, 25).map((fk, i) => (
                <View key={i} style={styles.card}>
                  <Text style={styles.fkText}>
                    {fk.fromTable}.{fk.fromColumn} = {fk.toTable}.{fk.toColumn}
                  </Text>
                  <Text style={styles.fkMeta}>{fk.occurrences}{t.insights.occurrencesSuffix}</Text>
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: spacing(5) }]}>
              {t.insights.sectionCustomItems} ({insightsQuery.data.customItems.length})
            </Text>
            <Text style={styles.sectionDesc}>
              {t.insights.sectionCustomItemsDesc}
            </Text>
            {insightsQuery.data.customItems.length === 0 ? (
              <Text style={styles.muted}>{t.insights.customItemsEmpty}</Text>
            ) : (
              insightsQuery.data.customItems.slice(0, 50).map((c, i) => (
                <View key={i} style={styles.card}>
                  <Text style={styles.fkText}>
                    {c.table}{c.column ? `.${c.column}` : ""}
                    {c.dataType ? <Text style={styles.fkMeta}> ({c.dataType})</Text> : null}
                  </Text>
                  <Text style={styles.fkMeta}>{c.reason}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
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
  sectionTitle: { color: colors.text, fontFamily: font, fontSize: 16, fontWeight: "600", marginBottom: 4 },
  sectionDesc: { color: colors.textMuted, fontFamily: font, fontSize: 12, marginBottom: spacing(3) },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
  fkText: { color: colors.text, fontFamily: fontMono, fontSize: 12, lineHeight: 18 },
  fkMeta: { color: colors.textSubtle, fontFamily: font, fontSize: 11, marginTop: 2 },
  muted: { color: colors.textSubtle, fontFamily: font, fontSize: 13 },
});

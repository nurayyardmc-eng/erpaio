import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getConnections, getInsights } from "../lib/dashboard";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "Insights">;
}

export default function InsightsScreen({ navigation }: Props) {
  const [connId, setConnId] = useState<string | null>(null);

  const connsQuery = useQuery({ queryKey: ["connections"], queryFn: getConnections });

  useEffect(() => {
    if (!connId && connsQuery.data) {
      const active = connsQuery.data.filter((c) => c.status === "active");
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
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        brand="ERPAIO · ANALİZ"
        title="Şema Analizi"
        description="Sorgulardan otomatik öğrenilen ilişkiler + profile dışı tablolar."
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(5), paddingBottom: spacing(40) }}>
        {connsQuery.isError ? (
          <ErrorState onRetry={() => connsQuery.refetch()} />
        ) : activeConns.length === 0 ? (
          <EmptyState title="Aktif bağlantı yok" description="Şema analizi için ERP bağlantısı gerekli." />
        ) : !insightsQuery.data ? (
          <SkeletonList count={4} height={60} gap={8} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Çıkarılmış İlişkiler ({insightsQuery.data.inferredForeignKeys.length})
            </Text>
            <Text style={styles.sectionDesc}>
              Başarılı sorgulardan tespit edilen JOIN pattern&apos;leri.
            </Text>
            {insightsQuery.data.inferredForeignKeys.length === 0 ? (
              <Text style={styles.muted}>Yeterli veri yok. 10+ sorgu sorduktan sonra tekrar bakın.</Text>
            ) : (
              insightsQuery.data.inferredForeignKeys.slice(0, 25).map((fk, i) => (
                <View key={i} style={styles.card}>
                  <Text style={styles.fkText}>
                    {fk.fromTable}.{fk.fromColumn} = {fk.toTable}.{fk.toColumn}
                  </Text>
                  <Text style={styles.fkMeta}>{fk.occurrences}× kullanım</Text>
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: spacing(5) }]}>
              Profile Dışı ({insightsQuery.data.customItems.length})
            </Text>
            <Text style={styles.sectionDesc}>
              Müşteri-özgü tablolar / kolonlar. Annotation ekleyin.
            </Text>
            {insightsQuery.data.customItems.length === 0 ? (
              <Text style={styles.muted}>Tüm tablolar profile ile eşleşiyor.</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
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

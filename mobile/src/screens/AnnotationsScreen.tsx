import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getAnnotations, type Annotation } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "Annotations">;
}

export default function AnnotationsScreen({ navigation }: Props) {
  const q = useQuery({ queryKey: ["annotations"], queryFn: getAnnotations });

  const renderItem = ({ item }: { item: Annotation }) => (
    <View style={styles.card}>
      <Text style={styles.label}>
        {item.tableName}{item.columnName ? `.${item.columnName}` : ""}
        {item.hidden && <Text style={styles.hidden}> · gizli</Text>}
      </Text>
      {item.description && <Text style={styles.desc}>{item.description}</Text>}
      <Text style={styles.timestamp}>{new Date(item.updatedAt).toLocaleString("tr-TR")}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        brand="ERPAIO · ŞEMA"
        title="Açıklamalar"
        description="Müşteri-özgü tablo/kolon notları. AI bunları SQL üretirken kullanır."
        onBack={() => navigation.goBack()}
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={4} height={80} gap={10} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.annotations ?? []}
          keyExtractor={(a) => a.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing(5), paddingBottom: spacing(40), flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title="Henüz açıklama yok"
              description="Web'den tablo/kolon açıklaması ekleyin. AI Türkçe iş mantığını daha iyi anlar."
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
  label: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "600", marginBottom: spacing(1) },
  hidden: { color: colors.error, fontWeight: "400" },
  desc: { color: colors.textMuted, fontFamily: font, fontSize: 13, lineHeight: 19, marginBottom: spacing(1.5) },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
});

import { FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteScheduledReport, getScheduledReports, type ScheduledReport } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
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
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["scheduled-reports"], queryFn: getScheduledReports });
  const [menuFor, setMenuFor] = useState<ScheduledReport | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      showToast("Rapor silindi", "success");
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const onDelete = async (r: ScheduledReport) => {
    setMenuFor(null);
    const ok = await confirmDialog({
      title: "Raporu sil?",
      message: `"${r.name}" kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(r.id);
  };

  const renderItem = ({ item }: { item: ScheduledReport }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: spacing(1.5) }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.name}>{item.name}</Text>
            {!item.enabled && <Text style={styles.disabled}>· devre dışı</Text>}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setMenuFor(item)}
          style={styles.menuBtn}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Rapor menüsü"
        >
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.question}>{item.question}</Text>
      <Text style={styles.meta}>{SCHEDULE_LABEL[item.schedule] ?? item.schedule} · {item.emailTo}</Text>
      {item.lastRunAt && (
        <Text style={styles.timestamp}>Son çalışma: {new Date(item.lastRunAt).toLocaleString("tr-TR")}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand="ERPAIO · RAPORLAR"
        title="Planlı Raporlar"
        description="Otomatik email gönderilen periyodik raporlar."
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate("ScheduledReportForm")}
            style={styles.addBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Yeni planlı rapor"
          >
            <Text style={styles.addBtnText}>+ Yeni</Text>
          </TouchableOpacity>
        }
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
          contentContainerStyle={{ padding: spacing(5), paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title="Planlı rapor yok"
              description='Yukarıdaki "+ Yeni" butonuyla periyodik email raporu oluşturun.'
            />
          }
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}

      {menuFor && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setMenuFor(null)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuFor(null)}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{menuFor.name}</Text>
              <TouchableOpacity onPress={() => onDelete(menuFor)} style={styles.sheetItem} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.error }]}>Sil</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuFor(null)} style={[styles.sheetItem, styles.sheetCancel]} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.textMuted }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing(4), marginBottom: spacing(3) },
  name: { color: colors.text, fontFamily: font, fontSize: 15, fontWeight: "600" },
  disabled: { color: colors.textSubtle, fontFamily: font, fontSize: 11, marginLeft: spacing(1) },
  question: { color: colors.textMuted, fontFamily: font, fontSize: 13, lineHeight: 19, marginBottom: spacing(1.5) },
  meta: { color: colors.text, fontFamily: font, fontSize: 12, marginBottom: 4 },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  addBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    marginLeft: spacing(2),
  },
  addBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 13, fontWeight: "600" },
  menuBtn: { paddingHorizontal: spacing(2), paddingVertical: spacing(1) },
  menuDots: { color: colors.textMuted, fontSize: 22, fontWeight: "300" },

  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,10,10,0.4)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 36,
  },
  sheetTitle: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  sheetItem: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(4),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  sheetCancel: { borderBottomWidth: 0, marginTop: spacing(2) },
  sheetText: { color: colors.text, fontFamily: font, fontSize: 16, fontWeight: "500" },
});

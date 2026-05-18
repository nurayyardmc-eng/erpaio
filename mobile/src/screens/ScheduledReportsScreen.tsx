import { FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteScheduledReport, getScheduledReports, runScheduledReportTest, updateScheduledReport, type ScheduledReport } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import { apiErrorMessage } from "../lib/apiError";
import type { Dictionary } from "../lib/i18n/dictionary";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "ScheduledReports">; }

function buildScheduleLabel(t: Dictionary): Record<string, string> {
  return {
    hourly: t.scheduledReports.schedHourly,
    daily_06: t.scheduledReports.schedDaily06,
    daily_18: t.scheduledReports.schedDaily18,
    weekly_monday: t.scheduledReports.schedWeeklyMonday,
    monthly_first: t.scheduledReports.schedMonthlyFirst,
  };
}

export default function ScheduledReportsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const SCHEDULE_LABEL = buildScheduleLabel(t);
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["scheduled-reports"], queryFn: getScheduledReports });
  const [menuFor, setMenuFor] = useState<ScheduledReport | null>(null);

  // Track LL — enable/disable toggle mutation.
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateScheduledReport(id, { enabled }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      showToast(vars.enabled ? t.scheduledReports.enabledToast : t.scheduledReports.disabledToast, "success");
    },
    onError: () => showToast(t.common.error, "error"),
  });

  const onToggle = (r: ScheduledReport) => {
    setMenuFor(null);
    toggleMutation.mutate({ id: r.id, enabled: !r.enabled });
  };

  // Track ZZ — test run mutation (cron beklemeden önizleme).
  const testMutation = useMutation({
    mutationFn: (id: string) => runScheduledReportTest(id),
    onSuccess: (data) => {
      showToast(`${t.scheduledReports.testRunResultPrefix} ${data.rowCount}`, "success");
    },
    onError: () => showToast(t.common.error, "error"),
  });

  const onTest = (r: ScheduledReport) => {
    setMenuFor(null);
    testMutation.mutate(r.id);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      showToast(t.scheduledReports.deletedToast, "success");
    },
    onError: (e: Error) => showToast(apiErrorMessage(e, t), "error"),
  });

  const onDelete = async (r: ScheduledReport) => {
    setMenuFor(null);
    const ok = await confirmDialog({
      title: t.scheduledReports.deleteConfirmTitle,
      message: `"${r.name}"${t.scheduledReports.deleteConfirmMessageSuffix}`,
      confirmLabel: t.scheduledReports.deleteConfirmYes,
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
            {!item.enabled && <Text style={styles.disabled}>{t.scheduledReports.disabledSuffix}</Text>}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setMenuFor(item)}
          style={styles.menuBtn}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={t.scheduledReports.menuA11y}
        >
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.question}>{item.question}</Text>
      <Text style={styles.meta}>{SCHEDULE_LABEL[item.schedule] ?? item.schedule} · {item.emailTo}</Text>
      {item.lastRunAt && (
        <Text style={styles.timestamp}>{t.scheduledReports.lastRunLabel}{new Date(item.lastRunAt).toLocaleString("tr-TR")}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.scheduledReports.brand}
        title={t.scheduledReports.title}
        description={t.scheduledReports.description}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate("ScheduledReportForm")}
            style={styles.addBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t.scheduledReports.addA11y}
          >
            <Text style={styles.addBtnText}>{t.scheduledReports.addLabel}</Text>
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
              title={t.scheduledReports.emptyTitle}
              description={t.scheduledReports.emptyDesc}
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
              <TouchableOpacity
                onPress={() => onTest(menuFor)}
                style={styles.sheetItem}
                activeOpacity={0.6}
                disabled={testMutation.isPending}
              >
                <Text style={styles.sheetText}>
                  {testMutation.isPending ? "..." : t.scheduledReports.testRunBtn}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onToggle(menuFor)}
                style={styles.sheetItem}
                activeOpacity={0.6}
                disabled={toggleMutation.isPending}
              >
                <Text style={styles.sheetText}>
                  {menuFor.enabled ? t.scheduledReports.disableBtn : t.scheduledReports.enableBtn}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(menuFor)} style={styles.sheetItem} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.error }]}>{t.common.delete}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuFor(null)} style={[styles.sheetItem, styles.sheetCancel]} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.textMuted }]}>{t.common.cancel}</Text>
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

import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAlert,
  clearAlertFeedback,
  getAlert,
  markAlertFalsePositive,
  resolveAlert,
  type Alert,
} from "../lib/alerts";
import { colors, font, fontMono, fontSerif, radius, spacing } from "../lib/theme";
import ErrorState from "../components/ErrorState";
import { showToast } from "../components/Toast";
import { confirmDialog } from "../components/Confirm";
import { useI18n } from "../lib/i18n/context";
import type { Dictionary } from "../lib/i18n/dictionary";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AlertsStackParamList } from "./AlertsStackNav";

type Props = NativeStackScreenProps<AlertsStackParamList, "AlertDetail">;

const SEVERITY_COLOR: Record<Alert["severity"], string> = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#F59E0B",
  low: "#737373",
};

function severityLabel(s: Alert["severity"], t: Dictionary): string {
  switch (s) {
    case "critical": return t.alerts.sevCritical;
    case "high": return t.alerts.sevHigh;
    case "medium": return t.alerts.sevMedium;
    case "low": return t.alerts.sevLow;
  }
}

function statusLabel(s: Alert["status"], t: Dictionary): string {
  switch (s) {
    case "open": return t.alerts.statusOpen;
    case "acked": return t.alerts.statusAcked;
    case "resolved": return t.alerts.statusResolved;
  }
}

export default function AlertDetailScreen({ route, navigation }: Props) {
  const { t } = useI18n();
  const { id } = route.params;
  const qc = useQueryClient();
  const [acting, setActing] = useState<"ack" | "resolve" | "fp" | "clearFp" | null>(null);

  const q = useQuery({
    queryKey: ["alert", id],
    queryFn: () => getAlert(id),
  });

  const onAck = useMutationWrapper({
    action: () => acknowledgeAlert(id),
    label: t.alerts.ackedToast,
    failLabel: t.alerts.actionFailedToast,
    qc,
    id,
    nav: navigation,
    setBusy: () => setActing("ack"),
    clearBusy: () => setActing(null),
  });

  const onResolve = async () => {
    const ok = await confirmDialog({
      title: t.alerts.resolveConfirmTitle,
      message: t.alerts.resolveConfirmMessage,
      confirmLabel: t.alerts.confirmYes,
      destructive: false,
    });
    if (!ok) return;
    setActing("resolve");
    try {
      await resolveAlert(id);
      showToast(t.alerts.resolvedToast, "success");
      void qc.invalidateQueries({ queryKey: ["alert", id] });
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : t.alerts.actionFailedToast, "error");
    } finally {
      setActing(null);
    }
  };

  const onMarkFp = async () => {
    const ok = await confirmDialog({
      title: t.alerts.fpConfirmTitle,
      message: t.alerts.fpConfirmMessage,
      confirmLabel: t.alerts.fpConfirmYes,
      destructive: false,
    });
    if (!ok) return;
    setActing("fp");
    try {
      await markAlertFalsePositive(id);
      showToast(t.alerts.fpMarkedToast, "success");
      void qc.invalidateQueries({ queryKey: ["alert", id] });
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : t.alerts.actionFailedToast, "error");
    } finally {
      setActing(null);
    }
  };

  const onClearFp = async () => {
    setActing("clearFp");
    try {
      await clearAlertFeedback(id);
      showToast(t.alerts.fpClearedToast, "success");
      void qc.invalidateQueries({ queryKey: ["alert", id] });
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : t.alerts.actionFailedToast, "error");
    } finally {
      setActing(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backText}>{t.alerts.back}</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>{t.alerts.detailBrand}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(5), paddingBottom: 200 }}>
        {q.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : q.isError || !q.data ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : (
          <>
            <AlertHeader alert={q.data} t={t} />

            {q.data.description && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>{t.alerts.sectionDescription}</Text>
                <Text style={styles.bodyText}>{q.data.description}</Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t.alerts.sectionInfo}</Text>
              <MetaRow label={t.alerts.metaType} value={q.data.type} mono />
              {q.data.module && <MetaRow label={t.alerts.metaModule} value={q.data.module} />}
              <MetaRow label={t.alerts.metaStatus} value={statusLabel(q.data.status, t)} />
              <MetaRow
                label={t.alerts.metaTime}
                value={new Date(q.data.createdAt).toLocaleString()}
              />
            </View>

            {q.data.evidence !== null && q.data.evidence !== undefined && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>{t.alerts.sectionEvidence}</Text>
                <Text style={styles.evidenceText} selectable>
                  {JSON.stringify(q.data.evidence, null, 2)}
                </Text>
              </View>
            )}

            {q.data.status === "open" && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={onAck}
                  disabled={acting !== null}
                  style={[styles.secondaryBtn, acting !== null && { opacity: 0.5 }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryBtnText}>
                    {acting === "ack" ? "..." : t.alerts.ackBtnLabel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onResolve}
                  disabled={acting !== null}
                  style={[styles.primaryBtn, acting !== null && { opacity: 0.5 }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {acting === "resolve" ? "..." : t.alerts.resolveBtnFromOpen}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {q.data.status === "acked" && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={onResolve}
                  disabled={acting !== null}
                  style={[styles.primaryBtn, acting !== null && { opacity: 0.5 }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {acting === "resolve" ? "..." : t.alerts.resolveBtnFromAcked}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* False positive feedback — her durumda görünür (open/acked/resolved).
                Engine learning loop için sinyal toplama; suppression Track NNN'de. */}
            <View style={styles.fpRow}>
              {q.data.falsePositiveAt ? (
                <TouchableOpacity
                  onPress={onClearFp}
                  disabled={acting !== null}
                  style={[styles.fpClearBtn, acting !== null && { opacity: 0.5 }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fpClearBtnText}>
                    {acting === "clearFp" ? "..." : t.alerts.fpClearBtn}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={onMarkFp}
                  disabled={acting !== null}
                  style={[styles.fpMarkBtn, acting !== null && { opacity: 0.5 }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fpMarkBtnText}>
                    {acting === "fp" ? "..." : t.alerts.fpMarkBtn}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Helper hook → onAck callback'i kurar (kod tekrarını azaltır)
function useMutationWrapper(opts: {
  action: () => Promise<void>;
  label: string;
  failLabel: string;
  qc: ReturnType<typeof useQueryClient>;
  id: string;
  nav: NativeStackNavigationProp<AlertsStackParamList, "AlertDetail">;
  setBusy: () => void;
  clearBusy: () => void;
}) {
  return async () => {
    opts.setBusy();
    try {
      await opts.action();
      showToast(opts.label, "success");
      void opts.qc.invalidateQueries({ queryKey: ["alert", opts.id] });
      void opts.qc.invalidateQueries({ queryKey: ["alerts"] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : opts.failLabel, "error");
    } finally {
      opts.clearBusy();
    }
  };
}

function AlertHeader({ alert, t }: { alert: Alert; t: Dictionary }) {
  const sevColor = SEVERITY_COLOR[alert.severity] ?? SEVERITY_COLOR.low;
  return (
    <View style={[styles.headerCard, { borderLeftColor: sevColor }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2), marginBottom: spacing(2), flexWrap: "wrap" }}>
        <View style={[styles.sevBadge, { backgroundColor: `${sevColor}1A` }]}>
          <Text style={[styles.sevText, { color: sevColor }]}>{severityLabel(alert.severity, t)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: alert.status === "open" ? colors.errorSoft : alert.status === "acked" ? colors.warningSoft : colors.successSoft },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  alert.status === "open" ? colors.error : alert.status === "acked" ? colors.warning : colors.success,
              },
            ]}
          >
            {statusLabel(alert.status, t)}
          </Text>
        </View>
        {alert.falsePositiveAt && (
          <View style={[styles.statusBadge, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B", borderWidth: 1 }]}>
            <Text style={[styles.statusText, { color: "#92400E" }]}>{t.alerts.falsePositiveBadge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title}>{alert.title}</Text>
    </View>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, mono && { fontFamily: fontMono, fontSize: 12 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  header: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  backText: { color: colors.brand, fontFamily: font, fontSize: 13, fontWeight: "500", marginBottom: spacing(1) },
  brand: { color: colors.textSubtle, fontFamily: font, fontSize: 10, letterSpacing: 3, fontWeight: "600" },
  headerCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  sectionLabel: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: spacing(2),
  },
  bodyText: { color: colors.text, fontFamily: font, fontSize: 14, lineHeight: 21 },
  title: { color: colors.text, fontFamily: fontSerif, fontSize: 22, fontWeight: "400", letterSpacing: -0.5 },
  sevBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  sevText: { fontFamily: font, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing(2.5),
    paddingVertical: 2,
  },
  statusText: { fontFamily: font, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing(1.5),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  metaLabel: { color: colors.textMuted, fontFamily: font, fontSize: 12, flexShrink: 0, marginRight: spacing(2) },
  metaValue: { color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "500", textAlign: "right", flex: 1 },
  evidenceText: {
    color: colors.text,
    fontFamily: fontMono,
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: colors.bgSubtle,
    padding: spacing(3),
    borderRadius: radius.md,
  },
  actionRow: { flexDirection: "row", gap: spacing(2), marginTop: spacing(2) },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: spacing(3),
    alignItems: "center",
  },
  primaryBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 14, fontWeight: "600" },
  secondaryBtn: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: spacing(3),
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  secondaryBtnText: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "500" },
  fpRow: { marginTop: spacing(3) },
  fpMarkBtn: {
    alignSelf: "flex-start",
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
  },
  fpMarkBtnText: { color: colors.textMuted, fontFamily: font, fontSize: 12, fontWeight: "500" },
  fpClearBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
  },
  fpClearBtnText: { color: colors.warning, fontFamily: font, fontSize: 12, fontWeight: "600" },
});

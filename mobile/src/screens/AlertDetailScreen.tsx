import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAlert,
  getAlert,
  resolveAlert,
  type Alert,
} from "../lib/alerts";
import { colors, font, fontMono, fontSerif, radius, spacing } from "../lib/theme";
import ErrorState from "../components/ErrorState";
import { showToast } from "../components/Toast";
import { confirmDialog } from "../components/Confirm";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AlertsStackParamList } from "./AlertsStackNav";

type Props = NativeStackScreenProps<AlertsStackParamList, "AlertDetail">;

const SEVERITY: Record<Alert["severity"], { color: string; label: string }> = {
  critical: { color: "#EF4444", label: "KRİTİK" },
  high: { color: "#F59E0B", label: "YÜKSEK" },
  medium: { color: "#F59E0B", label: "ORTA" },
  low: { color: "#737373", label: "DÜŞÜK" },
};

const STATUS_LABEL_TR: Record<Alert["status"], string> = {
  open: "Açık",
  acked: "Okundu",
  resolved: "Çözüldü",
};

export default function AlertDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const qc = useQueryClient();
  const [acting, setActing] = useState<"ack" | "resolve" | null>(null);

  const q = useQuery({
    queryKey: ["alert", id],
    queryFn: () => getAlert(id),
  });

  const onAck = useMutationWrapper({
    action: () => acknowledgeAlert(id),
    label: "Okundu olarak işaretlendi.",
    qc,
    id,
    nav: navigation,
    setBusy: () => setActing("ack"),
    clearBusy: () => setActing(null),
  });

  const onResolve = async () => {
    const ok = await confirmDialog({
      title: "Bildirimi çözüldü olarak işaretle?",
      message: "Çözüldü olarak işaretlendikten sonra kapalı listede görünür.",
      confirmLabel: "Evet",
      destructive: false,
    });
    if (!ok) return;
    setActing("resolve");
    try {
      await resolveAlert(id);
      showToast("Bildirim çözüldü.", "success");
      void qc.invalidateQueries({ queryKey: ["alert", id] });
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "İşlem başarısız.", "error");
    } finally {
      setActing(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>ERPAIO · BİLDİRİM DETAYI</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(5), paddingBottom: 200 }}>
        {q.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : q.isError || !q.data ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : (
          <>
            <AlertHeader alert={q.data} />

            {q.data.description && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>AÇIKLAMA</Text>
                <Text style={styles.bodyText}>{q.data.description}</Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>BİLGİLER</Text>
              <MetaRow label="Tip" value={q.data.type} mono />
              {q.data.module && <MetaRow label="Modül" value={q.data.module} />}
              <MetaRow label="Durum" value={STATUS_LABEL_TR[q.data.status] ?? q.data.status} />
              <MetaRow
                label="Zaman"
                value={new Date(q.data.createdAt).toLocaleString("tr-TR")}
              />
            </View>

            {q.data.evidence !== null && q.data.evidence !== undefined && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>KANIT (raw)</Text>
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
                    {acting === "ack" ? "..." : "Okundu olarak işaretle"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onResolve}
                  disabled={acting !== null}
                  style={[styles.primaryBtn, acting !== null && { opacity: 0.5 }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {acting === "resolve" ? "..." : "Çözüldü"}
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
                    {acting === "resolve" ? "..." : "Çözüldü olarak işaretle"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
      showToast(e instanceof Error ? e.message : "İşlem başarısız.", "error");
    } finally {
      opts.clearBusy();
    }
  };
}

function AlertHeader({ alert }: { alert: Alert }) {
  const sev = SEVERITY[alert.severity] ?? SEVERITY.low;
  return (
    <View style={[styles.headerCard, { borderLeftColor: sev.color }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2), marginBottom: spacing(2) }}>
        <View style={[styles.sevBadge, { backgroundColor: `${sev.color}1A` }]}>
          <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
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
            {STATUS_LABEL_TR[alert.status] ?? alert.status}
          </Text>
        </View>
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
});

import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { shareJson } from "../lib/share";
import { showToast } from "../components/Toast";
import {
  getMyNotificationLog,
  type NotificationLogEntry,
  type NotificationChannelSummary,
} from "../lib/dashboard";
import { getMe } from "../lib/auth";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { useI18n } from "../lib/i18n/context";
import type { Dictionary } from "../lib/i18n/dictionary";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "NotificationLog">; }

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  sent: { bg: "#D1FAE5", fg: "#065F46" },
  failed: { bg: "#FEE2E2", fg: "#991B1B" },
  skipped: { bg: "#F1F5F9", fg: "#475569" },
};

function channelLabel(channel: string, t: Dictionary): string {
  switch (channel) {
    case "whatsapp": return t.notificationLog.chanWhatsapp;
    case "email": return t.notificationLog.chanEmail;
    case "push": return t.notificationLog.chanPush;
    case "slack": return t.notificationLog.chanSlack;
    case "teams": return t.notificationLog.chanTeams;
    case "webhook": return t.notificationLog.chanWebhook;
    default: return channel;
  }
}

function statusLabel(status: string, t: Dictionary): string {
  switch (status) {
    case "sent": return t.notificationLog.statusSent;
    case "failed": return t.notificationLog.statusFailed;
    case "skipped": return t.notificationLog.statusSkipped;
    default: return status;
  }
}

export default function NotificationLogScreen({ navigation }: Props) {
  const { t, locale } = useI18n();
  const meQuery = useQuery({ queryKey: ["me-role-notif-log"], queryFn: getMe });
  const isOwnerOrAdmin =
    meQuery.data?.user.role === "owner" || meQuery.data?.user.role === "admin";

  const q = useQuery({
    queryKey: ["me-notification-log"],
    queryFn: () => getMyNotificationLog({ days: 7, limit: 100 }),
    enabled: isOwnerOrAdmin,
  });

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(locale === "en" ? "en-US" : "tr-TR");

  const renderItem = ({ item }: { item: NotificationLogEntry }) => {
    const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE.skipped;
    return (
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2), marginBottom: 4 }}>
            <Text style={styles.channel}>{channelLabel(item.channel, t)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.fg }]}>
                {statusLabel(item.status, t)}
              </Text>
            </View>
          </View>
          {item.recipient && (
            <Text style={styles.recipient} numberOfLines={1}>{item.recipient}</Text>
          )}
          {item.error && (
            <Text style={styles.errorText} numberOfLines={2}>{item.error}</Text>
          )}
          <Text style={styles.timestamp}>{fmtDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.notificationLog.brand}
        title={t.notificationLog.title}
        description={t.notificationLog.description}
        onBack={() => navigation.goBack()}
        right={
          isOwnerOrAdmin && (q.data?.recent.length ?? 0) > 0 ? (
            <TouchableOpacity
              onPress={async () => {
                /* Track AAA — notification log share (mobile CSV parity).
                   JSON paylaşımı (web CSV indirme'ye eşdeğer; mobile
                   Native Share intent kullanıyor). */
                try {
                  const ts = new Date().toISOString().slice(0, 10);
                  await shareJson(`erpaio-notification-log-${ts}.json`, {
                    days: q.data!.days,
                    summary: q.data!.summary,
                    recent: q.data!.recent,
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

      {!isOwnerOrAdmin && !meQuery.isLoading ? (
        <View style={styles.ownerOnlyBox}>
          <Text style={styles.ownerOnlyText}>{t.notificationLog.ownerOnly}</Text>
        </View>
      ) : (
        <>
          {q.data?.summary && Object.keys(q.data.summary).length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {t.notificationLog.summary24hPrefix}
                {q.data.days}
                {t.notificationLog.daysSuffix}
              </Text>
              {Object.entries(q.data.summary).map(([ch, s]: [string, NotificationChannelSummary]) => {
                const successPct = Math.round(s.successRate * 100);
                return (
                  <View key={ch} style={styles.summaryRow}>
                    <Text style={styles.summaryChannel}>{channelLabel(ch, t)}</Text>
                    <Text style={styles.summaryMeta}>
                      <Text style={{ color: colors.success }}>{s.sent} </Text>
                      <Text style={{ color: colors.textMuted }}>/ </Text>
                      <Text style={{ color: s.failed > 0 ? colors.error : colors.textMuted }}>{s.failed} </Text>
                      <Text style={styles.summaryMetaFaint}>(%{successPct})</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {q.isLoading ? (
            <View style={{ padding: spacing(5) }}>
              <SkeletonList count={5} height={64} gap={6} />
            </View>
          ) : q.isError ? (
            <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
          ) : (
            <FlatList
              data={q.data?.recent ?? []}
              keyExtractor={(e) => e.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 200, flexGrow: 1 }}
              ListEmptyComponent={<EmptyState title={t.notificationLog.emptyTitle} />}
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
  exportBtn: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    marginLeft: spacing(2),
  },
  exportBtnText: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "700" },
  ownerOnlyBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing(3),
    margin: spacing(4),
  },
  ownerOnlyText: { color: colors.warning, fontFamily: font, fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  summaryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginHorizontal: spacing(4),
    marginTop: spacing(3),
    padding: spacing(3.5),
  },
  summaryTitle: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: spacing(2),
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing(1.5),
  },
  summaryChannel: { color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "500" },
  summaryMeta: { fontFamily: fontMono, fontSize: 12 },
  summaryMetaFaint: { color: colors.textSubtle, fontFamily: fontMono, fontSize: 11 },
  row: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(5),
    backgroundColor: colors.card,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  channel: { color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: { fontFamily: font, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  recipient: { color: colors.textMuted, fontFamily: fontMono, fontSize: 11, marginBottom: 2 },
  errorText: { color: colors.error, fontFamily: font, fontSize: 11, lineHeight: 15, marginBottom: 2 },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
});

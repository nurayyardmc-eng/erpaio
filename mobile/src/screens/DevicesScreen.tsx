import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyDevices, revokeMyDevice, type MyDevice } from "../lib/dashboard";
import { shareJson } from "../lib/share";
import { getCurrentPushToken } from "../lib/push";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Devices">; }

export default function DevicesScreen({ navigation }: Props) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Mount'ta cihazın kendi push token'ını çekiyoruz — backend'e re-register
  // YAPMADAN salt-okunur read. Permission verilmemişse null döner, rozet gözükmez.
  useEffect(() => {
    void getCurrentPushToken().then(setCurrentToken);
  }, []);

  const q = useQuery({
    queryKey: ["me-devices", currentToken],
    queryFn: () => getMyDevices(currentToken),
  });

  const revoke = async (d: MyDevice) => {
    const name = d.deviceName || t.devices.unnamedDevice;
    const ok = await confirmDialog({
      title: t.devices.revokeConfirmTitle,
      message: `${t.devices.revokeConfirmMessagePrefix}${name}${t.devices.revokeConfirmMessageSuffix}`,
      confirmLabel: t.devices.revokeConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    setRevoking(d.id);
    try {
      await revokeMyDevice(d.id);
      showToast(t.devices.revokedToast, "success");
      // Tüm push-token bağımlı view'lar refresh — devices listesi + activity log.
      void qc.invalidateQueries({ queryKey: ["me-devices"] });
      void qc.invalidateQueries({ queryKey: ["me-activity"] });
    } catch {
      showToast(t.devices.revokeFailedToast, "error");
    } finally {
      setRevoking(null);
    }
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(locale === "en" ? "en-US" : "tr-TR");

  const renderItem = ({ item }: { item: MyDevice }) => (
    <View style={[styles.row, item.isCurrent && styles.rowCurrent]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
          <Text style={styles.deviceName}>
            {item.deviceName || t.devices.unnamedDevice}
          </Text>
          {item.isCurrent && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t.devices.thisDeviceBadge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          <Text style={styles.platform}>{item.platform}</Text>
          {`  ·  ${t.devices.lastSeenLabel}${fmtDate(item.lastSeenAt)}`}
        </Text>
        <Text style={styles.metaFaint}>
          {t.devices.addedLabel}{fmtDate(item.createdAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => revoke(item)}
        disabled={revoking === item.id}
        style={[styles.revokeBtn, revoking === item.id && styles.revokeBtnDisabled]}
        activeOpacity={0.7}
      >
        <Text style={styles.revokeBtnText}>
          {revoking === item.id ? t.devices.revokingBtn : t.devices.revokeBtn}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.devices.brand}
        title={t.devices.title}
        description={t.devices.description}
        onBack={() => navigation.goBack()}
        right={
          (q.data?.devices.length ?? 0) > 0 ? (
            <TouchableOpacity
              onPress={async () => {
                /* Track MMM — devices share (push token audit). Token body
                   share edilmez; sadece metadata (platform/lastSeen/createdAt). */
                const ts = new Date().toISOString().slice(0, 10);
                try {
                  const sanitized = q.data!.devices.map((d) => ({
                    id: d.id,
                    platform: d.platform,
                    deviceName: d.deviceName,
                    lastSeenAt: d.lastSeenAt,
                    createdAt: d.createdAt,
                  }));
                  await shareJson(`erpaio-devices-${ts}.json`, {
                    count: sanitized.length,
                    devices: sanitized,
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
        <View style={{ padding: spacing(5) }}><SkeletonList count={4} height={70} gap={6} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.devices ?? []}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState title={t.devices.emptyTitle} description={t.devices.emptyDesc} />
          }
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching}
              onRefresh={() => q.refetch()}
              tintColor={colors.brand}
            />
          }
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
  rowCurrent: { backgroundColor: colors.brandSoft },
  deviceName: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "600" },
  badge: {
    marginLeft: spacing(2),
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  badgeText: { color: "#FFFFFF", fontFamily: font, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  meta: { color: colors.textMuted, fontFamily: font, fontSize: 12 },
  metaFaint: { color: colors.textSubtle, fontFamily: font, fontSize: 11, marginTop: 2 },
  platform: { fontFamily: fontMono, fontSize: 11 },
  revokeBtn: {
    marginLeft: spacing(2),
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  revokeBtnDisabled: { opacity: 0.5 },
  revokeBtnText: { color: colors.error, fontFamily: font, fontSize: 12, fontWeight: "600" },
});

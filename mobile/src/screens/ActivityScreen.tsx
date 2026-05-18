import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getMyActivity, type MyActivityEntry } from "../lib/dashboard";
import { colors, font, fontMono, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Activity">; }

// Action key → human-readable label (mirrors web /dashboard/activity dictionaries).
const ACTION_LABELS_TR: Record<string, string> = {
  "profile.update": "Profil güncelleme",
  "profile.avatar.update": "Avatar güncelleme",
  "password.change": "Şifre değiştirme",
  "password.reset": "Şifre sıfırlama",
  "mfa.enable": "MFA aktivasyonu",
  "mfa.disable": "MFA devre dışı",
  "mfa.recovery.regenerate": "Kurtarma kodu yenileme",
  "mfa.recovery.consume": "Kurtarma kodu kullanımı",
  "session.revoke": "Oturum sonlandırma",
  "tenant.update": "Tenant ayarları güncelleme",
  "tenant.branding.update": "Branding güncelleme",
  "tenant.delete": "Hesap silme",
  "team.invite": "Takım üyesi davet",
  "team.member.remove": "Takım üyesi silme",
  "team.role.change": "Rol değiştirme",
  "integration.update": "Entegrasyon güncelleme",
  "ip_allowlist.add": "IP allowlist ekleme",
  "ip_allowlist.remove": "IP allowlist silme",
  "api_token.create": "API token oluşturma",
  "api_token.revoke": "API token iptali",
  "notification.prefs.update": "Bildirim tercihleri güncellendi",
  "push_token.revoke": "Cihaz (push) silindi",
  "alert.feedback.false_positive": "Alert yanlış alarm olarak işaretlendi",
  "alert.feedback.clear": "Alert FP işareti kaldırıldı",
  "connection.schema.sync": "ERP şeması senkronize edildi",
  "email.change.request": "Email değişikliği talebi",
  "email.change.complete": "Email değişikliği tamamlandı",
  "tenant.export": "Tenant veri export'u (KVKK md. 20)",
};

const ACTION_LABELS_EN: Record<string, string> = {
  "profile.update": "Profile updated",
  "profile.avatar.update": "Avatar updated",
  "password.change": "Password changed",
  "password.reset": "Password reset",
  "mfa.enable": "MFA enabled",
  "mfa.disable": "MFA disabled",
  "mfa.recovery.regenerate": "Recovery codes regenerated",
  "mfa.recovery.consume": "Recovery code used",
  "session.revoke": "Session revoked",
  "tenant.update": "Tenant settings updated",
  "tenant.branding.update": "Branding updated",
  "tenant.delete": "Account deleted",
  "team.invite": "Team member invited",
  "team.member.remove": "Team member removed",
  "team.role.change": "Role changed",
  "integration.update": "Integration updated",
  "ip_allowlist.add": "IP allowlist added",
  "ip_allowlist.remove": "IP allowlist removed",
  "api_token.create": "API token created",
  "api_token.revoke": "API token revoked",
  "notification.prefs.update": "Notification preferences updated",
  "push_token.revoke": "Device (push) removed",
  "alert.feedback.false_positive": "Alert marked as false positive",
  "alert.feedback.clear": "Alert FP mark cleared",
  "connection.schema.sync": "ERP schema synced",
  "email.change.request": "Email change requested",
  "email.change.complete": "Email change completed",
  "tenant.export": "Tenant data export (GDPR Art. 20)",
};

export default function ActivityScreen({ navigation }: Props) {
  const { t, locale } = useI18n();
  const q = useQuery({ queryKey: ["me-activity"], queryFn: () => getMyActivity(100) });

  const actionLabel = (action: string) =>
    (locale === "en" ? ACTION_LABELS_EN : ACTION_LABELS_TR)[action] ?? action;

  const renderItem = ({ item }: { item: MyActivityEntry }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.action}>{actionLabel(item.action)}</Text>
        <Text style={styles.meta}>
          {new Date(item.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
          {item.ipAddress ? <Text style={styles.ip}>{`  ·  ${item.ipAddress}`}</Text> : null}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.activity.brand}
        title={t.activity.title}
        description={t.activity.description}
        onBack={() => navigation.goBack()}
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={6} height={60} gap={6} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.activities ?? []}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title={t.activity.emptyTitle} />}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  row: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(5),
    backgroundColor: colors.card,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  action: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "600", marginBottom: 4 },
  meta: { color: colors.textMuted, fontFamily: font, fontSize: 12 },
  ip: { fontFamily: fontMono, fontSize: 11, color: colors.textSubtle },
});

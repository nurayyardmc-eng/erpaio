import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getMyConsents, type MyConsentEntry } from "../lib/dashboard";
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

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Consents">; }

// Mirrors web /dashboard/consents dictionaries — keep in sync with TYPE_LABELS there.
const TYPE_LABELS_TR: Record<string, string> = {
  kvkk_signup: "KVKK aydınlatma metni",
  kvkk_marketing: "Pazarlama tercihleri (KVKK)",
  kvkk_cookies: "Çerez tercihleri",
  terms: "Kullanım Koşulları",
  privacy: "Gizlilik Politikası",
};

const TYPE_LABELS_EN: Record<string, string> = {
  kvkk_signup: "KVKK consent notice",
  kvkk_marketing: "Marketing preferences (KVKK)",
  kvkk_cookies: "Cookie preferences",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

const ACTION_LABELS_TR: Record<string, string> = {
  granted: "Onaylandı",
  withdrawn: "Geri çekildi",
};

const ACTION_LABELS_EN: Record<string, string> = {
  granted: "Granted",
  withdrawn: "Withdrawn",
};

const ACTION_COLORS: Record<string, { fg: string; bg: string }> = {
  granted: { fg: colors.success, bg: colors.successSoft },
  withdrawn: { fg: colors.error, bg: colors.errorSoft },
};

export default function ConsentsScreen({ navigation }: Props) {
  const { t, locale } = useI18n();
  const q = useQuery({ queryKey: ["me-consents"], queryFn: () => getMyConsents() });

  const typeLabel = (key: string) =>
    (locale === "en" ? TYPE_LABELS_EN : TYPE_LABELS_TR)[key] ?? key;
  const actionLabel = (key: string) =>
    (locale === "en" ? ACTION_LABELS_EN : ACTION_LABELS_TR)[key] ?? key;

  const renderItem = ({ item }: { item: MyConsentEntry }) => {
    const ac = ACTION_COLORS[item.action] ?? ACTION_COLORS.granted;
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.type}>{typeLabel(item.type)}</Text>
          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
            {item.documentVer ? <Text style={styles.ver}>{`  ·  v${item.documentVer}`}</Text> : null}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: ac.bg }]}>
          <Text style={[styles.badgeText, { color: ac.fg }]}>{actionLabel(item.action)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.consents.brand}
        title={t.consents.title}
        description={t.consents.description}
        onBack={() => navigation.goBack()}
        right={
          (q.data?.consents.length ?? 0) > 0 ? (
            <TouchableOpacity
              onPress={async () => {
                /* Track HHH — consents share (KVKK audit trail mobile). */
                const ts = new Date().toISOString().slice(0, 10);
                try {
                  await shareJson(`erpaio-consents-${ts}.json`, {
                    count: q.data!.consents.length,
                    consents: q.data!.consents,
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
        <View style={{ padding: spacing(5) }}><SkeletonList count={6} height={60} gap={6} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.consents ?? []}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title={t.consents.emptyTitle} />}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
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
  type: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "600", marginBottom: 4 },
  meta: { color: colors.textMuted, fontFamily: font, fontSize: 12 },
  ver: { fontFamily: fontMono, fontSize: 11, color: colors.textSubtle },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing(2.5),
    paddingVertical: 4,
    marginLeft: spacing(2),
  },
  badgeText: { fontFamily: font, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
});

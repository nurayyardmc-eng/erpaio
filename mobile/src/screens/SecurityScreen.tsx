import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { api } from "../lib/api";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Security">; }

export default function SecurityScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const d = await api<{ user: { totpEnabled: boolean } }>("/api/me");
      setEnabled(d.user.totpEnabled);
    } catch {
      setEnabled(false);
    }
  };

  // Initial data fetch on mount — refresh() triggers fetch + setState.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, []);

  const disable = async () => {
    const ok = await confirmDialog({
      title: t.security.disableConfirmTitle,
      message: t.security.disableConfirmMessage,
      confirmLabel: t.security.disableConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await api("/api/auth/mfa/setup", { method: "DELETE" });
      showToast(t.security.mfaDisabledToast, "success");
      refresh();
    } catch {
      showToast(t.security.mfaDisableFailedToast, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.security.brand}
        title={t.security.title}
        description={t.security.description}
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(5), paddingBottom: 200 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.security.sectionMfa}</Text>

          {enabled === null ? (
            <ActivityIndicator color={colors.brand} />
          ) : enabled ? (
            <>
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>{t.security.mfaActiveBadge}</Text>
              </View>
              <Text style={styles.desc}>
                {t.security.mfaActiveDesc}
              </Text>
              <TouchableOpacity onPress={disable} disabled={loading} style={styles.dangerBtn} activeOpacity={0.8}>
                <Text style={styles.dangerBtnText}>{loading ? "..." : t.security.mfaDisableBtn}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.warning}>{t.security.mfaInactive}</Text>
              <Text style={styles.desc}>
                {t.security.mfaInactiveDesc}
              </Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.security.sectionApiToken}</Text>
          <Text style={styles.desc}>
            {t.security.apiTokenDesc}
          </Text>
          <Text style={styles.linkText}>erpaio.vercel.app/dashboard/security</Text>
        </View>
      </ScrollView>
    </View>
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
  sectionTitle: { color: colors.text, fontFamily: font, fontSize: 16, fontWeight: "600", marginBottom: spacing(3) },
  activeBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing(2.5),
    paddingVertical: 4,
    marginBottom: spacing(2),
  },
  activeText: { color: colors.success, fontFamily: font, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  warning: { color: colors.warning, fontFamily: font, fontSize: 13, fontWeight: "500", marginBottom: spacing(2) },
  desc: { color: colors.textMuted, fontFamily: font, fontSize: 13, lineHeight: 20, marginBottom: spacing(3) },
  linkText: { color: colors.brand, fontFamily: font, fontSize: 13, fontWeight: "500" },
  dangerBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  dangerBtnText: { color: colors.error, fontFamily: font, fontSize: 13, fontWeight: "600" },
});

import { useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getTenant } from "../lib/tenant";
import { trialBannerStatus, type TrialUrgency } from "../lib/trialBanner";
import { useI18n } from "../lib/i18n/context";
import { font, spacing } from "../lib/theme";

/**
 * Trial countdown banner — Track AAAA. Tenant trial sona ermesine yaklaşırken
 * kullanıcıya plan yükseltme hatırlatması. Web ikizi src/components/TrialBanner.tsx.
 *
 * Pricing sayfası mobile'da yok → "Planı yükselt" butonu web pricing sayfasını
 * Linking ile açar.
 *
 * Banner null dönerse hiçbir şey render edilmez (>14 gün veya paid plan).
 */

const STYLES: Record<TrialUrgency, { bg: string; fg: string }> = {
  info: { bg: "#F1F5F9", fg: "#0F172A" },
  warning: { bg: "#FEF3C7", fg: "#92400E" },
  danger: { bg: "#FEE2E2", fg: "#991B1B" },
  expired: { bg: "#FEE2E2", fg: "#991B1B" },
};

const PRICING_URL = "https://erpaio.vercel.app/pricing";

export default function TrialBanner() {
  const { t } = useI18n();
  const tenantQuery = useQuery({
    queryKey: ["tenant-trial-banner"],
    queryFn: getTenant,
    // 5 dakika cache — banner günde 1 kez state değiştirir, sıklıkla fetch'e gerek yok.
    staleTime: 5 * 60_000,
  });
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !tenantQuery.data) return null;
  const status = trialBannerStatus(tenantQuery.data);
  if (!status) return null;

  const style = STYLES[status.urgency];
  const expired = status.urgency === "expired";

  const message = expired
    ? t.trialBanner.expiredMessage
    : status.daysLeft === 1
      ? t.trialBanner.lastDayMessage
      : `${t.trialBanner.daysLeftPrefix}${status.daysLeft}${t.trialBanner.daysLeftSuffix}`;

  return (
    <View style={[styles.row, { backgroundColor: style.bg }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: style.fg }]}>
          {expired ? t.trialBanner.expiredTitle : t.trialBanner.title}
        </Text>
        <Text style={[styles.message, { color: style.fg }]}>{message}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => void Linking.openURL(PRICING_URL).catch(() => {})}
          style={[styles.upgradeBtn, { backgroundColor: style.fg }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.upgradeBtnText, { color: style.bg }]}>
            {t.trialBanner.upgradeBtn}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          accessibilityLabel={t.trialBanner.dismissAria}
          style={styles.dismissBtn}
        >
          <Text style={[styles.dismissText, { color: style.fg }]}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    gap: spacing(2),
  },
  title: { fontFamily: font, fontSize: 12, fontWeight: "700" },
  message: { fontFamily: font, fontSize: 11, marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), flexShrink: 0 },
  upgradeBtn: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: 100,
  },
  upgradeBtnText: { fontFamily: font, fontSize: 11, fontWeight: "700" },
  dismissBtn: { padding: spacing(1) },
  dismissText: { fontFamily: font, fontSize: 18, fontWeight: "300" },
});

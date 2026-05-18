import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  generateRecoveryCodes,
  getRecoveryCodeStatus,
} from "../lib/auth";
import {
  getApiSessions,
  renameApiSession,
  revokeApiSession,
  type ApiSession,
} from "../lib/dashboard";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
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
              <RecoveryStatusRow />
              <TouchableOpacity onPress={disable} disabled={loading} style={styles.dangerBtn} activeOpacity={0.8}>
                <Text style={styles.dangerBtnText}>{loading ? "..." : t.security.mfaDisableBtn}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.warning}>{t.security.mfaInactive}</Text>
              <Text style={[styles.desc, { marginBottom: spacing(3) }]}>
                {t.security.mfaInactiveDesc}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("MfaEnable")}
                style={styles.enableMfaBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.enableMfaBtnText}>{t.security.mfaEnableBtn}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <ActiveSessionsSection />
      </ScrollView>
    </View>
  );
}

/**
 * Aktif API token oturumları. /api/me/sessions (= ApiToken[]) listesi.
 * Web /dashboard/security'deki "Aktif Oturumlar" section'ının mobile karşılığı.
 *
 * Kullanıcı current oturumunu sonlandıramaz (server `isCurrent: true` döner;
 * UI disable + uyarı toast).
 */
function ActiveSessionsSection() {
  const { t, locale } = useI18n();
  const [revoking, setRevoking] = useState<string | null>(null);
  // Track FFFF — inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const q = useQuery({ queryKey: ["me-sessions"], queryFn: getApiSessions });

  const startRename = (s: ApiSession) => {
    setRenamingId(s.id);
    setRenameValue(s.name);
  };
  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };
  const saveRename = async (s: ApiSession) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === s.name) {
      cancelRename();
      return;
    }
    setRenamingId(null);
    try {
      await renameApiSession(s.id, trimmed);
      showToast(t.security.sessionRenamedToast, "success");
      void q.refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.security.sessionRenameFailed;
      showToast(msg, "error");
    }
  };

  const revoke = useCallback(
    async (s: ApiSession) => {
      if (s.isCurrent) {
        showToast(t.security.sessionRevokeCurrentBlocked, "error");
        return;
      }
      const ok = await confirmDialog({
        title: t.security.sessionRevokeConfirmTitle,
        message: t.security.sessionRevokeConfirmMessage,
        confirmLabel: t.security.sessionRevokeConfirmYes,
        destructive: true,
      });
      if (!ok) return;
      setRevoking(s.id);
      try {
        await revokeApiSession(s.id);
        showToast(t.security.sessionRevokedToast, "success");
        void q.refetch();
      } catch {
        showToast(t.security.sessionRevokeFailedToast, "error");
      } finally {
        setRevoking(null);
      }
    },
    [q, t],
  );

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(locale === "en" ? "en-US" : "tr-TR");

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t.security.sessionsTitle}</Text>
      <Text style={styles.desc}>{t.security.sessionsDescription}</Text>
      {q.isLoading ? (
        <ActivityIndicator color={colors.brand} />
      ) : q.isError ? (
        <Text style={[styles.warning, { marginBottom: 0 }]}>{t.security.sessionRevokeFailedToast}</Text>
      ) : (q.data?.sessions ?? []).length === 0 ? (
        <Text style={[styles.desc, { marginBottom: 0 }]}>{t.security.sessionsEmpty}</Text>
      ) : (
        (q.data?.sessions ?? []).map((s, idx, arr) => (
          <View
            key={s.id}
            style={[
              styles.sessionRow,
              idx === arr.length - 1 && { borderBottomWidth: 0 },
              s.isCurrent && styles.sessionRowCurrent,
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              {renamingId === s.id ? (
                <View style={{ flexDirection: "row", gap: spacing(1.5), marginBottom: spacing(1.5) }}>
                  <TextInput
                    value={renameValue}
                    onChangeText={setRenameValue}
                    autoFocus
                    maxLength={80}
                    style={styles.renameInput}
                    onSubmitEditing={() => saveRename(s)}
                  />
                  <TouchableOpacity onPress={() => saveRename(s)} style={styles.renameSaveBtn}>
                    <Text style={styles.renameSaveBtnText}>{t.security.sessionRenameSave}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={cancelRename} style={styles.renameCancelBtn}>
                    <Text style={styles.renameCancelBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 2, gap: spacing(1) }}>
                  <Text style={styles.sessionName}>{s.name}</Text>
                  <TouchableOpacity
                    onPress={() => startRename(s)}
                    accessibilityLabel={t.security.sessionRenameBtn}
                    style={styles.renameIconBtn}
                  >
                    <Text style={styles.renameIcon}>✏︎</Text>
                  </TouchableOpacity>
                  {s.isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>{t.security.sessionsCurrent}</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.sessionMeta}>
                {s.lastUsedAt
                  ? `${t.security.sessionsLastUsed}${fmtDate(s.lastUsedAt)}`
                  : t.security.sessionsNeverUsed}
              </Text>
              <Text style={styles.sessionMetaFaint}>
                {t.security.sessionsExpires}{fmtDate(s.expiresAt)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => revoke(s)}
              disabled={revoking === s.id || s.isCurrent}
              style={[
                styles.revokeBtn,
                (revoking === s.id || s.isCurrent) && styles.revokeBtnDisabled,
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.revokeBtnText}>
                {revoking === s.id ? "..." : t.security.sessionRevoke}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

/**
 * MFA aktif iken kalan recovery code sayısı + regenerate butonu.
 * Eski kodlar tükendiyse kullanıcı authenticator app'i kaybetmesi durumunda
 * hesabına erişemez — bu yüzden status sürekli görünür.
 */
function RecoveryStatusRow() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [shownCodes, setShownCodes] = useState<string[] | null>(null);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["mfa-recovery-status"], queryFn: getRecoveryCodeStatus });

  const regenerate = async () => {
    const ok = await confirmDialog({
      title: t.mfaSetup.regenerateConfirmTitle,
      message: t.mfaSetup.regenerateConfirmMessage,
      confirmLabel: t.mfaSetup.regenerateConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { codes } = await generateRecoveryCodes();
      setShownCodes(codes);
      void qc.invalidateQueries({ queryKey: ["mfa-recovery-status"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.common.error;
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const shareCodes = async () => {
    if (!shownCodes) return;
    try {
      await Share.share({ message: shownCodes.join("\n") });
    } catch {
      // user cancelled
    }
  };

  return (
    <View style={styles.recoveryRow}>
      {q.isLoading ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <Text style={styles.recoveryStatusText}>
          {q.data && q.data.total > 0
            ? `${t.mfaSetup.recoveryStatusPrefix}${q.data.remaining}${t.mfaSetup.recoveryStatusSuffix}`
            : t.mfaSetup.recoveryNeverGenerated}
        </Text>
      )}
      <TouchableOpacity
        onPress={regenerate}
        disabled={busy}
        style={[styles.regenerateBtn, busy && { opacity: 0.5 }]}
        activeOpacity={0.7}
      >
        <Text style={styles.regenerateBtnText}>{t.mfaSetup.regenerateBtn}</Text>
      </TouchableOpacity>

      {shownCodes && (
        <View style={styles.regenerateCodesBox}>
          <View style={styles.warningBoxInline}>
            <Text style={styles.warningTextInline}>{t.mfaSetup.stepRecoveryWarning}</Text>
          </View>
          {shownCodes.map((c) => (
            <Text key={c} style={styles.recoveryCodeInline} selectable>
              {c}
            </Text>
          ))}
          <View style={{ flexDirection: "row", gap: spacing(2), marginTop: spacing(2) }}>
            <TouchableOpacity onPress={shareCodes} style={styles.outlineBtnSmall} activeOpacity={0.7}>
              <Text style={styles.outlineBtnSmallText}>{t.mfaSetup.shareCodesBtn}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShownCodes(null)} style={styles.outlineBtnSmall} activeOpacity={0.7}>
              <Text style={styles.outlineBtnSmallText}>{t.mfaSetup.doneBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(3),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  sessionRowCurrent: { backgroundColor: colors.brandSoft, marginHorizontal: -spacing(4), paddingHorizontal: spacing(4), borderRadius: radius.md },
  sessionName: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "600" },
  currentBadge: {
    marginLeft: spacing(2),
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  currentBadgeText: { color: "#FFFFFF", fontFamily: font, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  sessionMeta: { color: colors.textMuted, fontFamily: font, fontSize: 12, marginTop: 2 },
  sessionMetaFaint: { color: colors.textSubtle, fontFamily: fontMono, fontSize: 11, marginTop: 2 },
  revokeBtn: {
    marginLeft: spacing(2),
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  revokeBtnDisabled: { opacity: 0.4 },
  revokeBtnText: { color: colors.error, fontFamily: font, fontSize: 12, fontWeight: "600" },
  renameIconBtn: { padding: spacing(0.5) },
  renameIcon: { color: colors.textSubtle, fontSize: 12 },
  renameInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    color: colors.text,
    fontFamily: font,
    fontSize: 13,
  },
  renameSaveBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
    justifyContent: "center",
  },
  renameSaveBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 12, fontWeight: "600" },
  renameCancelBtn: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    justifyContent: "center",
  },
  renameCancelBtnText: { color: colors.textMuted, fontFamily: font, fontSize: 14, fontWeight: "500" },
  enableMfaBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2.5),
  },
  enableMfaBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 13, fontWeight: "600" },
  recoveryRow: {
    marginBottom: spacing(3),
    paddingTop: spacing(2),
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
  },
  recoveryStatusText: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 12,
    marginBottom: spacing(2),
    marginTop: spacing(2),
  },
  regenerateBtn: {
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  regenerateBtnText: { color: colors.text, fontFamily: font, fontSize: 12, fontWeight: "500" },
  regenerateCodesBox: {
    marginTop: spacing(3),
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
  },
  warningBoxInline: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  warningTextInline: { color: colors.warning, fontFamily: font, fontSize: 11, fontWeight: "600", lineHeight: 16 },
  recoveryCodeInline: {
    color: colors.text,
    fontFamily: fontMono,
    fontSize: 14,
    letterSpacing: 1.5,
    textAlign: "center",
    paddingVertical: spacing(1),
  },
  outlineBtnSmall: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: spacing(2),
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  outlineBtnSmallText: { color: colors.text, fontFamily: font, fontSize: 12, fontWeight: "500" },
});

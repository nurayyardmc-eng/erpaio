import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  generateRecoveryCodes,
  setupMfa,
  verifyMfaSetup,
  type MfaSetupResponse,
} from "../lib/auth";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import ErrorState from "../components/ErrorState";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "MfaEnable">; }

type Step = "loading" | "setup" | "recovery";

/**
 * MFA TOTP setup akışı — 3 fazlı state machine:
 *   1. loading: POST /api/auth/mfa/setup yapılıyor (mount'ta tetiklenir)
 *   2. setup:   secret + URI gösterilir, kullanıcı authenticator'a ekler
 *               ve 6 haneli kodu girer → PATCH ile doğrulanır
 *   3. recovery: PATCH başarılı → POST recovery-codes ile 10 kod üretilir,
 *               kullanıcıya BİR KEZ gösterilir; kaydetmesi gerekir.
 *
 * "Done" butonuna basınca SecurityScreen'e geri döner ve `me` query
 * invalidate edilir (totpEnabled badge güncellenir).
 */
export default function MfaEnableScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("loading");
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await setupMfa();
        setSetupData(data);
        setStep("setup");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        // Server 403 ise plan-gate mesajı; aksi halde generic.
        if (/Pro\+|MFA yalnızca|MFA is only/i.test(msg)) {
          setSetupError(t.mfaSetup.setupErrorPlanGate);
        } else {
          setSetupError(msg || t.mfaSetup.setupErrorGeneric);
        }
        setStep("setup"); // setup state — error sub-state
      }
    })();
  }, [t]);

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      showToast(t.mfaSetup.verifyError, "error");
      return;
    }
    setVerifying(true);
    try {
      await verifyMfaSetup(code);
      // Verify başarılı → recovery code'ları üret + adımı ilerlet.
      const { codes } = await generateRecoveryCodes();
      setRecoveryCodes(codes);
      setStep("recovery");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.mfaSetup.verifyError;
      showToast(msg, "error");
    } finally {
      setVerifying(false);
    }
  };

  const openAuthApp = () => {
    if (!setupData) return;
    // otpauth:// URI — iOS/Android'de yüklü authenticator app'lerini açar.
    // Bazı cihazlarda app yoksa "no handler" hatası fırlar — sessizce yutuyoruz
    // (kullanıcı secret'ı manuel kopyalayabilir).
    void Linking.openURL(setupData.uri).catch(() => {
      showToast(t.mfaSetup.shareSecretBtn, "error");
    });
  };

  const shareSecret = async () => {
    if (!setupData) return;
    try {
      await Share.share({ message: setupData.secret });
    } catch {
      // user cancelled
    }
  };

  const shareCodes = async () => {
    try {
      await Share.share({ message: recoveryCodes.join("\n") });
    } catch {
      // user cancelled
    }
  };

  const finish = () => {
    showToast(t.mfaSetup.completeToast, "success");
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.mfaSetup.brand}
        title={t.mfaSetup.title}
        description={t.mfaSetup.description}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing(5), paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === "loading" ? (
          <ActivityIndicator color={colors.brand} />
        ) : setupError ? (
          <View style={styles.card}>
            <ErrorState message={setupError} onRetry={() => navigation.goBack()} />
          </View>
        ) : step === "setup" && setupData ? (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>{t.mfaSetup.stepSetupTitle}</Text>
            <Text style={styles.hint}>{t.mfaSetup.stepSetupHint}</Text>

            <Text style={styles.label}>{t.mfaSetup.secretLabel}</Text>
            <TextInput
              value={setupData.secret}
              editable={false}
              selectTextOnFocus
              multiline
              style={styles.secretBox}
            />
            <Text style={styles.secretHint}>{t.mfaSetup.secretCopyHint}</Text>

            <View style={styles.btnRow}>
              <TouchableOpacity onPress={openAuthApp} style={styles.primaryBtn} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>{t.mfaSetup.openAuthAppBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={shareSecret} style={styles.secondaryBtn} activeOpacity={0.7}>
                <Text style={styles.secondaryBtnText}>{t.mfaSetup.shareSecretBtn}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>{t.mfaSetup.codeLabel}</Text>
            <TextInput
              value={code}
              onChangeText={(s) => setCode(s.replace(/\D/g, "").slice(0, 6))}
              placeholder={t.mfaSetup.codePlaceholder}
              placeholderTextColor={colors.textSubtle}
              keyboardType="number-pad"
              autoFocus={false}
              maxLength={6}
              style={styles.codeInput}
              accessibilityLabel={t.mfaSetup.codeLabel}
            />

            <TouchableOpacity
              onPress={verify}
              disabled={verifying || code.length !== 6}
              style={[styles.primaryBtnFull, (verifying || code.length !== 6) && { opacity: 0.5 }]}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {verifying ? t.mfaSetup.verifyingBtn : t.mfaSetup.verifyBtn}
              </Text>
            </TouchableOpacity>
          </View>
        ) : step === "recovery" ? (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>{t.mfaSetup.stepRecoveryTitle}</Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>{t.mfaSetup.stepRecoveryWarning}</Text>
            </View>
            <View style={styles.codesBox}>
              {recoveryCodes.map((c) => (
                <Text key={c} style={styles.recoveryCode} selectable>
                  {c}
                </Text>
              ))}
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={shareCodes} style={styles.secondaryBtn} activeOpacity={0.7}>
                <Text style={styles.secondaryBtnText}>{t.mfaSetup.shareCodesBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={finish} style={styles.primaryBtn} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>{t.mfaSetup.doneBtn}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
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
  },
  stepTitle: { color: colors.text, fontFamily: font, fontSize: 15, fontWeight: "700", marginBottom: spacing(2) },
  hint: { color: colors.textMuted, fontFamily: font, fontSize: 13, lineHeight: 19, marginBottom: spacing(4) },
  label: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: spacing(2),
  },
  secretBox: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    color: colors.text,
    fontFamily: fontMono,
    fontSize: 14,
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: spacing(1),
    minHeight: 60,
  },
  secretHint: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    textAlign: "center",
    marginBottom: spacing(4),
  },
  btnRow: { flexDirection: "row", gap: spacing(2), marginBottom: spacing(2) },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: spacing(3),
    alignItems: "center",
  },
  primaryBtnFull: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: spacing(3),
    alignItems: "center",
    marginTop: spacing(2),
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing(4),
  },
  codeInput: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    color: colors.text,
    fontFamily: fontMono,
    fontSize: 22,
    letterSpacing: 4,
    textAlign: "center",
  },
  warningBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  warningText: { color: colors.warning, fontFamily: font, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  codesBox: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  recoveryCode: {
    color: colors.text,
    fontFamily: fontMono,
    fontSize: 16,
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: spacing(1.5),
  },
});

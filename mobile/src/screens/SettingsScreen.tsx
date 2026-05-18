import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTenant, updateTenant, type TenantSettings } from "../lib/tenant";
import { getConnections, type Connection } from "../lib/chat";
import {
  getMyNotificationPrefs,
  updateMyNotificationPrefs,
  deleteTenant,
  exportTenantData,
  getTenantUsage,
  getCronHealth,
  getTenantNps,
  type NotificationPrefs,
  type CronHealthJob,
} from "../lib/dashboard";
import { shareJson } from "../lib/share";
import { getMe, requestEmailChange, updateMyProfile } from "../lib/auth";
import {
  budgetStatusLevel,
  daysUntilReset,
  formatTokens,
} from "../lib/budgetFormat";
import { confirmDialog } from "../components/Confirm";
import { isBiometricSupported, isBiometricEnabled, setBiometricEnabled } from "../lib/biometric";
import { useI18n } from "../lib/i18n/context";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "../lib/i18n/dictionary";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import { showToast } from "../components/Toast";
import { showNpsPrompt } from "../components/NpsPrompt";

interface Props {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: Props) {
  const { locale, setLocale, t } = useI18n();
  const tenantQuery = useQuery({ queryKey: ["tenant"], queryFn: getTenant });
  const connQuery = useQuery({ queryKey: ["connections"], queryFn: getConnections });

  const [draft, setDraft] = useState<TenantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    void (async () => {
      setBioSupported(await isBiometricSupported());
      setBioEnabled(await isBiometricEnabled());
    })();
  }, []);

  const toggleBiometric = async (v: boolean) => {
    await setBiometricEnabled(v);
    setBioEnabled(v);
    setStatus({ kind: "ok", msg: v ? t.settings.biometricOn : t.settings.biometricOff });
  };

  // Seed draft from fetched tenant once. Guarded by !draft — runs once.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tenantQuery.data && !draft) setDraft(tenantQuery.data);
  }, [tenantQuery.data, draft]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setStatus(null);
    try {
      await updateTenant({
        name: draft.name,
        whatsappTo: draft.whatsappTo || null,
        whatsappEnabled: draft.whatsappEnabled,
        emailTo: draft.emailTo || null,
        emailEnabled: draft.emailEnabled,
        alertMinSeverity: draft.alertMinSeverity,
      });
      setStatus({ kind: "ok", msg: t.settings.statusSaved });
      tenantQuery.refetch();
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : t.settings.statusSaveFailed });
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSubtle, paddingTop: 50 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing(5),
          paddingBottom: 200,
        }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
      <View style={{ marginBottom: spacing(5) }}>
        <Text style={styles.brand}>{t.settings.brand}</Text>
        <Text style={styles.pageTitle}>{t.settings.title}</Text>
      </View>

      <ProfileSection />

      <UsageSection />

      <Section title={t.settings.sectionAccount}>
        <Field label={t.settings.fieldTenantName}>
          <TextInput
            value={draft.name}
            onChangeText={(v) => setDraft({ ...draft, name: v })}
            style={styles.input}
          />
        </Field>
        <Field label={t.settings.fieldPlan}>
          <Text style={[styles.input, { color: colors.cached, textTransform: "uppercase", letterSpacing: 1 }]}>
            {draft.plan}
          </Text>
        </Field>
      </Section>

      <Section title={t.settings.sectionWhatsapp}>
        <ToggleRow
          label={t.settings.toggleWhatsappEnabled}
          value={draft.whatsappEnabled}
          onChange={(v) => setDraft({ ...draft, whatsappEnabled: v })}
        />
        <Field label={t.settings.fieldWhatsappRecipient}>
          <TextInput
            value={draft.whatsappTo ?? ""}
            onChangeText={(v) => setDraft({ ...draft, whatsappTo: v })}
            placeholder="whatsapp:+905555555555"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            editable={draft.whatsappEnabled}
            autoCapitalize="none"
          />
        </Field>
      </Section>

      <Section title={t.settings.sectionEmail}>
        <ToggleRow
          label={t.settings.toggleEmailEnabled}
          value={draft.emailEnabled}
          onChange={(v) => setDraft({ ...draft, emailEnabled: v })}
        />
        <Field label={t.settings.fieldEmailRecipient}>
          <TextInput
            value={draft.emailTo ?? ""}
            onChangeText={(v) => setDraft({ ...draft, emailTo: v })}
            placeholder="alerts@firma.com"
            placeholderTextColor={colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            editable={draft.emailEnabled}
          />
        </Field>
      </Section>

      <Section title={t.settings.sectionAlertThreshold}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) }}>
          {(["low", "medium", "high", "critical"] as const).map((sev) => {
            const sevLabel =
              sev === "low" ? t.settings.sevLow
              : sev === "medium" ? t.settings.sevMedium
              : sev === "high" ? t.settings.sevHigh
              : t.settings.sevCritical;
            return (
              <TouchableOpacity
                key={sev}
                onPress={() => setDraft({ ...draft, alertMinSeverity: sev })}
                style={[
                  styles.sevChip,
                  draft.alertMinSeverity === sev && styles.sevChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.sevChipText,
                    draft.alertMinSeverity === sev && styles.sevChipTextActive,
                  ]}
                >
                  {sevLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(3), marginTop: spacing(2) }}>
        <TouchableOpacity onPress={save} disabled={saving} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>{saving ? "..." : t.common.save}</Text>
        </TouchableOpacity>
        {status && (
          <Text style={{ color: status.kind === "ok" ? colors.success : colors.danger, fontFamily: font, fontSize: 11 }}>
            {status.msg}
          </Text>
        )}
      </View>

      <Section title={t.settings.sectionConnections}>
        {connQuery.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <View>
            {(connQuery.data ?? []).map((c: Connection) => (
              <View key={c.id} style={styles.connRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connName}>{c.dbName}</Text>
                  <Text style={styles.connHost}>{c.host}</Text>
                </View>
                <View
                  style={[
                    styles.connStatus,
                    { backgroundColor: c.status === "active" ? "rgba(105,255,71,0.15)" : "rgba(255,107,107,0.15)" },
                  ]}
                >
                  <Text style={{ color: c.status === "active" ? colors.success : colors.danger, fontFamily: font, fontSize: 10 }}>
                    {c.status}
                  </Text>
                </View>
              </View>
            ))}
            {connQuery.data?.length === 0 && (
              <Text style={styles.muted}>{t.settings.connectionsEmpty}</Text>
            )}
          </View>
        )}
      </Section>

      {bioSupported && (
        <Section title={t.settings.sectionSecurity}>
          <ToggleRow
            label={t.settings.biometricLabel}
            value={bioEnabled}
            onChange={toggleBiometric}
          />
        </Section>
      )}

      <NotificationPrefsSection />

      <Section title={t.settings.language}>
        <Text style={[styles.muted, { marginBottom: spacing(3) }]}>{t.settings.languageHint}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) }}>
          {SUPPORTED_LOCALES.map((loc) => (
            <TouchableOpacity
              key={loc}
              onPress={() => {
                if (loc === locale) return;
                void setLocale(loc as Locale).then(() => {
                  showToast(t.settings.languageSaved, "success");
                });
              }}
              style={[
                styles.sevChip,
                locale === loc && styles.sevChipActive,
              ]}
            >
              <Text style={[styles.sevChipText, locale === loc && styles.sevChipTextActive]}>
                {LOCALE_LABELS[loc]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Track WWWW — manuel NPS feedback trigger. Cool-down bypass. */}
      <Section title={t.settings.feedbackTitle}>
        <Text style={[styles.muted, { marginBottom: spacing(3) }]}>{t.settings.feedbackDescription}</Text>
        <TouchableOpacity
          onPress={() => showNpsPrompt()}
          style={styles.feedbackBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.feedbackBtnText}>{t.settings.feedbackOpenBtn}</Text>
        </TouchableOpacity>
      </Section>

      <Section title={t.settings.sectionLegal}>
        <TouchableOpacity onPress={() => Linking.openURL("https://erpaio.vercel.app/privacy")}>
          <Text style={styles.link}>{t.settings.linkPrivacy}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("https://erpaio.vercel.app/terms")}>
          <Text style={styles.link}>{t.settings.linkTerms}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("mailto:support@erpaio.com")}>
          <Text style={styles.link}>{t.settings.linkSupport}</Text>
        </TouchableOpacity>
      </Section>

      <TenantCronHealthSection />

      <TenantNpsSection />

      <TenantExportSection />

      <DangerZoneSection onLogout={onLogout} />

      <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>{t.settings.logout}</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/**
 * Tenant silme — KVKK md. 11 + GDPR Art. 17 (right to erasure) mobile parity.
 * Yalnızca owner role görür. Form: password + literal "HESABIMI SİL" onay
 * metni → confirmDialog → POST /api/tenant/delete → onLogout.
 *
 * Onay metni locale'den bağımsız sabit (Turkish phrase) çünkü server'da
 * `z.literal("HESABIMI SİL")` ile kontrol ediliyor.
 */
/**
 * Aylık token bütçesi paneli — kullanıcı kendi tenant'ının kullanımını görür.
 * Web /dashboard/settings'teki aynı panel'in mobile karşılığı. Plan limitine
 * yaklaştıkça uyarı renkleri (ok/warning/danger).
 */
function UsageSection() {
  const { t, locale } = useI18n();
  const q = useQuery({
    queryKey: ["tenant-usage"],
    queryFn: getTenantUsage,
    // 60s stale — kullanıcı her settings açışında fresh çekmesin
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return (
      <Section title={t.settings.sectionUsage}>
        <ActivityIndicator color={colors.brand} />
      </Section>
    );
  }
  if (!q.data) {
    // Hata veya 404 — sessizce skip et (settings ana akışını bozmasın).
    return null;
  }

  const { used, budget, percentUsed, resetsOn } = q.data;
  const pctClamped = Math.min(100, Math.max(0, percentUsed));
  const level = budgetStatusLevel(percentUsed);
  const daysLeft = daysUntilReset(resetsOn);
  const STATUS_COLORS = {
    ok: { bg: colors.successSoft, fg: colors.success, label: t.settings.usageStatusOk },
    warning: { bg: colors.warningSoft, fg: colors.warning, label: t.settings.usageStatusWarning },
    danger: { bg: colors.errorSoft, fg: colors.error, label: t.settings.usageStatusDanger },
  } as const;
  const sc = STATUS_COLORS[level];

  return (
    <Section title={t.settings.sectionUsage}>
      <Text style={[styles.muted, { marginBottom: spacing(3), lineHeight: 18 }]}>
        {t.settings.usageHint}
      </Text>

      {/* Sayılar + status badge */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(2.5) }}>
        <Text style={{ color: colors.text, fontFamily: font, fontSize: 14 }}>
          <Text style={{ fontWeight: "700" }}>{formatTokens(used)}</Text>
          <Text style={{ color: colors.textMuted }}>{` / ${formatTokens(budget)} ${t.settings.usageProgressLabel}`}</Text>
        </Text>
        <View style={[styles.usageBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.usageBadgeText, { color: sc.fg }]}>{sc.label}</Text>
        </View>
      </View>

      {/* Progress bar — accessible */}
      <View
        style={styles.usageBarTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pctClamped) }}
      >
        <View
          style={[
            styles.usageBarFill,
            { width: `${pctClamped}%`, backgroundColor: sc.fg },
          ]}
        />
      </View>

      {/* % + reset countdown */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing(2) }}>
        <Text style={[styles.muted, { fontSize: 12 }]}>%{Math.round(pctClamped)}</Text>
        <Text style={[styles.muted, { fontSize: 12 }]}>
          {locale === "en"
            ? `${t.settings.usageDaysUntilResetPrefix}${daysLeft}${t.settings.usageDaysUntilResetSuffix}`
            : `${daysLeft}${t.settings.usageDaysUntilResetSuffix}`}
        </Text>
      </View>
    </Section>
  );
}

/**
 * Profil section'ı — kullanıcının kendi adını düzenleyebileceği yer. E-posta
 * read-only (değiştirmek password change kadar hassas, ayrı flow gerekir).
 * Avatar mobile'da henüz yok (expo-image-picker dep gerekir → ayrı track).
 *
 * Server PATCH /api/me audit log entry yazar; getMe query invalidate edilir.
 */
function ProfileSection() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const meQuery = useQuery({ queryKey: ["me-profile"], queryFn: getMe });

  const [draftName, setDraftName] = useState<string | null>(null);
  // null = avatar değişikliği yok (server değeri kullanılır); string = yeni base64;
  // "" sentinel = avatar kaldır (PATCH null gönder).
  const [draftAvatar, setDraftAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  // Sync server'dan gelen current isim ile draft (kullanıcı edit etmediyse).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (meQuery.data?.user && draftName === null) {
      setDraftName(meQuery.data.user.name ?? "");
    }
  }, [meQuery.data?.user, draftName]);

  if (meQuery.isLoading || !meQuery.data) return null;
  const currentName = meQuery.data.user.name ?? "";
  const email = meQuery.data.user.email;
  const currentAvatar = meQuery.data.user.avatarBase64 ?? null;
  const displayedAvatar = draftAvatar !== null
    ? (draftAvatar === "" ? null : draftAvatar)
    : currentAvatar;
  const nameDirty = draftName !== null && draftName.trim() !== currentName.trim();
  const avatarDirty = draftAvatar !== null;
  const dirty = nameDirty || avatarDirty;

  const pickAvatar = async () => {
    if (pickingImage || saving) return;
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast(t.settings.avatarPermissionDenied, "error");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        // Base64'ü picker direkt sağlasın — file-system reads gerektirmez,
        // server max 500KB base64 (≈370KB raw) cap'i quality 0.6 + aspect 1:1
        // çoğu fotoda altında kalır.
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        showToast(t.settings.avatarPickFailed, "error");
        return;
      }
      const mime = asset.mimeType ?? "image/jpeg";
      const dataUri = `data:${mime};base64,${asset.base64}`;
      // Server cap'i 500_000 char base64. Quality 0.6 ile genelde altında
      // kalır ama büyük fotolarda guard koyalım.
      if (dataUri.length > 500_000) {
        showToast(t.settings.avatarTooLarge, "error");
        return;
      }
      setDraftAvatar(dataUri);
    } catch {
      showToast(t.settings.avatarPickFailed, "error");
    } finally {
      setPickingImage(false);
    }
  };

  const removeAvatar = () => {
    setDraftAvatar("");
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const input: { name?: string | null; avatarBase64?: string | null } = {};
      if (nameDirty) {
        const trimmed = (draftName ?? "").trim();
        input.name = trimmed.length > 0 ? trimmed : null;
      }
      if (avatarDirty) {
        input.avatarBase64 = draftAvatar === "" ? null : draftAvatar;
      }
      await updateMyProfile(input);
      showToast(t.settings.profileSavedToast, "success");
      setDraftAvatar(null);
      // me-profile + me-role tüm getMe consumer'larını refresh
      void qc.invalidateQueries({ queryKey: ["me-profile"] });
      void qc.invalidateQueries({ queryKey: ["me-role"] });
      void qc.invalidateQueries({ queryKey: ["me-role-conn"] });
      void qc.invalidateQueries({ queryKey: ["me-role-slowq"] });
      void qc.invalidateQueries({ queryKey: ["me-role-allowlist"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.settings.profileSaveFailedToast;
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={t.settings.sectionProfile}>
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrap}>
          {displayedAvatar ? (
            <Image source={{ uri: displayedAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(currentName.trim() || email).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: spacing(3) }}>
          <TouchableOpacity onPress={pickAvatar} disabled={pickingImage || saving} activeOpacity={0.7}>
            <Text style={styles.avatarBtn}>
              {pickingImage ? "..." : (displayedAvatar ? t.settings.avatarChange : t.settings.avatarUpload)}
            </Text>
          </TouchableOpacity>
          {displayedAvatar && (
            <TouchableOpacity onPress={removeAvatar} disabled={pickingImage || saving} activeOpacity={0.7}>
              <Text style={styles.avatarBtnSecondary}>{t.settings.avatarRemove}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Field label={t.settings.fieldProfileEmail}>
        <Text
          selectable
          style={[styles.input, { color: colors.textMuted, paddingVertical: spacing(2.5) }]}
        >
          {email}
        </Text>
        <EmailChangeRow currentEmail={email} />
      </Field>
      <Field label={t.settings.fieldProfileName}>
        <TextInput
          value={draftName ?? ""}
          onChangeText={setDraftName}
          placeholder={t.settings.fieldProfileNamePlaceholder}
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="words"
          maxLength={80}
          style={styles.input}
        />
      </Field>
      <TouchableOpacity
        onPress={save}
        disabled={!dirty || saving}
        style={[
          styles.profileSaveBtn,
          (!dirty || saving) && { opacity: 0.4 },
        ]}
        activeOpacity={0.85}
      >
        <Text style={styles.profileSaveBtnText}>
          {saving ? t.settings.profileSavingBtn : t.settings.profileSaveBtn}
        </Text>
      </TouchableOpacity>
    </Section>
  );
}

/**
 * Email değiştirme inline form — Track YYY. Profile section'da email
 * field altında. Tıklayınca form açar; submit → POST /me/email/request-change
 * → server YENİ email'e doğrulama linki yollar. Kullanıcı linki tıklayınca
 * web /auth/email-changed'da User.email atomik güncellenir.
 */
function EmailChangeRow({ currentEmail }: { currentEmail: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed || !password) return;
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      showToast(t.settings.emailChangeSameAsCurrent, "error");
      return;
    }
    setSubmitting(true);
    try {
      await requestEmailChange({ newEmail: trimmed, currentPassword: password });
      showToast(t.settings.emailChangeSentToast, "success");
      setOpen(false);
      setNewEmail("");
      setPassword("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.common.error;
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <View style={{ marginTop: spacing(1.5) }}>
        <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}>
          <Text style={styles.emailChangeLink}>{t.settings.emailChangeBtn} →</Text>
        </TouchableOpacity>
        <Text style={[styles.muted, { fontSize: 11, marginTop: 2 }]}>
          {t.settings.emailChangeHint}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.emailChangeBox}>
      <Field label={t.settings.emailChangeFieldNew}>
        <TextInput
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="ornek@firma.com"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />
      </Field>
      <Field label={t.settings.emailChangeFieldPassword}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t.settings.emailChangeFieldPasswordPlaceholder}
          placeholderTextColor={colors.textSubtle}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </Field>
      <View style={{ flexDirection: "row", gap: spacing(2), marginTop: spacing(1) }}>
        <TouchableOpacity
          onPress={submit}
          disabled={submitting || !newEmail.trim() || !password}
          style={[
            styles.profileSaveBtn,
            (submitting || !newEmail.trim() || !password) && { opacity: 0.4 },
          ]}
          activeOpacity={0.85}
        >
          <Text style={styles.profileSaveBtnText}>
            {submitting ? t.settings.emailChangeSendingBtn : t.settings.emailChangeSendBtn}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setOpen(false);
            setNewEmail("");
            setPassword("");
          }}
          style={styles.cancelBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>{t.settings.emailChangeCancel}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.muted, { fontSize: 11, marginTop: spacing(2), lineHeight: 16 }]}>
        {t.settings.emailChangeNote}
      </Text>
    </View>
  );
}

/**
 * Tenant cron health — Track GG (DD mobile parity). Owner+admin görür 3
 * tenant-facing cron'un son çalışma durumunu.
 */
function TenantCronHealthSection() {
  const { t, locale } = useI18n();
  const meQuery = useQuery({ queryKey: ["me-role-cron-health"], queryFn: getMe });
  const role = meQuery.data?.user?.role ?? null;
  const enabled = role === "owner" || role === "admin";
  const healthQuery = useQuery({
    queryKey: ["cron-health"],
    queryFn: getCronHealth,
    enabled,
    staleTime: 60_000,
  });

  if (!enabled) return null;

  const formatRel = (iso: string | null): string => {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    const hour = Math.floor(diff / 3_600_000);
    const day = Math.floor(diff / 86_400_000);
    if (locale === "en") {
      if (min < 1) return "just now";
      if (min < 60) return `${min}m ago`;
      if (hour < 24) return `${hour}h ago`;
      return `${day}d ago`;
    }
    if (min < 1) return "az önce";
    if (min < 60) return `${min}d önce`;
    if (hour < 24) return `${hour}sa önce`;
    return `${day}g önce`;
  };

  const statusColor = (s: CronHealthJob["status"]): { bg: string; fg: string } => {
    switch (s) {
      case "SUCCESS": return { bg: "#D1FAE5", fg: "#065F46" };
      case "PARTIAL_FAILURE": return { bg: "#FEF3C7", fg: "#92400E" };
      case "FAILED": return { bg: "#FEE2E2", fg: "#991B1B" };
      case "RUNNING": return { bg: "#E0F2FE", fg: "#075985" };
      case "NEVER": return { bg: "#F1F5F9", fg: "#64748B" };
    }
  };

  const statusLabel = (s: CronHealthJob["status"]): string => {
    switch (s) {
      case "SUCCESS": return t.settings.cronHealthSuccess;
      case "PARTIAL_FAILURE": return t.settings.cronHealthPartial;
      case "FAILED": return t.settings.cronHealthFailed;
      case "RUNNING": return t.settings.cronHealthRunning;
      case "NEVER": return t.settings.cronHealthNever;
    }
  };

  const jobLabel = (name: string): string => {
    switch (name) {
      case "anomaly-detection": return t.settings.cronHealthAnomalyLabel;
      case "watchlists": return t.settings.cronHealthWatchlistsLabel;
      case "scheduled-reports": return t.settings.cronHealthReportsLabel;
      default: return name;
    }
  };

  return (
    <Section title={t.settings.cronHealthTitle}>
      <Text style={[styles.muted, { marginBottom: spacing(3) }]}>{t.settings.cronHealthDescription}</Text>
      {healthQuery.isLoading || !healthQuery.data ? (
        <Text style={styles.muted}>{t.common.loading}</Text>
      ) : (
        <View style={{ gap: spacing(2) }}>
          {healthQuery.data.jobs.map((j) => {
            const c = statusColor(j.status);
            return (
              <View key={j.jobName} style={styles.cronRow}>
                <Text style={styles.cronLabel} numberOfLines={1}>{jobLabel(j.jobName)}</Text>
                <Text style={styles.cronTime}>{formatRel(j.finishedAt)}</Text>
                <View style={[styles.cronBadge, { backgroundColor: c.bg }]}>
                  <Text style={[styles.cronBadgeText, { color: c.fg }]}>{statusLabel(j.status)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Section>
  );
}

/**
 * Tenant NPS aggregate — Track MM (UUUU mobile parity). Owner+admin görür
 * kendi org NPS skorunu. Mobile compact UI — büyük skor + breakdown
 * badges + max 3 recent comment (web 5'i gösterir, mobile dar ekran).
 */
function TenantNpsSection() {
  const { t, locale } = useI18n();
  const meQuery = useQuery({ queryKey: ["me-role-nps"], queryFn: getMe });
  const role = meQuery.data?.user?.role ?? null;
  const enabled = role === "owner" || role === "admin";
  const npsQuery = useQuery({
    queryKey: ["tenant-nps"],
    queryFn: getTenantNps,
    enabled,
    staleTime: 60_000,
  });

  if (!enabled) return null;

  const data = npsQuery.data;
  const isEmpty = !data || data.breakdown.total === 0;
  const scoreColor =
    data && data.nps >= 30 ? colors.success : data && data.nps >= 0 ? "#F59E0B" : colors.error;

  return (
    <Section title={t.settings.tenantNpsTitle}>
      <Text style={[styles.muted, { marginBottom: spacing(3) }]}>{t.settings.tenantNpsDescription}</Text>
      {npsQuery.isLoading ? (
        <Text style={styles.muted}>{t.common.loading}</Text>
      ) : isEmpty ? (
        <Text style={styles.muted}>{t.settings.tenantNpsEmpty}</Text>
      ) : (
        <View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: spacing(3) }}>
            <Text style={{ fontSize: 40, fontWeight: "700", color: scoreColor, fontFamily: font }}>
              {data!.nps > 0 ? "+" : ""}{data!.nps}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: font }}>
              {t.settings.tenantNpsScoreLabel} · {data!.breakdown.total} {t.settings.tenantNpsResponsesLabel}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing(2), marginBottom: spacing(3), flexWrap: "wrap" }}>
            <View style={[styles.npsBadge, { backgroundColor: "#D1FAE5" }]}>
              <Text style={[styles.npsBadgeText, { color: "#065F46" }]}>
                {t.settings.tenantNpsPromoters}: {data!.breakdown.promoters}
              </Text>
            </View>
            <View style={[styles.npsBadge, { backgroundColor: "#F1F5F9" }]}>
              <Text style={[styles.npsBadgeText, { color: "#475569" }]}>
                {t.settings.tenantNpsPassives}: {data!.breakdown.passives}
              </Text>
            </View>
            <View style={[styles.npsBadge, { backgroundColor: "#FEE2E2" }]}>
              <Text style={[styles.npsBadgeText, { color: "#991B1B" }]}>
                {t.settings.tenantNpsDetractors}: {data!.breakdown.detractors}
              </Text>
            </View>
          </View>
          {data!.responses.filter((r) => r.comment).slice(0, 3).map((r, i) => (
            <View
              key={i}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: r.score >= 9 ? "#10B981" : r.score >= 7 ? "#F59E0B" : "#EF4444",
                paddingLeft: 10,
                marginBottom: spacing(2),
              }}
            >
              <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: font }}>
                {r.score}/10 · {new Date(r.respondedAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, fontFamily: font, marginTop: 2 }}>{r.comment}</Text>
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}

/**
 * Tenant data export — KVKK md. 11 / GDPR Art. 20 right to data portability.
 * Owner-only (server 403 dönüyor, UI rolü çekip butonu non-owner için gizler).
 * Click → API JSON çek → shareJson() ile Native Share intent ile dosya
 * paylaşılır. Server audit log entry yazar (tenant.export action).
 */
function TenantExportSection() {
  const { t } = useI18n();
  const meQuery = useQuery({ queryKey: ["me-role-export"], queryFn: getMe });
  const [downloading, setDownloading] = useState(false);

  if (meQuery.isLoading || !meQuery.data) return null;
  if (meQuery.data.user.role !== "owner") return null;

  const download = async () => {
    setDownloading(true);
    try {
      const data = await exportTenantData();
      const ts = new Date().toISOString().slice(0, 10);
      await shareJson(`erpaio-export-${ts}.json`, data);
      showToast(t.settings.tenantExportSharedToast, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.settings.tenantExportFailedToast;
      showToast(msg, "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Section title={t.settings.tenantExportTitle}>
      <Text style={[styles.muted, { lineHeight: 18, marginBottom: spacing(3) }]}>
        {t.settings.tenantExportDescription}
      </Text>
      <TouchableOpacity
        onPress={download}
        disabled={downloading}
        style={[
          styles.profileSaveBtn,
          downloading && { opacity: 0.5 },
        ]}
        activeOpacity={0.85}
      >
        <Text style={styles.profileSaveBtnText}>
          {downloading ? t.settings.tenantExportDownloadingBtn : t.settings.tenantExportBtn}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.muted, { fontSize: 11, marginTop: spacing(2), lineHeight: 16 }]}>
        {t.settings.tenantExportNote}
      </Text>
    </Section>
  );
}

function DangerZoneSection({ onLogout }: { onLogout: () => void }) {
  const { t } = useI18n();
  const meQuery = useQuery({ queryKey: ["me-role"], queryFn: getMe });
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (meQuery.isLoading || !meQuery.data) return null;
  const isOwner = meQuery.data.user.role === "owner";

  const submit = async () => {
    const ok = await confirmDialog({
      title: t.settings.deleteAccountConfirmTitle,
      message: t.settings.deleteAccountConfirmMessage,
      confirmLabel: t.settings.deleteAccountConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteTenant({ password, confirmation });
      showToast(t.settings.deleteAccountSuccess, "success");
      // Server token'ı revoke etti — local state'i temizleyip login'e dön.
      // Slight delay so toast is visible before navigation.
      setTimeout(onLogout, 1200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.common.error;
      showToast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const canSubmit = !!password && confirmation === t.settings.deleteAccountConfirmInputPlaceholder;

  return (
    <View style={styles.dangerSection}>
      <Text style={styles.dangerTitle}>{t.settings.dangerZone}</Text>
      <Text style={styles.dangerDesc}>{t.settings.dangerZoneDescription}</Text>
      {!isOwner ? (
        <Text style={styles.dangerOwnerOnly}>{t.settings.deleteAccountOwnerOnly}</Text>
      ) : !showForm ? (
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={styles.dangerOutlineBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.dangerOutlineBtnText}>{t.settings.deleteAccountBtn}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: spacing(3) }}>
          <Field label={t.settings.deleteAccountPasswordLabel}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </Field>
          <Field
            label={`${t.settings.deleteAccountConfirmInputLabelPrefix}${t.settings.deleteAccountConfirmInputLabelHighlight}${t.settings.deleteAccountConfirmInputLabelSuffix}`}
          >
            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder={t.settings.deleteAccountConfirmInputPlaceholder}
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, { fontFamily: font, letterSpacing: 1 }]}
            />
          </Field>
          <View style={{ flexDirection: "row", gap: spacing(2) }}>
            <TouchableOpacity
              onPress={submit}
              disabled={!canSubmit || deleting}
              style={[styles.dangerSolidBtn, (!canSubmit || deleting) && { opacity: 0.5 }]}
              activeOpacity={0.85}
            >
              <Text style={styles.dangerSolidBtnText}>
                {deleting ? t.settings.deleteAccountDeleting : t.settings.deleteAccountFinal}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                setPassword("");
                setConfirmation("");
              }}
              style={styles.cancelBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>{t.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Per-user push opt-in (KVKK md. 11 + GDPR Art. 21).
 * Web /dashboard/settings'teki aynı section'ın mobile karşılığı.
 */
function NotificationPrefsSection() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null);

  useEffect(() => {
    void getMyNotificationPrefs()
      .then((d) => setPrefs(d.prefs))
      .catch(() => {
        // Sessizce başarısız — sayfa açılışında load failure'ı kullanıcıyı
        // yıldırmasın; pull-to-refresh ile tekrar denenebilir.
      });
  }, []);

  const toggle = async (key: keyof NotificationPrefs) => {
    if (!prefs || saving) return;
    const next = !prefs[key];
    const prev = prefs;
    setPrefs({ ...prefs, [key]: next });
    setSaving(key);
    try {
      const d = await updateMyNotificationPrefs({ [key]: next });
      setPrefs(d.prefs);
      showToast(t.settings.notifPrefsSaved, "success");
    } catch {
      setPrefs(prev); // revert
      showToast(t.settings.notifPrefsSaveError, "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Section title={t.settings.notifPrefsTitle}>
      <Text style={[styles.muted, { marginBottom: spacing(3), lineHeight: 18 }]}>
        {t.settings.notifPrefsDescription}
      </Text>
      {prefs === null ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <>
          <ToggleRow
            label={t.settings.notifPrefsAlerts}
            value={prefs.alerts}
            onChange={() => toggle("alerts")}
          />
          <ToggleRow
            label={t.settings.notifPrefsAnomaly}
            value={prefs.anomaly}
            onChange={() => toggle("anomaly")}
          />
          <ToggleRow
            label={t.settings.notifPrefsWatchlists}
            value={prefs.watchlists}
            onChange={() => toggle("watchlists")}
          />
        </>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing(2) }}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing(3),
    }}>
      <Text style={{ color: colors.text, fontFamily: font, fontSize: 14, flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.bgMuted, true: colors.brand }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.bgMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgSubtle },
  brand: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 4,
  },
  pageTitle: {
    color: colors.text,
    fontFamily: fontSerif,
    fontSize: 28,
    fontWeight: "400",
    letterSpacing: -0.5,
  },
  section: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(5),
    marginBottom: spacing(3),
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: font,
    fontSize: 15,
    marginBottom: spacing(4),
    fontWeight: "600",
  },
  label: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "600",
    marginBottom: spacing(1.5),
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    color: colors.text,
    fontFamily: font,
    fontSize: 14,
  },
  sevChip: {
    backgroundColor: "transparent",
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
  },
  sevChipActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  sevChipText: { color: colors.textMuted, fontFamily: font, fontSize: 13, fontWeight: "500" },
  sevChipTextActive: { color: colors.textInverse },
  saveBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(3),
  },
  saveBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 14, fontWeight: "600" },
  connRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(3),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  connName: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "500" },
  connHost: { color: colors.textSubtle, fontFamily: font, fontSize: 12, marginTop: 2 },
  connStatus: { borderRadius: radius.full, paddingHorizontal: spacing(2.5), paddingVertical: 4 },
  muted: { color: colors.textSubtle, fontFamily: font, fontSize: 13 },
  link: {
    color: colors.brand,
    fontFamily: font,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 8,
  },
  logoutBtn: {
    marginTop: spacing(4),
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing(4),
    alignItems: "center",
  },
  logoutBtnText: { color: colors.error, fontFamily: font, fontSize: 14, fontWeight: "600" },
  feedbackBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  feedbackBtnText: { color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "600" },
  cronRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing(2),
  },
  cronLabel: { flex: 1, color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "500" },
  cronTime: { color: colors.textMuted, fontFamily: font, fontSize: 11 },
  cronBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  cronBadgeText: { fontFamily: font, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  npsBadge: {
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  npsBadgeText: { fontFamily: font, fontSize: 11, fontWeight: "600" },
  dangerSection: {
    marginTop: spacing(4),
    backgroundColor: colors.card,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
  },
  dangerTitle: {
    color: colors.error,
    fontFamily: font,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing(2),
  },
  dangerDesc: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing(3),
  },
  dangerOwnerOnly: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
  dangerOutlineBtn: {
    alignSelf: "flex-start",
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  dangerOutlineBtnText: {
    color: colors.error,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "600",
  },
  dangerSolidBtn: {
    backgroundColor: colors.error,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  dangerSolidBtnText: { color: "#FFFFFF", fontFamily: font, fontSize: 13, fontWeight: "600" },
  cancelBtn: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  cancelBtnText: { color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "500" },
  profileSaveBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    marginTop: spacing(2),
  },
  profileSaveBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 13, fontWeight: "600" },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing(3),
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSubtle,
  },
  avatarInitial: {
    color: colors.textMuted,
    fontFamily: fontSerif,
    fontSize: 28,
    fontWeight: "400",
  },
  avatarBtn: {
    color: colors.brand,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: spacing(1),
  },
  avatarBtnSecondary: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 12,
    fontWeight: "500",
    paddingVertical: spacing(1),
  },
  usageBadge: {
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  usageBadgeText: {
    fontFamily: font,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  usageBarTrack: {
    height: 8,
    backgroundColor: colors.bgSubtle,
    borderRadius: 4,
    overflow: "hidden",
  },
  usageBarFill: {
    height: 8,
    borderRadius: 4,
  },
  emailChangeLink: {
    color: colors.brand,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  emailChangeBox: {
    marginTop: spacing(2),
    padding: spacing(3),
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
});

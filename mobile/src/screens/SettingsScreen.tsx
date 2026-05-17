import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getTenant, updateTenant, type TenantSettings } from "../lib/tenant";
import { getConnections, type Connection } from "../lib/chat";
import { isBiometricSupported, isBiometricEnabled, setBiometricEnabled } from "../lib/biometric";
import { useI18n } from "../lib/i18n/context";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "../lib/i18n/dictionary";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import { showToast } from "../components/Toast";

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
    setStatus({ kind: "ok", msg: v ? "Biyometrik aktif." : "Biyometrik kapatıldı." });
  };

  useEffect(() => {
    if (tenantQuery.data && !draft) setDraft(tenantQuery.data);
  }, [tenantQuery.data, draft]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
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
      setStatus({ kind: "ok", msg: "Kaydedildi." });
      tenantQuery.refetch();
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Kayıt başarısız." });
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
        <Text style={styles.brand}>ERPAIO · AYARLAR</Text>
        <Text style={styles.pageTitle}>Ayarlar</Text>
      </View>

      <Section title="Hesap">
        <Field label="Tenant Adı">
          <TextInput
            value={draft.name}
            onChangeText={(v) => setDraft({ ...draft, name: v })}
            style={styles.input}
          />
        </Field>
        <Field label="Plan">
          <Text style={[styles.input, { color: colors.cached, textTransform: "uppercase", letterSpacing: 1 }]}>
            {draft.plan}
          </Text>
        </Field>
      </Section>

      <Section title="WhatsApp Bildirimleri">
        <ToggleRow
          label="WhatsApp etkin"
          value={draft.whatsappEnabled}
          onChange={(v) => setDraft({ ...draft, whatsappEnabled: v })}
        />
        <Field label="Alıcı (whatsapp:+90...)">
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

      <Section title="Email Bildirimleri (yakında)">
        <ToggleRow
          label="Email etkin"
          value={draft.emailEnabled}
          onChange={(v) => setDraft({ ...draft, emailEnabled: v })}
        />
        <Field label="Alıcı email">
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

      <Section title="Alert Eşiği">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) }}>
          {(["low", "medium", "high", "critical"] as const).map((sev) => (
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
                {sev}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(3), marginTop: spacing(2) }}>
        <TouchableOpacity onPress={save} disabled={saving} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>{saving ? "..." : "Kaydet"}</Text>
        </TouchableOpacity>
        {status && (
          <Text style={{ color: status.kind === "ok" ? colors.success : colors.danger, fontFamily: font, fontSize: 11 }}>
            {status.msg}
          </Text>
        )}
      </View>

      <Section title="ERP Bağlantıları">
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
              <Text style={styles.muted}>Bağlantı yok. Web&apos;den ekleyebilirsin.</Text>
            )}
          </View>
        )}
      </Section>

      {bioSupported && (
        <Section title="Güvenlik">
          <ToggleRow
            label="Biyometrik kilit (Face ID / Touch ID)"
            value={bioEnabled}
            onChange={toggleBiometric}
          />
        </Section>
      )}

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

      <Section title="Yasal">
        <TouchableOpacity onPress={() => Linking.openURL("https://erpaio.vercel.app/privacy")}>
          <Text style={styles.link}>Gizlilik Politikası →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("https://erpaio.vercel.app/terms")}>
          <Text style={styles.link}>Kullanım Koşulları →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("mailto:support@erpaio.com")}>
          <Text style={styles.link}>support@erpaio.com →</Text>
        </TouchableOpacity>
      </Section>

      <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
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
});

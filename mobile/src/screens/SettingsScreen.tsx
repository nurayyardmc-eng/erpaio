import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getTenant, updateTenant, type TenantSettings } from "../lib/tenant";
import { getConnections, type Connection } from "../lib/chat";
import { colors, font, radius, spacing } from "../lib/theme";

interface Props {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: Props) {
  const tenantQuery = useQuery({ queryKey: ["tenant"], queryFn: getTenant });
  const connQuery = useQuery({ queryKey: ["connections"], queryFn: getConnections });

  const [draft, setDraft] = useState<TenantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

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
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}>
      <Text style={styles.brand}>ERPAIO · AYARLAR</Text>

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
          <ActivityIndicator color={colors.accent} />
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

      <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
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
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(2) }}>
      <Text style={{ color: colors.text, fontFamily: font, fontSize: 12 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accentBorder }}
        thumbColor={value ? colors.accent : colors.textDim}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  brand: { color: colors.accent, fontFamily: font, fontSize: 9, letterSpacing: 3, marginBottom: spacing(4) },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(3),
    marginBottom: spacing(3),
  },
  sectionTitle: { color: colors.accent, fontFamily: font, fontSize: 12, marginBottom: spacing(3), fontWeight: "600" },
  label: { color: colors.textDim, fontFamily: font, fontSize: 9, letterSpacing: 1, marginBottom: spacing(1) },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(2),
    color: colors.text,
    fontFamily: font,
    fontSize: 12,
  },
  sevChip: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  sevChipActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  sevChipText: { color: colors.textMuted, fontFamily: font, fontSize: 11 },
  sevChipTextActive: { color: colors.accent },
  saveBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2.5),
  },
  saveBtnText: { color: colors.accent, fontFamily: font, fontSize: 12, fontWeight: "600" },
  connRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(2),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  connName: { color: colors.text, fontFamily: font, fontSize: 12 },
  connHost: { color: colors.textDim, fontFamily: font, fontSize: 10 },
  connStatus: { borderRadius: radius.sm, paddingHorizontal: spacing(2), paddingVertical: 2 },
  muted: { color: colors.textDim, fontFamily: font, fontSize: 11 },
  logoutBtn: {
    marginTop: spacing(4),
    backgroundColor: "rgba(255,107,107,0.1)",
    borderColor: "rgba(255,107,107,0.3)",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    alignItems: "center",
  },
  logoutBtnText: { color: colors.danger, fontFamily: font, fontSize: 12 },
});

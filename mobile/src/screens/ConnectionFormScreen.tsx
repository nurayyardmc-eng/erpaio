import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConnection, type CreateConnectionInput } from "../lib/dashboard";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import { showToast } from "../components/Toast";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "ConnectionForm">;
}

const ERP_TYPES: Array<{ id: CreateConnectionInput["erpType"]; label: string; desc: string; defaultPort: number }> = [
  { id: "nebim_v3", label: "Nebim V3", desc: "MS SQL Server tabanlı", defaultPort: 1433 },
  { id: "dynamics365", label: "Dynamics 365", desc: "Microsoft ERP", defaultPort: 1433 },
  { id: "sap", label: "SAP", desc: "Hana / Oracle adapter", defaultPort: 1433 },
  { id: "postgres", label: "PostgreSQL / Odoo", desc: "Open-source DB", defaultPort: 5432 },
];

export default function ConnectionFormScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateConnectionInput>({
    erpType: "postgres",
    host: "",
    port: 5432,
    dbName: "",
    username: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: CreateConnectionInput) => createConnection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dash-connections"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      showToast("Bağlantı oluşturuldu", "success");
      navigation.goBack();
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  const onSubmit = () => {
    setError(null);
    if (!form.host || !form.dbName || !form.username || !form.password) {
      setError("Tüm alanları doldurun.");
      return;
    }
    mutation.mutate(form);
  };

  const onTypeChange = (id: CreateConnectionInput["erpType"]) => {
    const erp = ERP_TYPES.find((t) => t.id === id);
    setForm({ ...form, erpType: id, port: erp?.defaultPort ?? 1433 });
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand="ERPAIO · YENİ BAĞLANTI"
        title="ERP Bağlantısı Ekle"
        description="Read-only kullanıcı önerilir. Şifre AES-256-GCM ile şifrelenir."
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing(5), paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>ERP Tipi</Text>
          <View style={styles.typeGrid}>
            {ERP_TYPES.map((t) => {
              const active = form.erpType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => onTypeChange(t.id)}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${t.label} — ${t.desc}`}
                >
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.label}</Text>
                  <Text style={[styles.typeDesc, active && styles.typeDescActive]}>{t.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Bağlantı Bilgileri</Text>

          <Field label="Host / IP">
            <TextInput
              value={form.host}
              onChangeText={(v) => setForm({ ...form, host: v })}
              placeholder="db.firma.com"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Host veya IP adresi"
            />
          </Field>

          <Field label="Port">
            <TextInput
              value={String(form.port)}
              onChangeText={(v) => setForm({ ...form, port: parseInt(v.replace(/\D/g, ""), 10) || 0 })}
              keyboardType="number-pad"
              placeholder="1433"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              accessibilityLabel="Port numarası"
            />
          </Field>

          <Field label="Veritabanı Adı">
            <TextInput
              value={form.dbName}
              onChangeText={(v) => setForm({ ...form, dbName: v })}
              placeholder="NebimWinAnaDB"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Veritabanı adı"
            />
          </Field>

          <Field label="Kullanıcı Adı">
            <TextInput
              value={form.username}
              onChangeText={(v) => setForm({ ...form, username: v })}
              placeholder="erpaio_readonly"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Kullanıcı adı"
            />
          </Field>

          <Field label="Şifre">
            <TextInput
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              accessibilityLabel="Şifre"
              accessibilityHint="Şifreniz AES-256-GCM ile şifrelenerek saklanır"
            />
          </Field>

          <Text style={styles.securityNote}>
            🔒 Şifre AES-256-GCM ile şifrelenir. Sadece SELECT yetkisi olan kullanıcı önerilir.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={mutation.isPending}
            style={[styles.submitBtn, mutation.isPending && { opacity: 0.5 }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Bağlantıyı kaydet"
            accessibilityState={{ disabled: mutation.isPending }}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.submitText}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing(3) }}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  sectionTitle: {
    color: colors.text,
    fontFamily: fontSerif,
    fontSize: 18,
    fontWeight: "400",
    letterSpacing: -0.3,
    marginBottom: spacing(3),
    marginTop: spacing(2),
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  typeCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    flexGrow: 1,
    flexBasis: "45%",
  },
  typeCardActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  typeLabel: {
    color: colors.text,
    fontFamily: font,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  typeLabelActive: { color: colors.textInverse },
  typeDesc: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
  },
  typeDescActive: { color: colors.textInverse, opacity: 0.8 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    fontFamily: font,
  },
  securityNote: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 12,
    lineHeight: 18,
    marginVertical: spacing(3),
    fontStyle: "italic",
  },
  errorBox: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing(2),
  },
  errorText: { color: colors.error, fontSize: 13, fontWeight: "500", fontFamily: font },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing(2),
  },
  submitText: {
    color: colors.textInverse,
    fontFamily: font,
    fontSize: 15,
    fontWeight: "600",
  },
});

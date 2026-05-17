import { useEffect, useState } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createScheduledReport, getConnections, type CreateReportInput } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import { showToast } from "../components/Toast";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "ScheduledReportForm">;
}

const SCHEDULES: Array<{ id: CreateReportInput["schedule"]; label: string }> = [
  { id: "hourly", label: "Saatlik" },
  { id: "daily_06", label: "Günlük 06:00" },
  { id: "daily_18", label: "Günlük 18:00" },
  { id: "weekly_monday", label: "Haftalık (Pzt)" },
  { id: "monthly_first", label: "Aylık (1.gün)" },
];

export default function ScheduledReportFormScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const connsQuery = useQuery({ queryKey: ["connections"], queryFn: getConnections });

  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [connectionId, setConnectionId] = useState<string>("");
  const [schedule, setSchedule] = useState<CreateReportInput["schedule"]>("daily_06");
  const [emailTo, setEmailTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeConns = (connsQuery.data ?? []).filter((c) => c.status === "active");

  useEffect(() => {
    if (!connectionId && activeConns[0]) setConnectionId(activeConns[0].id);
  }, [activeConns, connectionId]);

  const mutation = useMutation({
    mutationFn: () =>
      createScheduledReport({
        name: name.trim(),
        question: question.trim(),
        connectionId,
        schedule,
        emailTo: emailTo.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      showToast("Rapor oluşturuldu", "success");
      navigation.goBack();
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = () => {
    setError(null);
    if (!name.trim() || !question.trim() || !connectionId || !emailTo.trim()) {
      setError("Tüm zorunlu alanları doldurun.");
      return;
    }
    mutation.mutate();
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand="ERPAIO · YENİ RAPOR"
        title="Planlı Rapor Ekle"
        description="Belirlediğiniz periyotta sorgu çalıştırılır, email ile gönderilir."
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
          <Field label="İsim *">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Günlük ciro raporu"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              accessibilityLabel="Rapor ismi"
            />
          </Field>

          <Field label="Soru (Türkçe) *">
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Bugünkü toplam ciro"
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              accessibilityLabel="Rapor sorusu"
            />
          </Field>

          <Field label="ERP Bağlantısı *">
            {activeConns.length === 0 ? (
              <Text style={styles.muted}>Aktif bağlantı yok. Önce ERP bağlantısı ekleyin.</Text>
            ) : (
              <View style={styles.chipRow}>
                {activeConns.map((c) => {
                  const active = connectionId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setConnectionId(c.id)}
                      style={[styles.chip, active && styles.chipActive]}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.dbName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </Field>

          <Field label="Periyot">
            <View style={styles.chipRow}>
              {SCHEDULES.map((s) => {
                const active = schedule === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSchedule(s.id)}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <Field label="Email Alıcı *">
            <TextInput
              value={emailTo}
              onChangeText={setEmailTo}
              placeholder="alerts@firma.com"
              placeholderTextColor={colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Email alıcı"
            />
          </Field>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={mutation.isPending || activeConns.length === 0}
            style={[styles.submitBtn, (mutation.isPending || activeConns.length === 0) && { opacity: 0.5 }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Raporu kaydet"
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  chip: {
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  chipText: { color: colors.textMuted, fontFamily: font, fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: colors.textInverse },
  muted: { color: colors.textSubtle, fontFamily: font, fontSize: 13, fontStyle: "italic" },
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
  submitText: { color: colors.textInverse, fontFamily: font, fontSize: 15, fontWeight: "600" },
});

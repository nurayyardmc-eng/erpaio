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
import { useI18n } from "../lib/i18n/context";
import type { Dictionary } from "../lib/i18n/dictionary";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "ScheduledReportForm">;
}

function buildSchedules(t: Dictionary): Array<{ id: CreateReportInput["schedule"]; label: string }> {
  return [
    { id: "hourly", label: t.scheduledReportForm.schedHourly },
    { id: "daily_06", label: t.scheduledReportForm.schedDaily06 },
    { id: "daily_18", label: t.scheduledReportForm.schedDaily18 },
    { id: "weekly_monday", label: t.scheduledReportForm.schedWeeklyMondayShort },
    { id: "monthly_first", label: t.scheduledReportForm.schedMonthlyFirst },
  ];
}

export default function ScheduledReportFormScreen({ navigation }: Props) {
  const { t } = useI18n();
  const SCHEDULES = buildSchedules(t);
  const queryClient = useQueryClient();
  const connsQuery = useQuery({ queryKey: ["connections"], queryFn: getConnections });

  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [connectionId, setConnectionId] = useState<string>("");
  const [schedule, setSchedule] = useState<CreateReportInput["schedule"]>("daily_06");
  const [emailTo, setEmailTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeConns = (connsQuery.data ?? []).filter((c) => c.status === "active");

  // Default-select first active connection. Guarded — runs once per mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      showToast(t.scheduledReportForm.createdToast, "success");
      navigation.goBack();
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = () => {
    setError(null);
    if (!name.trim() || !question.trim() || !connectionId || !emailTo.trim()) {
      setError(t.scheduledReportForm.errAllRequired);
      return;
    }
    mutation.mutate();
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.scheduledReportForm.brand}
        title={t.scheduledReportForm.title}
        description={t.scheduledReportForm.description}
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
          <Field label={t.scheduledReportForm.fieldName}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t.scheduledReportForm.fieldNamePlaceholder}
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              accessibilityLabel={t.scheduledReportForm.fieldNameA11y}
            />
          </Field>

          <Field label={t.scheduledReportForm.fieldQuestion}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder={t.scheduledReportForm.fieldQuestionPlaceholder}
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              accessibilityLabel={t.scheduledReportForm.fieldQuestionA11y}
            />
          </Field>

          <Field label={t.scheduledReportForm.fieldConnection}>
            {activeConns.length === 0 ? (
              <Text style={styles.muted}>{t.scheduledReportForm.noActiveConnections}</Text>
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

          <Field label={t.scheduledReportForm.fieldSchedule}>
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

          <Field label={t.scheduledReportForm.fieldEmail}>
            <TextInput
              value={emailTo}
              onChangeText={setEmailTo}
              placeholder={t.scheduledReportForm.fieldEmailPlaceholder}
              placeholderTextColor={colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel={t.scheduledReportForm.fieldEmailA11y}
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
            accessibilityLabel={t.scheduledReportForm.submitA11y}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.submitText}>{t.common.save}</Text>
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

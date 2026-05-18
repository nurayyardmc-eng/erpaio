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
import { createWatchlist, getConnections, updateWatchlist, type CreateWatchlistInput } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import { apiErrorMessage } from "../lib/apiError";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

type Props = NativeStackScreenProps<MoreStackParamList, "WatchlistForm"> & {
  navigation: NativeStackNavigationProp<MoreStackParamList, "WatchlistForm">;
};

const OPS: Array<{ id: CreateWatchlistInput["thresholdOp"]; label: string }> = [
  { id: "lt", label: "<" },
  { id: "lte", label: "≤" },
  { id: "gt", label: ">" },
  { id: "gte", label: "≥" },
  { id: "eq", label: "=" },
];

export default function WatchlistFormScreen({ navigation, route }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const editWatchlist = route.params?.editWatchlist;
  const isEdit = !!editWatchlist;
  // Edit mode'da connection değiştirilemez (PATCH şeması connectionId kabul
  // etmiyor). Create için connection chooser şart.
  const connsQuery = useQuery({
    queryKey: ["connections"],
    queryFn: getConnections,
    enabled: !isEdit,
  });

  const [name, setName] = useState(editWatchlist?.name ?? "");
  const [question, setQuestion] = useState(editWatchlist?.question ?? "");
  const [connectionId, setConnectionId] = useState<string>("");
  const [thresholdOp, setThresholdOp] = useState<CreateWatchlistInput["thresholdOp"]>(
    (editWatchlist?.thresholdOp as CreateWatchlistInput["thresholdOp"]) ?? "lt",
  );
  const [thresholdVal, setThresholdVal] = useState(
    editWatchlist?.thresholdVal != null ? String(editWatchlist.thresholdVal) : "",
  );
  const [emailTo, setEmailTo] = useState(editWatchlist?.emailTo ?? "");
  const [error, setError] = useState<string | null>(null);

  const activeConns = (connsQuery.data ?? []).filter((c) => c.status === "active");

  // Default-select first active connection (create-only). Guarded — runs once.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isEdit && !connectionId && activeConns[0]) setConnectionId(activeConns[0].id);
  }, [activeConns, connectionId, isEdit]);

  const mutation = useMutation<void, Error>({
    mutationFn: async () => {
      const valNum = parseFloat(thresholdVal);
      if (isEdit && editWatchlist) {
        await updateWatchlist(editWatchlist.id, {
          name: name.trim(),
          question: question.trim(),
          thresholdOp,
          thresholdVal: valNum,
          emailTo: emailTo.trim() ? emailTo.trim() : null,
        });
        return;
      }
      await createWatchlist({
        name: name.trim(),
        question: question.trim(),
        connectionId,
        thresholdOp,
        thresholdVal: valNum,
        emailTo: emailTo.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      showToast(isEdit ? t.watchlistForm.updatedToast : t.watchlistForm.createdToast, "success");
      navigation.goBack();
    },
    onError: (e: Error) => setError(apiErrorMessage(e, t)),
  });

  const onSubmit = () => {
    setError(null);
    if (!name.trim() || !question.trim() || (!isEdit && !connectionId)) {
      setError(t.watchlistForm.errRequired);
      return;
    }
    const val = parseFloat(thresholdVal);
    if (Number.isNaN(val)) {
      setError(t.watchlistForm.errInvalidThreshold);
      return;
    }
    mutation.mutate();
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={isEdit ? t.watchlistForm.editBrand : t.watchlistForm.brand}
        title={isEdit ? t.watchlistForm.editTitle : t.watchlistForm.title}
        description={isEdit ? t.watchlistForm.editDescription : t.watchlistForm.description}
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
          <Field label={t.watchlistForm.fieldName}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t.watchlistForm.fieldNamePlaceholder}
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              accessibilityLabel={t.watchlistForm.fieldNameA11y}
            />
          </Field>

          <Field label={t.watchlistForm.fieldQuestion}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder={t.watchlistForm.fieldQuestionPlaceholder}
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              accessibilityLabel={t.watchlistForm.fieldQuestionA11y}
              accessibilityHint={t.watchlistForm.fieldQuestionHint}
            />
          </Field>

          {!isEdit && (
            <Field label={t.watchlistForm.fieldConnection}>
              {activeConns.length === 0 ? (
                <Text style={styles.muted}>{t.watchlistForm.noActiveConnections}</Text>
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
          )}

          <Field label={t.watchlistForm.fieldOperator}>
            <View style={styles.chipRow}>
              {OPS.map((op) => {
                const active = thresholdOp === op.id;
                return (
                  <TouchableOpacity
                    key={op.id}
                    onPress={() => setThresholdOp(op.id)}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${t.watchlistForm.operatorA11yPrefix}${op.label}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive, { fontSize: 16 }]}>{op.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <Field label={t.watchlistForm.fieldThreshold}>
            <TextInput
              value={thresholdVal}
              onChangeText={setThresholdVal}
              placeholder={t.watchlistForm.fieldThresholdPlaceholder}
              placeholderTextColor={colors.textSubtle}
              keyboardType="decimal-pad"
              style={styles.input}
              accessibilityLabel={t.watchlistForm.fieldThresholdA11y}
            />
          </Field>

          <Field label={t.watchlistForm.fieldEmail}>
            <TextInput
              value={emailTo}
              onChangeText={setEmailTo}
              placeholder={t.watchlistForm.fieldEmailPlaceholder}
              placeholderTextColor={colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel={t.watchlistForm.fieldEmailA11y}
            />
          </Field>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={mutation.isPending || (!isEdit && activeConns.length === 0)}
            style={[styles.submitBtn, (mutation.isPending || (!isEdit && activeConns.length === 0)) && { opacity: 0.5 }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t.watchlistForm.submitA11y}
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

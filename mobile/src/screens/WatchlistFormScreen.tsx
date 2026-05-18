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
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { createWatchlist, getConnections, getWatchlistTriggers, runWatchlistTest, updateWatchlist, type CreateWatchlistInput } from "../lib/dashboard";
import { computeSparkline } from "../lib/watchlist/sparkline";
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

  // Track OOOO — trigger history (sadece edit modunda). useFocusEffect değil
  // ekran açılışı yeterli; user save'den önce geçmişi inceler, sonra ekran kapanır.
  const triggersQuery = useQuery({
    queryKey: ["watchlist-triggers", editWatchlist?.id ?? ""],
    queryFn: () => getWatchlistTriggers(editWatchlist!.id),
    enabled: isEdit,
  });

  // Track CC — preview run state.
  const [testResult, setTestResult] = useState<{ value: number; wouldTrigger: boolean } | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  const runTest = async () => {
    if (!editWatchlist) return;
    setTestRunning(true);
    setTestResult(null);
    try {
      const r = await runWatchlistTest(editWatchlist.id);
      setTestResult({ value: r.value, wouldTrigger: r.wouldTrigger });
    } catch (e) {
      // showToast yerine sessiz başarısızlık değil — user farkında olmalı
      const msg = e instanceof Error ? e.message : t.common.error;
      setError(msg);
    } finally {
      setTestRunning(false);
    }
  };

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

          {/* Trigger history — Track OOOO, sadece edit modunda */}
          {isEdit && (
            <View style={styles.triggerBox}>
              <Text style={styles.triggerTitle}>{t.watchlistForm.triggerHistoryTitle}</Text>
              {triggersQuery.isLoading ? (
                <Text style={styles.triggerEmpty}>{t.common.loading}</Text>
              ) : (triggersQuery.data?.triggers ?? []).length === 0 ? (
                <Text style={styles.triggerEmpty}>{t.watchlistForm.triggerHistoryEmpty}</Text>
              ) : (
                <>
                  {/* Track XXXX — sparkline value-over-time, threshold dashed */}
                  <TriggerSparkline
                    triggers={triggersQuery.data?.triggers ?? []}
                    thresholdVal={parseFloat(thresholdVal) || 0}
                  />
                  {(triggersQuery.data?.triggers ?? []).map((tr) => (
                    <View key={tr.id} style={styles.triggerRow}>
                      <Text style={styles.triggerValue}>
                        {tr.value} {tr.thresholdOp} {tr.thresholdVal}
                      </Text>
                      <Text style={styles.triggerTime}>
                        {new Date(tr.triggeredAt).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                  {(triggersQuery.data?.triggers ?? []).length === 50 && (
                    <Text style={styles.triggerCap}>{t.watchlistForm.triggerHistoryCap}</Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* Track CC — Test çalıştır sadece edit modunda (yeni metric'in
              ID'si olmadan endpoint çağırılamaz). */}
          {isEdit && (
            <>
              <TouchableOpacity
                onPress={runTest}
                disabled={testRunning}
                style={[styles.testBtn, testRunning && { opacity: 0.5 }]}
                activeOpacity={0.7}
              >
                <Text style={styles.testBtnText}>
                  {testRunning ? "..." : t.watchlistForm.testRunBtn}
                </Text>
              </TouchableOpacity>
              {testResult && (
                <View
                  style={[
                    styles.testResultBox,
                    { backgroundColor: testResult.wouldTrigger ? "#D1FAE5" : colors.bgSubtle },
                  ]}
                >
                  <Text style={[styles.testResultText, { color: testResult.wouldTrigger ? "#065F46" : colors.textMuted }]}>
                    {t.watchlistForm.testRunResultPrefix} {testResult.value} —{" "}
                    {testResult.wouldTrigger ? t.watchlistForm.testRunWouldTrigger : t.watchlistForm.testRunNoTrigger}
                  </Text>
                </View>
              )}
            </>
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

/**
 * Track XXXX — value-over-time sparkline. react-native-svg ile (zaten dep).
 * Web TriggerSparkline ile aynı pattern; computeSparkline pure helper aynı.
 */
function TriggerSparkline({
  triggers,
  thresholdVal,
}: {
  triggers: { value: number; triggeredAt: string }[];
  thresholdVal: number;
}) {
  const data = computeSparkline(triggers, thresholdVal);
  if (!data.hasData) return null;

  const W = 280;
  const H = 40;
  const PAD = 4;
  const xPx = (x: number) => PAD + x * (W - 2 * PAD);
  const yPx = (y: number) => H - PAD - y * (H - 2 * PAD);
  const polyline = data.points.map((p) => `${xPx(p.x)},${yPx(p.y)}`).join(" ");
  const thresholdYpx = yPx(data.thresholdY);

  return (
    <View style={{ marginBottom: spacing(2) }}>
      <Svg width={W} height={H}>
        <Line
          x1={PAD}
          x2={W - PAD}
          y1={thresholdYpx}
          y2={thresholdYpx}
          stroke="#F59E0B"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {data.points.length === 1 ? (
          <Circle cx={xPx(data.points[0].x)} cy={yPx(data.points[0].y)} r={3} fill={colors.text} />
        ) : (
          <>
            <Polyline points={polyline} fill="none" stroke={colors.text} strokeWidth={1.5} />
            {data.points.map((p, i) => (
              <Circle key={i} cx={xPx(p.x)} cy={yPx(p.y)} r={2} fill={colors.text} />
            ))}
          </>
        )}
      </Svg>
      <Text style={{ fontSize: 10, color: colors.textSubtle, fontFamily: "Menlo, monospace", marginTop: 2 }}>
        min: {data.minVal} · max: {data.maxVal}
      </Text>
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
  testBtn: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing(2),
  },
  testBtnText: { color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "600" },
  testResultBox: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: spacing(2),
  },
  testResultText: { fontFamily: font, fontSize: 13, fontWeight: "600" },
  triggerBox: {
    marginTop: spacing(3),
    marginBottom: spacing(2),
    paddingTop: spacing(3),
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  triggerTitle: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: spacing(2),
  },
  triggerEmpty: { color: colors.textSubtle, fontFamily: font, fontSize: 13, fontStyle: "italic" },
  triggerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing(1.5),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  triggerValue: { color: colors.text, fontFamily: "Menlo, monospace", fontSize: 12, fontWeight: "500" },
  triggerTime: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  triggerCap: { color: colors.textSubtle, fontFamily: font, fontSize: 11, fontStyle: "italic", marginTop: spacing(2) },
});

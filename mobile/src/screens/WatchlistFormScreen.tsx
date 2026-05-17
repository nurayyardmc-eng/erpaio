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
import { createWatchlist, getConnections, type CreateWatchlistInput } from "../lib/dashboard";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import { showToast } from "../components/Toast";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "WatchlistForm">;
}

const OPS: Array<{ id: CreateWatchlistInput["thresholdOp"]; label: string }> = [
  { id: "lt", label: "<" },
  { id: "lte", label: "≤" },
  { id: "gt", label: ">" },
  { id: "gte", label: "≥" },
  { id: "eq", label: "=" },
];

export default function WatchlistFormScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const connsQuery = useQuery({ queryKey: ["connections"], queryFn: getConnections });

  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [connectionId, setConnectionId] = useState<string>("");
  const [thresholdOp, setThresholdOp] = useState<CreateWatchlistInput["thresholdOp"]>("lt");
  const [thresholdVal, setThresholdVal] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeConns = (connsQuery.data ?? []).filter((c) => c.status === "active");

  useEffect(() => {
    if (!connectionId && activeConns[0]) setConnectionId(activeConns[0].id);
  }, [activeConns, connectionId]);

  const mutation = useMutation({
    mutationFn: () =>
      createWatchlist({
        name: name.trim(),
        question: question.trim(),
        connectionId,
        thresholdOp,
        thresholdVal: parseFloat(thresholdVal),
        emailTo: emailTo.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      showToast("Watchlist oluşturuldu", "success");
      navigation.goBack();
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = () => {
    setError(null);
    if (!name.trim() || !question.trim() || !connectionId) {
      setError("İsim, soru ve bağlantı zorunlu.");
      return;
    }
    const val = parseFloat(thresholdVal);
    if (Number.isNaN(val)) {
      setError("Eşik değer geçerli bir sayı olmalı.");
      return;
    }
    mutation.mutate();
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand="ERPAIO · YENİ WATCHLIST"
        title="Watchlist Ekle"
        description="Sorgu sonucu eşiği geçince otomatik email uyarısı."
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
              placeholder="Kritik stok uyarısı"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              accessibilityLabel="Watchlist ismi"
            />
          </Field>

          <Field label="Soru (Türkçe) *">
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Kritik stoktaki ürün sayısı"
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              accessibilityLabel="Watchlist sorusu"
              accessibilityHint="AI bu soruyu SQL'e çevirir, sonucu eşik ile karşılaştırır"
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

          <Field label="Eşik Operatörü">
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
                    accessibilityLabel={`Eşik operatörü ${op.label}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive, { fontSize: 16 }]}>{op.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <Field label="Eşik Değer *">
            <TextInput
              value={thresholdVal}
              onChangeText={setThresholdVal}
              placeholder="10"
              placeholderTextColor={colors.textSubtle}
              keyboardType="decimal-pad"
              style={styles.input}
              accessibilityLabel="Eşik değer"
            />
          </Field>

          <Field label="Email Alıcı (opsiyonel)">
            <TextInput
              value={emailTo}
              onChangeText={setEmailTo}
              placeholder="alerts@firma.com (boş = tenant default)"
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
            accessibilityLabel="Watchlist'i kaydet"
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

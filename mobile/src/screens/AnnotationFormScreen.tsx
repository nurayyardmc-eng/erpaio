import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertAnnotation } from "../lib/dashboard";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import { showToast } from "../components/Toast";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "AnnotationForm">;
}

export default function AnnotationFormScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [tableName, setTableName] = useState("");
  const [columnName, setColumnName] = useState("");
  const [description, setDescription] = useState("");
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      upsertAnnotation({
        tableName: tableName.trim(),
        columnName: columnName.trim() || null,
        description: description.trim() || null,
        hidden,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations"] });
      showToast("Açıklama kaydedildi", "success");
      navigation.goBack();
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = () => {
    setError(null);
    if (!tableName.trim()) {
      setError("Tablo adı zorunlu.");
      return;
    }
    mutation.mutate();
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand="ERPAIO · YENİ AÇIKLAMA"
        title="Şema Açıklaması Ekle"
        description="AI sorgu üretirken bu notu kullanır. Müşteri-özgü tablolarda kritik."
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
          <Field label="Tablo Adı *">
            <TextInput
              value={tableName}
              onChangeText={setTableName}
              placeholder="trFatura"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Tablo adı"
            />
          </Field>

          <Field label="Kolon Adı (opsiyonel)">
            <TextInput
              value={columnName}
              onChangeText={setColumnName}
              placeholder="Boş = tablo seviyesi"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Kolon adı"
            />
          </Field>

          <Field label="Açıklama">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Örn: Bu tabloda sadece e-ticaret faturaları var, mağaza satışları için trFaturaMagaza kullan."
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={4}
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
              accessibilityLabel="Açıklama"
            />
          </Field>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Gizle</Text>
              <Text style={styles.toggleDesc}>
                AI bu tabloyu / kolonu kullanmasın
              </Text>
            </View>
            <Switch
              value={hidden}
              onValueChange={setHidden}
              trackColor={{ false: colors.bgMuted, true: colors.brand }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.bgMuted}
            />
          </View>

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
            accessibilityLabel="Açıklamayı kaydet"
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  toggleLabel: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "600", marginBottom: 2 },
  toggleDesc: { color: colors.textSubtle, fontFamily: font, fontSize: 12 },
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

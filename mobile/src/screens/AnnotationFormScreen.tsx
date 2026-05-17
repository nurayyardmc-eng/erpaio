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
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "AnnotationForm">;
}

export default function AnnotationFormScreen({ navigation }: Props) {
  const { t } = useI18n();
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
      showToast(t.annotationForm.savedToast, "success");
      navigation.goBack();
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = () => {
    setError(null);
    if (!tableName.trim()) {
      setError(t.annotationForm.errTableRequired);
      return;
    }
    mutation.mutate();
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.annotationForm.brand}
        title={t.annotationForm.title}
        description={t.annotationForm.description}
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
          <Field label={t.annotationForm.fieldTable}>
            <TextInput
              value={tableName}
              onChangeText={setTableName}
              placeholder={t.annotationForm.fieldTablePlaceholder}
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel={t.annotationForm.fieldTableA11y}
            />
          </Field>

          <Field label={t.annotationForm.fieldColumn}>
            <TextInput
              value={columnName}
              onChangeText={setColumnName}
              placeholder={t.annotationForm.fieldColumnPlaceholder}
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel={t.annotationForm.fieldColumnA11y}
            />
          </Field>

          <Field label={t.annotationForm.fieldDescription}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t.annotationForm.fieldDescriptionPlaceholder}
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={4}
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
              accessibilityLabel={t.annotationForm.fieldDescriptionA11y}
            />
          </Field>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>{t.annotationForm.toggleHiddenLabel}</Text>
              <Text style={styles.toggleDesc}>
                {t.annotationForm.toggleHiddenDesc}
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
            accessibilityLabel={t.annotationForm.submitA11y}
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

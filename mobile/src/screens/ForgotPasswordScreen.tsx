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
import { requestPasswordReset } from "../lib/auth";
import Logo from "../components/Logo";
import { colors, font, fontSerif, radius, shadow } from "../lib/theme";

interface Props {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Geçerli bir email adresi girin.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(cleanEmail);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "İstek başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Logo size={80} variant="full" />
          </View>

          <Text style={styles.title}>Şifremi Unuttum</Text>
          <Text style={styles.subtitle}>
            Email adresine şifre sıfırlama linki göndereceğiz.
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Email gönderildi</Text>
              <Text style={styles.successText}>
                {email} adresine sıfırlama linki gönderdik. Linke tıklayıp yeni şifrenizi belirleyin (1 saat geçerli).
              </Text>
              <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
                <Text style={styles.backText}>Girişe Dön</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="ornek@firma.com"
                  placeholderTextColor={colors.textSubtle}
                  style={styles.input}
                  editable={!loading}
                />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={submit}
                disabled={loading || !email}
                style={[styles.button, (loading || !email) && styles.buttonDisabled]}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.buttonText}>Sıfırlama Linki Gönder</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={onBack} style={styles.linkBack}>
                <Text style={styles.linkText}>← Girişe dön</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: 32,
    ...shadow.sm,
  },
  logoWrap: { marginBottom: 24, alignItems: "center" },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontFamily: fontSerif,
    marginBottom: 6,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, fontFamily: font, marginBottom: 22, lineHeight: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "500", color: colors.text, marginBottom: 6, fontFamily: font },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    fontFamily: font,
  },
  errorBox: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: { color: colors.error, fontSize: 13, fontWeight: "500", fontFamily: font },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.textInverse, fontSize: 14, fontWeight: "600", fontFamily: font },
  linkBack: { marginTop: 16, alignItems: "center" },
  linkText: { color: colors.textMuted, fontSize: 13, fontFamily: font },
  successBox: { gap: 14 },
  successTitle: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: font,
  },
  successText: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: font,
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  backText: { color: colors.textInverse, fontSize: 14, fontWeight: "600", fontFamily: font },
});

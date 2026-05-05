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
import { login } from "../lib/auth";
import Logo from "../components/Logo";
import { colors, font, radius, shadow } from "../lib/theme";

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Geçerli bir email adresi girin.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(cleanEmail, password);
      onLoginSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Giriş başarısız.");
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
            <Logo size={96} variant="full" />
          </View>

          <Text style={styles.title}>Giriş Yap</Text>
          <Text style={styles.subtitle}>Hesabına devam et</Text>

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

          <View style={styles.field}>
            <Text style={styles.label}>Şifre</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
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
            disabled={loading || !email || !password}
            style={[styles.button, (loading || !email || !password) && styles.buttonDisabled]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Hesabın yok mu?</Text>
            <TouchableOpacity disabled>
              <Text style={[styles.bottomLink, { opacity: 0.5 }]}> Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgSubtle,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
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
  logoWrap: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontFamily: font,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: font,
    marginBottom: 24,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 6,
    fontFamily: font,
  },
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
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "500",
    fontFamily: font,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: font,
  },
  bottomRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomText: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: font,
  },
  bottomLink: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: font,
  },
});

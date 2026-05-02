import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { login } from "../lib/auth";
import { colors, font, radius, spacing } from "../lib/theme";

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
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
      <View style={styles.card}>
        <Text style={styles.brand}>ERPAIO</Text>
        <Text style={styles.title}>Giriş Yap</Text>

        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="admin@example.com"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          editable={!loading}
        />

        <Text style={styles.label}>ŞİFRE</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          editable={!loading}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          onPress={submit}
          disabled={loading || !email || !password}
          style={[styles.button, (loading || !email || !password) && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.buttonText}>Giriş Yap →</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(5),
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing(8),
  },
  brand: {
    color: colors.accent,
    fontFamily: font,
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: spacing(2),
  },
  title: {
    color: colors.text,
    fontFamily: font,
    fontSize: 20,
    marginBottom: spacing(6),
    fontWeight: "600",
  },
  label: {
    color: colors.textDim,
    fontFamily: font,
    fontSize: 11,
    marginBottom: spacing(1.5),
    marginTop: spacing(2),
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    color: colors.text,
    fontFamily: font,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: font,
    fontSize: 12,
    marginTop: spacing(3),
  },
  button: {
    marginTop: spacing(6),
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.accent,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "600",
  },
});

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
import { signup, login } from "../lib/auth";
import Logo from "../components/Logo";
import { colors, font, fontSerif, radius, shadow } from "../lib/theme";
import { showToast } from "../components/Toast";

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

export default function SignupScreen({ onSuccess, onBack }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password || !tenantName.trim()) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Geçerli bir email adresi girin.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signup({
        email: cleanEmail,
        password,
        name: name.trim() || undefined,
        tenantName: tenantName.trim(),
      });
      // Otomatik login
      await login(cleanEmail, password);
      showToast("Hesap oluşturuldu, hoş geldiniz!", "success");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız.");
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

          <Text style={styles.title}>Kayıt Ol</Text>
          <Text style={styles.subtitle}>14 gün ücretsiz Pro deneme</Text>

          <View style={styles.field}>
            <Text style={styles.label}>İsim (opsiyonel)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ali Yılmaz"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              editable={!loading}
              accessibilityLabel="İsim"
            />
          </View>

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
            <Text style={styles.label}>Şifre (en az 8 karakter)</Text>
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

          <View style={styles.field}>
            <Text style={styles.label}>Şirket Adı</Text>
            <TextInput
              value={tenantName}
              onChangeText={setTenantName}
              placeholder="Firma Ltd."
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
            disabled={loading || !email || !password || !tenantName}
            style={[
              styles.button,
              (loading || !email || !password || !tenantName) && styles.buttonDisabled,
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Hesap oluştur"
            accessibilityState={{ disabled: loading || !email || !password || !tenantName }}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Hesap Oluştur</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Hesabın var mı?</Text>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.bottomLink}> Giriş Yap</Text>
            </TouchableOpacity>
          </View>
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
    padding: 28,
    ...shadow.sm,
  },
  logoWrap: { marginBottom: 20, alignItems: "center" },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontFamily: fontSerif,
    marginBottom: 4,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, fontFamily: font, marginBottom: 20 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "500", color: colors.text, marginBottom: 5, fontFamily: font },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    fontFamily: font,
  },
  errorBox: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
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
  bottomRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomText: { color: colors.textMuted, fontSize: 13, fontFamily: font },
  bottomLink: { color: colors.brand, fontSize: 13, fontWeight: "600", fontFamily: font },
});

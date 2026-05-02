import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, font, radius, spacing } from "../lib/theme";

interface Props {
  title: string;
  onLogout?: () => void;
}

export default function PlaceholderScreen({ title, onLogout }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.brand}>ERPAIO</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.muted}>Bu ekran sonraki batch&apos;te dolacak.</Text>
      {onLogout && (
        <TouchableOpacity onPress={onLogout} style={styles.button}>
          <Text style={styles.buttonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing(10),
    alignItems: "flex-start",
    justifyContent: "flex-start",
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
    fontSize: 24,
    marginBottom: spacing(6),
    fontWeight: "600",
  },
  muted: {
    color: colors.textDim,
    fontFamily: font,
    fontSize: 12,
  },
  button: {
    marginTop: spacing(8),
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
  },
  buttonText: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 12,
  },
});

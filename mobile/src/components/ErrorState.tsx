import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, font, fontSerif } from "../lib/theme";

interface Props {
  message?: string;
  onRetry?: () => void;
}

/**
 * Web ErrorState ile aynı: kırmızı tonlu uyarı kutusu + retry butonu.
 */
export default function ErrorState({ message, onRetry }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>⚠</Text>
      </View>
      <Text style={styles.title}>Veri yüklenemedi</Text>
      <Text style={styles.description}>
        {message ?? "Bağlantı sorunu olabilir. Lütfen tekrar deneyin."}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.button} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Tekrar dene</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    backgroundColor: "rgba(239, 68, 68, 0.04)",
    borderColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderRadius: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 22,
    color: colors.error,
  },
  title: {
    fontFamily: fontSerif,
    fontSize: 18,
    fontWeight: "400",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: font,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  button: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: colors.brand,
    borderRadius: 100,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: "500",
    fontFamily: font,
  },
});

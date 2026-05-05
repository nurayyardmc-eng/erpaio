import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, font, fontSerif, spacing } from "../lib/theme";

interface Props {
  brand?: string;
  title: string;
  description?: string;
  onBack?: () => void;
  right?: ReactNode;
}

/**
 * Standard sayfa header — ERPAIO marka label + Playfair başlık + opsiyonel açıklama.
 */
export default function ScreenHeader({ brand, title, description, onBack, right }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.6}>
              <Text style={styles.backText}>← Geri</Text>
            </TouchableOpacity>
          )}
          {brand && <Text style={styles.brand}>{brand}</Text>}
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(4),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  row: { flexDirection: "row", alignItems: "flex-start" },
  backBtn: { marginBottom: spacing(2), alignSelf: "flex-start" },
  backText: { color: colors.brand, fontFamily: font, fontSize: 13, fontWeight: "500" },
  brand: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fontSerif,
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: -0.5,
  },
  description: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing(1.5),
    maxWidth: 600,
  },
});

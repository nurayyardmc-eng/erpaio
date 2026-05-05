import { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, font, fontSerif } from "../lib/theme";

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Web EmptyState ile aynı tasarım: ikon + Playfair başlık + açıklama + opsiyonel aksiyon.
 * Mobile'da SVG icon yerine emoji/text karakterli ikon kullanıyoruz (basit + paket gereksiz).
 */
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <View style={styles.root}>
      {icon && (
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.actionWrap}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  iconBox: {
    width: 64,
    height: 64,
    backgroundColor: colors.bgSubtle,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconText: {
    fontSize: 28,
    color: colors.textMuted,
  },
  title: {
    fontFamily: fontSerif,
    fontSize: 22,
    fontWeight: "400",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  description: {
    fontFamily: font,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  actionWrap: {
    marginTop: 8,
  },
});

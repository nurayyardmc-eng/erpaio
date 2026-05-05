import { View, Text, StyleSheet } from "react-native";
import { colors, fontSerif } from "../lib/theme";

interface Props {
  size?: number;
  variant?: "full" | "mark";
  inverse?: boolean;
}

/**
 * ERPAIO logo — text + simple bars amblem.
 * - "full": ERPAIO yazısı + amblem bars
 * - "mark": sadece amblem bars (ikon)
 *
 * SVG yerine RN View'lar ile çiziyoruz (ek paket gerekmez).
 */
export default function Logo({ size = 96, variant = "full", inverse = false }: Props) {
  const color = inverse ? colors.textInverse : colors.brand;
  const barHeight = Math.max(2, size * 0.022);
  const barRadius = barHeight / 2;
  const markWidth = size * 0.22;

  const bars = (
    <View style={{ width: markWidth, gap: barHeight * 1.6, alignItems: "flex-end" }}>
      <View style={{ width: markWidth, height: barHeight, backgroundColor: color, borderRadius: barRadius }} />
      <View style={{ width: markWidth * 0.5, height: barHeight, backgroundColor: color, borderRadius: barRadius }} />
      <View style={{ width: markWidth, height: barHeight, backgroundColor: color, borderRadius: barRadius }} />
      <View style={{ width: markWidth * 0.4, height: barHeight, backgroundColor: color, borderRadius: barRadius }} />
      <View style={{ width: markWidth * 0.85, height: barHeight, backgroundColor: color, borderRadius: barRadius }} />
    </View>
  );

  if (variant === "mark") {
    return <View>{bars}</View>;
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.06 }}>
      <Text style={[styles.text, { color, fontSize: size * 0.32, letterSpacing: size * 0.012 }]}>
        ERPAIO
      </Text>
      {bars}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontSerif,
    fontWeight: "400",
  },
});

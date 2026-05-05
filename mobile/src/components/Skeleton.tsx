import { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";
import { colors } from "../lib/theme";

interface Props {
  width?: number | `${number}%` | "auto";
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Web Skeleton ile aynı: pulse animation ile loading placeholder.
 */
export default function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.bgSubtle,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface ListProps {
  count?: number;
  height?: number;
  gap?: number;
}

export function SkeletonList({ count = 3, height = 64, gap = 8 }: ListProps) {
  return (
    <Animated.View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} borderRadius={10} />
      ))}
    </Animated.View>
  );
}

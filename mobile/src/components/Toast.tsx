import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors, font, radius } from "../lib/theme";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

let counter = 0;
const listeners: ((item: ToastItem) => void)[] = [];

export function showToast(message: string, kind: ToastKind = "success"): void {
  const item: ToastItem = { id: ++counter, message, kind };
  listeners.forEach((l) => l(item));
}

/**
 * Web Toaster ile aynı API: showToast(message, kind) ile kullanılır.
 * Root layoutta <Toaster /> mount edilmeli.
 */
export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (item: ToastItem) => {
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 3000);
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.root} pointerEvents="none">
      {toasts.map((t) => (
        <ToastView key={t.id} message={t.message} kind={t.kind} />
      ))}
    </View>
  );
}

function ToastView({ message, kind }: { message: string; kind: ToastKind }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 2700);
  }, [opacity, translateY]);

  const bgColor =
    kind === "success" ? colors.successSoft : kind === "error" ? colors.errorSoft : colors.infoSoft;
  const textColor = kind === "success" ? colors.success : kind === "error" ? colors.error : colors.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bgColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: "100%",
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: font,
  },
});

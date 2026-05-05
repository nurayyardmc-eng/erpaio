import { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, font, fontSerif, radius } from "../lib/theme";

interface ConfirmOpts {
  id: number;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

let counter = 0;
const listeners: ((opts: ConfirmOpts) => void)[] = [];

/**
 * Web confirmDialog ile aynı API.
 * await confirmDialog({ title, message, destructive: true }) → boolean
 */
export function confirmDialog(opts: Omit<ConfirmOpts, "id" | "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    const id = ++counter;
    listeners.forEach((l) => l({ id, ...opts, resolve }));
  });
}

/**
 * Root layoutta <ConfirmHost /> olarak mount edilmeli.
 */
export default function ConfirmHost() {
  const [stack, setStack] = useState<ConfirmOpts[]>([]);

  useEffect(() => {
    const listener = (opts: ConfirmOpts) => {
      setStack((prev) => [...prev, opts]);
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  const close = (id: number, ok: boolean) => {
    setStack((prev) => {
      const item = prev.find((x) => x.id === id);
      item?.resolve(ok);
      return prev.filter((x) => x.id !== id);
    });
  };

  if (stack.length === 0) return null;
  const top = stack[stack.length - 1];

  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
      onRequestClose={() => close(top.id, false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{top.title}</Text>
          <Text style={styles.message}>{top.message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={() => close(top.id, false)}
              style={[styles.button, styles.cancelButton]}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>{top.cancelLabel ?? "İptal"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => close(top.id, true)}
              style={[
                styles.button,
                top.destructive ? styles.destructiveButton : styles.confirmButton,
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{top.confirmLabel ?? "Onayla"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 10, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 28,
    width: "100%",
    maxWidth: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 8,
  },
  warningIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.errorSoft,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  warningText: {
    fontSize: 22,
    color: colors.error,
  },
  title: {
    fontFamily: fontSerif,
    fontSize: 22,
    fontWeight: "400",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  message: {
    fontFamily: font,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cancelText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: font,
  },
  confirmButton: {
    backgroundColor: colors.brand,
  },
  destructiveButton: {
    backgroundColor: colors.error,
  },
  confirmText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: font,
  },
});

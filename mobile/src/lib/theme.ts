// Mobile theme — web tarafıyla aynı warm B&W palette.
// Inter sistemde yoksa system font fallback.
import { Platform } from "react-native";

export const colors = {
  // Backgrounds
  bg: "#FAFAF8",
  bgSubtle: "#F2F1EE",
  bgMuted: "#EDECE8",
  card: "#FFFFFF",
  bgDark: "#0A0A0A",

  // Borders
  border: "rgba(10, 10, 10, 0.08)",
  borderStrong: "rgba(10, 10, 10, 0.12)",
  borderSubtle: "rgba(10, 10, 10, 0.04)",
  borderSoft: "rgba(10, 10, 10, 0.04)",

  // Brand
  brand: "#0A0A0A",
  brandHover: "#1A1A1A",
  brandSoft: "#F2F1EE",

  // Text
  text: "#0A0A0A",
  textMuted: "#525252",
  textSubtle: "#737373",
  textInverse: "#FAFAF8",

  // Status
  success: "#10B981",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  error: "#EF4444",
  errorSoft: "#FEE2E2",
  info: "#3B82F6",
  infoSoft: "#DBEAFE",

  accent: "#9C8AFF",
  accentSoft: "#EDE9FE",

  // Mobile-specific aliases (eski referansları korumak için)
  surface: "#FFFFFF",
  textDim: "#737373",
  accentMuted: "rgba(10, 10, 10, 0.06)",
  accentBorder: "rgba(10, 10, 10, 0.12)",
  danger: "#EF4444",
  cached: "#9C8AFF",
} as const;

// Inter sistemde mevcutsa kullan, değilse iOS San Francisco / Android Roboto
export const font = Platform.OS === "ios" ? "System" : "sans-serif";
export const fontMono = Platform.OS === "ios" ? "Menlo" : "monospace";
export const fontSerif = Platform.OS === "ios" ? "Georgia" : "serif";

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const spacing = (n: number) => n * 4;

// Shadow — RN'de elevation + shadow* özellikleri ile
export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
} as const;

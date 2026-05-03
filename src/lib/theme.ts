export const colors = {
  bg: "#FAFAF8",
  bgSubtle: "#F2F1EE",
  bgMuted: "#EDECE8",
  card: "#FFFFFF",
  bgDark: "#0A0A0A",

  border: "rgba(10, 10, 10, 0.08)",
  borderStrong: "rgba(10, 10, 10, 0.12)",
  borderSubtle: "rgba(10, 10, 10, 0.04)",

  brand: "#0A0A0A",
  brandHover: "#1A1A1A",
  brandSoft: "#F2F1EE",

  text: "#0A0A0A",
  textMuted: "#525252",
  textSubtle: "#737373",
  textInverse: "#FAFAF8",

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
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadow = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
} as const;

export const font = {
  family: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

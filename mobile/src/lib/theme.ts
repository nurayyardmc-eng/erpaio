export const colors = {
  bg: "#07090F",
  surface: "#0C1018",
  surfaceAlt: "#0A0D14",
  border: "#131A26",
  borderSoft: "#1E2A3E",
  text: "#E8EDF5",
  textMuted: "#9AA5B4",
  textDim: "#3A4558",
  accent: "#00E5FF",
  accentMuted: "rgba(0,229,255,0.15)",
  accentBorder: "rgba(0,229,255,0.4)",
  success: "#69FF47",
  warning: "#FF9500",
  danger: "#FF6B6B",
  cached: "#9C8AFF",
} as const;

export const font = "Menlo";

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
};

export const spacing = (n: number) => n * 4;

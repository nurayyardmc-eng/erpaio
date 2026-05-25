/**
 * Percent-change badge formatting.
 *
 * Used by overview/dashboard cards to render "↑ 5.2%" / "↓ 12.0%" / "→ 0.0%"
 * coloured by direction. Extracted (Track ZZZZZ) so the color thresholds and
 * arrow mapping live in one place — design system regression guard
 * (changing the green/red palette in theme.ts shouldn't silently break
 * this).
 *
 * Null/undefined input → muted grey + em-dash placeholder (caller may
 * choose to hide the badge entirely instead).
 */
import { colors } from "@/lib/theme";

export interface ChangeDelta {
  /** "↑" up arrow when positive, "↓" down arrow when negative, "→" sideways otherwise. */
  arrow: "↑" | "↓" | "→";
  /** Hex color from theme tokens. */
  color: string;
  /** Absolute value formatted to 1 fractional digit (e.g. "5.2"). */
  absText: string;
  /** True when the input was null/undefined — caller may hide the badge. */
  isMissing: boolean;
}

export function changeDelta(change: number | null | undefined): ChangeDelta {
  if (change === null || change === undefined) {
    return { arrow: "→", color: colors.textSubtle, absText: "—", isMissing: true };
  }
  const arrow: "↑" | "↓" | "→" = change > 0 ? "↑" : change < 0 ? "↓" : "→";
  const color = change > 0 ? colors.success : change < 0 ? colors.error : colors.textMuted;
  return {
    arrow,
    color,
    absText: Math.abs(change).toFixed(1),
    isMissing: false,
  };
}

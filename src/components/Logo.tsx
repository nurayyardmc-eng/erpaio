import { colors } from "@/lib/theme";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  color?: string;
}

export default function Logo({ size = 32, showWordmark = true, color = colors.brand }: LogoProps) {
  if (showWordmark) {
    return (
      <svg
        width={size * 2.6}
        height={size}
        viewBox="0 0 260 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ERPAIO"
      >
        <g fill={color}>
          <rect x="56" y="10" width="40" height="9" rx="4.5" />
          <rect x="64" y="24" width="24" height="9" rx="4.5" />
          <rect x="46" y="38" width="60" height="9" rx="4.5" />
          <rect x="60" y="52" width="32" height="9" rx="4.5" />
          <rect x="52" y="66" width="48" height="9" rx="4.5" />
        </g>
        <text
          x="130"
          y="58"
          fontFamily="var(--font-inter), Inter, system-ui, sans-serif"
          fontSize="32"
          fontWeight="800"
          letterSpacing="2"
          fill={color}
          dominantBaseline="middle"
        >
          ERPAIO
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ERPAIO"
    >
      <g fill={color}>
        <rect x="30" y="14" width="40" height="9" rx="4.5" />
        <rect x="38" y="30" width="24" height="9" rx="4.5" />
        <rect x="20" y="46" width="60" height="9" rx="4.5" />
        <rect x="34" y="62" width="32" height="9" rx="4.5" />
        <rect x="26" y="78" width="48" height="9" rx="4.5" />
      </g>
    </svg>
  );
}

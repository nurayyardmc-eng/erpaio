import { colors } from "@/lib/theme";

interface LogoProps {
  size?: number;
  variant?: "stacked" | "horizontal" | "mark";
  color?: string;
}

const VB = 200;
const CENTER = VB / 2;

const BAR_H = 14;
const BAR_GAP = 8;
const BAR_R = BAR_H / 2;

const BARS_W = [70, 42, 100, 50, 78];

function buildBars(yStart: number) {
  return BARS_W.map((w, i) => {
    const y = yStart + i * (BAR_H + BAR_GAP);
    const x = CENTER - w / 2;
    return (
      <rect
        key={i}
        x={x}
        y={y}
        width={w}
        height={BAR_H}
        rx={BAR_R}
      />
    );
  });
}

export default function Logo({ size = 32, variant = "horizontal", color = colors.brand }: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        fill={color}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ERPAIO"
      >
        {buildBars((VB - (5 * BAR_H + 4 * BAR_GAP)) / 2)}
      </svg>
    );
  }

  if (variant === "stacked") {
    return (
      <svg
        width={size * 1.6}
        height={size * 2}
        viewBox="0 0 200 250"
        fill={color}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ERPAIO"
      >
        {buildBars(20)}
        <text
          x="100"
          y="220"
          textAnchor="middle"
          fontFamily="var(--font-inter), Inter, system-ui, sans-serif"
          fontSize="44"
          fontWeight="800"
          letterSpacing="3"
          fill={color}
        >
          ERPAIO
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={size * 4.5}
      height={size}
      viewBox="0 0 360 80"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ERPAIO"
    >
      <g transform="translate(0, 8) scale(0.32)">
        {buildBars(0)}
      </g>
      <text
        x="80"
        y="52"
        fontFamily="var(--font-inter), Inter, system-ui, sans-serif"
        fontSize="38"
        fontWeight="800"
        letterSpacing="3"
        fill={color}
      >
        ERPAIO
      </text>
    </svg>
  );
}

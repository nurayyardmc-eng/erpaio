/* eslint-disable @next/next/no-img-element */

interface LogoProps {
  size?: number;
  variant?: "full" | "mark";
}

/**
 * Logo component
 * - "full" (default): bars + "ERPAIO" yazısı (logo.svg, kare)
 * - "mark": sadece bars amblem (logo-mark.svg, kare)
 */
export default function Logo({ size = 32, variant = "full" }: LogoProps) {
  if (variant === "mark") {
    return (
      <img
        src="/logo-mark.svg"
        alt="ERPAIO"
        width={size}
        height={size}
        style={{ display: "block" }}
      />
    );
  }

  // full — kare aspect ratio (1:1)
  return (
    <img
      src="/logo.svg"
      alt="ERPAIO"
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}

/* eslint-disable @next/next/no-img-element */

interface LogoProps {
  size?: number;
  variant?: "stacked" | "horizontal" | "mark";
}

export default function Logo({ size = 32, variant = "horizontal" }: LogoProps) {
  if (variant === "stacked") {
    return (
      <img
        src="/logo.svg"
        alt="ERPAIO"
        width={size * 2.4}
        height={size * 2.4}
        style={{ display: "block" }}
      />
    );
  }

  if (variant === "mark") {
    return (
      <img
        src="/logo.svg"
        alt="ERPAIO"
        width={size}
        height={size}
        style={{ display: "block", objectFit: "cover", objectPosition: "top" }}
      />
    );
  }

  return (
    <img
      src="/logo.svg"
      alt="ERPAIO"
      height={size * 1.4}
      style={{ display: "block", height: size * 1.4, width: "auto" }}
    />
  );
}

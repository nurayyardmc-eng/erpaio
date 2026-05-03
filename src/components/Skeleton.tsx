interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, rounded = 8, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius: rounded,
        ...style,
      }}
    />
  );
}

export function SkeletonList({ count = 3, gap = 12, height = 48 }: { count?: number; gap?: number; height?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}

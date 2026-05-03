"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { colors } from "@/lib/theme";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "16px 0",
      flexWrap: "wrap",
    }}>
      <div style={{ fontSize: 13, color: colors.textMuted }}>
        <span style={{ fontWeight: 600, color: colors.text }}>{start}–{end}</span>
        {" / "}
        <span>{total}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Önceki sayfa"
          style={btn}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{
          fontSize: 13,
          color: colors.text,
          padding: "0 12px",
          minWidth: 60,
          textAlign: "center",
        }}>
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Sonraki sayfa"
          style={btn}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
  cursor: "pointer",
};

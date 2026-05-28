"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { colors } from "@/lib/theme";
import { computePagination } from "@/lib/pagination";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onChange }: Props) {
  const { t } = useI18n();
  const { totalPages, start, end } = computePagination(page, pageSize, total);
  if (totalPages <= 1) return null;

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
          aria-label={t.pagination.prevAria}
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
          aria-label={t.pagination.nextAria}
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

/**
 * Pure pagination math.
 *
 * Extracted (Track GGGGGGGGGG) from src/components/Pagination.tsx to make
 * the math testable without rendering. Used by the UI Pagination component
 * + any future server-side pagination renderer.
 */

export interface PaginationInfo {
  /** Total number of pages (at least 1). */
  totalPages: number;
  /** 1-based index of the first item on the current page (0 if total = 0). */
  start: number;
  /** 1-based index of the last item on the current page (0 if total = 0). */
  end: number;
  /** True if this page has no preceding pages. */
  isFirst: boolean;
  /** True if this page has no following pages. */
  isLast: boolean;
}

export function computePagination(
  page: number,
  pageSize: number,
  total: number,
): PaginationInfo {
  // Defensive: pageSize must be positive, total clamped to >= 0.
  const safePageSize = Math.max(1, pageSize);
  const safeTotal = Math.max(0, total);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));

  const start = safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const end = Math.min(safePage * safePageSize, safeTotal);

  return {
    totalPages,
    start,
    end,
    isFirst: safePage <= 1,
    isLast: safePage >= totalPages,
  };
}

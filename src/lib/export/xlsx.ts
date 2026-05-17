// XLSX export — xlsx paketi ~5 MB. Dashboard sayfalarına bundle olarak girmesin
// diye lazy import. Sadece kullanıcı "XLSX indir" butonuna basınca yüklenir.

/**
 * Generate XLSX blob from rows. Async because xlsx is dynamically imported
 * (5+ MB savings on first-load JS for dashboard pages).
 */
export async function rowsToXlsxBlob(
  rows: Record<string, unknown>[],
  columns: string[],
): Promise<Blob> {
  const XLSX = await import("xlsx");

  const ws = XLSX.utils.json_to_sheet(rows, { header: columns });

  ws["!cols"] = columns.map((col) => {
    const maxLen = Math.max(
      col.length,
      ...rows.map((r) => String(r[col] ?? "").length),
    );
    return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ERPAIO");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadXlsx(
  filename: string,
  rows: Record<string, unknown>[],
  columns: string[],
): Promise<void> {
  const blob = await rowsToXlsxBlob(rows, columns);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

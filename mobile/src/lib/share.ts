import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function shareCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns: string[],
): Promise<void> {
  const header = columns.map(escapeCsv).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCsv(r[c])).join(",")).join("\n");
  const csv = "\uFEFF" + header + "\n" + body;

  const path = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(path, csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "text/csv",
      dialogTitle: "ERPAIO sonuçlarını paylaş",
      UTI: "public.comma-separated-values-text",
    });
  }
}

/**
 * JSON dosyasını paylaş — tenant export (ZZZ) + future feature'lar.
 * Pretty-printed (2-space indent) — kullanıcı dosyayı açtığında okunabilir.
 */
export async function shareJson(filename: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const path = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(path, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      dialogTitle: "ERPAIO veri export'unu paylaş",
      UTI: "public.json",
    });
  }
}

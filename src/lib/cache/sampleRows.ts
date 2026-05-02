import { queryERP } from "@/lib/db/connector";
import type { ErpProfile } from "@/lib/erpProfiles";
import { childLogger } from "@/lib/observability/logger";

interface CacheEntry {
  data: Record<string, Row[]>;
  ts: number;
}

type Row = Record<string, unknown>;

const memCache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000;
const ROWS_PER_TABLE = 3;
const MAX_CELL_LEN = 60;

const log = childLogger({ component: "sample-rows" });

export async function getSampleRows(
  connectionId: string,
  profile: ErpProfile,
): Promise<Record<string, Row[]>> {
  const key = `${connectionId}:${profile.slug}`;
  const cached = memCache.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;

  const result: Record<string, Row[]> = {};

  for (const [tableName, def] of Object.entries(profile.canonical_tables)) {
    const cols = def.important_columns.map((c) => `[${c.name}]`).join(", ");
    const sql = `SELECT TOP ${ROWS_PER_TABLE} ${cols} FROM dbo.[${tableName}] WITH (NOLOCK)`;
    try {
      const rows = await queryERP(connectionId, sql);
      result[tableName] = rows.map((r) => truncateRow(r));
    } catch (err) {
      log.debug({ table: tableName, err: err instanceof Error ? err.message : err }, "Sample fetch skipped");
    }
  }

  memCache.set(key, { data: result, ts: Date.now() });
  log.info({ tables: Object.keys(result).length }, "Sample rows refreshed");
  return result;
}

function truncateRow(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      out[k] = null;
    } else if (typeof v === "string" && v.length > MAX_CELL_LEN) {
      out[k] = v.slice(0, MAX_CELL_LEN) + "…";
    } else if (v instanceof Date) {
      out[k] = v.toISOString().slice(0, 10);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function sampleRowsToPromptContext(samples: Record<string, Row[]>): string {
  const lines: string[] = [];
  lines.push("## ÖRNEK SATIRLAR (canlı veriden, format/değer şekli için)");
  for (const [table, rows] of Object.entries(samples)) {
    if (rows.length === 0) continue;
    lines.push(`### ${table}`);
    for (const row of rows) {
      const pairs = Object.entries(row)
        .map(([k, v]) => `${k}=${formatValue(v)}`)
        .join(" | ");
      lines.push(`  - ${pairs}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `"${String(v)}"`;
}

export function invalidateSampleRows(connectionId: string): void {
  for (const key of memCache.keys()) {
    if (key.startsWith(`${connectionId}:`)) memCache.delete(key);
  }
}

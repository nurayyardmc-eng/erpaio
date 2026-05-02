import { prisma } from "@/lib/db/prisma";

interface CacheEntry {
  data: AnnotationLookup;
  ts: number;
}

export interface AnnotationLookup {
  tables: Record<string, { description?: string; hidden: boolean }>;
  columns: Record<string, { description?: string }>;
}

const memCache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;

export async function getAnnotations(tenantId: string): Promise<AnnotationLookup> {
  const cached = memCache.get(tenantId);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;

  const rows = await prisma.schemaAnnotation.findMany({
    where: { tenantId },
  });

  const lookup: AnnotationLookup = { tables: {}, columns: {} };
  for (const r of rows) {
    if (r.columnName === null || r.columnName === "") {
      lookup.tables[r.tableName] = { description: r.description ?? undefined, hidden: r.hidden };
    } else {
      lookup.columns[`${r.tableName}.${r.columnName}`] = {
        description: r.description ?? undefined,
      };
    }
  }

  memCache.set(tenantId, { data: lookup, ts: Date.now() });
  return lookup;
}

export function invalidateAnnotations(tenantId: string): void {
  memCache.delete(tenantId);
}

export function annotationsToPromptContext(lookup: AnnotationLookup): string {
  const tableEntries = Object.entries(lookup.tables);
  const columnEntries = Object.entries(lookup.columns);

  if (tableEntries.length === 0 && columnEntries.length === 0) return "";

  const lines: string[] = [];
  lines.push("## MÜŞTERİ ÖZGÜ ANNOTATIONS (kullanıcı admin tarafından eklendi — bu bilgilere ÖNCELİK VER)");

  for (const [table, ann] of tableEntries) {
    if (ann.hidden) {
      lines.push(`- ${table}: ❌ KULLANMA (admin gizledi)`);
    } else if (ann.description) {
      lines.push(`- ${table}: ${ann.description}`);
    }
  }
  for (const [colKey, ann] of columnEntries) {
    if (ann.description) lines.push(`- ${colKey}: ${ann.description}`);
  }

  return lines.join("\n");
}

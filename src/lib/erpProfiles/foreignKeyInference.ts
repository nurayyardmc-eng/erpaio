import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";

export interface InferredFk {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  occurrences: number;
}

const JOIN_RX =
  /\bJOIN\s+(?:dbo\.)?\[?([\w]+)\]?\s+(?:[\w]+\s+)?ON\s+\[?([\w]+)\]?\.\[?([\w]+)\]?\s*=\s*\[?([\w]+)\]?\.\[?([\w]+)\]?/gi;

function extractJoins(sql: string): Array<{ a: string; aCol: string; b: string; bCol: string }> {
  const out: Array<{ a: string; aCol: string; b: string; bCol: string }> = [];
  let m;
  while ((m = JOIN_RX.exec(sql)) !== null) {
    out.push({ a: m[2], aCol: m[3], b: m[4], bCol: m[5] });
  }
  return out;
}

export async function inferForeignKeys(
  tenantId: string,
  minSuccessCount = 2,
): Promise<InferredFk[]> {
  const log = childLogger({ component: "fk-inference", tenantId });

  const entries = await prisma.queryCache.findMany({
    where: { tenantId, successCount: { gte: minSuccessCount } },
    select: { sqlQuery: true, successCount: true },
    take: 500,
  });

  const counts = new Map<string, InferredFk>();

  for (const e of entries) {
    const joins = extractJoins(e.sqlQuery);
    for (const j of joins) {
      const norm = canonicalize(j);
      const key = `${norm.fromTable}.${norm.fromColumn}->${norm.toTable}.${norm.toColumn}`;
      const existing = counts.get(key);
      if (existing) {
        existing.occurrences += e.successCount;
      } else {
        counts.set(key, { ...norm, occurrences: e.successCount });
      }
    }
  }

  const result = Array.from(counts.values())
    .filter((f) => f.occurrences >= 3)
    .sort((a, b) => b.occurrences - a.occurrences);

  log.info({ candidates: result.length, sourceQueries: entries.length }, "FK inference completed");
  return result;
}

function canonicalize(j: { a: string; aCol: string; b: string; bCol: string }): {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
} {
  if (j.a < j.b) {
    return { fromTable: j.a, fromColumn: j.aCol, toTable: j.b, toColumn: j.bCol };
  }
  return { fromTable: j.b, fromColumn: j.bCol, toTable: j.a, toColumn: j.aCol };
}

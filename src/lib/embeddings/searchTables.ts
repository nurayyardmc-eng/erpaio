import { prisma } from "@/lib/db/prisma";
import { hexToVec, cosineSim } from "./cosine";
import { deterministicEmbed } from "./index";

export interface TableMatch {
  tableName: string;
  columnName: string | null;
  text: string;
  score: number;
}

export async function searchSimilarTables(
  tenantId: string,
  connectionId: string,
  query: string,
  topN = 10,
): Promise<TableMatch[]> {
  const queryVec = deterministicEmbed(query);

  const candidates = await prisma.tableEmbedding.findMany({
    where: { tenantId, connectionId },
    select: { tableName: true, columnName: true, text: true, embeddingHex: true },
  });

  if (candidates.length === 0) return [];

  const scored = candidates.map((c) => ({
    tableName: c.tableName,
    columnName: c.columnName,
    text: c.text,
    score: cosineSim(queryVec, hexToVec(c.embeddingHex)),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}

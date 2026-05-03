import { prisma } from "@/lib/db/prisma";
import { queryERP } from "@/lib/db/connector";
import { dialectFromErpType, getDialect } from "@/lib/db/dialect";
import { invalidateForTenant } from "./queryCache";
import { invalidateSampleRows } from "./sampleRows";
import { childLogger } from "@/lib/observability/logger";

const memCache = new Map<string, { data: string; ts: number }>();
const TTL_MS = 60 * 60 * 1000;

export async function getSchema(connectionId: string): Promise<string> {
  const mem = memCache.get(connectionId);
  if (mem && Date.now() - mem.ts < TTL_MS) return mem.data;

  const snapshot = await prisma.schemaCache.findUnique({
    where: { connectionId },
  });
  const oneHourAgo = new Date(Date.now() - TTL_MS);
  if (snapshot && snapshot.builtAt > oneHourAgo) {
    memCache.set(connectionId, { data: snapshot.schemaText, ts: Date.now() });
    return snapshot.schemaText;
  }

  const schema = await buildSchema(connectionId);
  const schemaChanged = !snapshot || snapshot.schemaText !== schema;

  memCache.set(connectionId, { data: schema, ts: Date.now() });
  await prisma.schemaCache.upsert({
    where: { connectionId },
    create: { connectionId, schemaText: schema, tableCount: schema.split("\n").length },
    update: { schemaText: schema, tableCount: schema.split("\n").length, builtAt: new Date() },
  });

  if (schemaChanged) {
    invalidateSampleRows(connectionId);
    const conn = await prisma.erpConnection.findUnique({
      where: { id: connectionId },
      select: { tenantId: true },
    });
    if (conn) {
      const deleted = await invalidateForTenant(conn.tenantId);
      childLogger({ component: "schema-cache", connectionId, tenantId: conn.tenantId })
        .info({ event: "schema_changed", invalidatedQueries: deleted }, "Schema changed, query cache + sample rows invalidated");
    }
  }

  return schema;
}

async function buildSchema(connectionId: string): Promise<string> {
  const conn = await prisma.erpConnection.findUnique({
    where: { id: connectionId },
    select: { erpType: true },
  });
  const dialect = getDialect(dialectFromErpType(conn?.erpType ?? "nebim_v3"));
  const rows = await queryERP(connectionId, dialect.schemaQuery);

  const grouped: Record<string, string[]> = {};
  for (const row of rows as Array<{ TABLE_NAME: string; COLUMN_NAME: string; DATA_TYPE: string }>) {
    if (!grouped[row.TABLE_NAME]) grouped[row.TABLE_NAME] = [];
    grouped[row.TABLE_NAME].push(`${row.COLUMN_NAME}(${row.DATA_TYPE})`);
  }

  return Object.entries(grouped)
    .map(([t, cols]) => `${t}: ${cols.join(", ")}`)
    .join("\n");
}

export function invalidateSchema(connectionId: string) {
  memCache.delete(connectionId);
}

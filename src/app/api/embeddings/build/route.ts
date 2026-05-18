import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyCronAuth } from "@/lib/cron/auth";
import { queryERP } from "@/lib/db/connector";
import { embedAndStore } from "@/lib/embeddings";
import { childLogger } from "@/lib/observability/logger";
import { loadProfile } from "@/lib/erpProfiles";

export const maxDuration = 300;
const log = childLogger({ component: "embeddings-build" });

interface SchemaRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

export async function GET(req: NextRequest) {
  const auth = await verifyCronAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetTenantId = searchParams.get("tenantId");

  const where = targetTenantId
    ? { id: targetTenantId }
    : {};

  const tenants = await prisma.tenant.findMany({
    where,
    select: {
      id: true,
      connections: { where: { status: "active" }, select: { id: true, erpProfile: true, erpType: true } },
    },
    take: 50,
  });

  let totalEmbeddings = 0;

  for (const tenant of tenants) {
    for (const conn of tenant.connections) {
      try {
        const rows = (await queryERP(
          conn.id,
          `SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE
           FROM INFORMATION_SCHEMA.COLUMNS c
           JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
           WHERE t.TABLE_TYPE = 'BASE TABLE'`,
        )) as unknown as SchemaRow[];

        const profileSlug = conn.erpProfile ?? (conn.erpType === "nebim_v3" ? "nebim_v3" : null);
        const profile = profileSlug ? loadProfile(profileSlug) : null;

        const tableMap = new Map<string, string[]>();
        for (const r of rows) {
          if (!tableMap.has(r.TABLE_NAME)) tableMap.set(r.TABLE_NAME, []);
          tableMap.get(r.TABLE_NAME)!.push(`${r.COLUMN_NAME}:${r.DATA_TYPE}`);
        }

        for (const [table, cols] of tableMap) {
          const profileMeta = profile?.canonical_tables?.[table];
          const description = profileMeta?.description ?? "";
          const aliases = profileMeta?.aliases?.join(", ") ?? "";
          const text = `${table} ${description} ${aliases} ${cols.slice(0, 10).join(" ")}`.trim();

          await prisma.tableEmbedding.upsert({
            where: {
              tenantId_connectionId_tableName_columnName: {
                tenantId: tenant.id,
                connectionId: conn.id,
                tableName: table,
                columnName: null as unknown as string,
              },
            },
            create: {
              tenantId: tenant.id,
              connectionId: conn.id,
              tableName: table,
              columnName: null,
              text: text.slice(0, 500),
              embeddingHex: embedAndStore(text),
            },
            update: {
              text: text.slice(0, 500),
              embeddingHex: embedAndStore(text),
            },
          });
          totalEmbeddings++;
        }

        log.info({ tenantId: tenant.id, connectionId: conn.id, tables: tableMap.size }, "Embeddings built for connection");
      } catch (err) {
        log.warn({ err, tenantId: tenant.id, connectionId: conn.id }, "Embedding build failed");
      }
    }
  }

  return NextResponse.json({ ok: true, totalEmbeddings, tenants: tenants.length });
}

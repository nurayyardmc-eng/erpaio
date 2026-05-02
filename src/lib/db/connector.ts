import sql from "mssql";
import { decrypt } from "@/lib/crypto/encrypt";
import { prisma } from "@/lib/db/prisma";

interface PoolEntry {
  pool: sql.ConnectionPool;
  lastUsedAt: number;
}

const pools = new Map<string, PoolEntry>();
const POOL_IDLE_MS = 10 * 60 * 1000;
const MAX_POOLS = 50;

async function evictIdle() {
  const now = Date.now();
  for (const [id, entry] of pools) {
    if (now - entry.lastUsedAt > POOL_IDLE_MS) {
      pools.delete(id);
      try { await entry.pool.close(); } catch {}
    }
  }
  if (pools.size > MAX_POOLS) {
    const sorted = Array.from(pools.entries()).sort(
      (a, b) => a[1].lastUsedAt - b[1].lastUsedAt,
    );
    const toEvict = sorted.slice(0, pools.size - MAX_POOLS);
    for (const [id, entry] of toEvict) {
      pools.delete(id);
      try { await entry.pool.close(); } catch {}
    }
  }
}

export async function getPool(connectionId: string): Promise<sql.ConnectionPool> {
  await evictIdle();

  const cached = pools.get(connectionId);
  if (cached) {
    cached.lastUsedAt = Date.now();
    return cached.pool;
  }

  const conn = await prisma.erpConnection.findUnique({
    where: { id: connectionId },
  });
  if (!conn) throw new Error("Bağlantı bulunamadı.");

  const config: sql.config = {
    server: conn.host,
    port: conn.port,
    database: conn.dbName,
    user: conn.username,
    password: decrypt(conn.passwordEnc),
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
    requestTimeout: 15_000,
  };

  const pool = await new sql.ConnectionPool(config).connect();
  pools.set(connectionId, { pool, lastUsedAt: Date.now() });
  pool.on("error", () => pools.delete(connectionId));
  return pool;
}

export async function queryERP(connectionId: string, sqlStr: string) {
  const pool = await getPool(connectionId);
  const result = await pool.request().query(sqlStr);
  return result.recordset;
}

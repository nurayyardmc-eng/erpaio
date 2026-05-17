import sql from "mssql";
import { Pool as PgPool } from "pg";
import * as Sentry from "@sentry/nextjs";
import { decrypt } from "@/lib/crypto/encrypt";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "db-connector" });

type AnyPool = sql.ConnectionPool | PgPool;

interface PoolEntry {
  pool: AnyPool;
  kind: "mssql" | "postgres";
  lastUsedAt: number;
}

const pools = new Map<string, PoolEntry>();
const POOL_IDLE_MS = 10 * 60 * 1000;
const MAX_POOLS = 50;
/** 40+/50 oranı approaching exhaustion sinyali. */
const POOL_WARN_THRESHOLD = Math.floor(MAX_POOLS * 0.8);

async function evictIdle() {
  const now = Date.now();
  let evictedIdle = 0;
  for (const [id, entry] of pools) {
    if (now - entry.lastUsedAt > POOL_IDLE_MS) {
      pools.delete(id);
      evictedIdle++;
      await closePool(entry).catch(() => {});
    }
  }

  if (pools.size > MAX_POOLS) {
    // Cap exhausted — eviction LRU. Production'da bu durum tek tenant'ın
    // pool'unu çalmaya yol açabilir (next request reconnect). Sentry warn.
    const overflow = pools.size - MAX_POOLS;
    log.warn(
      { current: pools.size, max: MAX_POOLS, overflow, evictedIdle },
      "ERP pool cap exceeded — LRU eviction kicking in",
    );
    Sentry.captureMessage("ERP pool cap exceeded", {
      level: "warning",
      tags: { component: "db-connector" },
      extra: { current: pools.size, max: MAX_POOLS, overflow },
    });
    const sorted = Array.from(pools.entries()).sort(
      (a, b) => a[1].lastUsedAt - b[1].lastUsedAt,
    );
    const toEvict = sorted.slice(0, overflow);
    for (const [id, entry] of toEvict) {
      pools.delete(id);
      await closePool(entry).catch(() => {});
    }
  } else if (pools.size >= POOL_WARN_THRESHOLD) {
    // Approaching — soft warning, not an exception.
    log.warn(
      { current: pools.size, max: MAX_POOLS },
      "ERP pool approaching cap (≥80%)",
    );
  }
}

async function closePool(entry: PoolEntry): Promise<void> {
  if (entry.kind === "mssql") {
    await (entry.pool as sql.ConnectionPool).close();
  } else {
    await (entry.pool as PgPool).end();
  }
}

export async function getPoolEntry(connectionId: string): Promise<PoolEntry> {
  await evictIdle();

  const cached = pools.get(connectionId);
  if (cached) {
    cached.lastUsedAt = Date.now();
    return cached;
  }

  const conn = await prisma.erpConnection.findUnique({
    where: { id: connectionId },
  });
  if (!conn) throw new Error("Bağlantı bulunamadı.");

  const password = decrypt(conn.passwordEnc);
  const kind: "mssql" | "postgres" = conn.erpType === "postgres" ? "postgres" : "mssql";

  let pool: AnyPool;
  if (kind === "postgres") {
    pool = new PgPool({
      host: conn.host,
      port: conn.port,
      database: conn.dbName,
      user: conn.username,
      password,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
    await (pool as PgPool).query("SELECT 1");
  } else {
    pool = await new sql.ConnectionPool({
      server: conn.host,
      port: conn.port,
      database: conn.dbName,
      user: conn.username,
      password,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
      requestTimeout: 15_000,
    }).connect();
    (pool as sql.ConnectionPool).on("error", () => pools.delete(connectionId));
  }

  const entry: PoolEntry = { pool, kind, lastUsedAt: Date.now() };
  pools.set(connectionId, entry);
  return entry;
}

export async function getPool(connectionId: string): Promise<sql.ConnectionPool> {
  const entry = await getPoolEntry(connectionId);
  if (entry.kind !== "mssql") {
    throw new Error("getPool only works for mssql; use getPoolEntry for postgres");
  }
  return entry.pool as sql.ConnectionPool;
}

export async function queryERP(connectionId: string, sqlStr: string): Promise<Record<string, unknown>[]> {
  const entry = await getPoolEntry(connectionId);
  if (entry.kind === "postgres") {
    const result = await (entry.pool as PgPool).query(sqlStr);
    return result.rows as Record<string, unknown>[];
  }
  const result = await (entry.pool as sql.ConnectionPool).request().query(sqlStr);
  return result.recordset as Record<string, unknown>[];
}

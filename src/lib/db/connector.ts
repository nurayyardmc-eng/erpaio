import sql from "mssql";
import { Pool as PgPool } from "pg";
import * as Sentry from "@sentry/nextjs";
import { decrypt } from "@/lib/crypto/encrypt";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { enqueueAgentJob, waitForAgentJob } from "@/lib/agent/queue";

const log = childLogger({ component: "db-connector" });

type AnyPool = sql.ConnectionPool | PgPool;

interface PoolEntry {
  pool: AnyPool;
  kind: "mssql" | "postgres";
  /** Cached on first connect — slow-query log için runtime extra prisma query yok. */
  tenantId: string;
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

  const entry: PoolEntry = { pool, kind, tenantId: conn.tenantId, lastUsedAt: Date.now() };
  pools.set(connectionId, entry);
  return entry;
}

/**
 * Eşik aşımı — bunun üzerindeki sorgular SlowQueryLog'a yazılır.
 * 3 saniye keyfî bir başlangıç değeri; production telemetrisinden sonra
 * ayarlanabilir (env override için ileride: SLOW_QUERY_THRESHOLD_MS).
 */
export const SLOW_QUERY_THRESHOLD_MS = 3000;

/**
 * SQL'i log için kısalt: max 500 char + tek satıra çek (newline → space).
 * Pure function — test edilir. Boş/whitespace-only girdi "" döner.
 */
export function truncateSqlForLog(sql: string, max: number = 500): string {
  const collapsed = sql.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed.length > max ? collapsed.slice(0, max - 1) + "…" : collapsed;
}

/**
 * Best-effort slow query insert. queryERP fail-fast hot path'i blocklamasın
 * diye fire-and-forget — log fail Sentry'ye düşer.
 */
function recordSlowQuery(input: {
  tenantId: string;
  connectionId: string;
  sql: string;
  durationMs: number;
  ok: boolean;
  errorMessage?: string | null;
}): void {
  void prisma.slowQueryLog
    .create({
      data: {
        tenantId: input.tenantId,
        connectionId: input.connectionId,
        sqlSnippet: truncateSqlForLog(input.sql),
        durationMs: input.durationMs,
        ok: input.ok,
        errorMessage: input.errorMessage ?? null,
      },
    })
    .catch((err) => {
      log.warn({ err, connectionId: input.connectionId }, "slowQueryLog insert failed");
      Sentry.captureException(err, {
        tags: { component: "db-connector", subsystem: "slow-query-log" },
      });
    });
}

export async function getPool(connectionId: string): Promise<sql.ConnectionPool> {
  const entry = await getPoolEntry(connectionId);
  if (entry.kind !== "mssql") {
    throw new Error("getPool only works for mssql; use getPoolEntry for postgres");
  }
  return entry.pool as sql.ConnectionPool;
}

export async function queryERP(connectionId: string, sqlStr: string): Promise<Record<string, unknown>[]> {
  // Agent-backed connections never open a TCP pool — the on-prem agent executes
  // locally. A cached pool therefore implies a direct connection, so we only
  // pay the mode lookup when no pool exists yet (keeps the direct hot path at
  // zero extra queries).
  if (!pools.has(connectionId)) {
    const conn = await prisma.erpConnection.findUnique({
      where: { id: connectionId },
      select: { connectionMode: true, tenantId: true },
    });
    if (conn?.connectionMode === "agent") {
      return runWithSlowLog(connectionId, conn.tenantId, sqlStr, async () => {
        const jobId = await enqueueAgentJob(connectionId, conn.tenantId, sqlStr);
        return waitForAgentJob(jobId);
      });
    }
  }

  const entry = await getPoolEntry(connectionId);
  return runWithSlowLog(connectionId, entry.tenantId, sqlStr, () => execOnPool(entry, sqlStr));
}

/** Run the direct query against an already-resolved pool. */
async function execOnPool(entry: PoolEntry, sqlStr: string): Promise<Record<string, unknown>[]> {
  if (entry.kind === "postgres") {
    const result = await (entry.pool as PgPool).query(sqlStr);
    return result.rows as Record<string, unknown>[];
  }
  const result = await (entry.pool as sql.ConnectionPool).request().query(sqlStr);
  return result.recordset as Record<string, unknown>[];
}

/**
 * Shared timing + slow-query logging wrapper for both transports (direct pool
 * and agent queue). try → ölç → eşiği aşıyorsa fire-and-forget log; error path
 * da log'lanır (slow + failing query'leri görmek admin debug için kritik).
 */
async function runWithSlowLog(
  connectionId: string,
  tenantId: string,
  sqlStr: string,
  exec: () => Promise<Record<string, unknown>[]>,
): Promise<Record<string, unknown>[]> {
  const startedAt = Date.now();
  try {
    const rows = await exec();
    const durationMs = Date.now() - startedAt;
    if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
      recordSlowQuery({ tenantId, connectionId, sql: sqlStr, durationMs, ok: true });
    }
    return rows;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
      recordSlowQuery({
        tenantId,
        connectionId,
        sql: sqlStr,
        durationMs,
        ok: false,
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
      });
    }
    throw err;
  }
}

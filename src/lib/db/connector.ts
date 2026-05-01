import sql from "mssql";
import { decrypt } from "@/lib/crypto/encrypt";
import { prisma } from "@/lib/db/prisma";

const pools = new Map<string, sql.ConnectionPool>();

export async function getPool(connectionId: string): Promise<sql.ConnectionPool> {
  if (pools.has(connectionId)) return pools.get(connectionId)!;

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
  pools.set(connectionId, pool);
  pool.on("error", () => pools.delete(connectionId));
  return pool;
}

export async function queryERP(connectionId: string, sqlStr: string) {
  const pool = await getPool(connectionId);
  const result = await pool.request().query(sqlStr);
  return result.recordset;
}

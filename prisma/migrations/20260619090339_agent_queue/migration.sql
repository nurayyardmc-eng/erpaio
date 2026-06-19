-- On-prem agent: connection mode flag + agent registration + job queue.
-- IF NOT EXISTS throughout — prod is managed via `prisma db push`, so this
-- migration must be a safe no-op on a DB that already has these objects.

-- ErpConnection.connectionMode ("direct" | "agent")
ALTER TABLE "ErpConnection" ADD COLUMN IF NOT EXISTS "connectionMode" TEXT NOT NULL DEFAULT 'direct';

-- AgentRegistration -------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AgentRegistration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "name" TEXT,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentRegistration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentRegistration_tokenHash_key" ON "AgentRegistration"("tokenHash");
CREATE INDEX IF NOT EXISTS "AgentRegistration_connectionId_idx" ON "AgentRegistration"("connectionId");
CREATE INDEX IF NOT EXISTS "AgentRegistration_tokenHash_idx" ON "AgentRegistration"("tokenHash");

-- AgentQueryJob -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AgentQueryJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultJson" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AgentQueryJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentQueryJob_connectionId_status_idx" ON "AgentQueryJob"("connectionId", "status");
CREATE INDEX IF NOT EXISTS "AgentQueryJob_tenantId_status_createdAt_idx" ON "AgentQueryJob"("tenantId", "status", "createdAt");

-- Foreign keys (guarded — ADD CONSTRAINT has no IF NOT EXISTS in PG, so use a
-- DO block that checks pg_constraint first; safe to re-run).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AgentRegistration_connectionId_fkey') THEN
    ALTER TABLE "AgentRegistration" ADD CONSTRAINT "AgentRegistration_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "ErpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AgentQueryJob_connectionId_fkey') THEN
    ALTER TABLE "AgentQueryJob" ADD CONSTRAINT "AgentQueryJob_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "ErpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

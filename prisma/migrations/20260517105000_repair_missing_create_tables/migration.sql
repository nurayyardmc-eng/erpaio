-- =============================================================
-- REPAIR migration — create 4 models that exist in schema.prisma
-- but were never created by any migration (they were added to
-- production via `prisma db push`, so no CREATE migration was
-- generated): EncryptionKey, NpsResponse, TableEmbedding,
-- TenantIntegration.
--
-- Without this, a clean `prisma migrate deploy` on a fresh DB fails
-- at 20260517110000_fk_constraints_cleanup, which references
-- TenantIntegration / TableEmbedding / NpsResponse as already-existing
-- (it deletes orphans + adds their FK constraints). This migration is
-- ordered immediately before it.
--
-- FK constraints for the 3 relational tables are intentionally OMITTED
-- here — fk_constraints_cleanup adds them. NpsResponse.userId is created
-- NULLABLE to match schema.prisma (String?) and the SET NULL cleanup.
--
-- All statements use IF NOT EXISTS so this is a safe no-op on any
-- database that already has these objects (e.g. a db-push'd prod).
-- =============================================================

-- TenantIntegration ------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TenantIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "endpointEnc" TEXT NOT NULL,
    "secretEnc" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantIntegration_tenantId_kind_key" ON "TenantIntegration"("tenantId", "kind");
CREATE INDEX IF NOT EXISTS "TenantIntegration_tenantId_idx" ON "TenantIntegration"("tenantId");

-- TableEmbedding ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TableEmbedding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "columnName" TEXT,
    "text" TEXT NOT NULL,
    "embeddingHex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TableEmbedding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TableEmbedding_tenantId_connectionId_tableName_columnName_key" ON "TableEmbedding"("tenantId", "connectionId", "tableName", "columnName");
CREATE INDEX IF NOT EXISTS "TableEmbedding_tenantId_connectionId_idx" ON "TableEmbedding"("tenantId", "connectionId");

-- EncryptionKey ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "EncryptionKey" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "keyHashSha256" TEXT NOT NULL,
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EncryptionKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EncryptionKey_version_key" ON "EncryptionKey"("version");

-- NpsResponse ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "NpsResponse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "promptedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NpsResponse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "NpsResponse_tenantId_respondedAt_idx" ON "NpsResponse"("tenantId", "respondedAt");

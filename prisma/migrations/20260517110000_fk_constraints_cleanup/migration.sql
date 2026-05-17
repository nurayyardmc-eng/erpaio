-- =============================================================
-- Schema gap fix: explicit foreign key constraints on 12 models
-- that had tenantId/userId/connectionId columns without enforced
-- FK constraints. Pre-existing orphan rows are cleaned before
-- the constraints are added so the migration is idempotent.
-- =============================================================

-- Step 1: clean up orphans (rows referencing nonexistent parents)
DELETE FROM "EmailVerificationToken" WHERE "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "PasswordResetToken"     WHERE "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "Invitation"             WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant");
DELETE FROM "ScheduledReport"        WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant")
                                        OR "userId" NOT IN (SELECT "id" FROM "User")
                                        OR "connectionId" NOT IN (SELECT "id" FROM "ErpConnection");
DELETE FROM "Watchlist"              WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant")
                                        OR "userId" NOT IN (SELECT "id" FROM "User")
                                        OR "connectionId" NOT IN (SELECT "id" FROM "ErpConnection");
DELETE FROM "TenantIntegration"      WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant");
DELETE FROM "TenantIpAllowlist"      WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant");
DELETE FROM "TableEmbedding"         WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant")
                                        OR "connectionId" NOT IN (SELECT "id" FROM "ErpConnection");
DELETE FROM "NpsResponse"            WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant");
UPDATE "NpsResponse" SET "userId" = NULL WHERE "userId" IS NOT NULL AND "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "CustomMetric"           WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant")
                                        OR "connectionId" NOT IN (SELECT "id" FROM "ErpConnection");
DELETE FROM "SchemaAnnotation"       WHERE "tenantId" NOT IN (SELECT "id" FROM "Tenant");

-- Step 2: NpsResponse.userId becomes nullable (preserve survey data on user delete)
ALTER TABLE "NpsResponse" ALTER COLUMN "userId" DROP NOT NULL;

-- Step 3: add missing indexes (for new FK lookups + already-needed)
CREATE INDEX IF NOT EXISTS "ScheduledReport_userId_idx"        ON "ScheduledReport"("userId");
CREATE INDEX IF NOT EXISTS "ScheduledReport_connectionId_idx"  ON "ScheduledReport"("connectionId");
CREATE INDEX IF NOT EXISTS "Watchlist_userId_idx"              ON "Watchlist"("userId");
CREATE INDEX IF NOT EXISTS "Watchlist_connectionId_idx"        ON "Watchlist"("connectionId");
CREATE INDEX IF NOT EXISTS "CustomMetric_connectionId_idx"     ON "CustomMetric"("connectionId");

-- Step 4: add foreign key constraints
ALTER TABLE "EmailVerificationToken"
  ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledReport"
  ADD CONSTRAINT "ScheduledReport_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledReport"
  ADD CONSTRAINT "ScheduledReport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledReport"
  ADD CONSTRAINT "ScheduledReport_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "ErpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Watchlist"
  ADD CONSTRAINT "Watchlist_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist"
  ADD CONSTRAINT "Watchlist_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist"
  ADD CONSTRAINT "Watchlist_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "ErpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantIntegration"
  ADD CONSTRAINT "TenantIntegration_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantIpAllowlist"
  ADD CONSTRAINT "TenantIpAllowlist_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableEmbedding"
  ADD CONSTRAINT "TableEmbedding_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TableEmbedding"
  ADD CONSTRAINT "TableEmbedding_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "ErpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NpsResponse"
  ADD CONSTRAINT "NpsResponse_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomMetric"
  ADD CONSTRAINT "CustomMetric_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomMetric"
  ADD CONSTRAINT "CustomMetric_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "ErpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchemaAnnotation"
  ADD CONSTRAINT "SchemaAnnotation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

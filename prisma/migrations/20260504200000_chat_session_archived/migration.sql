ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ChatSession_tenantId_userId_archivedAt_idx" ON "ChatSession"("tenantId", "userId", "archivedAt");

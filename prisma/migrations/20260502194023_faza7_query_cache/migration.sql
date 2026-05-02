-- CreateTable
CREATE TABLE "QueryCache" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "questionHash" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "sqlQuery" TEXT NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QueryCache_tenantId_lastUsedAt_idx" ON "QueryCache"("tenantId", "lastUsedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "QueryCache_tenantId_questionHash_key" ON "QueryCache"("tenantId", "questionHash");

-- AddForeignKey
ALTER TABLE "QueryCache" ADD CONSTRAINT "QueryCache_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

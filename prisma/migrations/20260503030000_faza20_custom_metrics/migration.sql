CREATE TABLE "CustomMetric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "schedule" TEXT NOT NULL DEFAULT 'hourly',
    "algorithm" TEXT NOT NULL DEFAULT 'zscore',
    "direction" TEXT NOT NULL DEFAULT 'both',
    "configJson" JSONB,
    "sql" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomMetric_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomMetric_tenantId_key_key" ON "CustomMetric"("tenantId", "key");
CREATE INDEX "CustomMetric_tenantId_enabled_idx" ON "CustomMetric"("tenantId", "enabled");

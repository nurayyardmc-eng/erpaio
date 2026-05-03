-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "emailTo" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledReport_tenantId_idx" ON "ScheduledReport"("tenantId");
CREATE INDEX "ScheduledReport_enabled_schedule_idx" ON "ScheduledReport"("enabled", "schedule");

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "thresholdOp" TEXT NOT NULL,
    "thresholdVal" DOUBLE PRECISION NOT NULL,
    "emailTo" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastValue" DOUBLE PRECISION,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Watchlist_tenantId_idx" ON "Watchlist"("tenantId");
CREATE INDEX "Watchlist_enabled_idx" ON "Watchlist"("enabled");

-- CreateTable
CREATE TABLE "TenantIpAllowlist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantIpAllowlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantIpAllowlist_tenantId_cidr_key" ON "TenantIpAllowlist"("tenantId", "cidr");

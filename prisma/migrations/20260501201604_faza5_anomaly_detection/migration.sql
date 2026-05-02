-- CreateEnum
CREATE TYPE "CronStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL_FAILURE', 'FAILED');

-- CreateTable
CREATE TABLE "AnomalyBaseline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "AnomalyBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "CronStatus" NOT NULL DEFAULT 'RUNNING',
    "tenantsTotal" INTEGER NOT NULL DEFAULT 0,
    "tenantsOk" INTEGER NOT NULL DEFAULT 0,
    "tenantsFail" INTEGER NOT NULL DEFAULT 0,
    "alertsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnomalyBaseline_tenantId_metricKey_capturedAt_idx" ON "AnomalyBaseline"("tenantId", "metricKey", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "AnomalyBaseline_tenantId_capturedAt_idx" ON "AnomalyBaseline"("tenantId", "capturedAt");

-- CreateIndex
CREATE INDEX "CronRun_jobName_startedAt_idx" ON "CronRun"("jobName", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "CronRun_status_idx" ON "CronRun"("status");

-- AddForeignKey
ALTER TABLE "AnomalyBaseline" ADD CONSTRAINT "AnomalyBaseline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

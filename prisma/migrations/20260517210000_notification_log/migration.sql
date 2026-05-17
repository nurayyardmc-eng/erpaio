-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "alertId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipient" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_createdAt_idx" ON "NotificationLog"("tenantId", "createdAt");
CREATE INDEX "NotificationLog_channel_status_createdAt_idx" ON "NotificationLog"("channel", "status", "createdAt");
CREATE INDEX "NotificationLog_alertId_idx" ON "NotificationLog"("alertId");

-- AddForeignKey
ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

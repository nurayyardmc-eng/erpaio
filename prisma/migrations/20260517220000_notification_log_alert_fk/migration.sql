-- Clean up orphan NotificationLog rows pointing at non-existent alerts
UPDATE "NotificationLog" SET "alertId" = NULL
WHERE "alertId" IS NOT NULL
  AND "alertId" NOT IN (SELECT "id" FROM "Alert");

-- AddForeignKey
ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

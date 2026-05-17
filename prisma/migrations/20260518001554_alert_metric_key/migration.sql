-- Alert.metricKey shadow column — evidence.metricKey'in indexed kopyası.
-- Track NNN FP suppression query'si bu kolonu kullanır (JSON path filter'dan
-- 100× daha hızlı + index'lenebilir).
ALTER TABLE "Alert" ADD COLUMN "metricKey" TEXT;

-- Backfill: mevcut anomaly alert'lerinde evidence.metricKey varsa kopyala.
-- Manuel alert'lerde NULL kalır (zaten o şekilde kullanılır).
UPDATE "Alert"
SET "metricKey" = "evidence"->>'metricKey'
WHERE "type" = 'anomaly'
  AND "evidence" IS NOT NULL
  AND "evidence" ? 'metricKey';

-- Compound index FP suppression query (tenantId + metricKey + falsePositiveAt)
-- içindir. (tenantId, falsePositiveAt) tek başına da var; bu daha keskin.
CREATE INDEX "Alert_tenantId_metricKey_falsePositiveAt_idx"
  ON "Alert"("tenantId", "metricKey", "falsePositiveAt");

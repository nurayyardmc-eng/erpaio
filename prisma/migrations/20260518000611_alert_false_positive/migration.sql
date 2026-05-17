-- Anomaly engine learning loop — kullanıcı bir alert'i yanlış alarm
-- olarak işaretleyebilsin; engine bu sinyali baseline suppression için
-- okuyabilsin.
ALTER TABLE "Alert"
    ADD COLUMN "falsePositiveAt" TIMESTAMP(3),
    ADD COLUMN "falsePositiveBy" TEXT;

-- Tenant-bazlı recent FP araması için index. (status indexi ayrı yok ama
-- recent FP sorgusu metric key bazlı ve tenant scoped — bu index yeterli.)
CREATE INDEX "Alert_tenantId_falsePositiveAt_idx" ON "Alert"("tenantId", "falsePositiveAt");

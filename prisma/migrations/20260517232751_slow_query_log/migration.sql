-- ERP query observability — eşiği aşan (varsayılan 3000ms) sorgular için
-- trace kaydı. Admin slow query dashboard'ı.
CREATE TABLE "SlowQueryLog" (
    "id"           TEXT NOT NULL,
    "tenantId"     TEXT NOT NULL,
    "connectionId" TEXT,
    "sqlSnippet"   TEXT NOT NULL,
    "durationMs"   INTEGER NOT NULL,
    "ok"           BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlowQueryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SlowQueryLog_tenantId_createdAt_idx" ON "SlowQueryLog"("tenantId", "createdAt");
CREATE INDEX "SlowQueryLog_durationMs_idx" ON "SlowQueryLog"("durationMs");

ALTER TABLE "SlowQueryLog"
    ADD CONSTRAINT "SlowQueryLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SlowQueryLog"
    ADD CONSTRAINT "SlowQueryLog_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "ErpConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
